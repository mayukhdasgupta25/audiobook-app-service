/**
 * Type definitions for author events and messages
 */

export interface AuthorCreationMessage {
   userId: string;
   firstName: string;
   lastName: string;
   address: string;
   contact?: string;
   profileImage?: string;
}
