import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { inMemoryStore, saveInMemoryStoreToDisk } from '../db';

export interface GoogleDriveConfig {
  isEnabled: boolean;
  driveEmail: string;
  folderName: string;
  serviceAccountKeyJson: string; // JSON string of Google Cloud Service Account
  clientEmail?: string;
  privateKey?: string;
  autoSyncMinutes: number;
  lastSyncTime?: number;
  lastSyncStatus?: 'idle' | 'success' | 'failed' | 'syncing';
  lastSyncMessage?: string;
  driveFileId?: string;
  driveFolderId?: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'server', 'data', 'google-drive-config.json');

// Default initial config
const DEFAULT_CONFIG: GoogleDriveConfig = {
  isEnabled: true,
  driveEmail: 'twinginfobd@gmail.com',
  folderName: 'TWING_HISABI_DATABASE',
  serviceAccountKeyJson: '',
  autoSyncMinutes: 10,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'ড্রাইভ সংযোগ প্রস্তুত হচ্ছে...',
};

let currentConfig: GoogleDriveConfig = { ...DEFAULT_CONFIG };
let autoSyncIntervalTimer: NodeJS.Timeout | null = null;
let isSyncInProgress = false;

/**
 * Load Google Drive configuration from disk
 */
export function loadGoogleDriveConfig(): GoogleDriveConfig {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      return currentConfig;
    }
  } catch (err) {
    console.warn('⚠️ Could not load Google Drive config from disk:', err);
  }
  currentConfig = { ...DEFAULT_CONFIG };
  return currentConfig;
}

/**
 * Save Google Drive configuration to disk
 */
export function saveGoogleDriveConfig(newConfig: Partial<GoogleDriveConfig>): GoogleDriveConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    // Always normalize email
    driveEmail: newConfig.driveEmail?.trim() || currentConfig.driveEmail || 'twinginfobd@gmail.com',
  };

  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Could not write Google Drive config to disk:', err);
  }

  // Re-schedule auto-sync timer
  scheduleAutoSync();
  return currentConfig;
}

/**
 * Resolves a Google Drive client using Service Account credentials
 */
function getDriveClient(): { drive: any; authEmail: string } {
  const config = currentConfig;
  let credentials: any = null;

  // 1. Try parsing serviceAccountKeyJson
  if (config.serviceAccountKeyJson && config.serviceAccountKeyJson.trim()) {
    try {
      credentials = JSON.parse(config.serviceAccountKeyJson.trim());
    } catch {
      // maybe raw private key or env variable
    }
  }

  // 2. Check process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch {}
  }

  // 3. Check process.env.GOOGLE_APPLICATION_CREDENTIALS path
  if (!credentials && process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
    } catch {}
  }

  if (!credentials || !credentials.client_email || !credentials.private_key) {
    throw new Error(
      `গুগল ড্রাইভ সার্ভিস অ্যাকাউন্ট কি (Service Account Key) কনফিগার করা হয়নি। দয়া করে সুপার অ্যাডমিন প্যানেলে JSON Key দিন অথবা twinginfobd@gmail.com ড্রাইভের সাথে যুক্ত করুন।`
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  return { drive, authEmail: credentials.client_email };
}

/**
 * Find or create the dedicated folder on Google Drive
 */
async function findOrCreateDriveFolder(drive: any, folderName: string): Promise<string> {
  // Check if folder ID is already cached
  if (currentConfig.driveFolderId) {
    try {
      const getRes = await drive.files.get({ fileId: currentConfig.driveFolderId, fields: 'id, trashed' });
      if (getRes.data && !getRes.data.trashed) {
        return currentConfig.driveFolderId;
      }
    } catch {
      // expired or inaccessible, search again
    }
  }

  // Search existing active folder
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    const folderId = listRes.data.files[0].id!;
    saveGoogleDriveConfig({ driveFolderId: folderId });
    return folderId;
  }

  // Create new folder
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    description: 'TWING Hisabi POS Automated Master Database Storage',
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  const newFolderId = createRes.data.id!;
  saveGoogleDriveConfig({ driveFolderId: newFolderId });
  console.log(`📁 [Google Drive] Created folder "${folderName}" with ID: ${newFolderId}`);
  return newFolderId;
}

/**
 * Upload complete master database to Google Drive
 */
