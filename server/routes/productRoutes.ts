import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();

// Protect all product routes with user authentication
router.use(authenticateUser);

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
      const products = result.rows.map(row => ({
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
        updatedAt: Number(row.updated_at),
      }));
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

      const row = result.rows[0];
      const product = {
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
        updatedAt: Number(row.updated_at),
      };
      return res.json({ product });
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

    const { id, name, category, unit, buyPrice, salePrice, stock, minStockAlert, sku, qrCode } = req.body;

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

    const pool = getDbPool();
    if (pool) {
      const validUserId = await ensureUserExistsInPostgres(pool, userId, req.user);
      try {
        await pool.query(`
          INSERT INTO products (
            id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
            updated_at = EXCLUDED.updated_at
        `, [
          prodId, validUserId, name.trim(), category || 'সাধারণ', unit || 'পিস',
          cleanBuy, cleanSale, cleanStock, cleanAlert, assignedSku, qrCode || '', now
        ]);
      } catch (insertErr: any) {
        if (insertErr?.message?.includes('products_user_id_fkey') || insertErr?.code === '23503') {
          console.warn('⚠️ Foreign key constraint caught on products, auto-dropping constraint and retrying...');
          await pool.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;');
          await pool.query(`
            INSERT INTO products (
              id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
              updated_at = EXCLUDED.updated_at
          `, [
            prodId, validUserId, name.trim(), category || 'সাধারণ', unit || 'পিস',
            cleanBuy, cleanSale, cleanStock, cleanAlert, assignedSku, qrCode || '', now
          ]);
        } else {
          throw insertErr;
        }
      }
    } else {
      if (!inMemoryStore.products) inMemoryStore.products = [];
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
      updatedAt: now,
    };

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
      await pool.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [id, userId]);
    } else {
      if (inMemoryStore.products) {
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
      try {
        for (const p of products) {
          if (!p || !p.name) continue;
          const prodId = p.id || 'prod_' + Math.random().toString(36).substring(2, 8);
          const assignedSku = p.sku ? p.sku.trim() : `PRD-${Date.now().toString().slice(-6)}`;
          await pool.query(`
            INSERT INTO products (
              id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
              updated_at = EXCLUDED.updated_at
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
            p.updatedAt || now,
          ]);
        }
      } catch (batchErr: any) {
        if (batchErr?.message?.includes('products_user_id_fkey') || batchErr?.code === '23503') {
          console.warn('⚠️ Foreign key constraint caught on products batch, auto-dropping constraint and retrying...');
          await pool.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;');
          for (const p of products) {
            if (!p || !p.name) continue;
            const prodId = p.id || 'prod_' + Math.random().toString(36).substring(2, 8);
            const assignedSku = p.sku ? p.sku.trim() : `PRD-${Date.now().toString().slice(-6)}`;
            await pool.query(`
              INSERT INTO products (
                id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
                updated_at = EXCLUDED.updated_at
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
              p.updatedAt || now,
            ]);
          }
        } else {
          throw batchErr;
        }
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
