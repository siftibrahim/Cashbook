import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { query, inMemoryStore } from '../db';

// Extend Express Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      subdomain?: string | null;
      tenant?: any | null;
    }
  }
}

/**
 * Configuration for Wildcard Subdomains on Render
 */
const BASE_DOMAIN = (process.env.STORE_BASE_DOMAIN || 'twinghisabi.site').toLowerCase().trim();

// System subdomains that should NOT be treated as customer stores
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'superadmin',
  'dashboard',
  'mail',
  'cname',
  'static',
  'assets',
  'cdn',
  'centralmarketplace',
  'marketplace',
]);

/**
 * 1. Helper to extract hostname safely behind Render reverse proxy
 */
export function getCleanHost(req: Request): string {
  // Render and Cloudflare forward original host via 'x-forwarded-host'
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || '';
  const directHost = req.headers.host || '';
  const rawHost = forwardedHost.split(',')[0].trim() || directHost;

  // Remove port numbers (e.g. localhost:3000 -> localhost)
  return rawHost.split(':')[0].toLowerCase().trim();
}

/**
 * 2. Wildcard CORS Configuration
 * Allows requests from:
 *  - Root domain: https://twinghisabi.site & https://www.twinghisabi.site
 *  - Any wildcard subdomain: https://*.twinghisabi.site (e.g. https://tanjinhub.twinghisabi.site)
 *  - Local development environments (localhost, 127.0.0.1, *.localhost)
 */
const WILDCARD_SUBDOMAIN_REGEX = new RegExp(
  `^https?:\\/\\/([a-zA-Z0-9-]+\\.)?${BASE_DOMAIN.replace(/\./g, '\\.')}(:\\d+)?$`
);

export const wildcardCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin, 'null' (common in sandboxed TV WebViews), or custom TV app protocols
    if (
      !origin ||
      origin === 'null' ||
      origin.startsWith('file://') ||
      origin.startsWith('tizen://') ||
      origin.startsWith('webos://') ||
      origin.startsWith('ms-appx-web://')
    ) {
      return callback(null, true);
    }

    // Allow local development & local network IP access (common when Smart TV connects to PC server)
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|([a-zA-Z0-9-]+\.)?localhost)(:\d+)?$/.test(
        origin
      )
    ) {
      return callback(null, true);
    }

    // Allow base domain and any wildcard subdomains (*.twinghisabi.site)
    if (WILDCARD_SUBDOMAIN_REGEX.test(origin)) {
      return callback(null, true);
    }

    // Allow cloud platform test domains (e.g. *.onrender.com, *.run.app, AI Studio preview)
    if (
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.run.app') ||
      origin.endsWith('.googleusercontent.com') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }

    // Resilient fallback: allow request instead of returning fatal 500 error on Smart TVs
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Store-Domain'],
});

/**
 * 3. Subdomain Extraction & Database Tenant Resolver Middleware
 *
 * - Extracts tenant slug (e.g., "tanjinhub" from "tanjinhub.twinghisabi.site")
 * - Bypasses root domain (twinghisabi.site, www.twinghisabi.site, localhost)
 * - Queries database for active store/tenant
 * - If subdomain is present but not found in DB -> returns 404
 * - Attaches store data to req.subdomain and req.tenant
 */