export async function uploadDatabaseToDrive(source: string = 'auto_sync'): Promise<{
  success: boolean;
  message: string;
  fileId?: string;
  folderId?: string;
  timestamp: number;
  stats?: any;
}> {
  if (isSyncInProgress) {
    return {
      success: false,
      message: 'ইতিমধ্যে একটি সিঙ্ক কার্যক্রম চলমান রয়েছে।',
      timestamp: Date.now(),
    };
  }

  isSyncInProgress = true;
  saveGoogleDriveConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'গুগল ড্রাইভে ডাটা আপলোড হচ্ছে...' });

  try {
    const { drive, authEmail } = getDriveClient();
    const folderId = await findOrCreateDriveFolder(drive, currentConfig.folderName || 'TWING_HISABI_DATABASE');

    // Prepare complete database dump
    const payload = {
      exportVersion: '2.5.0-gdrive',
      exportedAt: Date.now(),
      exportedAtIso: new Date().toISOString(),
      source,
      targetDriveEmail: currentConfig.driveEmail || 'twinginfobd@gmail.com',
      serviceAccount: authEmail,
      data: {
        users: inMemoryStore.users || [],
        stores: inMemoryStore.stores || [],
        customers: inMemoryStore.customers || [],
        transactions: inMemoryStore.transactions || [],
        expenses: inMemoryStore.expenses || [],
        products: inMemoryStore.products || [],
        payments: inMemoryStore.payments || [],
        system_config: inMemoryStore.system_config || {},
        online_orders: inMemoryStore.online_orders || [],
        online_store_configs: inMemoryStore.online_store_configs || [],
        marketplace_users: inMemoryStore.marketplace_users || [],
        marketplace_master_orders: inMemoryStore.marketplace_master_orders || [],
        marketplace_products: inMemoryStore.marketplace_products || [],
      },
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    const fileName = 'twing_hisabi_master_database.json';

    // Search if file already exists in folder
    let targetFileId = currentConfig.driveFileId;
    if (!targetFileId) {
      const searchRes = await drive.files.list({
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      if (searchRes.data.files && searchRes.data.files.length > 0) {
        targetFileId = searchRes.data.files[0].id!;
      }
    }

    let fileRes: any;
    const media = {
      mimeType: 'application/json',
      body: jsonContent,
    };

    if (targetFileId) {
      // Update existing file content directly
      fileRes = await drive.files.update({
        fileId: targetFileId,
        media,
        fields: 'id, name, modifiedTime',
      });
      console.log(`☁️ [Google Drive] Updated master database file (${targetFileId}) in folder "${currentConfig.folderName}"`);
    } else {
      // Create new file inside folder
      fileRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          description: 'TWING Hisabi POS Live Master Database (JSON)',
        },
        media,
        fields: 'id, name, modifiedTime',
      });
      targetFileId = fileRes.data.id!;
      console.log(`☁️ [Google Drive] Created new master database file (${targetFileId}) in folder "${currentConfig.folderName}"`);
    }

    const timestamp = Date.now();
    const stats = {
      users: (inMemoryStore.users || []).length,
      customers: (inMemoryStore.customers || []).length,
      transactions: (inMemoryStore.transactions || []).length,
      products: (inMemoryStore.products || []).length,
    };

    saveGoogleDriveConfig({
      driveFileId: targetFileId,
      driveFolderId: folderId,
      lastSyncTime: timestamp,
      lastSyncStatus: 'success',
      lastSyncMessage: `✅ গুগল ড্রাইভে (${currentConfig.driveEmail}) সফলভাবে ব্যাকআপ সংরক্ষিত হয়েছে! (${stats.users} জন ইউজার, ${stats.customers} জন কাস্টমার)`,
    });

    return {
      success: true,
      message: `✅ গুগল ড্রাইভে (${currentConfig.driveEmail}) সফলভাবে ডাটাবেজ ব্যাকআপ সম্পন্ন হয়েছে!`,
      fileId: targetFileId,
      folderId,
      timestamp,
      stats,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('❌ [Google Drive Upload Error]:', errorMsg);
    saveGoogleDriveConfig({
      lastSyncStatus: 'failed',
      lastSyncMessage: `❌ আপলোড ব্যর্থ: ${errorMsg}`,
    });
    return {
      success: false,
      message: `গুগল ড্রাইভে আপলোড ব্যর্থ হয়েছে: ${errorMsg}`,
      timestamp: Date.now(),
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Download and restore master database from Google Drive into live inMemoryStore
 */
export async function restoreDatabaseFromDrive(): Promise<{
  success: boolean;
  message: string;
  restoredCount?: {
    users: number;
    customers: number;
    transactions: number;
    products: number;
  };
}> {
  try {
    const { drive } = getDriveClient();
    const folderId = await findOrCreateDriveFolder(drive, currentConfig.folderName || 'TWING_HISABI_DATABASE');
    const fileName = 'twing_hisabi_master_database.json';

    let targetFileId = currentConfig.driveFileId;
    if (!targetFileId) {
      const searchRes = await drive.files.list({
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      if (searchRes.data.files && searchRes.data.files.length > 0) {
        targetFileId = searchRes.data.files[0].id!;
      }
    }

    if (!targetFileId) {
      throw new Error(`গুগল ড্রাইভ ফোল্ডারে "${fileName}" ফাইলটি পাওয়া যায়নি। প্রথমে ড্রাইভ ব্যাকআপ তৈরি করুন।`);
    }

    // Download content
    const getRes = await drive.files.get(
      { fileId: targetFileId, alt: 'media' },
      { responseType: 'text' }
    );

    let rawData = getRes.data;
    if (typeof rawData !== 'string') {
      rawData = JSON.stringify(rawData);
    }

    const payload = JSON.parse(rawData);
    const data = payload.data || payload;

    let restoredUsers = 0;
    let restoredCustomers = 0;
    let restoredTransactions = 0;
    let restoredProducts = 0;

    if (Array.isArray(data.users) && data.users.length > 0) {
      // Merge users, keeping super admin intact
      const existingMap = new Map((inMemoryStore.users || []).map(u => [u.id, u]));
      data.users.forEach((u: any) => {
        if (u && u.id) {
          existingMap.set(u.id, { ...(existingMap.get(u.id) || {}), ...u });
        }
      });
      inMemoryStore.users = Array.from(existingMap.values());
      restoredUsers = inMemoryStore.users.length;
    }

    if (Array.isArray(data.customers)) {
      const existingMap = new Map((inMemoryStore.customers || []).map(c => [c.id, c]));
      data.customers.forEach((c: any) => {
        if (c && c.id) existingMap.set(c.id, { ...(existingMap.get(c.id) || {}), ...c });
      });
      inMemoryStore.customers = Array.from(existingMap.values());
      restoredCustomers = inMemoryStore.customers.length;
    }

    if (Array.isArray(data.transactions)) {
      const existingMap = new Map((inMemoryStore.transactions || []).map(t => [t.id, t]));
      data.transactions.forEach((t: any) => {
        if (t && t.id) existingMap.set(t.id, { ...(existingMap.get(t.id) || {}), ...t });
      });
      inMemoryStore.transactions = Array.from(existingMap.values());
      restoredTransactions = inMemoryStore.transactions.length;
    }

    if (Array.isArray(data.products)) {
      const existingMap = new Map((inMemoryStore.products || []).map(p => [p.id, p]));
      data.products.forEach((p: any) => {
        if (p && p.id) existingMap.set(p.id, { ...(existingMap.get(p.id) || {}), ...p });
      });
      inMemoryStore.products = Array.from(existingMap.values());
      restoredProducts = inMemoryStore.products.length;
    }

    if (data.system_config && typeof data.system_config === 'object') {
      inMemoryStore.system_config = {
        ...inMemoryStore.system_config,
        ...data.system_config,
      };
    }

    // Persist to local disk immediately
    saveInMemoryStoreToDisk();

    console.log(`📥 [Google Drive Restore] Restored ${restoredUsers} users, ${restoredCustomers} customers, ${restoredTransactions} transactions from Google Drive!`);

    return {
      success: true,
      message: `✅ গুগল ড্রাইভ থেকে ডাটাবেজ সফলভাবে রিস্টোর হয়েছে! (${restoredUsers} জন ইউজার, ${restoredCustomers} জন কাস্টমার)`,
      restoredCount: {
        users: restoredUsers,
        customers: restoredCustomers,
        transactions: restoredTransactions,
        products: restoredProducts,
      },
    };
  } catch (err: any) {
    console.error('❌ [Google Drive Restore Error]:', err);
    throw new Error(`গুগল ড্রাইভ থেকে রিস্টোর ব্যর্থ: ${err.message || err}`);
  }
}

/**
 * Schedule automatic background backup timer
 */
export function scheduleAutoSync() {
  if (autoSyncIntervalTimer) {
    clearInterval(autoSyncIntervalTimer);
    autoSyncIntervalTimer = null;
  }

  const intervalMinutes = Math.max(5, currentConfig.autoSyncMinutes || 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  if (!currentConfig.isEnabled) {
    console.log('ℹ️ [Google Drive Auto-Sync] Disabled in configuration.');
    return;
  }

  autoSyncIntervalTimer = setInterval(async () => {
    try {
      console.log(`⏰ [Google Drive Auto-Sync] Triggering scheduled backup (every ${intervalMinutes} mins)...`);
      await uploadDatabaseToDrive('scheduled_auto_sync');
    } catch (err: any) {
      console.warn('⚠️ [Google Drive Auto-Sync Background Warning]:', err?.message);
    }
  }, intervalMs);

  if (autoSyncIntervalTimer.unref) {
    autoSyncIntervalTimer.unref();
  }
}

/**
 * Initialize Google Drive integration on server startup
 */
export async function initGoogleDriveSync() {
  loadGoogleDriveConfig();

  // If enabled and credentials exist, check/restore on startup
  try {
    const hasKey = Boolean(
      (currentConfig.serviceAccountKeyJson && currentConfig.serviceAccountKeyJson.trim()) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

    if (currentConfig.isEnabled && hasKey) {
      console.log(`🚀 [Google Drive Engine] Initialized for ${currentConfig.driveEmail}. Checking Drive on startup...`);
      // Try soft-restore from drive on startup if local-db is empty or needs refresh
      const userCount = inMemoryStore.users ? inMemoryStore.users.length : 0;
      if (userCount <= 1) {
        console.log('🔄 [Google Drive Engine] Local users list is low — checking Drive for master database...');
        await restoreDatabaseFromDrive().catch(e => console.log('Drive startup restore notice:', e.message));
      }
      scheduleAutoSync();
    } else {
      console.log(`ℹ️ [Google Drive Engine] Standing by. Target: ${currentConfig.driveEmail}. Configure credentials in Admin Panel to activate auto-sync.`);
    }
  } catch (err: any) {
    console.warn('Google Drive init warning:', err?.message);
  }
}
