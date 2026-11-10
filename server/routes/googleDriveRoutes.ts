import { Router, Response } from 'express';
import { requireSuperAdmin, AuthenticatedRequest } from '../authMiddleware';
import {
  loadGoogleDriveConfig,
  saveGoogleDriveConfig,
  uploadDatabaseToDrive,
  restoreDatabaseFromDrive,
} from '../services/googleDriveService';

const router = Router();

// 1. Get Google Drive Status & Config
router.get('/status', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = loadGoogleDriveConfig();
    const hasCredentials = Boolean(
      (config.serviceAccountKeyJson && config.serviceAccountKeyJson.trim()) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

    return res.json({
      success: true,
      isEnabled: config.isEnabled,
      driveEmail: config.driveEmail || 'twinginfobd@gmail.com',
      folderName: config.folderName || 'TWING_HISABI_DATABASE',
      hasCredentials,
      autoSyncMinutes: config.autoSyncMinutes || 10,
      lastSyncTime: config.lastSyncTime || null,
      lastSyncStatus: config.lastSyncStatus || 'idle',
      lastSyncMessage: config.lastSyncMessage || 'ড্রাইভ ব্যাকআপ প্রস্তুত',
      driveFileId: config.driveFileId || null,
      driveFolderId: config.driveFolderId || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'স্ট্যাটাস পেতে ব্যর্থ হয়েছে' });
  }
});

// 2. Save Google Drive Configuration
router.post('/config', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { isEnabled, driveEmail, folderName, serviceAccountKeyJson, autoSyncMinutes } = req.body;

    const updated = saveGoogleDriveConfig({
      isEnabled: isEnabled !== false,
      driveEmail: driveEmail ? driveEmail.trim() : 'twinginfobd@gmail.com',
      folderName: folderName ? folderName.trim() : 'TWING_HISABI_DATABASE',
      serviceAccountKeyJson: serviceAccountKeyJson !== undefined ? serviceAccountKeyJson : undefined,
      autoSyncMinutes: Number(autoSyncMinutes) || 10,
    });

    return res.json({
      success: true,
      message: '✅ গুগল ড্রাইভ ব্যাকআপ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
      config: {
        isEnabled: updated.isEnabled,
        driveEmail: updated.driveEmail,
        folderName: updated.folderName,
        autoSyncMinutes: updated.autoSyncMinutes,
        hasCredentials: Boolean(updated.serviceAccountKeyJson),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে' });
  }
});

// 3. Manually Trigger Immediate Upload / Sync to Google Drive
router.post('/sync-now', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await uploadDatabaseToDrive('manual_super_admin_trigger');
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'গুগল ড্রাইভে আপলোড ব্যর্থ হয়েছে' });
  }
});

// 4. Manually Trigger Restore from Google Drive
router.post('/restore-now', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await restoreDatabaseFromDrive();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'গুগল ড্রাইভ থেকে রিস্টোর ব্যর্থ হয়েছে' });
  }
});

export default router;
