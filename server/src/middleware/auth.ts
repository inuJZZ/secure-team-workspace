import type { NextFunction, Request, Response } from 'express';
import { verifyJwt } from '../utils/security.js';
import { memberships, users } from '../db/memory.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  orgId?: string;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const token = authorization.replace('Bearer ', '');
    const payload = verifyJwt(token) as { userId: string };
    const user = users.find((entry) => entry.id === payload.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireOrgMembership = (requiredRole?: 'admin' | 'member') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const orgId = req.params.orgId;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization id required.' });
    }

    const membership = memberships.find((entry) => entry.userId === req.user!.id && entry.orgId === orgId);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this organization.' });
    }

    const hasRequiredRole = requiredRole === 'member'
      ? membership.role === 'member' || membership.role === 'admin'
      : membership.role === 'admin';

    if (!hasRequiredRole) {
      return res.status(403).json({ error: `This action requires ${requiredRole} permissions.` });
    }

    req.orgId = orgId;
    next();
  };
};
