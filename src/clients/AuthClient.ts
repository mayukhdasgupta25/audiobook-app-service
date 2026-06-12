import axios, { AxiosError } from 'axios';
import { config } from '../config/env';

export interface AuthUserInfo {
   role: string;
   email: string;
}

export interface AuthAuthorInfo {
   id: string;
   slug: string;
   userId: string;
}

export interface AuthMembershipInfo {
   role: string;
}

export class AuthClient {
   private baseUrl: string;

   constructor(baseUrl: string = config.AUTH_SERVICE_URL) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
   }

   private authHeaders(accessToken: string): { Authorization: string } {
      return { Authorization: `Bearer ${accessToken}` };
   }

   async getUserById(userId: string, accessToken: string): Promise<AuthUserInfo | null> {
      try {
         const response = await axios.get<{ role: string; email: string }>(
            `${this.baseUrl}/auth/user/${userId}`,
            {
               headers: this.authHeaders(accessToken),
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

   async getAuthorByUserId(userId: string, accessToken: string): Promise<AuthAuthorInfo | null> {
      try {
         const response = await axios.get<{ author: AuthAuthorInfo }>(
            `${this.baseUrl}/auth/authors/me`,
            {
               headers: this.authHeaders(accessToken),
               timeout: 5000,
            },
         );

         const author = response.data?.author;
         if (!author?.id || author.userId !== userId) {
            return null;
         }

         return author;
      } catch (error) {
         if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
            return null;
         }
         console.error('AuthClient.getAuthorByUserId failed:', error);
         throw error;
      }
   }

   async getMembership(
      organizationId: string,
      accessToken: string,
   ): Promise<AuthMembershipInfo | null> {
      try {
         const response = await axios.get<{ membership: { role: string } }>(
            `${this.baseUrl}/auth/organizations/${organizationId}/members/me`,
            {
               headers: this.authHeaders(accessToken),
               timeout: 5000,
            },
         );

         const role = response.data?.membership?.role;
         if (!role) {
            return null;
         }

         return { role };
      } catch (error) {
         if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
            return null;
         }
         console.error('AuthClient.getMembership failed:', error);
         throw error;
      }
   }

   async isAuthorLinkedToOrganization(
      authorId: string,
      organizationId: string,
      accessToken: string,
   ): Promise<boolean> {
      try {
         const response = await axios.get<{ linked: boolean }>(
            `${this.baseUrl}/auth/authors/${authorId}/organizations/${organizationId}/link`,
            {
               headers: this.authHeaders(accessToken),
               timeout: 5000,
            },
         );
         return Boolean(response.data?.linked);
      } catch (error) {
         if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
            return false;
         }
         console.error('AuthClient.isAuthorLinkedToOrganization failed:', error);
         throw error;
      }
   }
}

export const authClient = new AuthClient();
