import axios, { AxiosError } from 'axios';
import { config } from '../config/env';

export interface AuthUserInfo {
   role: string;
   email: string;
}

export class AuthClient {
   private baseUrl: string;

   constructor(baseUrl: string = config.AUTH_SERVICE_URL) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
   }

   async getUserById(userId: string, accessToken: string): Promise<AuthUserInfo | null> {
      try {
         const response = await axios.get<{ role: string; email: string }>(
            `${this.baseUrl}/auth/user/${userId}`,
            {
               headers: { Authorization: `Bearer ${accessToken}` },
               timeout: 5000,
            },
         );

         const role = response.data?.role;
         const email = response.data?.email;

         if (!role || !email) {
            return null;
         }

         return { role, email };
      } catch (error) {
         if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
            return null;
         }
         console.error('AuthClient.getUserById failed:', error);
         throw error;
      }
   }
}

export const authClient = new AuthClient();
