import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { query } from '../db';

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
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow local development
    if (/^https?:\/\/(localhost|127\.0\.0\.1|([a-zA-Z0-9-]+\.)?localhost)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Allow base domain and any wildcard subdomains (*.twinghisabi.site)
    if (WILDCARD_SUBDOMAIN_REGEX.test(origin)) {
      return callback(null, true);
    }

    // Allow cloud platform test domains (e.g. *.onrender.com, *.run.app)
    if (origin.endsWith('.onrender.com') || origin.endsWith('.run.app')) {
      return callback(null, true);
    }

    // Block disallowed origins
    callback(new Error(`CORS policy: Origin ${origin} not allowed`));
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
     * Query your database for this tenant/store.
     * Replace this query with your ORM (e.g., Prisma, Mongoose, Drizzle, TypeORM, or pg pool).
     */
    const storeRes = await query(
      `SELECT id, name, shop_name, phone, email, store_slug, custom_domain, status, created_at 
       FROM users 
       WHERE store_slug = $1 
       LIMIT 1`,
      [slug]
    );

    if (!storeRes || !storeRes.rows || storeRes.rows.length === 0) {
      // 5. Fallback 404 response when subdomain store does not exist
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
