/**
 * Role-Based Authorization Middleware
 * Provides role-based access control for protected routes
 */
import { Response, NextFunction } from 'express';
import { AuthRoleGroups, normalizeAuthRole } from '../constants/authRoles';
import { AuthenticatedRequest } from '../types/auth';

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
      const userRole = normalizeAuthRole(req.user.role);
      const normalizedAllowedRoles = allowedRoles.map(role => normalizeAuthRole(role));

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
   return requireRole([...AuthRoleGroups.ADMIN_ONLY]);
}

/**
 * Require User or Admin role
 * Convenience middleware for routes accessible to both users and admins
 */
export function requireUserOrAdmin() {
   return requireRole([...AuthRoleGroups.USER_ADMIN_AUTHOR]);
}
