import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  BOOTSTRAP_ADMIN_EMAILS,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  BLUEPRINT_LIMITS,
  type AccessRequestRecord,
  type AccessRequestStatus,
  type AdminUserRecord,
  type AuthAccessState,
  type EngagementEvent,
  type LoginAccessRole,
  type LoginLogRecord,
  type LoginStatus,
  type OnboardingStage,
  type QuizQuestion,
  type Segment,
  type TeamAccessRecord,
  type TrackSegment,
  type TrainingVideo,
  type UserVideoProgress,
} from '../types';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, BLUEPRINT_LIMITS.EMAIL_MAX);
}

export function isValidEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  return (
    norm.length >= 5 &&
    norm.length <= BLUEPRINT_LIMITS.EMAIL_MAX &&
    BLUEPRINT_LIMITS.EMAIL_PATTERN.test(norm)
  );
}

export const LEGAL_POLICY_VERSION = '2026-11-19-racforge';

export function sortTrainingVideos(items: TrainingVideo[]): TrainingVideo[] {
  return [...items].sort((a, b) => {
    const aStageRank = a.onboardingStage === 'post_onboarding' ? 1 : 0;
    const bStageRank = b.onboardingStage === 'post_onboarding' ? 1 : 0;
    if (aStageRank !== bStageRank) return aStageRank - bStageRank;
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    const aSec = a.createdAt?.seconds ?? 0;
    const bSec = b.createdAt?.seconds ?? 0;
    return aSec - bSec;
  });
}

