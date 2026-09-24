import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { notifySearchEnginesOnProductPublish } from '../services/productSeoHelper';

const router = Router();

// Protect all product routes with user authentication
router.use(authenticateUser);

function mapRowToProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || 'সাধারণ',
    unit: row.unit || 'পিস',
    buyPrice: parseFloat(row.buy_price) || 0,
    salePrice: parseFloat(row.sale_price) || 0,
    stock: parseFloat(row.stock) || 0,
    minStockAlert: parseFloat(row.min_stock_alert) || 5,
    sku: row.sku || row.id,
    qrCode: row.qr_code || '',
    imageUrl: row.image_url || '',
    description: row.description || '',
    originalPrice: row.original_price ? parseFloat(row.original_price) : undefined,
    discountPercent: row.discount_percent ? parseFloat(row.discount_percent) : undefined,
    isPublishedOnline: row.is_published_online !== false,
    isListedOnMarketplace: row.is_listed_on_marketplace === true,
    rating: row.rating ? parseFloat(row.rating) : 5.0,
    reviewCount: row.review_count ? parseInt(row.review_count, 10) : 0,
    updatedAt: Number(row.updated_at),
  };
}

/**
 * GET /api/products - List all products for logged-in user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM products WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      const products = result.rows.map(mapRowToProduct);
      return res.json({ products });
    } else {
      const list = (inMemoryStore.products || [])
        .filter(p => p.userId === userId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return res.json({ products: list });
    }
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/products/by-code/:code - Find product by SKU or ID for scanning
 */
