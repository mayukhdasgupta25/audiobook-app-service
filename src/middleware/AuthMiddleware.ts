/**
 * Authentication Middleware
 * Verifies JWT tokens by fetching JWKS from the auth-service
 * Protects routes that require authentication
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import axios from 'axios';
import { config } from '../config/env';
import { JWKSResponse, JWK, JWTHeader } from '../types/auth';

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
      // 1. Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         res.status(401).json({
            success: false,
            message: 'Missing or invalid authorization header',
            details: 'Authorization header must be in format: Bearer <token>'
         });
         return;
      }

      const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix and trim
      // 2. Decode JWT header to get kid (key ID)
      let decodedHeader: JWTHeader;
      try {
         const decoded = jwt.decode(token, { complete: true });
         if (!decoded || !decoded.header) {
            res.status(401).json({
               success: false,
               message: 'Invalid token format',
               details: 'Token could not be decoded'
            });
            return;
         }
         decodedHeader = decoded.header as JWTHeader;
      } catch (decodeError: any) {
         res.status(401).json({
            success: false,
            message: 'Invalid token',
            details: `Token header could not be decoded: ${decodeError.message}`
         });
         return;
      }

      const kid = decodedHeader.kid?.trim();
      if (!kid) {
         res.status(401).json({
            success: false,
            message: 'Missing key ID in token header',
            details: 'Token header must contain a kid (key ID) field'
         });
         return;
      }

      // 3. Fetch JWKS from auth-service
      let jwks: JWKSResponse;
      try {
         const jwksResponse = await axios.get<JWKSResponse>(config.JWKS_ENDPOINT);
         jwks = jwksResponse.data;

         // Trim whitespace from all JWK values in the keys array
         jwks.keys.forEach(key => {
            if (key.n) key.n = key.n.trim();
            if (key.e) key.e = key.e.trim();
            if (key.kid) key.kid = key.kid.trim();
            if (key.kty) key.kty = key.kty.trim();
            if (key.use) key.use = key.use.trim();
            if (key.alg) key.alg = key.alg.trim();
         });
      } catch (fetchError: any) {
         // Handle axios errors with more detailed information
         if (axios.isAxiosError(fetchError)) {
            const statusCode = fetchError.response?.status || 500;
            const errorMessage = fetchError.response?.statusText || fetchError.message;
            res.status(statusCode).json({
               success: false,
               message: 'Failed to fetch JWKS from auth-service',
               details: `Auth service returned status ${statusCode}: ${errorMessage}`
            });
         } else {
            res.status(500).json({
               success: false,
               message: 'Failed to fetch JWKS from auth-service',
               details: `Unable to connect to authentication service: ${fetchError.message || 'Unknown error'}`
            });
         }
         return;
      }

      // 4. Find the matching key by kid
      const jwk = jwks.keys.find((k: JWK) => k.kid === kid);
      if (!jwk) {
         res.status(401).json({
            success: false,
            message: 'Key not found',
            details: `No matching key found for kid: ${kid}`
         });
         return;
      }

      // 5. Convert JWK to PEM format
      let publicKey: string;
      try {
         publicKey = jwkToPem(jwk);
      } catch (conversionError) {
         // console.error('Conversion error:', conversionError);
         res.status(500).json({
            success: false,
            message: 'Failed to convert JWK to PEM format',
            details: String(conversionError)
         });
         return;
      }

      // 6. Verify token signature
      try {
         jwt.verify(token, publicKey, { algorithms: ['RS256'] });
         console.log('Token verified successfully');
         next();
      } catch (verifyError: any) {
         // console.error('Verification error:', verifyError.name, verifyError.message);
         res.status(401).json({
            success: false,
            message: 'Invalid token signature',
            details: verifyError.name === 'TokenExpiredError' ? 'Token has expired' : 'Token verification failed'
         });
         return;
      }
   } catch (_error) {
      // Catch any unexpected errors
      // console.error('Authentication error:', error);
      res.status(500).json({
         success: false,
         message: 'Authentication error',
         details: 'An unexpected error occurred during authentication'
      });
   }
}

