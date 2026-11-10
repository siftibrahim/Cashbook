import { adminApi } from './apiService';

// Fallback Google OAuth Client ID provisioned for this application
export const DEFAULT_GOOGLE_CLIENT_ID =
  '884140829059-gfmb9gv54r619p4t971m46m6jl8604da.apps.googleusercontent.com';

export const TARGET_GOOGLE_EMAIL = 'twinginfobd@gmail.com';
export const DRIVE_FOLDER_NAME = 'TWING_Hisabi_Backups';
export const DRIVE_BACKUP_FILENAME = 'twing_hisabi_master_db.json';

const STORAGE_KEYS = {
  TOKEN: 'twing_gdrive_access_token',
  TOKEN_EXPIRY: 'twing_gdrive_token_expiry',
  USER_EMAIL: 'twing_gdrive_connected_email',
  USER_NAME: 'twing_gdrive_connected_name',
  USER_PICTURE: 'twing_gdrive_connected_picture',
  LAST_SYNC: 'twing_gdrive_last_sync_time',
  LAST_SYNC_STATUS: 'twing_gdrive_last_sync_status',
  AUTO_SYNC: 'twing_gdrive_auto_sync_enabled',
  CUSTOM_CLIENT_ID: 'twing_gdrive_custom_client_id',
  FOLDER_ID: 'twing_gdrive_folder_id',
  FILE_ID: 'twing_gdrive_file_id',
};

export interface GoogleDriveAccountInfo {
  isConnected: boolean;
  email: string | null;
  name: string | null;
  picture: string | null;
  lastSyncTime: number | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  autoSyncEnabled: boolean;
  folderId: string | null;
  fileId: string | null;
  customClientId: string;
}

// In-memory token storage (persisted in sessionStorage for page reload safety)
let inMemoryAccessToken: string | null = null;

export function getEffectiveGoogleClientId(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
  } catch {}
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export function saveCustomGoogleClientId(clientId: string) {
  try {
    if (clientId && clientId.trim()) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLIENT_ID, clientId.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
    }
  } catch {}
}

export function getStoredAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiry = Number(sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || 0);
    if (token && expiry > Date.now()) {
      inMemoryAccessToken = token;
      return token;
    }
  } catch {}
  return null;
}

export function setStoredAccessToken(token: string | null, expiresInSeconds = 3599) {
  inMemoryAccessToken = token;
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      sessionStorage.setItem(
        STORAGE_KEYS.TOKEN_EXPIRY,
        String(Date.now() + (expiresInSeconds - 60) * 1000)
      );
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    }
  } catch {}
}

export function getGoogleDriveStatus(): GoogleDriveAccountInfo {
  const token = getStoredAccessToken();
  let email: string | null = null;
  let name: string | null = null;
  let picture: string | null = null;
  let lastSyncTime: number | null = null;
  let lastSyncStatus: any = null;
  let autoSyncEnabled = true;
  let folderId: string | null = null;
  let fileId: string | null = null;
  let customClientId = '';

  try {
    email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || (token ? TARGET_GOOGLE_EMAIL : null);
    name = localStorage.getItem(STORAGE_KEYS.USER_NAME) || null;
    picture = localStorage.getItem(STORAGE_KEYS.USER_PICTURE) || null;
    const rawTime = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    lastSyncTime = rawTime ? Number(rawTime) : null;
    lastSyncStatus = localStorage.getItem(STORAGE_KEYS.LAST_SYNC_STATUS) as any;
    const rawAuto = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    autoSyncEnabled = rawAuto !== 'false';
    folderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);
    fileId = localStorage.getItem(STORAGE_KEYS.FILE_ID);
    customClientId = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID) || '';
  } catch {}

  return {
    isConnected: Boolean(token),
    email,
    name,
    picture,
    lastSyncTime,
    lastSyncStatus,
    autoSyncEnabled,
    folderId,
    fileId,
    customClientId,
  };
}

export function setAutoSyncEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(enabled));
  } catch {}
}

/**
 * Ensures Google Identity Services (GIS) client script is loaded
 */