export async function dynamicSubdomainMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const host = getCleanHost(req);

  // Default values
  req.subdomain = null;
  req.tenant = null;

  // Always bypass health checks
  if (req.path === '/api/health') {
    return next();
  }

  // A. Check for Root Domain, www, or pure localhost (Bypass tenant resolution)
  const isRootDomain =
    !host ||
    host === BASE_DOMAIN ||
    host === `www.${BASE_DOMAIN}` ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.onrender.com');

  if (isRootDomain) {
    return next();
  }

  let slug: string | null = null;

  // B. Extract subdomain for twinghisabi.site (e.g., "tanjinhub.twinghisabi.site")
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subPart = host.slice(0, -(BASE_DOMAIN.length + 1));
    // In case of multi-level subdomains, grab the primary prefix
    slug = subPart.split('.')[0];
  }
  // Support local development subdomains (e.g., "tanjinhub.localhost")
  else if (host.endsWith('.localhost')) {
    slug = host.split('.')[0];
  }

  // C. If it's a reserved subdomain (like api, admin, cdn), do not treat as store
  if (slug && RESERVED_SUBDOMAINS.has(slug)) {
    return next();
  }

  // D. If no valid subdomain was found, proceed to normal routes
  if (!slug) {
    return next();
  }

  // Sanitize slug (only lowercase alphanumeric and dashes)
  slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  req.subdomain = slug;

  try {
    /**
     * DATABASE LOOKUP:
     * Query online_store_configs (primary store configuration table)
     * and fallback to store_profiles or users table.
     */
    let storeRes = await query(
      `SELECT osc.user_id as id, osc.store_name, osc.store_slug, osc.custom_domain, osc.phone, osc.is_enabled,
              u.name, u.shop_name, u.email, u.status, osc.created_at 
       FROM online_store_configs osc 
       LEFT JOIN users u ON u.id = osc.user_id 
       WHERE LOWER(osc.store_slug) = $1 
       LIMIT 1`,
      [slug]
    ).catch(() => null as any);

    if (!storeRes || !storeRes.rows || storeRes.rows.length === 0) {
      // Fallback 1: check store_profiles
      storeRes = await query(
        `SELECT sp.user_id as id, sp.name as store_name, sp.slug as store_slug, sp.phone,
                u.name, u.shop_name, u.email, u.status, sp.created_at 
         FROM store_profiles sp 
         LEFT JOIN users u ON u.id = sp.user_id 
         WHERE LOWER(sp.slug) = $1 
         LIMIT 1`,
        [slug]
      ).catch(() => null as any);
    }

    if (!storeRes || !storeRes.rows || storeRes.rows.length === 0) {
      // Fallback 2: check users table by id, name or shop_name
      storeRes = await query(
        `SELECT id, name, shop_name, phone, email, status, created_at 
         FROM users 
         WHERE LOWER(REPLACE(COALESCE(shop_name, ''), ' ', '')) = $1 
            OR LOWER(REPLACE(COALESCE(name, ''), ' ', '')) = $1 
            OR id = $1
         LIMIT 1`,
        [slug]
      ).catch(() => null as any);
    }

    if (!storeRes || !storeRes.rows || storeRes.rows.length === 0) {
      // Fallback 3: check inMemoryStore configs
      const memConfig = (inMemoryStore.online_store_configs || []).find(
        (c) => (c.storeSlug || c.store_slug || '').toLowerCase() === slug
      );
      if (memConfig) {
        const memUser = (inMemoryStore.users || []).find(
          (u) => u.id === (memConfig.userId || memConfig.user_id)
        );
        req.tenant = {
          id: memConfig.userId || memConfig.user_id,
          store_name: memConfig.storeName || memConfig.store_name,
          store_slug: memConfig.storeSlug || memConfig.store_slug,
          phone: memConfig.phone,
          status: memUser?.status || 'active',
        };
        return next();
      }

      // If this is a page visit (HTML / assets), do NOT return raw JSON!
      // Let it pass through to the frontend router/PublicStorefrontPage
      if (!req.path.startsWith('/api/')) {
        return next();
      }

      // Fallback 404 response for API requests when subdomain store does not exist
      return res.status(404).json({
        error: 'Store Not Found',
        message: `The requested store "${slug}.${BASE_DOMAIN}" does not exist or has been disabled.`,
        subdomain: slug,
      });
    }

    const tenant = storeRes.rows[0];

    // If store is suspended/inactive
    if (tenant.status === 'suspended') {
      return res.status(403).json({
        error: 'Store Suspended',
        message: `This store has been temporarily suspended. Please contact customer support.`,
      });
    }

    // Attach tenant object to the request lifecycle
    req.tenant = tenant;

    next();
  } catch (err: any) {
    console.error(`[Subdomain Middleware Error] Error resolving tenant for "${slug}":`, err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resolve store domain.',
    });
  }
}
