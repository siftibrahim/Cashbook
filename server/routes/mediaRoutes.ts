import express, { Response } from 'express';
import { getDbPool } from '../db';
import { authenticateUser, AuthenticatedRequest } from '../authMiddleware';

const router = express.Router();

// Fallback in-memory media cache for when database pool is not connected
const localMediaCache = new Map<string, { mimeType: string; data: string }>();

/**
 * POST /api/media/upload - Upload an image permanently to PostgreSQL or local storage
 */
router.post('/upload', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'অননুমোদিত অ্যাক্সেস' });
    }

    const { data, fileName, mimeType } = req.body;
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'ছবির ডাটা প্রদান করুন' });
    }

    // Determine mime type and pure base64
    let detectedMime = mimeType || 'image/jpeg';
    let base64Data = data;
    if (data.startsWith('data:')) {
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1];
        base64Data = match[2];
      }
    }

    const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sizeBytes = Math.round((base64Data.length * 3) / 4);
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(
        `INSERT INTO media_storage (id, user_id, mime_type, file_name, data, size_bytes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [mediaId, userId, detectedMime, fileName || 'upload.jpg', base64Data, sizeBytes, now]
      );
    } else {
      // Store in memory cache
      localMediaCache.set(mediaId, { mimeType: detectedMime, data: base64Data });
    }

    const permanentUrl = `/api/media/${mediaId}`;
    return res.json({
      success: true,
      mediaId,
      url: permanentUrl,
      sizeBytes,
    });
  } catch (err: any) {
    console.error('Media upload error:', err);
    return res.status(500).json({ error: 'ছবি আপলোড করতে ব্যর্থ হয়েছে: ' + (err?.message || err) });
  }
});

/**
 * GET /api/media/:id - Fetch permanently stored image
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();

    let mimeType = 'image/jpeg';
    let rawBase64 = '';

    if (pool) {
      const result = await pool.query(
        `SELECT mime_type, data FROM media_storage WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (result.rows.length > 0) {
        mimeType = result.rows[0].mime_type || 'image/jpeg';
        rawBase64 = result.rows[0].data;
      }
    }

    if (!rawBase64 && localMediaCache.has(id)) {
      const cached = localMediaCache.get(id)!;
      mimeType = cached.mimeType;
      rawBase64 = cached.data;
    }

    if (!rawBase64) {
      return res.status(404).send('Media not found');
    }

    const imageBuffer = Buffer.from(rawBase64, 'base64');

    res.setHeader('Content-Type', mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', imageBuffer.length);

    return res.send(imageBuffer);
  } catch (err: any) {
    console.error('Media fetch error:', err);
    return res.status(500).send('Error serving media');
  }
});

export default router;