export async function ensureGisLoaded(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    return true;
  }
  return new Promise((resolve) => {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      if ((window as any).google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve(true);
      } else if (checkCount > 40) {
        // Fallback: inject script if not present
        if (!document.getElementById('google-gsi-client')) {
          const script = document.createElement('script');
          script.id = 'google-gsi-client';
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        }
        clearInterval(interval);
      }
    }, 100);
  });
}

/**
 * Initiates standard Google OAuth 2.0 token request (GIS popup) for Google Drive
 */
export async function connectGoogleDrive(
  targetEmail = TARGET_GOOGLE_EMAIL
): Promise<{ success: boolean; email?: string; error?: string }> {
  const isLoaded = await ensureGisLoaded();
  if (!isLoaded || !(window as any).google?.accounts?.oauth2) {
    throw new Error('গুগল আইডেন্টিটি সার্ভিসেস লোড করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন।');
  }

  const clientId = getEffectiveGoogleClientId();

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        hint: targetEmail,
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google OAuth error:', response);
            reject(new Error(`গুগল ড্রাইভ অথোরাইজেশন ব্যর্থ: ${response.error_description || response.error}`));
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            setStoredAccessToken(token, Number(response.expires_in) || 3599);

            // Fetch user profile info
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.email) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, userData.email);
                if (userData.name) localStorage.setItem(STORAGE_KEYS.USER_NAME, userData.name);
                if (userData.picture) localStorage.setItem(STORAGE_KEYS.USER_PICTURE, userData.picture);
              }
            } catch (uErr) {
              localStorage.setItem(STORAGE_KEYS.USER_EMAIL, targetEmail);
            }

            resolve({
              success: true,
              email: localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || targetEmail,
            });
          } else {
            reject(new Error('গুগল থেকে অ্যাক্সেস টোকেন পাওয়া যায়নি'));
          }
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(err);
    }
  });
}

export function disconnectGoogleDrive() {
  const token = getStoredAccessToken();
  if (token && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }
  setStoredAccessToken(null);
  localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  localStorage.removeItem(STORAGE_KEYS.USER_NAME);
  localStorage.removeItem(STORAGE_KEYS.USER_PICTURE);
}

/**
 * Finds or creates the TWING_Hisabi_Backups folder on Google Drive
 */