function mapVideoDoc(d: QueryDocumentSnapshot): TrainingVideo {
  const data = d.data();
  const stage: OnboardingStage =
    data.onboardingStage === 'post_onboarding' ? 'post_onboarding' : 'pre_onboarding';
  return {
    id: d.id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    driveUrl: String(data.driveUrl ?? ''),
    driveFileId: String(data.driveFileId ?? ''),
    segment: (data.segment as Segment) ?? 'operations',
    onboardingStage: stage,
    customEmails: Array.isArray(data.customEmails)
      ? data.customEmails.map((e: unknown) => normalizeEmail(String(e))).filter(Boolean)
      : [],
    orderIndex: Number(data.orderIndex ?? 0),
    passingScore: Number(data.passingScore ?? 70),
    questions: Array.isArray(data.questions) ? (data.questions as QuizQuestion[]) : [],
    createdBy: String(data.createdBy ?? ''),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function syncSignedInUserProfile(
  user: User,
  recordAcceptanceNow = false,
): Promise<{ hasAcceptedLegal: boolean }> {
  if (!user.email) return { hasAcceptedLegal: false };
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const safeName = (user.displayName ?? '').trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  const safePhoto = (user.photoURL ?? '').trim().slice(0, 500);
  const email = normalizeEmail(user.email);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { acceptedLegalAt?: unknown; acceptedLegalVersion?: string };
      const alreadyAccepted = Boolean(
        data.acceptedLegalAt && data.acceptedLegalVersion === LEGAL_POLICY_VERSION,
      );
      const updatePayload: Record<string, unknown> = {
        displayName: safeName,
        photoURL: safePhoto,
        updatedAt: serverTimestamp(),
      };
      if (!alreadyAccepted && recordAcceptanceNow) {
        updatePayload.acceptedLegalAt = serverTimestamp();
        updatePayload.acceptedLegalVersion = LEGAL_POLICY_VERSION;
      }
      await updateDoc(ref, updatePayload);
      return { hasAcceptedLegal: alreadyAccepted || recordAcceptanceNow };
    } else {
      const createPayload: Record<string, unknown> = {
        uid: user.uid,
        email,
        displayName: safeName,
        photoURL: safePhoto,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (recordAcceptanceNow) {
        createPayload.acceptedLegalAt = serverTimestamp();
        createPayload.acceptedLegalVersion = LEGAL_POLICY_VERSION;
      }
      await setDoc(ref, createPayload);
      return { hasAcceptedLegal: recordAcceptanceNow };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordLegalAcceptance(user: User): Promise<void> {
  if (!user.email) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    await updateDoc(ref, {
      acceptedLegalAt: serverTimestamp(),
      acceptedLegalVersion: LEGAL_POLICY_VERSION,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveUserAccess(user: User): Promise<AuthAccessState> {
  if (!user.email || !user.emailVerified) {
    return {
      isAdmin: false,
      operationsAccess: false,
      salesAccess: false,
      customAccess: false,
    };
  }
  const email = normalizeEmail(user.email);
  let isAdmin = (BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(email);

  if (!isAdmin) {
    const adminPath = `admins/${email}`;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', email));
      isAdmin = adminSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, adminPath);
    }
  }

  let operationsAccess = false;
  let salesAccess = false;
  let customAccess = false;
  const accessPath = `teamAccess/${email}`;
  try {
    const accessSnap = await getDoc(doc(db, 'teamAccess', email));
    if (accessSnap.exists()) {
      const data = accessSnap.data() as Partial<TeamAccessRecord>;
      operationsAccess = Boolean(data.operationsAccess);
      salesAccess = Boolean(data.salesAccess);
      customAccess = Boolean(data.customAccess);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, accessPath);
  }

  // Also check if the user has been directly assigned to any specific custom audience videos
  if (!customAccess && !isAdmin) {
    try {
      const directSnap = await getDocs(
        query(collection(db, 'videos'), where('customEmails', 'array-contains', email)),
      );
      if (!directSnap.empty) {
        customAccess = true;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    }
  }

  return { isAdmin, operationsAccess, salesAccess, customAccess };
}

export function subscribeTrainingVideos(
  access: AuthAccessState,
  userEmail: string,
  onData: (videos: TrainingVideo[]) => void,
): Unsubscribe {
  const colRef = collection(db, 'videos');

  if (access.isAdmin) {
    return onSnapshot(
      query(colRef),
      (snapshot) => {
        onData(sortTrainingVideos(snapshot.docs.map(mapVideoDoc)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'videos');
      },
    );
  }

  const allowedSegments: Segment[] = [];
  if (access.operationsAccess) allowedSegments.push('operations');
  if (access.salesAccess) allowedSegments.push('sales');
  if (access.operationsAccess || access.salesAccess) allowedSegments.push('both');
  if (access.customAccess) allowedSegments.push('custom');

  const normEmail = normalizeEmail(userEmail);
  let segmentVideos: TrainingVideo[] = [];
  let directCustomVideos: TrainingVideo[] = [];

  const emitMerged = () => {
    const map = new Map<string, TrainingVideo>();
    segmentVideos.forEach((v) => map.set(v.id, v));
    directCustomVideos.forEach((v) => map.set(v.id, v));
    onData(sortTrainingVideos(Array.from(map.values())));
  };

  const unsubs: Unsubscribe[] = [];

  if (allowedSegments.length > 0) {
    const segQuery = query(colRef, where('segment', 'in', allowedSegments));
    unsubs.push(
      onSnapshot(
        segQuery,
        (snapshot) => {
          segmentVideos = snapshot.docs.map(mapVideoDoc);
          emitMerged();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'videos');
        },
      ),
    );
  }

  if (normEmail) {
    const directQuery = query(colRef, where('customEmails', 'array-contains', normEmail));
    unsubs.push(
      onSnapshot(
        directQuery,
        (snapshot) => {
          directCustomVideos = snapshot.docs.map(mapVideoDoc);
          emitMerged();
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'videos');
        },
      ),
    );
  }

  if (unsubs.length === 0) {
    onData([]);
    return () => {};
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function subscribeUserProgress(
  uid: string,
  onData: (progressMap: Record<string, UserVideoProgress>) => void,
): Unsubscribe {
  const q = query(collection(db, 'progress'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const map: Record<string, UserVideoProgress> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const rec: UserVideoProgress = {
          id: d.id,
          uid: String(data.uid ?? ''),
          userEmail: String(data.userEmail ?? ''),
          userName: String(data.userName ?? ''),
          videoId: String(data.videoId ?? ''),
          segment: (data.segment as Segment) ?? 'operations',
          viewCount: Number(data.viewCount ?? 0),
          watchSeconds: Number(data.watchSeconds ?? 0),
          attempts: Number(data.attempts ?? 0),
          bestScore: Number(data.bestScore ?? 0),
          lastScore: Number(data.lastScore ?? 0),
          passed: Boolean(data.passed),
          completedAt: data.completedAt ?? null,
          lastAccessedAt: data.lastAccessedAt ?? null,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
        map[rec.videoId] = rec;
      });
      onData(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'progress');
    },
  );
}

export function subscribeTeamAccessList(
  onData: (records: TeamAccessRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'teamAccess'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TeamAccessRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          email: String(data.email ?? d.id),
          displayName: data.displayName ? String(data.displayName) : '',
          operationsAccess: Boolean(data.operationsAccess),
          salesAccess: Boolean(data.salesAccess),
          customAccess: Boolean(data.customAccess),
          updatedBy: String(data.updatedBy ?? ''),
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teamAccess');
    },
  );
}

export function subscribeAdminsList(
  onData: (records: AdminUserRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'admins'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdminUserRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          email: String(data.email ?? d.id),
          addedBy: String(data.addedBy ?? ''),
          createdAt: data.createdAt ?? null,
        };
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
    },
  );
}

export function subscribeAllProgress(
  onData: (records: UserVideoProgress[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'progress'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserVideoProgress[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: String(data.uid ?? ''),
          userEmail: String(data.userEmail ?? ''),
          userName: String(data.userName ?? ''),
          videoId: String(data.videoId ?? ''),
          segment: (data.segment as Segment) ?? 'operations',
          viewCount: Number(data.viewCount ?? 0),
          watchSeconds: Number(data.watchSeconds ?? 0),
          attempts: Number(data.attempts ?? 0),
          bestScore: Number(data.bestScore ?? 0),
          lastScore: Number(data.lastScore ?? 0),
          passed: Boolean(data.passed),
          completedAt: data.completedAt ?? null,
          lastAccessedAt: data.lastAccessedAt ?? null,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'progress');
    },
  );
}

export function subscribeEngagementEvents(
  onData: (events: EngagementEvent[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'engagementEvents'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: EngagementEvent[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: String(data.uid ?? ''),
          userEmail: String(data.userEmail ?? ''),
          videoId: String(data.videoId ?? ''),
          videoTitle: String(data.videoTitle ?? ''),
          segment: (data.segment as Segment) ?? 'operations',
          eventType: data.eventType,
          score: Number(data.score ?? 0),
          watchSecondsDelta: Number(data.watchSecondsDelta ?? 0),
          createdAt: data.createdAt ?? null,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'engagementEvents');
    },
  );
}

export async function grantTeamAccessEmails(
  rawEmails: string[],
  team: TrackSegment,
  adminUid: string,
): Promise<{ added: string[]; invalid: string[] }> {
  const added: string[] = [];
  const invalid: string[] = [];

  const fieldName =
    team === 'operations'
      ? 'operationsAccess'
      : team === 'sales'
        ? 'salesAccess'
        : 'customAccess';

  for (const raw of rawEmails) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    if (!isValidEmail(email)) {
      invalid.push(raw.trim());
      continue;
    }

    const path = `teamAccess/${email}`;
    const ref = doc(db, 'teamAccess', email);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          [fieldName]: true,
          updatedBy: adminUid,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          email,
          displayName: '',
          operationsAccess: team === 'operations',
          salesAccess: team === 'sales',
          customAccess: team === 'custom',
          updatedBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      added.push(email);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  return { added, invalid };
}

export async function revokeTeamAccessEmail(
  emailInput: string,
  team: TrackSegment,
  adminUid: string,
): Promise<void> {
  const email = normalizeEmail(emailInput);
  const path = `teamAccess/${email}`;
  const ref = doc(db, 'teamAccess', email);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const current = snap.data() as Partial<TeamAccessRecord>;
    const nextOps = team === 'operations' ? false : Boolean(current.operationsAccess);
    const nextSales = team === 'sales' ? false : Boolean(current.salesAccess);
    const nextCustom = team === 'custom' ? false : Boolean(current.customAccess);

    if (!nextOps && !nextSales && !nextCustom) {
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, {
        operationsAccess: nextOps,
        salesAccess: nextSales,
        customAccess: nextCustom,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addAdminEmail(emailInput: string, adminUid: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    throw new Error('Please enter a valid email address.');
  }
  const path = `admins/${email}`;
  try {
    await setDoc(doc(db, 'admins', email), {
      email,
      addedBy: adminUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAdminEmail(emailInput: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  if ((BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(email)) {
    throw new Error('Primary bootstrap administrators cannot be removed.');
  }
  const path = `admins/${email}`;
  try {
    await deleteDoc(doc(db, 'admins', email));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface SaveVideoInput {
  title: string;
  description: string;
  driveUrl: string;
  driveFileId: string;
  segment: Segment;
  onboardingStage: OnboardingStage;
  customEmails: string[];
  orderIndex: number;
  passingScore: number;
  questions: QuizQuestion[];
}

function sanitizeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.slice(0, BLUEPRINT_LIMITS.MAX_QUESTIONS).map((q) => ({
    question: q.question.trim().slice(0, BLUEPRINT_LIMITS.QUESTION_MAX) || 'Question',
    options: [
      (q.options[0] ?? 'Option 1').trim().slice(0, BLUEPRINT_LIMITS.OPTION_MAX) || 'Option 1',
      (q.options[1] ?? 'Option 2').trim().slice(0, BLUEPRINT_LIMITS.OPTION_MAX) || 'Option 2',
      (q.options[2] ?? 'Option 3').trim().slice(0, BLUEPRINT_LIMITS.OPTION_MAX) || 'Option 3',
      (q.options[3] ?? 'Option 4').trim().slice(0, BLUEPRINT_LIMITS.OPTION_MAX) || 'Option 4',
    ],
    correctIndex: Math.min(3, Math.max(0, Math.trunc(Number(q.correctIndex) || 0))),
  }));
}

function sanitizeCustomEmails(emails: string[], segment: Segment): string[] {
  if (segment !== 'custom_list') return [];
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (isValidEmail(email) && !seen.has(email)) {
      seen.add(email);
      valid.push(email);
      if (valid.length >= BLUEPRINT_LIMITS.MAX_CUSTOM_EMAILS) break;
    }
  }
  return valid;
}

export async function createTrainingVideo(
  input: SaveVideoInput,
  adminUid: string,
): Promise<string> {
  const videoId = makeSafeId('vid');
  const path = `videos/${videoId}`;
  const cleanCustomEmails = sanitizeCustomEmails(input.customEmails, input.segment);

  try {
    await setDoc(doc(db, 'videos', videoId), {
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      description: input.description.trim().slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX),
      driveUrl: input.driveUrl.trim().slice(0, BLUEPRINT_LIMITS.DRIVE_URL_MAX),
      driveFileId: input.driveFileId.trim().slice(0, BLUEPRINT_LIMITS.DRIVE_FILE_ID_MAX),
      segment: input.segment,
      onboardingStage: input.onboardingStage,
      customEmails: cleanCustomEmails,
      orderIndex: Math.max(0, Math.min(10000, Math.trunc(input.orderIndex))),
      passingScore: Math.max(1, Math.min(100, Math.trunc(input.passingScore))),
      questions: sanitizeQuestions(input.questions),
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return videoId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTrainingVideo(
  videoId: string,
  input: SaveVideoInput,
): Promise<void> {
  const path = `videos/${videoId}`;
  const cleanCustomEmails = sanitizeCustomEmails(input.customEmails, input.segment);

  try {
    await updateDoc(doc(db, 'videos', videoId), {
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      description: input.description.trim().slice(0, BLUEPRINT_LIMITS.DESCRIPTION_MAX),
      driveUrl: input.driveUrl.trim().slice(0, BLUEPRINT_LIMITS.DRIVE_URL_MAX),
      driveFileId: input.driveFileId.trim().slice(0, BLUEPRINT_LIMITS.DRIVE_FILE_ID_MAX),
      segment: input.segment,
      onboardingStage: input.onboardingStage,
      customEmails: cleanCustomEmails,
      orderIndex: Math.max(0, Math.min(10000, Math.trunc(input.orderIndex))),
      passingScore: Math.max(1, Math.min(100, Math.trunc(input.passingScore))),
      questions: sanitizeQuestions(input.questions),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTrainingVideo(videoId: string): Promise<void> {
  const path = `videos/${videoId}`;
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function recordVideoOpen(user: User, video: TrainingVideo): Promise<void> {
  if (!user.email) return;
  const progressId = `${user.uid}_${video.id}`;
  const progressPath = `progress/${progressId}`;
  const progressRef = doc(db, 'progress', progressId);
  const email = normalizeEmail(user.email);
  const userName = (user.displayName ?? email).trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);

  try {
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      const existing = snap.data() as UserVideoProgress;
      await updateDoc(progressRef, {
        userName,
        segment: video.segment,
        viewCount: (existing.viewCount ?? 0) + 1,
        lastAccessedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(progressRef, {
        uid: user.uid,
        userEmail: email,
        userName,
        videoId: video.id,
        segment: video.segment,
        viewCount: 1,
        watchSeconds: 0,
        attempts: 0,
        bestScore: 0,
        lastScore: 0,
        passed: false,
        lastAccessedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }

  const eventId = makeSafeId('evt');
  const eventPath = `engagementEvents/${eventId}`;
  try {
    await setDoc(doc(db, 'engagementEvents', eventId), {
      uid: user.uid,
      userEmail: email,
      videoId: video.id,
      videoTitle: video.title.slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      segment: video.segment,
      eventType: 'video_open',
      score: 0,
      watchSecondsDelta: 0,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, eventPath);
  }
}

export async function recordWatchHeartbeat(
  user: User,
  video: TrainingVideo,
  deltaSeconds: number,
): Promise<void> {
  if (!user.email || deltaSeconds <= 0) return;
  const boundedDelta = Math.min(3600, Math.max(1, Math.trunc(deltaSeconds)));
  const progressId = `${user.uid}_${video.id}`;
  const progressPath = `progress/${progressId}`;
  const progressRef = doc(db, 'progress', progressId);
  const email = normalizeEmail(user.email);
  const userName = (user.displayName ?? email).trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);

  try {
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      const existing = snap.data() as UserVideoProgress;
      await updateDoc(progressRef, {
        userName,
        segment: video.segment,
        watchSeconds: (existing.watchSeconds ?? 0) + boundedDelta,
        lastAccessedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, progressPath);
  }

  const eventId = makeSafeId('evt');
  try {
    await setDoc(doc(db, 'engagementEvents', eventId), {
      uid: user.uid,
      userEmail: email,
      videoId: video.id,
      videoTitle: video.title.slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      segment: video.segment,
      eventType: 'watch_heartbeat',
      score: 0,
      watchSecondsDelta: boundedDelta,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `engagementEvents/${eventId}`);
  }
}

export interface QuizSubmissionResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
}

export async function submitQuestionnaireAttempt(
  user: User,
  video: TrainingVideo,
  selectedAnswers: Record<number, number>,
): Promise<QuizSubmissionResult> {
  if (!user.email) {
    throw new Error('Authenticated user email is required.');
  }
  const totalQuestions = video.questions.length;
  let correctCount = 0;

  if (totalQuestions > 0) {
    video.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });
  }

  const score = totalQuestions === 0 ? 100 : Math.round((correctCount / totalQuestions) * 100);
  const passedNow = totalQuestions === 0 ? true : score >= video.passingScore;

  const progressId = `${user.uid}_${video.id}`;
  const progressPath = `progress/${progressId}`;
  const progressRef = doc(db, 'progress', progressId);
  const email = normalizeEmail(user.email);
  const userName = (user.displayName ?? email).trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);

  try {
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      const existing = snap.data() as UserVideoProgress;
      const updatePayload: Record<string, unknown> = {
        userName,
        segment: video.segment,
        attempts: (existing.attempts ?? 0) + 1,
        lastScore: score,
        bestScore: Math.max(existing.bestScore ?? 0, score),
        passed: Boolean(existing.passed) || passedNow,
        lastAccessedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (!existing.passed && passedNow) {
        updatePayload.completedAt = serverTimestamp();
      }
      await updateDoc(progressRef, updatePayload);
    } else {
      await setDoc(progressRef, {
        uid: user.uid,
        userEmail: email,
        userName,
        videoId: video.id,
        segment: video.segment,
        viewCount: 1,
        watchSeconds: 0,
        attempts: 1,
        bestScore: score,
        lastScore: score,
        passed: passedNow,
        completedAt: passedNow ? serverTimestamp() : null,
        lastAccessedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, progressPath);
  }

  const eventId = makeSafeId('evt');
  try {
    await setDoc(doc(db, 'engagementEvents', eventId), {
      uid: user.uid,
      userEmail: email,
      videoId: video.id,
      videoTitle: video.title.slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      segment: video.segment,
      eventType: passedNow ? 'quiz_pass' : 'quiz_submit',
      score,
      watchSecondsDelta: 0,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `engagementEvents/${eventId}`);
  }

  return {
    score,
    correctCount,
    totalQuestions,
    passed: passedNow,
  };
}

export async function fetchTeamAccessOnce(): Promise<TeamAccessRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'teamAccess'));
    return snap.docs.map((d) => d.data() as TeamAccessRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'teamAccess');
  }
}

// ---------------------------------------------------------------------------
// Sales Team (BDM) Access Approval Requests
// ---------------------------------------------------------------------------

function mapAccessRequest(id: string, data: Record<string, unknown>): AccessRequestRecord {
  const rawStatus = String(data.status ?? 'pending');
  const status: AccessRequestStatus =
    rawStatus === 'approved' || rawStatus === 'rejected' ? rawStatus : 'pending';
  return {
    uid: String(data.uid ?? ''),
    email: normalizeEmail(String(data.email ?? id)),
    displayName: String(data.displayName ?? ''),
    requestedTeam: 'sales',
    note: String(data.note ?? ''),
    status,
    reviewedBy: String(data.reviewedBy ?? ''),
    reviewedAt: (data.reviewedAt as AccessRequestRecord['reviewedAt']) ?? null,
    reviewNote: String(data.reviewNote ?? ''),
    createdAt: (data.createdAt as AccessRequestRecord['createdAt']) ?? null,
    updatedAt: (data.updatedAt as AccessRequestRecord['updatedAt']) ?? null,
  };
}

export async function ensureSalesAccessRequest(
  user: User,
  initialNote = '',
): Promise<AccessRequestRecord | null> {
  if (!user.email) return null;
  const email = normalizeEmail(user.email);
  if (!isValidEmail(email)) return null;
  const path = `accessRequests/${email}`;
  const ref = doc(db, 'accessRequests', email);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return mapAccessRequest(snap.id, snap.data() as Record<string, unknown>);
    }

    const safeName = (user.displayName ?? email).trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
    const safeNote = initialNote.trim().slice(0, 300);

    await setDoc(ref, {
      uid: user.uid,
      email,
      displayName: safeName,
      requestedTeam: 'sales',
      note: safeNote,
      status: 'pending',
      reviewedBy: '',
      reviewedAt: null,
      reviewNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdSnap = await getDoc(ref);
    return createdSnap.exists()
      ? mapAccessRequest(createdSnap.id, createdSnap.data() as Record<string, unknown>)
      : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMySalesAccessRequest(
  user: User,
  displayName: string,
  note: string,
  resubmit = false,
): Promise<void> {
  if (!user.email) return;
  const email = normalizeEmail(user.email);
  const path = `accessRequests/${email}`;
  const ref = doc(db, 'accessRequests', email);

  const safeName = (displayName || user.displayName || email)
    .trim()
    .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  const safeNote = note.trim().slice(0, 300);

  try {
    if (resubmit) {
      await updateDoc(ref, {
        displayName: safeName,
        note: safeNote,
        status: 'pending',
        reviewedBy: '',
        reviewedAt: null,
        reviewNote: '',
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: safeName,
        note: safeNote,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeMyAccessRequest(
  userEmail: string,
  onData: (record: AccessRequestRecord | null) => void,
): Unsubscribe {
  const email = normalizeEmail(userEmail);
  if (!email) {
    onData(null);
    return () => {};
  }
  const ref = doc(db, 'accessRequests', email);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapAccessRequest(snap.id, snap.data() as Record<string, unknown>));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `accessRequests/${email}`);
    },
  );
}

export function subscribeMyTeamAccess(
  userEmail: string,
  onData: (record: TeamAccessRecord | null) => void,
): Unsubscribe {
  const email = normalizeEmail(userEmail);
  if (!email) {
    onData(null);
    return () => {};
  }
  const ref = doc(db, 'teamAccess', email);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        email: String(data.email ?? snap.id),
        displayName: data.displayName ? String(data.displayName) : '',
        operationsAccess: Boolean(data.operationsAccess),
        salesAccess: Boolean(data.salesAccess),
        customAccess: Boolean(data.customAccess),
        updatedBy: String(data.updatedBy ?? ''),
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `teamAccess/${email}`);
    },
  );
}

export function subscribeAccessRequests(
  onData: (records: AccessRequestRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'accessRequests'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapAccessRequest(d.id, d.data() as Record<string, unknown>),
      );
      const rank = (status: AccessRequestStatus) =>
        status === 'pending' ? 0 : status === 'rejected' ? 1 : 2;
      list.sort((a, b) => {
        const diff = rank(a.status) - rank(b.status);
        if (diff !== 0) return diff;
        const aMs = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const bMs = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return bMs - aMs;
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accessRequests');
    },
  );
}

export async function approveSalesAccessRequest(
  reqRecord: AccessRequestRecord,
  adminUid: string,
  reviewNote = '',
): Promise<void> {
  const email = normalizeEmail(reqRecord.email);
  const safeReviewNote = reviewNote.trim().slice(0, 300);

  // 1. Grant Sales Team Window access (preserving any existing flags & saving displayName)
  const accessRef = doc(db, 'teamAccess', email);
  try {
    const existingSnap = await getDoc(accessRef);
    const safeDisplayName = reqRecord.displayName
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      await updateDoc(accessRef, {
        salesAccess: true,
        displayName: existingData.displayName || safeDisplayName,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(accessRef, {
        email,
        displayName: safeDisplayName,
        operationsAccess: false,
        salesAccess: true,
        customAccess: false,
        updatedBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `teamAccess/${email}`);
  }

  // 2. Mark request approved
  const reqRef = doc(db, 'accessRequests', email);
  try {
    await updateDoc(reqRef, {
      status: 'approved',
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
      reviewNote: safeReviewNote,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `accessRequests/${email}`);
  }
}

export async function rejectSalesAccessRequest(
  rawEmail: string,
  adminUid: string,
  reviewNote = '',
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const safeReviewNote = reviewNote.trim().slice(0, 300);
  const reqRef = doc(db, 'accessRequests', email);
  try {
    await updateDoc(reqRef, {
      status: 'rejected',
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
      reviewNote: safeReviewNote,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `accessRequests/${email}`);
  }
}

// ---------------------------------------------------------------------------
// Immutable Login Audit Logs
// ---------------------------------------------------------------------------

function detectDeviceSummary(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`.slice(0, 160);
}

export async function recordLoginLog(
  user: User,
  access: AuthAccessState,
  requestStatus?: AccessRequestStatus | null,
): Promise<void> {
  if (!user.email) return;
  const email = normalizeEmail(user.email);
  if (!isValidEmail(email)) return;

  const hasAccess =
    access.isAdmin || access.operationsAccess || access.salesAccess || access.customAccess;

  let accessRole: LoginAccessRole = 'pending_approval';
  if (access.isAdmin) {
    accessRole = 'admin';
  } else {
    const teamCount =
      (access.operationsAccess ? 1 : 0) +
      (access.salesAccess ? 1 : 0) +
      (access.customAccess ? 1 : 0);
    if (teamCount > 1) accessRole = 'multi_team';
    else if (access.operationsAccess) accessRole = 'operations';
    else if (access.salesAccess) accessRole = 'sales';
    else if (access.customAccess) accessRole = 'custom';
  }

  const status: LoginStatus = hasAccess
    ? 'granted'
    : requestStatus === 'rejected'
      ? 'rejected'
      : 'pending_approval';

  const logId = makeSafeId('login');
  const path = `loginLogs/${logId}`;
  const userName = (user.displayName ?? email).trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);

  try {
    await setDoc(doc(db, 'loginLogs', logId), {
      uid: user.uid,
      userEmail: email,
      userName,
      accessRole,
      status,
      deviceInfo: detectDeviceSummary(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeLoginLogs(
  onData: (logs: LoginLogRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'loginLogs'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LoginLogRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: String(data.uid ?? ''),
          userEmail: normalizeEmail(String(data.userEmail ?? '')),
          userName: String(data.userName ?? ''),
          accessRole: (data.accessRole as LoginAccessRole) ?? 'pending_approval',
          status: (data.status as LoginStatus) ?? 'granted',
          deviceInfo: String(data.deviceInfo ?? ''),
          createdAt: data.createdAt ?? null,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'loginLogs');
    },
  );
}
