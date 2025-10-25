/**
 * Session type extensions for Express
 * Extends the default session interface with custom properties
 */
import 'express-session';

declare module 'express-session' {
   interface SessionData {
      userId?: string;
      email?: string;
      username?: string;
      createdAt?: Date;
      lastAccessed?: Date;
      isAdmin?: boolean;
      csrfToken?: string;
   }
}

// Export empty object to make this a module
export { };