async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  const cachedFolderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID);
  if (cachedFolderId) {
    // Verify it still exists
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cachedFolderId}?fields=id,name,trashed`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (checkRes.ok) {
        const file = await checkRes.json();
        if (!file.trashed) return cachedFolderId;
      }
    } catch {}
  }

  // Search by name
  const q = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const list = await searchRes.json();
    if (list.files && list.files.length > 0) {
      const id = list.files[0].id;
      localStorage.setItem(STORAGE_KEYS.FOLDER_ID, id);
      return id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'TWING Hisabi POS & Store Database Automated Cloud Backups',
    }),
  });

  if (!createRes.ok) {
    throw new Error('গুগল ড্রাইভে ব্যাকআপ ফোল্ডার তৈরি করতে ব্যর্থ হয়েছে');
  }

  const newFolder = await createRes.json();
  localStorage.setItem(STORAGE_KEYS.FOLDER_ID, newFolder.id);
  return newFolder.id;
}

/**
 * Uploads full database snapshot to Google Drive in folder TWING_Hisabi_Backups
 */
export async function uploadBackupToGoogleDrive(): Promise<{
  success: boolean;
  message: string;
  fileId?: string;
  timestamp: number;
  sizeBytes?: number;
}> {
  let token = getStoredAccessToken();
  if (!token) {
    // Prompt connect
    const conn = await connectGoogleDrive();
    token = getStoredAccessToken();
    if (!token) throw new Error('গুগল ড্রাইভ কানেক্ট করা আবশ্যক');
  }

  localStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, 'in_progress');

  try {
    // 1. Get clean master backup from local backend
    const backupData = await adminApi.exportMasterBackup();
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('ডাটাবেজ থেকে ব্যাকআপ ডাটা তৈরি করা সম্ভব হয়নি');
    }

    const jsonString = JSON.stringify(
      {
        ...backupData,
        _twing_metadata: {
          syncedAt: Date.now(),
          syncedAtFormatted: new Date().toLocaleString('bn-BD'),
          version: '2.5.0',
          platform: 'twinghisabi.site',
          source: 'Google Drive Automated Cloud Sync',
          targetAccount: TARGET_GOOGLE_EMAIL,
        },
      },
      null,
      2
    );

    const sizeBytes = new Blob([jsonString]).size;
    const folderId = await getOrCreateDriveFolder(token);

    // 2. Check if backup file already exists in folder
    const q = `name = '${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let fileId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }

    if (fileId) {
      // Update existing file content directly (resilient upload)
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: jsonString,
        }
      );

      if (!updateRes.ok) {
        throw new Error('গুগল ড্রাইভে ফাইল আপডেট করতে সমস্যা হয়েছে');
      }
    } else {
      // Create new file via multipart
      const metadata = {
        name: DRIVE_BACKUP_FILENAME,
        parents: [folderId],
        mimeType: 'application/json',
        description: 'TWING Hisabi Master Database Backup',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelim = '\r\n--' + boundary + '--';

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonString +
        closeDelim;

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!createRes.ok) {
        throw new Error('গুগল ড্রাইভে নতুন ব্যাকআপ ফাইল তৈরি করতে সমস্যা হয়েছে');
      }

      const createdFile = await createRes.json();
      fileId = createdFile.id;
    }

    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(now));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, 'success');
    if (fileId) localStorage.setItem(STORAGE_KEYS.FILE_ID, fileId);

    return {
      success: true,
      message: `✅ গুগল ড্রাইভের "${DRIVE_FOLDER_NAME}" ফোল্ডারে সফলভাবে ব্যাকআপ সংরক্ষিত হয়েছে (${(sizeBytes / 1024).toFixed(1)} KB)!`,
      fileId: fileId || undefined,
      timestamp: now,
      sizeBytes,
    };
  } catch (err: any) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, 'failed');
    console.error('Google Drive Upload Error:', err);
    throw err;
  }
}

/**
 * Downloads and restores the database from Google Drive into TWING Hisabi
 */
export async function restoreBackupFromGoogleDrive(): Promise<{
  success: boolean;
  message: string;
  imported: any;
}> {
  let token = getStoredAccessToken();
  if (!token) {
    await connectGoogleDrive();
    token = getStoredAccessToken();
    if (!token) throw new Error('গুগল ড্রাইভ কানেক্ট করা আবশ্যক');
  }

  const folderId = await getOrCreateDriveFolder(token);

  // Search for the backup file
  const q = `name = '${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!searchRes.ok) {
    throw new Error('গুগল ড্রাইভে ব্যাকআপ ফাইল অনুসন্ধান করা যায়নি');
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    throw new Error(
      `❌ গুগল ড্রাইভের "${DRIVE_FOLDER_NAME}" ফোল্ডারে "${DRIVE_BACKUP_FILENAME}" ফাইলটি পাওয়া যায়নি। প্রথমে একটি ব্যাকআপ আপলোড করুন।`
    );
  }

  const file = searchData.files[0];

  // Download file contents
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!downloadRes.ok) {
    throw new Error('গুগল ড্রাইভ থেকে ব্যাকআপ ফাইল ডাউনলোড করা সম্ভব হয়নি');
  }

  const backupJson = await downloadRes.json();

  // Import directly into application backend
  const importResult = await adminApi.importMasterBackup(backupJson, 'replace');

  const now = Date.now();
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(now));
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC_STATUS, 'success');

  return {
    success: true,
    message: `🎉 গুগল ড্রাইভ থেকে সমস্ত ডাটা সফলভাবে রিস্টোর হয়েছে! (${importResult.imported?.users || 0} জন ইউজার, ${importResult.imported?.customers || 0} কাস্টমার)`,
    imported: importResult.imported,
  };
}
