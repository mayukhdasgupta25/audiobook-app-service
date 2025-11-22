/**
 * Role-Based Authorization Middleware
 * Provides role-based access control for protected routes
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Normalize role string for comparison (case-insensitive)
 */
function normalizeRole(role: string | undefined): string {
   if (!role) return '';
   return role.trim().toLowerCase();
}

/**
 * Check if user has one of the allowed roles
 * @param allowedRoles Array of allowed role names (case-insensitive)
 */
export function requireRole(allowedRoles: string[]) {
   return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      // Check if user is authenticated
      if (!req.user) {
         res.status(401).json({
            success: false,
            message: 'Authentication required',
            details: 'User must be authenticated to access this resource'
         });
         return;
      }

      // Normalize roles for comparison
      const userRole = normalizeRole(req.user.role);
      const normalizedAllowedRoles = allowedRoles.map(role => normalizeRole(role));

      // Check if user role is in allowed roles
      if (!normalizedAllowedRoles.includes(userRole)) {
         res.status(403).json({
            success: false,
            message: 'Access forbidden',
            details: `${allowedRoles.join(', ')} access only.`
         });
         return;
      }

      next();
   };
}

/**
 * Require Admin role only
 * Convenience middleware for admin-only routes
 */
export function requireAdmin() {
   return requireRole(['ADMIN']);
}

/**
 * Require User or Admin role
 * Convenience middleware for routes accessible to both users and admins
 */
export function requireUserOrAdmin() {
   return requireRole(['USER', 'ADMIN']);
}

