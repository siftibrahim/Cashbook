import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StaffPermission } from '../src/types/adminTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'twing_pos_super_secure_jwt_secret_2026';

export interface AuthUserPayload {
  userId: string;
  email: string;
  name?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user' | 'staff';
  shopName?: string;
  permissions?: StaffPermission[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Verify user authentication token
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'লগইন টোকেন অনুপস্থিত বা অবৈধ। অনুগ্রহ করে পুনরায় লগইন করুন।' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।' });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware: Optional user authentication (doesn't reject if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

/**
 * Middleware: Require Admin or Staff
 */
export function requireAdminOrStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    const role = req.user?.role;
    if (role === 'super_admin' || role === 'admin' || role === 'staff') {
      return next();
    }
    return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন বা অনুমোদিত স্টাফদের এই এক্সেস রয়েছে।' });
  });
}

/**
 * Middleware: Require Super Admin
 */
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticateUser(req, res, () => {
    if (req.user?.role === 'super_admin') {
      return next();
    }
    return res.status(403).json({ error: 'এই অপশনটি শুধুমাত্র সুপার অ্যাডমিনের জন্য অনুমোদিত।' });
  });
}

/**
 * Middleware: Check specific staff permission
 */
export function requireStaffPermission(permission: StaffPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    authenticateUser(req, res, () => {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'অননুমোদিত অনুরোধ' });

      if (user.role === 'super_admin') {
        return next();
      }

      if (user.role === 'staff' && user.permissions && user.permissions.includes(permission)) {
        return next();
      }

      return res.status(403).json({ error: `আপনার এই কাজের জন্য প্রয়োজনীয় পারমিশন (${permission}) নেই।` });
    });
  };
}
