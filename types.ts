export enum UserRole {
  MASTER = 'MASTER',
  USER = 'USER',
}

export interface User {
  uid: string; // Changed from id to uid to match Firebase Auth
  username: string; // This will now be an email
  role: UserRole;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
}

export interface UploadFile {
  name: string;
  type: string;
  size: number;
  url: string; // URL from Firebase Storage
  storagePath: string; // Path in Firebase Storage for deletion
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ReviewResult {
  report: string;
  sources: GroundingChunk[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  files?: UploadFile[];
}

export interface ReviewJob {
  id: string;
  userId: string;
  apiKeyId: string;
  apiKeyName: string; // for display
  manuscriptName: string;
  journalLevel: string;
  status: ReviewStatus;
  result?: ReviewResult;
  error?: string;
  createdAt: string;
  files: UploadFile[];
  chatHistory?: ChatMessage[];
  progressState?: string;
  progressPercentage?: number;
}
