import type { Timestamp } from 'firebase/firestore';

export type Segment = 'sales' | 'operations' | 'both';
export type TrackSegment = 'sales' | 'operations';

export const BLUEPRINT_LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  DRIVE_URL_MAX: 500,
  DRIVE_FILE_ID_MAX: 128,
  EMAIL_MAX: 254,
  DISPLAY_NAME_MAX: 120,
  MAX_QUESTIONS: 50,
  QUESTION_MAX: 500,
  OPTION_MAX: 300,
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
} as const;

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
}

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  driveUrl: string;
  driveFileId: string;
  segment: Segment;
  orderIndex: number;
  passingScore: number;
  questions: QuizQuestion[];
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TeamAccessRecord {
  email: string;
  displayName?: string;
  operationsAccess: boolean;
  salesAccess: boolean;
  updatedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface AdminUserRecord {
  email: string;
  addedBy: string;
  createdAt: Timestamp | null;
}

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  acceptedLegalAt?: Timestamp | null;
  acceptedLegalVersion?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserVideoProgress {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  videoId: string;
  segment: Segment;
  viewCount: number;
  watchSeconds: number;
  attempts: number;
  bestScore: number;
  lastScore: number;
  passed: boolean;
  completedAt?: Timestamp | null;
  lastAccessedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type EngagementEventType =
  | 'video_open'
  | 'watch_heartbeat'
  | 'quiz_submit'
  | 'quiz_pass';

export interface EngagementEvent {
  id: string;
  uid: string;
  userEmail: string;
  videoId: string;
  videoTitle: string;
  segment: Segment;
  eventType: EngagementEventType;
  score: number;
  watchSecondsDelta: number;
  createdAt: Timestamp | null;
}

export interface AuthAccessState {
  isAdmin: boolean;
  operationsAccess: boolean;
  salesAccess: boolean;
}
