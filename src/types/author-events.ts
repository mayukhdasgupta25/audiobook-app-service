/**
 * Author profile events from auth-service
 */
export interface AuthorCreationMessage {
   authorId: string;
   avatar?: string;
}

export interface AuthorDeletionMessage {
   authorId: string;
   userId: string;
}