router.get('/by-code/:code', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.params;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });
    if (!code) return res.status(400).json({ error: 'কোড আবশ্যক' });

    const cleanCode = code.trim();
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        `SELECT * FROM products 
         WHERE user_id = $1 AND (id = $2 OR sku = $2 OR LOWER(sku) = LOWER($2))
         LIMIT 1`,
        [userId, cleanCode]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      }

      return res.json({ product: mapRowToProduct(result.rows[0]) });
    } else {
      const p = (inMemoryStore.products || []).find(
        x => x.userId === userId && (x.id === cleanCode || (x.sku && x.sku.toLowerCase() === cleanCode.toLowerCase()))
      );
      if (!p) return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      return res.json({ product: p });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/products - Create or Update a product
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const {
      id,
      name,
      category,
      unit,
      buyPrice,
      salePrice,
      stock,
      minStockAlert,
      sku,
      qrCode,
      imageUrl,
      description,
      originalPrice,
      discountPercent,
      isPublishedOnline,
      isListedOnMarketplace,
      rating,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'পণ্যের নাম আবশ্যক' });
    }

    const prodId = id || 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const assignedSku = sku ? sku.trim() : `PRD-${Date.now().toString().slice(-6)}`;
    const now = Date.now();

    const cleanBuy = parseFloat(buyPrice) || 0;
    const cleanSale = parseFloat(salePrice) || 0;
    const cleanStock = parseFloat(stock) || 0;
    const cleanAlert = parseFloat(minStockAlert) || 5;
    const cleanOriginal = originalPrice !== undefined && originalPrice !== null ? parseFloat(originalPrice) : null;
    const cleanDiscount = discountPercent !== undefined && discountPercent !== null ? parseFloat(discountPercent) : null;
    const cleanOnline = isPublishedOnline !== false;
    const cleanMarketplace = isListedOnMarketplace === true;
    const cleanRating = rating ? parseFloat(rating) : 5.0;

    const pool = getDbPool();
    if (pool) {
      const validUserId = await ensureUserExistsInPostgres(pool, userId, req.user);

      // Multi-tenant check: if product ID is provided, verify it does NOT belong to another tenant
      if (id) {
        const existingCheck = await pool.query('SELECT user_id FROM products WHERE id = $1', [id]);
        if (existingCheck.rows.length > 0 && existingCheck.rows[0].user_id !== validUserId) {
          return res.status(403).json({ error: 'অ্যাক্সেস অস্বীকৃত: আপনি অন্য ভেন্ডরের পণ্য পরিবর্তন করতে পারবেন না।' });
        }
      }

      await pool.query(`
        INSERT INTO products (
          id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code,
          image_url, description, original_price, discount_percent, is_published_online, is_listed_on_marketplace, rating, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          buy_price = EXCLUDED.buy_price,
          sale_price = EXCLUDED.sale_price,
          stock = EXCLUDED.stock,
          min_stock_alert = EXCLUDED.min_stock_alert,
          sku = EXCLUDED.sku,
          qr_code = EXCLUDED.qr_code,
          image_url = EXCLUDED.image_url,
          description = EXCLUDED.description,
          original_price = EXCLUDED.original_price,
          discount_percent = EXCLUDED.discount_percent,
          is_published_online = EXCLUDED.is_published_online,
          is_listed_on_marketplace = EXCLUDED.is_listed_on_marketplace,
          rating = EXCLUDED.rating,
          updated_at = EXCLUDED.updated_at
        WHERE products.user_id = EXCLUDED.user_id
      `, [
        prodId, validUserId, name.trim(), category || 'সাধারণ', unit || 'পিস',
        cleanBuy, cleanSale, cleanStock, cleanAlert, assignedSku, qrCode || '',
        imageUrl || '', description || '', cleanOriginal, cleanDiscount, cleanOnline, cleanMarketplace, cleanRating, now
      ]);
    } else {
      if (!inMemoryStore.products) inMemoryStore.products = [];

      if (id) {
        const memExisting = inMemoryStore.products.find(p => p.id === id);
        if (memExisting && memExisting.userId !== userId) {
          return res.status(403).json({ error: 'অ্যাক্সেস অস্বীকৃত: আপনি অন্য ভেন্ডরের পণ্য পরিবর্তন করতে পারবেন না।' });
        }
      }

      const idx = inMemoryStore.products.findIndex(p => p.id === prodId && p.userId === userId);
      const prodObj = {
        id: prodId,
        userId,
        name: name.trim(),
        category: category || 'সাধারণ',
        unit: unit || 'পিস',
        buyPrice: cleanBuy,
        salePrice: cleanSale,
        stock: cleanStock,
        minStockAlert: cleanAlert,
        sku: assignedSku,
        qrCode: qrCode || '',
        imageUrl: imageUrl || '',
        description: description || '',
        originalPrice: cleanOriginal ?? undefined,
        discountPercent: cleanDiscount ?? undefined,
        isPublishedOnline: cleanOnline,
        isListedOnMarketplace: cleanMarketplace,
        rating: cleanRating,
        updatedAt: now,
      };
      if (idx >= 0) inMemoryStore.products[idx] = prodObj;
      else inMemoryStore.products.unshift(prodObj);
    }

    const savedProduct = {
      id: prodId,
      name: name.trim(),
      category: category || 'সাধারণ',
      unit: unit || 'পিস',
      buyPrice: cleanBuy,
      salePrice: cleanSale,
      stock: cleanStock,
      minStockAlert: cleanAlert,
      sku: assignedSku,
      qrCode: qrCode || '',
      imageUrl: imageUrl || '',
      description: description || '',
      originalPrice: cleanOriginal ?? undefined,
      discountPercent: cleanDiscount ?? undefined,
      isPublishedOnline: cleanOnline,
      isListedOnMarketplace: cleanMarketplace,
      rating: cleanRating,
      updatedAt: now,
    };

    // If product is listed on Central Marketplace or published online, notify search engines immediately
    if (cleanMarketplace || cleanOnline) {
      notifySearchEnginesOnProductPublish(prodId, savedProduct.name).catch(() => {});
    }

    return res.json({ message: '✅ পণ্য সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে', product: savedProduct });
  } catch (err: any) {
    console.error('Error saving product:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/products/:id - Delete a product
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query('DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
      if (result.rows.length === 0) {
        const otherCheck = await pool.query('SELECT user_id FROM products WHERE id = $1', [id]);
        if (otherCheck.rows.length > 0) {
          return res.status(403).json({ error: 'অ্যাক্সেস অস্বীকৃত: আপনি অন্য ভেন্ডরের পণ্য মুছতে পারবেন না।' });
        }
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      }
    } else {
      if (inMemoryStore.products) {
        const existing = inMemoryStore.products.find(p => p.id === id);
        if (existing && existing.userId !== userId) {
          return res.status(403).json({ error: 'অ্যাক্সেস অস্বীকৃত: আপনি অন্য ভেন্ডরের পণ্য মুছতে পারবেন না।' });
        }
        inMemoryStore.products = inMemoryStore.products.filter(p => !(p.id === id && p.userId === userId));
      }
    }

    return res.json({ message: '✅ পণ্য মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/products/batch - Bulk save products for user
 */
router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { products } = req.body;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });
    if (!Array.isArray(products)) return res.status(400).json({ error: 'অবৈধ পণ্য তালিকা' });

    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const validUserId = await ensureUserExistsInPostgres(pool, userId, req.user);
      for (const p of products) {
        if (!p || !p.name) continue;
        const prodId = p.id || 'prod_' + Math.random().toString(36).substring(2, 8);
        const assignedSku = p.sku ? p.sku.trim() : `PRD-${Date.now().toString().slice(-6)}`;
        await pool.query(`
          INSERT INTO products (
            id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code,
            image_url, description, original_price, discount_percent, is_published_online, is_listed_on_marketplace, rating, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            buy_price = EXCLUDED.buy_price,
            sale_price = EXCLUDED.sale_price,
            stock = EXCLUDED.stock,
            min_stock_alert = EXCLUDED.min_stock_alert,
            sku = EXCLUDED.sku,
            qr_code = EXCLUDED.qr_code,
            image_url = CASE WHEN EXCLUDED.image_url IS NOT NULL AND EXCLUDED.image_url != '' THEN EXCLUDED.image_url ELSE products.image_url END,
            description = EXCLUDED.description,
            original_price = EXCLUDED.original_price,
            discount_percent = EXCLUDED.discount_percent,
            is_published_online = EXCLUDED.is_published_online,
            is_listed_on_marketplace = EXCLUDED.is_listed_on_marketplace,
            rating = EXCLUDED.rating,
            updated_at = EXCLUDED.updated_at
          WHERE products.user_id = EXCLUDED.user_id
        `, [
          prodId,
          validUserId,
          p.name.trim(),
          p.category || 'সাধারণ',
          p.unit || 'পিস',
          parseFloat(p.buyPrice) || 0,
          parseFloat(p.salePrice) || 0,
          parseFloat(p.stock) || 0,
          parseFloat(p.minStockAlert) || 5,
          assignedSku,
          p.qrCode || '',
          p.imageUrl || '',
          p.description || '',
          p.originalPrice !== undefined ? parseFloat(p.originalPrice) : null,
          p.discountPercent !== undefined ? parseFloat(p.discountPercent) : null,
          p.isPublishedOnline !== false,
          p.isListedOnMarketplace === true,
          p.rating ? parseFloat(p.rating) : 5.0,
          p.updatedAt || now,
        ]);
      }
    } else {
      if (!inMemoryStore.products) inMemoryStore.products = [];
      for (const p of products) {
        if (!p || !p.name) continue;
        const prodId = p.id || 'prod_' + Math.random().toString(36).substring(2, 8);
        const idx = inMemoryStore.products.findIndex(x => x.id === prodId && x.userId === userId);
        const item = {
          ...p,
          id: prodId,
          userId,
          sku: p.sku || `PRD-${Date.now().toString().slice(-6)}`,
          updatedAt: p.updatedAt || now,
        };
        if (idx >= 0) inMemoryStore.products[idx] = item;
        else inMemoryStore.products.push(item);
      }
    }

    return res.json({ message: `✅ ${products.length}টি পণ্য সফলভাবে সিঙ্ক হয়েছে` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
