import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeDatabaseSchema } from './server/db';
import authRoutes from './server/routes/authRoutes';
import customerRoutes from './server/routes/customerRoutes';
import transactionRoutes from './server/routes/transactionRoutes';
import expenseRoutes from './server/routes/expenseRoutes';
import storeRoutes from './server/routes/storeRoutes';
import subscriptionRoutes from './server/routes/subscriptionRoutes';
import supportRoutes from './server/routes/supportRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import adminRoutes from './server/routes/adminRoutes';
import smsRoutes from './server/routes/smsRoutes';
import productRoutes from './server/routes/productRoutes';
import publicStoreRoutes from './server/routes/publicStoreRoutes';
import mediaRoutes from './server/routes/mediaRoutes';
import { migrateDataToPostgres } from './server/migration';
import { requireSuperAdmin } from './server/authMiddleware';
import { SubscriptionEngine } from './server/services/subscriptionEngine';
import { wildcardCors, dynamicSubdomainMiddleware } from './server/middleware/subdomainMiddleware';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy (Render.com, Cloudflare, Nginx) for accurate Host, IP, and Protocol detection
  app.set('trust proxy', true);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Dynamic Wildcard CORS for *.twinghisabi.site, root domain & dev environments
  app.use(wildcardCors);
  app.use(dynamicSubdomainMiddleware);
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Request logger for API calls
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Twing Store Backend API',
      database: 'Neon PostgreSQL',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/sms', smsRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/public/store', publicStoreRoutes);
  app.use('/api/media', mediaRoutes);

  // Manual / Batch Migration Trigger
  app.post('/api/admin/migrate-from-backup', requireSuperAdmin, async (req, res) => {
    try {
      const data = req.body;
      const result = await migrateDataToPostgres(data);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SEO: Sitemap.xml & Robots.txt
  app.get('/sitemap.xml', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const rawHost = req.headers.host || 'twinghisabi.site';
    const isLocalOrDev = rawHost.includes('localhost') || rawHost.includes('.run.app') || rawHost.includes('127.0.0.1');
    const baseUrl = isLocalOrDev ? `${protocol}://${rawHost}` : 'https://twinghisabi.site';
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/register</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
  });

  app.get('/robots.txt', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const rawHost = req.headers.host || 'twinghisabi.site';
    const isLocalOrDev = rawHost.includes('localhost') || rawHost.includes('.run.app') || rawHost.includes('127.0.0.1');
    const baseUrl = isLocalOrDev ? `${protocol}://${rawHost}` : 'https://twinghisabi.site';

    const txt = `User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(txt);
  });

  // Global API 404 handler for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  // Vite middleware for frontend in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening immediately
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // Initialize DB schema & seeds in background without blocking server startup
    initializeDatabaseSchema()
      .then(() => {
        SubscriptionEngine.start();
      })
      .catch((err) => {
        console.error('⚠️ DB Initialization warning:', err);
        SubscriptionEngine.start();
      });
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
});
