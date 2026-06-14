/**
 * Authentication Middleware
 * Verifies JWT tokens by fetching JWKS from the auth-service
 * Protects routes that require authentication
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import convertJwkToPem from 'jwk-to-pem';
import axios from 'axios';
import { config } from '../config/env';
import { JWKSResponse, JWK, JWTHeader, AuthenticatedRequest } from '../types/auth';
import { AuthRole } from '../constants/authRoles';

function extractAccessToken(req: Request): string | undefined {
   const authHeader = req.headers.authorization;
   const headerToken =
      authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
   const queryToken =
      typeof req.query['access_token'] === 'string' && req.query['access_token'].trim().length > 0
         ? req.query['access_token'].trim()
         : undefined;
   return headerToken ?? queryToken;
}

async function attachUserFromToken(req: Request, res: Response, token: string): Promise<boolean> {
   let decodedHeader: JWTHeader;
   try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header) {
         res.status(401).json({
            success: false,
            message: 'Invalid token format',
            details: 'Token could not be decoded',
         });
         return false;
      }
      decodedHeader = decoded.header as JWTHeader;
   } catch (decodeError: unknown) {
      const message = decodeError instanceof Error ? decodeError.message : 'Unknown error';
      res.status(401).json({
         success: false,
         message: 'Invalid token',
         details: `Token header could not be decoded: ${message}`,
      });
      return false;
   }

   const kid = decodedHeader.kid?.trim();
   if (!kid) {
      res.status(401).json({
         success: false,
         message: 'Missing key ID in token header',
         details: 'Token header must contain a kid (key ID) field',
      });
      return false;
   }

   let jwks: JWKSResponse;
   try {
      const jwksResponse = await axios.get<JWKSResponse>(config.JWKS_ENDPOINT);
      jwks = jwksResponse.data;

      jwks.keys.forEach((key) => {
         if (key.n) key.n = key.n.trim();
         if (key.e) key.e = key.e.trim();
         if (key.kid) key.kid = key.kid.trim();
         if (key.kty) key.kty = key.kty.trim();
         if (key.use) key.use = key.use.trim();
         if (key.alg) key.alg = key.alg.trim();
      });
   } catch (fetchError: unknown) {
      if (axios.isAxiosError(fetchError)) {
         const statusCode = fetchError.response?.status || 500;
         const errorMessage = fetchError.response?.statusText || fetchError.message;
         res.status(statusCode).json({
            success: false,
            message: 'Failed to fetch JWKS from auth-service',
            details: `Auth service returned status ${statusCode}: ${errorMessage}`,
         });
      } else {
         const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
         res.status(500).json({
            success: false,
            message: 'Failed to fetch JWKS from auth-service',
            details: `Unable to connect to authentication service: ${message}`,
         });
      }
      return false;
   }

   const jwk = jwks.keys.find((k: JWK) => k.kid === kid);
   if (!jwk) {
      res.status(401).json({
         success: false,
         message: 'Key not found',
         details: `No matching key found for kid: ${kid}`,
      });
      return false;
   }

   let publicKey: string;
   try {
      publicKey = convertJwkToPem(jwk as Parameters<typeof convertJwkToPem>[0]);
   } catch (conversionError) {
      res.status(500).json({
         success: false,
         message: 'Failed to convert JWK to PEM format',
         details: String(conversionError),
      });
      return false;
   }

   try {
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;

      const userId = decoded.sub || decoded['userId'] || decoded['id'];
      const email = decoded['email'];
      let role = decoded['role'];

      if (!role && userId) {
         try {
            const userInfo = await fetchUserInfoFromAuthService(token, userId);
            role = userInfo.role;
         } catch (fetchError: unknown) {
            const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
            console.error('Failed to fetch user info from auth service:', message);
            role = undefined;
         }
      }

      if (!userId) {
         res.status(401).json({
            success: false,
            message: 'Invalid token payload',
            details: 'Token does not contain user identifier',
         });
         return false;
      }

      (req as AuthenticatedRequest).user = {
         id: userId,
         email: email,
         role: role || AuthRole.LISTENER,
      };

      return true;
   } catch (verifyError: unknown) {
      const name = verifyError instanceof Error ? verifyError.name : 'Error';
      res.status(401).json({
         success: false,
         message: 'Invalid token signature',
         details: name === 'TokenExpiredError' ? 'Token has expired' : 'Token verification failed',
      });
      return false;
   }
}

/**
 * Authentication middleware to verify JWT tokens
 * Extracts token from Authorization header, fetches JWKS from auth-service,
 * and verifies the token signature
 */
export async function authenticateJWT(
   req: Request,
   res: Response,
   next: NextFunction
): Promise<void> {
   try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         res.status(401).json({
            success: false,
            message: 'Missing or invalid authorization header',
            details: 'Authorization header must be in format: Bearer <token>',
         });
         return;
      }

      const token = authHeader.substring(7).trim();
      const authenticated = await attachUserFromToken(req, res, token);
      if (authenticated) {
         next();
      }
   } catch (_error) {
      res.status(500).json({
         success: false,
         message: 'Authentication error',
         details: 'An unexpected error occurred during authentication',
      });
   }
}

/**
 * Authenticates SSE requests via Authorization header or ?access_token= query param.
 */
export async function authenticateJWTOrQuery(
   req: Request,
   res: Response,
   next: NextFunction,
): Promise<void> {
   try {
      const token = extractAccessToken(req);
      if (!token) {
         res.status(401).json({
            success: false,
            message: 'Access token required',
            details: 'Provide Authorization: Bearer <token> or ?access_token=<token>',
         });
         return;
      }

      const authenticated = await attachUserFromToken(req, res, token);
      if (authenticated) {
         next();
      }
   } catch (_error) {
      res.status(500).json({
         success: false,
         message: 'Authentication error',
         details: 'An unexpected error occurred during authentication',
      });
   }
}

/**
 * Fetch user information from auth service
 * This is called when role is not present in JWT token payload
 */
async function fetchUserInfoFromAuthService(token: string, userId: string): Promise<{ role: string }> {
   try {
      // Call auth service to get user info with role
      // Assuming endpoint: GET /auth/user or /auth/user/:userId
      const response = await axios.get(`${config.AUTH_SERVICE_URL}/auth/user/${userId}`, {
         headers: {
            Authorization: `Bearer ${token}`
         }
      });

      // Extract role from response
      // Adjust based on actual API response structure
      const role = response.data?.role || response.data?.data?.role;

      if (!role) {
         throw new Error('Role not found in auth service response');
      }

      return { role };
   } catch (error: any) {
      if (axios.isAxiosError(error)) {
         const statusCode = error.response?.status || 500;
         const errorMessage = error.response?.statusText || error.message;
         throw new Error(`Auth service returned status ${statusCode}: ${errorMessage}`);
      }
      throw error;
   }
}

