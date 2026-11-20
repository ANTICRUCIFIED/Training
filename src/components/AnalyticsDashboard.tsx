import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  LogIn,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { normalizeEmail, sortTrainingVideos } from '../services/firestoreService';
import type {
  EngagementEvent,
  LoginAccessRole,
  LoginLogRecord,
  LoginStatus,
  OnboardingStage,
  TeamAccessRecord,
  TrainingVideo,
  UserVideoProgress,
} from '../types';
import { exportAnalyticsWorkbook, exportIndividualUserReport } from '../utils/excelParser';
import { formatSegmentLabel, formatStageLabel } from './VideoUploadManager';

interface AnalyticsDashboardProps {
  videos: TrainingVideo[];
  allProgress: UserVideoProgress[];
  engagementEvents: EngagementEvent[];
  loginLogs: LoginLogRecord[];
  teamAccessList: TeamAccessRecord[];
}

type AudienceFilter = 'all' | 'operations' | 'sales' | 'custom';
type AnalyticsViewTab = 'users' | 'videos' | 'logs';
type UserModalTab = 'status' | 'learning_logs' | 'login_logs';
type ActivityLogFilter =
  | 'all'
  | 'logins'
  | 'learning'
  | 'video_open'
  | 'watch_heartbeat'
  | 'quiz_submit'
  | 'quiz_pass';

type DefaulterFilter =
  | 'all'
  | 'all_defaulters'
  | 'not_started'
  | 'stuck_pre'
  | 'pending_post'
  | 'failed_quiz'
  | 'inactive_7d'
  | 'completed';

type LearnerStageStatus =
  | 'no_videos'
  | 'not_started'
  | 'pre_onboarding'
  | 'post_onboarding'
  | 'completed';

type VideoLearnerStatus = 'passed' | 'failed_attempt' | 'in_progress' | 'unlocked' | 'locked';

interface LearnerVideoDetail {
  video: TrainingVideo;
  levelNumber: number;
  status: VideoLearnerStatus;
  viewCount: number;
  watchSeconds: number;
  attempts: number;
  bestScore: number;
  lastScore: number;
  passed: boolean;
  completedAtMs: number;
  lastAccessedMs: number;
}

interface LearnerReport {
  email: string;
  name: string;
  operationsAccess: boolean;
  salesAccess: boolean;
  customAccess: boolean;
  directCustomVideoCount: number;
  assignedVideos: LearnerVideoDetail[];
  assignedTotal: number;
  startedCount: number;
  passedCount: number;
  remainingCount: number;
  completionPct: number;
  completedTillLevel: number;
  lastCompletedTitle: string | null;
  nextPendingTitle: string | null;
  nextPendingLevel: number | null;
  preTotal: number;
  prePassed: number;
  preRemaining: number;
  postTotal: number;
  postPassed: number;
  postRemaining: number;
  currentStage: LearnerStageStatus;
  isDefaulter: boolean;
  isNotStarted: boolean;
  isStuckPre: boolean;
  isPendingPost: boolean;
  hasFailedQuiz: boolean;
  isInactive7d: boolean;
  defaulterReason: string;
  totalWatchSeconds: number;
  avgBestScore: number | null;
  lastAccessedMs: number;
  loginCount: number;
  lastLoginMs: number;
  userLoginLogs: LoginLogRecord[];
  userLearningLogs: EngagementEvent[];
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatWatchTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatDateShort(ms: number): string {
  if (!ms) return 'Never';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(ms: number): string {
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLoginRoleLabel(role: LoginAccessRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'operations':
      return 'Operations Team';
    case 'sales':
      return 'Sales Team';
    case 'custom':
      return 'Custom Audience';
    case 'multi_team':
      return 'Multi-Window Access';
    case 'pending_approval':
      return 'Pending Sales BDM Approval';
  }
}

function formatLoginStatusLabel(status: LoginStatus): string {
  switch (status) {
    case 'granted':
      return 'Access Granted';
    case 'pending_approval':
      return 'Awaiting Approval';
    case 'rejected':
      return 'Declined';
  }
}

function formatLearningEventLabel(evt: EngagementEvent): string {
  switch (evt.eventType) {
    case 'video_open':
      return 'Opened Video';
    case 'watch_heartbeat':
      return `Watched +${evt.watchSecondsDelta}s`;
    case 'quiz_pass':
      return `Passed Quiz (${evt.score}%)`;
    case 'quiz_submit':
      return `Failed Quiz Attempt (${evt.score}%)`;
  }
}

function stageLabel(stage: LearnerStageStatus): string {
  switch (stage) {
    case 'completed':
      return 'Fully Completed';
    case 'post_onboarding':
      return 'After Onboarding';
    case 'pre_onboarding':
      return 'Before Onboarding';
    case 'not_started':
      return 'Not Started';
    case 'no_videos':
      return 'No Videos Assigned';
  }
}

function stageTextClass(stage: LearnerStageStatus): string {
  switch (stage) {
    case 'completed':
      return 'text-emerald-700 font-semibold';
    case 'post_onboarding':
      return 'text-[#1F6E82] font-semibold';
    case 'pre_onboarding':
      return 'text-amber-700 font-semibold';
    case 'not_started':
      return 'text-rose-700 font-semibold';
    case 'no_videos':
      return 'text-slate-400 font-medium';
  }
}

function videoStatusLabel(status: VideoLearnerStatus): string {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'failed_attempt':
      return 'Failed Quiz Attempt';
    case 'in_progress':
      return 'In Progress';
    case 'unlocked':
      return 'Not Started (Unlocked)';
    case 'locked':
      return 'Locked';
  }
}

function videoStatusTextClass(status: VideoLearnerStatus): string {
  switch (status) {
    case 'passed':
      return 'text-emerald-700 font-semibold';
    case 'failed_attempt':
      return 'text-rose-700 font-semibold';
    case 'in_progress':
      return 'text-[#1F6E82] font-semibold';
    case 'unlocked':
      return 'text-amber-700 font-medium';
    case 'locked':
      return 'text-slate-400 font-medium';
  }
}

function matchesAudienceVideo(video: TrainingVideo, audience: AudienceFilter): boolean {
  if (audience === 'all') return true;
  if (audience === 'operations') return video.segment === 'operations' || video.segment === 'both';
  if (audience === 'sales') return video.segment === 'sales' || video.segment === 'both';
  return video.segment === 'custom' || video.segment === 'custom_list';
}

function userHasVideoAssignment(
  video: TrainingVideo,
  member: {
    email: string;
    operationsAccess: boolean;
    salesAccess: boolean;
    customAccess: boolean;
  },
): boolean {
  if (video.segment === 'operations') return member.operationsAccess;
  if (video.segment === 'sales') return member.salesAccess;
  if (video.segment === 'both') return member.operationsAccess || member.salesAccess;
  if (video.segment === 'custom') return member.customAccess;
  if (video.segment === 'custom_list') return video.customEmails.includes(member.email);
  return false;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  videos,
  allProgress,
  engagementEvents,
  loginLogs,
  teamAccessList,
}) => {
  const [activeView, setActiveView] = useState<AnalyticsViewTab>('users');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [stageFilter, setStageFilter] = useState<'all' | OnboardingStage>('all');
  const [defaulterFilter, setDefaulterFilter] = useState<DefaulterFilter>('all');
  const [learnerSearch, setLearnerSearch] = useState('');

  // Activity Logs tab filters
  const [logFilter, setLogFilter] = useState<ActivityLogFilter>('all');
  const [logSearch, setLogSearch] = useState('');

  // Modal states
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [userModalTab, setUserModalTab] = useState<UserModalTab>('status');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoModalSearch, setVideoModalSearch] = useState('');
  const [videoModalOnlyPending, setVideoModalOnlyPending] = useState(false);

  const sortedAllVideos = useMemo(() => sortTrainingVideos(videos), [videos]);

  const scopedVideos = useMemo(() => {
    return sortedAllVideos.filter((v) => {
      if (!matchesAudienceVideo(v, audienceFilter)) return false;
      if (stageFilter !== 'all' && v.onboardingStage !== stageFilter) return false;
      return true;
    });
  }, [sortedAllVideos, audienceFilter, stageFilter]);

  const scopedVideoIds = useMemo(() => new Set(scopedVideos.map((v) => v.id)), [scopedVideos]);

  // Index progress by `${email}::${videoId}` for O(1) lookup
  const progressByEmailAndVideo = useMemo(() => {
    const map = new Map<string, UserVideoProgress>();
    allProgress.forEach((p) => {
      const email = normalizeEmail(p.userEmail);
      const key = `${email}::${p.videoId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, p);
      } else {
        const keepNew =
          (p.passed && !existing.passed) ||
          p.bestScore > existing.bestScore ||
          (p.lastAccessedAt?.toMillis() ?? 0) > (existing.lastAccessedAt?.toMillis() ?? 0);
        if (keepNew) map.set(key, p);
      }
    });
    return map;
  }, [allProgress]);

  // Index login logs & learning logs by user email
  const loginLogsByEmail = useMemo(() => {
    const map = new Map<string, LoginLogRecord[]>();
    loginLogs.forEach((log) => {
      const email = normalizeEmail(log.userEmail);
      if (!email) return;
      const list = map.get(email) ?? [];
      list.push(log);
      map.set(email, list);
    });
    return map;
  }, [loginLogs]);

  const learningLogsByEmail = useMemo(() => {
    const map = new Map<string, EngagementEvent[]>();
    engagementEvents.forEach((evt) => {
      const email = normalizeEmail(evt.userEmail);
      if (!email) return;
      const list = map.get(email) ?? [];
      list.push(evt);
      map.set(email, list);
    });
    return map;
  }, [engagementEvents]);

  // Build master roster of all learners from teamAccessList, custom_list videos, progress, and login logs
  const allLearnerReports = useMemo<LearnerReport[]>(() => {
    const roster = new Map<
      string,
      {
        email: string;
        name: string;
        operationsAccess: boolean;
        salesAccess: boolean;
        customAccess: boolean;
        directCustomVideoCount: number;
      }
    >();

    teamAccessList.forEach((member) => {
      const email = normalizeEmail(member.email);
      if (!email) return;
      roster.set(email, {
        email,
        name: member.displayName || email,
        operationsAccess: Boolean(member.operationsAccess),
        salesAccess: Boolean(member.salesAccess),
        customAccess: Boolean(member.customAccess),
        directCustomVideoCount: 0,
      });
    });

    sortedAllVideos.forEach((video) => {
      if (video.segment !== 'custom_list') return;
      video.customEmails.forEach((rawEmail) => {
        const email = normalizeEmail(rawEmail);
        if (!email) return;
        const existing = roster.get(email) ?? {
          email,
          name: email,
          operationsAccess: false,
          salesAccess: false,
          customAccess: false,
          directCustomVideoCount: 0,
        };
        existing.directCustomVideoCount += 1;
        roster.set(email, existing);
      });
    });

    allProgress.forEach((p) => {
      const email = normalizeEmail(p.userEmail);
      if (!email) return;
      const existing = roster.get(email) ?? {
        email,
        name: p.userName || email,
        operationsAccess: false,
        salesAccess: false,
        customAccess: false,
        directCustomVideoCount: 0,
      };
      if (p.userName && existing.name === email) {
        existing.name = p.userName;
      }
      roster.set(email, existing);
    });

    loginLogs.forEach((log) => {
      const email = normalizeEmail(log.userEmail);
      if (!email) return;
      const existing = roster.get(email);
      if (existing && log.userName && existing.name === email) {
        existing.name = log.userName;
      }
    });

    const nowMs = Date.now();
    const reports: LearnerReport[] = [];

    roster.forEach((member) => {
      const memberVideos = sortedAllVideos.filter((v) => {
        const assigned = userHasVideoAssignment(v, member);
        if (assigned) return true;
        return progressByEmailAndVideo.has(`${member.email}::${v.id}`);
      });

      const details: LearnerVideoDetail[] = [];
      let prevPassed = true;
      let startedCount = 0;
      let passedCount = 0;
      let preTotal = 0;
      let prePassed = 0;
      let postTotal = 0;
      let postPassed = 0;
      let totalWatchSeconds = 0;
      const attemptedScores: number[] = [];
      let lastAccessedMs = 0;

      memberVideos.forEach((video, idx) => {
        const prog = progressByEmailAndVideo.get(`${member.email}::${video.id}`);
        const passed = Boolean(prog?.passed);
        const attempts = prog?.attempts ?? 0;
        const viewCount = prog?.viewCount ?? 0;
        const watchSeconds = prog?.watchSeconds ?? 0;
        const bestScore = prog?.bestScore ?? 0;
        const lastScore = prog?.lastScore ?? 0;
        const completedAtMs = prog?.completedAt ? prog.completedAt.toMillis() : 0;
        const accessedMs = prog?.lastAccessedAt ? prog.lastAccessedAt.toMillis() : 0;

        let status: VideoLearnerStatus;
        if (passed) {
          status = 'passed';
        } else if (attempts > 0) {
          status = 'failed_attempt';
        } else if (viewCount > 0 || watchSeconds > 0) {
          status = 'in_progress';
        } else if (idx === 0 || prevPassed) {
          status = 'unlocked';
        } else {
          status = 'locked';
        }

        if (viewCount > 0 || watchSeconds > 0 || attempts > 0 || passed) {
          startedCount += 1;
        }
        if (passed) {
          passedCount += 1;
        }
        if (video.onboardingStage === 'post_onboarding') {
          postTotal += 1;
          if (passed) postPassed += 1;
        } else {
          preTotal += 1;
          if (passed) prePassed += 1;
        }

        totalWatchSeconds += watchSeconds;
        if (attempts > 0) attemptedScores.push(bestScore);
        if (accessedMs > lastAccessedMs) lastAccessedMs = accessedMs;

        details.push({
          video,
          levelNumber: idx + 1,
          status,
          viewCount,
          watchSeconds,
          attempts,
          bestScore,
          lastScore,
          passed,
          completedAtMs,
          lastAccessedMs: accessedMs,
        });

        prevPassed = prevPassed && passed;
      });

      let completedTillLevel = 0;
      let lastCompletedTitle: string | null = null;
      for (const item of details) {
        if (item.passed) {
          completedTillLevel = item.levelNumber;
          lastCompletedTitle = item.video.title;
        } else {
          break;
        }
      }
      if (!lastCompletedTitle && passedCount > 0) {
        const lastPassedItem = [...details].reverse().find((d) => d.passed);
        if (lastPassedItem) {
          completedTillLevel = passedCount;
          lastCompletedTitle = lastPassedItem.video.title;
        }
      }

      const firstPending = details.find((d) => !d.passed) ?? null;
      const assignedTotal = details.length;
      const remainingCount = assignedTotal - passedCount;
      const completionPct =
        assignedTotal > 0 ? Math.round((passedCount / assignedTotal) * 100) : 0;
      const preRemaining = preTotal - prePassed;
      const postRemaining = postTotal - postPassed;

      let currentStage: LearnerStageStatus;
      if (assignedTotal === 0) {
        currentStage = 'no_videos';
      } else if (passedCount === assignedTotal) {
        currentStage = 'completed';
      } else if (startedCount === 0 && passedCount === 0) {
        currentStage = 'not_started';
      } else if (preTotal > 0 && preRemaining > 0) {
        currentStage = 'pre_onboarding';
      } else {
        currentStage = 'post_onboarding';
      }

      const isDefaulter = assignedTotal > 0 && remainingCount > 0;
      const isNotStarted = isDefaulter && startedCount === 0 && passedCount === 0;
      const isStuckPre = isDefaulter && preRemaining > 0;
      const isPendingPost = isDefaulter && preRemaining === 0 && postRemaining > 0;
      const hasFailedQuiz = details.some((d) => d.status === 'failed_attempt');
      const isInactive7d =
        isDefaulter && (lastAccessedMs === 0 || nowMs - lastAccessedMs > SEVEN_DAYS_MS);

      let defaulterReason = 'Compliant';
      if (assignedTotal === 0) {
        defaulterReason = 'No Videos Assigned';
      } else if (!isDefaulter) {
        defaulterReason = 'Compliant';
      } else if (isNotStarted) {
        defaulterReason = 'Defaulter — Not Started';
      } else if (hasFailedQuiz && isStuckPre) {
        defaulterReason = 'Defaulter — Failed Pre-Onboarding Quiz';
      } else if (isStuckPre) {
        defaulterReason = 'Defaulter — Pending Before Onboarding';
      } else if (hasFailedQuiz && isPendingPost) {
        defaulterReason = 'Defaulter — Failed Post-Onboarding Quiz';
      } else {
        defaulterReason = 'Defaulter — Pending After Onboarding';
      }

      const userLoginLogs = loginLogsByEmail.get(member.email) ?? [];
      const userLearningLogs = learningLogsByEmail.get(member.email) ?? [];
      const lastLoginMs =
        userLoginLogs.length > 0 && userLoginLogs[0].createdAt
          ? userLoginLogs[0].createdAt.toMillis()
          : 0;

      reports.push({
        email: member.email,
        name: member.name,
        operationsAccess: member.operationsAccess,
        salesAccess: member.salesAccess,
        customAccess: member.customAccess,
        directCustomVideoCount: member.directCustomVideoCount,
        assignedVideos: details,
        assignedTotal,
        startedCount,
        passedCount,
        remainingCount,
        completionPct,
        completedTillLevel,
        lastCompletedTitle,
        nextPendingTitle: firstPending?.video.title ?? null,
        nextPendingLevel: firstPending?.levelNumber ?? null,
        preTotal,
        prePassed,
        preRemaining,
        postTotal,
        postPassed,
        postRemaining,
        currentStage,
        isDefaulter,
        isNotStarted,
        isStuckPre,
        isPendingPost,
        hasFailedQuiz,
        isInactive7d,
        defaulterReason,
        totalWatchSeconds,
        avgBestScore:
          attemptedScores.length > 0
            ? Math.round(attemptedScores.reduce((a, b) => a + b, 0) / attemptedScores.length)
            : null,
        lastAccessedMs,
        loginCount: userLoginLogs.length,
        lastLoginMs,
        userLoginLogs,
        userLearningLogs,
      });
    });

    return reports.sort((a, b) => {
      if (a.isDefaulter !== b.isDefaulter) return a.isDefaulter ? -1 : 1;
      if (a.remainingCount !== b.remainingCount) return b.remainingCount - a.remainingCount;
      return a.email.localeCompare(b.email);
    });
  }, [
    teamAccessList,
    sortedAllVideos,
    allProgress,
    loginLogs,
    progressByEmailAndVideo,
    loginLogsByEmail,
    learningLogsByEmail,
  ]);

  const audienceLearners = useMemo(() => {
    return allLearnerReports.filter((r) => {
      if (audienceFilter === 'operations') return r.operationsAccess;
      if (audienceFilter === 'sales') return r.salesAccess;
      if (audienceFilter === 'custom') return r.customAccess || r.directCustomVideoCount > 0;
      return true;
    });
  }, [allLearnerReports, audienceFilter]);

  const filterCounts = useMemo(() => {
    return {
      all: audienceLearners.length,
      all_defaulters: audienceLearners.filter((r) => r.isDefaulter).length,
      not_started: audienceLearners.filter((r) => r.isNotStarted).length,
      stuck_pre: audienceLearners.filter((r) => r.isStuckPre).length,
      pending_post: audienceLearners.filter((r) => r.isPendingPost).length,
      failed_quiz: audienceLearners.filter((r) => r.hasFailedQuiz).length,
      inactive_7d: audienceLearners.filter((r) => r.isInactive7d).length,
      completed: audienceLearners.filter((r) => r.currentStage === 'completed').length,
    };
  }, [audienceLearners]);

  const filteredLearners = useMemo(() => {
    const q = learnerSearch.trim().toLowerCase();
    return audienceLearners.filter((r) => {
      if (defaulterFilter === 'all_defaulters' && !r.isDefaulter) return false;
      if (defaulterFilter === 'not_started' && !r.isNotStarted) return false;
      if (defaulterFilter === 'stuck_pre' && !r.isStuckPre) return false;
      if (defaulterFilter === 'pending_post' && !r.isPendingPost) return false;
      if (defaulterFilter === 'failed_quiz' && !r.hasFailedQuiz) return false;
      if (defaulterFilter === 'inactive_7d' && !r.isInactive7d) return false;
      if (defaulterFilter === 'completed' && r.currentStage !== 'completed') return false;

      if (q && !r.email.includes(q) && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [audienceLearners, defaulterFilter, learnerSearch]);

  // Unified chronological Login + Learning Activity stream for the Activity Logs tab
  const unifiedLogs = useMemo(() => {
    type UnifiedEntry =
      | {
          id: string;
          kind: 'login';
          timestampMs: number;
          email: string;
          name: string;
          title: string;
          detail: string;
          statusTone: 'emerald' | 'amber' | 'rose' | 'teal' | 'slate';
        }
      | {
          id: string;
          kind: 'learning';
          eventType: EngagementEvent['eventType'];
          timestampMs: number;
          email: string;
          name: string;
          title: string;
          detail: string;
          statusTone: 'emerald' | 'amber' | 'rose' | 'teal' | 'slate';
        };

    const learnerNameByEmail = new Map<string, string>();
    allLearnerReports.forEach((r) => learnerNameByEmail.set(r.email, r.name));

    const entries: UnifiedEntry[] = [];

    loginLogs.forEach((log) => {
      const email = normalizeEmail(log.userEmail);
      entries.push({
        id: `login_${log.id}`,
        kind: 'login',
        timestampMs: log.createdAt ? log.createdAt.toMillis() : 0,
        email,
        name: log.userName || learnerNameByEmail.get(email) || email,
        title: `Signed In · ${formatLoginStatusLabel(log.status)}`,
        detail: `${formatLoginRoleLabel(log.accessRole)}${log.deviceInfo ? ` · ${log.deviceInfo}` : ''}`,
        statusTone:
          log.status === 'granted'
            ? 'emerald'
            : log.status === 'rejected'
              ? 'rose'
              : 'amber',
      });
    });

    engagementEvents.forEach((evt) => {
      const email = normalizeEmail(evt.userEmail);
      entries.push({
        id: `learn_${evt.id}`,
        kind: 'learning',
        eventType: evt.eventType,
        timestampMs: evt.createdAt ? evt.createdAt.toMillis() : 0,
        email,
        name: learnerNameByEmail.get(email) || email,
        title: formatLearningEventLabel(evt),
        detail: `${evt.videoTitle} · ${formatSegmentLabel(evt.segment)}`,
        statusTone:
          evt.eventType === 'quiz_pass'
            ? 'emerald'
            : evt.eventType === 'quiz_submit'
              ? 'rose'
              : 'teal',
      });
    });

    const q = logSearch.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (logFilter === 'logins' && entry.kind !== 'login') return false;
        if (logFilter === 'learning' && entry.kind !== 'learning') return false;
        if (
          (logFilter === 'video_open' ||
            logFilter === 'watch_heartbeat' ||
            logFilter === 'quiz_submit' ||
            logFilter === 'quiz_pass') &&
          (entry.kind !== 'learning' || entry.eventType !== logFilter)
        ) {
          return false;
        }
        if (
          q &&
          !entry.email.includes(q) &&
          !entry.name.toLowerCase().includes(q) &&
          !entry.title.toLowerCase().includes(q) &&
          !entry.detail.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [loginLogs, engagementEvents, allLearnerReports, logFilter, logSearch]);

  // Per-video engagement & learner coverage metrics
  const videoMetrics = useMemo(() => {
    return scopedVideos.map((video) => {
      const assignedLearners = allLearnerReports.filter((r) =>
        r.assignedVideos.some((d) => d.video.id === video.id),
      );

      let views = 0;
      let watchSeconds = 0;
      let attempts = 0;
      let completions = 0;
      let startedLearners = 0;
      const scores: number[] = [];

      assignedLearners.forEach((learner) => {
        const detail = learner.assignedVideos.find((d) => d.video.id === video.id);
        if (!detail) return;
        views += detail.viewCount;
        watchSeconds += detail.watchSeconds;
        attempts += detail.attempts;
        if (detail.passed) completions += 1;
        if (detail.viewCount > 0 || detail.watchSeconds > 0 || detail.attempts > 0 || detail.passed) {
          startedLearners += 1;
        }
        if (detail.attempts > 0) scores.push(detail.bestScore);
      });

      const assignedCount = assignedLearners.length;
      const pendingCount = Math.max(0, assignedCount - completions);
      const completionRate =
        assignedCount > 0 ? Math.round((completions / assignedCount) * 100) : 0;
      const avgBestScore =
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      return {
        video,
        assignedCount,
        startedLearners,
        completions,
        pendingCount,
        views,
        watchSeconds,
        attempts,
        completionRate,
        avgBestScore,
      };
    });
  }, [scopedVideos, allLearnerReports]);

  const maxViews = Math.max(1, ...videoMetrics.map((m) => Math.max(m.views, m.assignedCount)));

  const scopedProgress = useMemo(
    () => allProgress.filter((p) => scopedVideoIds.has(p.videoId)),
    [allProgress, scopedVideoIds],
  );

  const engagementKpis = useMemo(() => {
    const totalViews = scopedProgress.reduce((acc, p) => acc + p.viewCount, 0);
    const totalWatchSeconds = scopedProgress.reduce((acc, p) => acc + p.watchSeconds, 0);
    const totalAttempts = scopedProgress.reduce((acc, p) => acc + p.attempts, 0);
    const passedCount = scopedProgress.filter((p) => p.passed).length;
    const activeLearners = new Set(scopedProgress.map((p) => normalizeEmail(p.userEmail))).size;
    const passRate =
      scopedProgress.length > 0 ? Math.round((passedCount / scopedProgress.length) * 100) : 0;

    return {
      totalViews,
      totalWatchSeconds,
      totalAttempts,
      passedCount,
      passRate,
      activeLearners,
    };
  }, [scopedProgress]);

  const recentEvents = useMemo(
    () => engagementEvents.filter((e) => scopedVideoIds.has(e.videoId)).slice(0, 12),
    [engagementEvents, scopedVideoIds],
  );

  const selectedUserReport = useMemo(
    () =>
      selectedUserEmail
        ? allLearnerReports.find((r) => r.email === selectedUserEmail) ?? null
        : null,
    [selectedUserEmail, allLearnerReports],
  );

  const selectedVideo = useMemo(
    () => (selectedVideoId ? sortedAllVideos.find((v) => v.id === selectedVideoId) ?? null : null),
    [selectedVideoId, sortedAllVideos],
  );

  const selectedVideoLearnerRows = useMemo(() => {
    if (!selectedVideo) return [];
    const q = videoModalSearch.trim().toLowerCase();
    return allLearnerReports
      .map((learner) => {
        const detail = learner.assignedVideos.find((d) => d.video.id === selectedVideo.id);
        if (!detail) return null;
        return { learner, detail };
      })
      .filter((row): row is { learner: LearnerReport; detail: LearnerVideoDetail } => Boolean(row))
      .filter(({ learner, detail }) => {
        if (videoModalOnlyPending && detail.passed) return false;
        if (q && !learner.email.includes(q) && !learner.name.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.detail.passed !== b.detail.passed) return a.detail.passed ? 1 : -1;
        return a.learner.email.localeCompare(b.learner.email);
      });
  }, [selectedVideo, allLearnerReports, videoModalSearch, videoModalOnlyPending]);

  const openUserModal = (email: string, tab: UserModalTab = 'status') => {
    setSelectedUserEmail(email);
    setUserModalTab(tab);
  };

  const handleExportFull = () => {
    const videoRows = videoMetrics.map((m) => ({
      'Module Title': m.video.title,
      'Onboarding Stage': formatStageLabel(m.video.onboardingStage),
      Audience: formatSegmentLabel(m.video.segment, m.video.customEmails),
      'Assigned Learners': m.assignedCount,
      Passed: m.completions,
      'Pending (Defaulters)': m.pendingCount,
      'Completion Rate (%)': m.completionRate,
      'Total Views': m.views,
      'Watch Seconds': m.watchSeconds,
      'Quiz Attempts': m.attempts,
      'Avg Best Score (%)': m.avgBestScore,
    }));

    const learnerRows = filteredLearners.map((r) => {
      const windows: string[] = [];
      if (r.operationsAccess) windows.push('Operations');
      if (r.salesAccess) windows.push('Sales');
      if (r.customAccess || r.directCustomVideoCount > 0) windows.push('Custom');
      return {
        Email: r.email,
        Name: r.name,
        Windows: windows.join(', ') || 'Unassigned',
        'Current Stage': stageLabel(r.currentStage),
        'Completed Till Level': `${r.completedTillLevel} / ${r.assignedTotal}`,
        'Last Completed Video': r.lastCompletedTitle ?? 'None',
        'Next Pending Video': r.nextPendingTitle ?? 'All Complete',
        'Before Onboarding (Passed/Total)': `${r.prePassed}/${r.preTotal}`,
        'After Onboarding (Passed/Total)': `${r.postPassed}/${r.postTotal}`,
        'Modules Remaining': r.remainingCount,
        'Completion (%)': r.completionPct,
        'Defaulter Status': r.defaulterReason,
        'Total Logins': r.loginCount,
        'Last Login': formatDateTime(r.lastLoginMs),
        'Avg Best Score (%)': r.avgBestScore ?? '—',
        'Total Watch Time': formatWatchTime(r.totalWatchSeconds),
        'Last Learning Activity': formatDateShort(r.lastAccessedMs),
      };
    });

    const matrixRows: Array<Record<string, string | number>> = [];
    filteredLearners.forEach((r) => {
      r.assignedVideos.forEach((d) => {
        matrixRows.push({
          Email: r.email,
          Name: r.name,
          Level: d.levelNumber,
          'Onboarding Stage': formatStageLabel(d.video.onboardingStage),
          'Video Title': d.video.title,
          Audience: formatSegmentLabel(d.video.segment, d.video.customEmails),
          Status: videoStatusLabel(d.status),
          Views: d.viewCount,
          'Watch Time': formatWatchTime(d.watchSeconds),
          Attempts: d.attempts,
          'Best Score (%)': d.attempts > 0 ? d.bestScore : '—',
          'Required Score (%)': d.video.passingScore,
          'Last Active': formatDateShort(d.lastAccessedMs),
        });
      });
    });

    const loginLogRows = loginLogs.map((l) => ({
      'Date & Time': formatDateTime(l.createdAt ? l.createdAt.toMillis() : 0),
      Email: l.userEmail,
      Name: l.userName,
      Role: formatLoginRoleLabel(l.accessRole),
      Status: formatLoginStatusLabel(l.status),
      Device: l.deviceInfo || 'Web Browser',
    }));

    const learningLogRows = engagementEvents.map((e) => ({
      'Date & Time': formatDateTime(e.createdAt ? e.createdAt.toMillis() : 0),
      Email: e.userEmail,
      Activity: formatLearningEventLabel(e),
      'Video Title': e.videoTitle,
      Audience: formatSegmentLabel(e.segment),
      'Score (%)': e.eventType === 'quiz_pass' || e.eventType === 'quiz_submit' ? e.score : '—',
      'Watch Delta (s)': e.watchSecondsDelta,
    }));

    exportAnalyticsWorkbook(videoRows, learnerRows, matrixRows, loginLogRows, learningLogRows);
  };

  const handleExportSingleUser = (report: LearnerReport) => {
    const windows: string[] = [];
    if (report.operationsAccess) windows.push('Operations');
    if (report.salesAccess) windows.push('Sales');
    if (report.customAccess || report.directCustomVideoCount > 0) windows.push('Custom Audience');

    const summaryRows: Array<Record<string, string | number>> = [
      { Metric: 'Learner Name', Value: report.name },
      { Metric: 'Email', Value: report.email },
      { Metric: 'Assigned Windows', Value: windows.join(', ') || 'Unassigned' },
      { Metric: 'Current Stage', Value: stageLabel(report.currentStage) },
      { Metric: 'Defaulter Status', Value: report.defaulterReason },
      {
        Metric: 'Completed Till Level',
        Value: `Level ${report.completedTillLevel} of ${report.assignedTotal}`,
      },
      { Metric: 'Last Completed Video', Value: report.lastCompletedTitle ?? 'None' },
      { Metric: 'Next Pending Video', Value: report.nextPendingTitle ?? 'All Complete' },
      { Metric: 'Before Onboarding Completed', Value: `${report.prePassed} / ${report.preTotal}` },
      { Metric: 'After Onboarding Completed', Value: `${report.postPassed} / ${report.postTotal}` },
      { Metric: 'Total Remaining Modules', Value: report.remainingCount },
      { Metric: 'Overall Completion (%)', Value: `${report.completionPct}%` },
      { Metric: 'Total Logins Recorded', Value: report.loginCount },
      {
        Metric: 'Last Login',
        Value: report.lastLoginMs ? formatDateTime(report.lastLoginMs) : 'No logins recorded',
      },
      { Metric: 'Total Watch Time', Value: formatWatchTime(report.totalWatchSeconds) },
      {
        Metric: 'Average Best Quiz Score',
        Value: report.avgBestScore !== null ? `${report.avgBestScore}%` : '—',
      },
      { Metric: 'Last Learning Activity', Value: formatDateShort(report.lastAccessedMs) },
    ];

    const detailRows = report.assignedVideos.map((d) => ({
      Level: d.levelNumber,
      'Onboarding Stage': formatStageLabel(d.video.onboardingStage),
      'Video Title': d.video.title,
      Audience: formatSegmentLabel(d.video.segment, d.video.customEmails),
      Status: videoStatusLabel(d.status),
      Views: d.viewCount,
      'Watch Time': formatWatchTime(d.watchSeconds),
      'Quiz Attempts': d.attempts,
      'Best Score (%)': d.attempts > 0 ? d.bestScore : '—',
      'Passing Score (%)': d.video.passingScore,
      'Completed On': formatDateShort(d.completedAtMs),
      'Last Active': formatDateShort(d.lastAccessedMs),
    }));

    const userLoginRows = report.userLoginLogs.map((l) => ({
      'Date & Time': formatDateTime(l.createdAt ? l.createdAt.toMillis() : 0),
      Status: formatLoginStatusLabel(l.status),
      Role: formatLoginRoleLabel(l.accessRole),
      Device: l.deviceInfo || 'Web Browser',
    }));

    const userLearningRows = report.userLearningLogs.map((e) => ({
      'Date & Time': formatDateTime(e.createdAt ? e.createdAt.toMillis() : 0),
      Activity: formatLearningEventLabel(e),
      'Video Title': e.videoTitle,
      Audience: formatSegmentLabel(e.segment),
      'Score (%)': e.eventType === 'quiz_pass' || e.eventType === 'quiz_submit' ? e.score : '—',
      'Watch Delta (s)': e.watchSecondsDelta,
    }));

    exportIndividualUserReport(
      report.email,
      summaryRows,
      detailRows,
      userLoginRows,
      userLearningRows,
    );
  };

  const complianceRate =
    audienceLearners.filter((r) => r.assignedTotal > 0).length > 0
      ? Math.round(
          (filterCounts.completed / audienceLearners.filter((r) => r.assignedTotal > 0).length) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header + Top Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Training Analytics, Stage Reports &amp; Activity Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect per-user onboarding stage, completed levels, defaulters, individual video
            status, login logs, and chronological learning logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Audience Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Audiences' },
                { id: 'operations', label: 'Operations' },
                { id: 'sales', label: 'Sales' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAudienceFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  audienceFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportFull}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#143d5e] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Primary View Switcher */}
      <div className="border-b border-slate-200 flex items-center gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveView('users')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeView === 'users'
              ? 'border-[#0D2C45] text-[#0D2C45]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Individual User Reports &amp; Defaulters</span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            ({audienceLearners.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('videos')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeView === 'videos'
              ? 'border-[#0D2C45] text-[#0D2C45]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Per-Video Status &amp; Engagement</span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            ({scopedVideos.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('logs')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeView === 'logs'
              ? 'border-[#0D2C45] text-[#0D2C45]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Login &amp; Learning Logs</span>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            ({loginLogs.length + engagementEvents.length})
          </span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: INDIVIDUAL USER REPORTS & DEFAULTERS                       */}
      {/* ================================================================= */}
      {activeView === 'users' && (
        <div className="space-y-6">
          {/* 4-Column Stage & Defaulter KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Authorized Learners</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {filterCounts.all}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {complianceRate}% fully compliant
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Active Defaulters</p>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="font-mono text-2xl font-bold text-rose-700 mt-2 tabular-nums">
                {filterCounts.all_defaulters}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {filterCounts.not_started} not started · {filterCounts.inactive_7d} inactive &gt;7d
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Stage Breakdown (Pending)</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {filterCounts.stuck_pre}{' '}
                <span className="text-sm font-normal text-slate-400">/</span>{' '}
                {filterCounts.pending_post}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Before Onboarding pending · After Onboarding pending
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Fully Completed</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="font-mono text-2xl font-bold text-emerald-700 mt-2 tabular-nums">
                {filterCounts.completed}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {loginLogs.length} total login(s) logged
              </p>
            </div>
          </div>

          {/* Defaulter Filter Bar + Search */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#1F6E82]" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Learner Stage, Defaulters &amp; Individual Logs
                  </h2>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={learnerSearch}
                    onChange={(e) => setLearnerSearch(e.target.value)}
                    placeholder="Search learner by email or name..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
                  />
                </div>
              </div>

              {/* Interactive Defaulter Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Users', count: filterCounts.all },
                    {
                      id: 'all_defaulters',
                      label: 'All Defaulters',
                      count: filterCounts.all_defaulters,
                    },
                    { id: 'not_started', label: 'Not Started', count: filterCounts.not_started },
                    {
                      id: 'stuck_pre',
                      label: 'Before Onboarding Pending',
                      count: filterCounts.stuck_pre,
                    },
                    {
                      id: 'pending_post',
                      label: 'After Onboarding Pending',
                      count: filterCounts.pending_post,
                    },
                    {
                      id: 'failed_quiz',
                      label: 'Failed Quiz Attempt',
                      count: filterCounts.failed_quiz,
                    },
                    {
                      id: 'inactive_7d',
                      label: 'Inactive > 7 Days',
                      count: filterCounts.inactive_7d,
                    },
                    { id: 'completed', label: 'Fully Completed', count: filterCounts.completed },
                  ] as const
                ).map((item) => {
                  const active = defaulterFilter === item.id;
                  const isAlertTab =
                    item.id === 'all_defaulters' ||
                    item.id === 'not_started' ||
                    item.id === 'stuck_pre' ||
                    item.id === 'failed_quiz' ||
                    item.id === 'inactive_7d';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDefaulterFilter(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? isAlertTab
                            ? 'bg-rose-700 text-white border-rose-700'
                            : 'bg-[#0D2C45] text-white border-[#0D2C45]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`ml-1.5 font-mono tabular-nums ${
                          active ? 'text-white/80' : 'text-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Individual User Stage & Defaulter Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Learner &amp; Access</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Completed Till Level</th>
                    <th className="py-3 px-4 text-center">Before / After</th>
                    <th className="py-3 px-4">Remaining</th>
                    <th className="py-3 px-4">Compliance Status</th>
                    <th className="py-3 px-4 text-right">Report &amp; Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLearners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                        No learners match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLearners.map((r) => {
                      const windows: string[] = [];
                      if (r.operationsAccess) windows.push('Operations');
                      if (r.salesAccess) windows.push('Sales');
                      if (r.customAccess) windows.push('Custom Window');
                      else if (r.directCustomVideoCount > 0)
                        windows.push(`Custom (${r.directCustomVideoCount} direct)`);

                      return (
                        <tr
                          key={r.email}
                          onClick={() => openUserModal(r.email, 'status')}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <p className="font-semibold text-slate-900 truncate">{r.name}</p>
                            <p className="text-xs text-slate-500 truncate">{r.email}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {windows.length > 0 ? windows.join(' · ') : 'No window access'} ·{' '}
                              {r.loginCount} login{r.loginCount === 1 ? '' : 's'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className={`text-xs ${stageTextClass(r.currentStage)}`}>
                              {stageLabel(r.currentStage)}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                              Last login: {r.lastLoginMs ? formatDateShort(r.lastLoginMs) : 'Never'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                              Level {r.completedTillLevel} / {r.assignedTotal}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {r.lastCompletedTitle
                                ? `Last: ${r.lastCompletedTitle}`
                                : r.assignedTotal > 0
                                  ? 'No levels completed'
                                  : '—'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <p className="font-mono text-xs text-slate-800 tabular-nums">
                              Pre {r.prePassed}/{r.preTotal} · Post {r.postPassed}/{r.postTotal}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                              {formatWatchTime(r.totalWatchSeconds)} watched
                            </p>
                          </td>

                          <td className="py-3.5 px-4 min-w-[145px]">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                              <span
                                className={
                                  r.remainingCount > 0
                                    ? 'font-semibold text-slate-900'
                                    : 'text-emerald-700 font-semibold'
                                }
                              >
                                {r.remainingCount} left
                              </span>
                              <span className="text-slate-500">{r.completionPct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  r.completionPct === 100
                                    ? 'bg-emerald-600'
                                    : r.completionPct === 0
                                      ? 'bg-rose-400'
                                      : 'bg-[#1F6E82]'
                                }`}
                                style={{ width: `${r.completionPct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p
                              className={`text-xs font-semibold ${
                                !r.isDefaulter && r.assignedTotal > 0
                                  ? 'text-emerald-700'
                                  : r.assignedTotal === 0
                                    ? 'text-slate-400'
                                    : r.isNotStarted || r.hasFailedQuiz
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                              }`}
                            >
                              {r.defaulterReason}
                            </p>
                            {r.nextPendingTitle && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                                Next (L{r.nextPendingLevel}): {r.nextPendingTitle}
                              </p>
                            )}
                          </td>

                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openUserModal(r.email, 'status')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0D2C45] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Report</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openUserModal(r.email, 'learning_logs')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1F6E82] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                <span>Logs</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: PER-VIDEO STATUS & ENGAGEMENT                              */}
      {/* ================================================================= */}
      {activeView === 'videos' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Stages' },
                  { id: 'pre_onboarding', label: 'Before Onboarding' },
                  { id: 'post_onboarding', label: 'After Onboarding' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStageFilter(st.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    stageFilter === st.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Click <span className="font-semibold text-slate-800">Check Status</span> on any video
              to inspect every learner&apos;s individual progress on that module.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Video Opens</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {engagementKpis.totalViews.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Across {scopedVideos.length} matching module(s)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Cumulative Watch Time</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {formatWatchTime(engagementKpis.totalWatchSeconds)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Active player engagement tracked</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Quiz Pass Rate</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {engagementKpis.passRate}%
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {engagementKpis.passedCount} passed · {engagementKpis.totalAttempts} quiz attempts
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Active Learners</p>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {engagementKpis.activeLearners}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {allLearnerReports.length} total assigned learners
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Individual Video Status &amp; Completion Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  See passed vs. pending learners per video and drill into individual status
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Onboarding Stage</th>
                    <th className="py-3 px-4">Audience</th>
                    <th className="py-3 px-4 text-right">Passed / Assigned</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4 text-right">Views</th>
                    <th className="py-3 px-4 text-right">Watch Time</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                    <th className="py-3 px-4 text-right">Status Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {videoMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-slate-500">
                        No modules match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    videoMetrics.map((m) => (
                      <tr
                        key={m.video.id}
                        onClick={() => {
                          setSelectedVideoId(m.video.id);
                          setVideoModalSearch('');
                          setVideoModalOnlyPending(false);
                        }}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{m.video.title}</p>
                          <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                            Order #{m.video.orderIndex} · Pass ≥ {m.video.passingScore}%
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <span
                            className={
                              m.video.onboardingStage === 'post_onboarding'
                                ? 'text-[#1F6E82] font-semibold'
                                : 'text-amber-700 font-semibold'
                            }
                          >
                            {formatStageLabel(m.video.onboardingStage)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatSegmentLabel(m.video.segment, m.video.customEmails)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-emerald-700">{m.completions}</span>
                          <span className="text-slate-400"> / {m.assignedCount}</span>
                          <span className="text-slate-500 ml-1">({m.completionRate}%)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                          <span
                            className={
                              m.pendingCount > 0
                                ? 'font-semibold text-rose-700'
                                : 'text-slate-400'
                            }
                          >
                            {m.pendingCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                          {m.views}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                          {formatWatchTime(m.watchSeconds)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                          {m.attempts > 0 ? `${m.avgBestScore}%` : '—'}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideoId(m.video.id);
                              setVideoModalSearch('');
                              setVideoModalOnlyPending(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0D2C45] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check Status</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1F6E82]" />
                    <span>Views vs. Completions by Module</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Relative view volume and learner pass counts
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span>Teal: Views</span>
                  <span>Green: Passed</span>
                </div>
              </div>

              {videoMetrics.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  Publish training modules to inspect video engagement metrics.
                </p>
              ) : (
                <div className="space-y-4">
                  {videoMetrics.map((m) => {
                    const viewWidth = Math.round((m.views / maxViews) * 100);
                    const passWidth = Math.round((m.completions / maxViews) * 100);
                    return (
                      <div key={m.video.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-3">
                          <span className="font-medium text-slate-900 truncate">
                            {m.video.title}{' '}
                            <span className="text-slate-400 font-normal">
                              · {formatStageLabel(m.video.onboardingStage)}
                            </span>
                          </span>
                          <span className="font-mono text-slate-600 tabular-nums whitespace-nowrap">
                            {m.views} views · {m.completions}/{m.assignedCount} passed
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1F6E82] rounded-full"
                              style={{ width: `${viewWidth}%` }}
                            />
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${passWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
              <div className="pb-4 mb-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Recent Engagement Events</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest video opens and quiz submissions
                </p>
              </div>

              {recentEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  No learner activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {recentEvents.map((evt) => (
                    <div key={evt.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {evt.userEmail}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {formatLearningEventLabel(evt)} · {evt.videoTitle}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                        {formatDateTime(evt.createdAt ? evt.createdAt.toMillis() : 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: GLOBAL LOGIN & LEARNING ACTIVITY LOGS                      */}
      {/* ================================================================= */}
      {activeView === 'logs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Total Login Sessions Logged</p>
                <LogIn className="w-4 h-4 text-[#0D2C45]" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {loginLogs.length}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                {new Set(loginLogs.map((l) => l.userEmail)).size} unique user(s) signed in
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Total Learning Events</p>
                <Activity className="w-4 h-4 text-[#1F6E82]" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {engagementEvents.length}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                Video opens, watch heartbeats &amp; quiz attempts
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Unlisted / Pending Logins</p>
              <p className="font-mono text-2xl font-bold text-amber-700 mt-2 tabular-nums">
                {loginLogs.filter((l) => l.status === 'pending_approval').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                BDM signup logins waiting for admin approval
              </p>
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Complete Login &amp; Learning Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by event type or search by learner email, name, or video title
                  </p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Filter by email, name, or module..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Activity' },
                    { id: 'logins', label: 'Login Logs Only' },
                    { id: 'learning', label: 'All Learning Logs' },
                    { id: 'video_open', label: 'Video Opens' },
                    { id: 'watch_heartbeat', label: 'Watch Heartbeats' },
                    { id: 'quiz_submit', label: 'Failed Quiz Attempts' },
                    { id: 'quiz_pass', label: 'Quiz Passes' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLogFilter(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      logFilter === item.id
                        ? 'bg-[#0D2C45] text-white border-[#0D2C45]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 sticky top-0">
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Log Type</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Individual View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {unifiedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No login or learning logs match your current filter.
                      </td>
                    </tr>
                  ) : (
                    unifiedLogs.slice(0, 250).map((entry) => {
                      const hasProfile = allLearnerReports.some((r) => r.email === entry.email);
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(entry.timestampMs)}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{entry.name}</p>
                            <p className="text-slate-500">{entry.email}</p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                            {entry.kind === 'login' ? 'Login' : 'Learning'}
                          </td>
                          <td
                            className={`py-3 px-4 font-semibold whitespace-nowrap ${
                              entry.statusTone === 'emerald'
                                ? 'text-emerald-700'
                                : entry.statusTone === 'rose'
                                  ? 'text-rose-700'
                                  : entry.statusTone === 'amber'
                                    ? 'text-amber-700'
                                    : 'text-[#1F6E82]'
                            }`}
                          >
                            {entry.title}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                            {entry.detail}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {hasProfile ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openUserModal(
                                    entry.email,
                                    entry.kind === 'login' ? 'login_logs' : 'learning_logs',
                                  )
                                }
                                className="text-xs font-semibold text-[#1F6E82] hover:text-[#0D2C45] underline cursor-pointer"
                              >
                                Open Learner Logs
                              </button>
                            ) : (
                              <span className="text-slate-400">Pending User</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: INDIVIDUAL USER FULL REPORT + LOGIN LOGS + LEARNING LOGS   */}
      {/* ================================================================= */}
      {selectedUserReport && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setSelectedUserEmail(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Individual Learner Report, Login Logs &amp; Learning Logs
                </p>
                <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                  {selectedUserReport.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedUserReport.email} ·{' '}
                  <span className={stageTextClass(selectedUserReport.currentStage)}>
                    {stageLabel(selectedUserReport.currentStage)}
                  </span>{' '}
                  · {selectedUserReport.defaulterReason}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportSingleUser(selectedUserReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#143d5e] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export User Report (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserEmail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                  aria-label="Close report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-6">
              <button
                type="button"
                onClick={() => setUserModalTab('status')}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  userModalTab === 'status'
                    ? 'border-[#0D2C45] text-[#0D2C45]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Video Status &amp; Stages ({selectedUserReport.assignedTotal})
              </button>
              <button
                type="button"
                onClick={() => setUserModalTab('learning_logs')}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  userModalTab === 'learning_logs'
                    ? 'border-[#0D2C45] text-[#0D2C45]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Learning Logs ({selectedUserReport.userLearningLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setUserModalTab('login_logs')}
                className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  userModalTab === 'login_logs'
                    ? 'border-[#0D2C45] text-[#0D2C45]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Login Logs ({selectedUserReport.userLoginLogs.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-slate-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Completed Till Level</p>
                  <p className="font-mono text-lg font-bold text-slate-900 mt-1 tabular-nums">
                    Level {selectedUserReport.completedTillLevel} /{' '}
                    {selectedUserReport.assignedTotal}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {selectedUserReport.lastCompletedTitle ?? 'None yet'}
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Remaining Modules</p>
                  <p
                    className={`font-mono text-lg font-bold mt-1 tabular-nums ${
                      selectedUserReport.remainingCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {selectedUserReport.remainingCount} left
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {selectedUserReport.completionPct}% overall completed
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">
                    Before / After Onboarding
                  </p>
                  <p className="font-mono text-lg font-bold text-slate-900 mt-1 tabular-nums">
                    {selectedUserReport.prePassed}/{selectedUserReport.preTotal}{' '}
                    <span className="text-slate-400 text-xs font-normal">·</span>{' '}
                    {selectedUserReport.postPassed}/{selectedUserReport.postTotal}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedUserReport.preRemaining} pre left · {selectedUserReport.postRemaining}{' '}
                    post left
                  </p>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-medium text-slate-500">Logins &amp; Watch Time</p>
                  <p className="font-mono text-lg font-bold text-slate-900 mt-1 tabular-nums">
                    {selectedUserReport.loginCount} login
                    {selectedUserReport.loginCount === 1 ? '' : 's'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {formatWatchTime(selectedUserReport.totalWatchSeconds)} · Avg{' '}
                    {selectedUserReport.avgBestScore !== null
                      ? `${selectedUserReport.avgBestScore}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* SUB-TAB 1: VIDEO STATUS & STAGES */}
              {userModalTab === 'status' &&
                (selectedUserReport.assignedVideos.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center border border-slate-200 rounded-lg">
                    This user currently has no assigned training videos.
                  </p>
                ) : (
                  (['pre_onboarding', 'post_onboarding'] as const).map((stage) => {
                    const stageItems = selectedUserReport.assignedVideos.filter(
                      (d) => d.video.onboardingStage === stage,
                    );
                    if (stageItems.length === 0) return null;
                    const stagePassed = stageItems.filter((d) => d.passed).length;

                    return (
                      <div key={stage} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {formatStageLabel(stage)}
                          </h3>
                          <span className="font-mono text-xs text-slate-600 tabular-nums">
                            {stagePassed} / {stageItems.length} completed ·{' '}
                            {stageItems.length - stagePassed} remaining
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-white">
                                <th className="py-2.5 px-4">Level</th>
                                <th className="py-2.5 px-4">Video Module</th>
                                <th className="py-2.5 px-4">Audience</th>
                                <th className="py-2.5 px-4">Status</th>
                                <th className="py-2.5 px-4 text-right">Views</th>
                                <th className="py-2.5 px-4 text-right">Watch Time</th>
                                <th className="py-2.5 px-4 text-right">Attempts</th>
                                <th className="py-2.5 px-4 text-right">Best Score</th>
                                <th className="py-2.5 px-4 text-right">Last Active</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {stageItems.map((item) => (
                                <tr key={item.video.id} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-600 tabular-nums">
                                    L{item.levelNumber}
                                  </td>
                                  <td className="py-2.5 px-4 font-medium text-slate-900">
                                    {item.video.title}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                    {formatSegmentLabel(item.video.segment, item.video.customEmails)}
                                  </td>
                                  <td
                                    className={`py-2.5 px-4 whitespace-nowrap ${videoStatusTextClass(
                                      item.status,
                                    )}`}
                                  >
                                    {videoStatusLabel(item.status)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                                    {item.viewCount}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                                    {formatWatchTime(item.watchSeconds)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                                    {item.attempts}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                    {item.attempts > 0
                                      ? `${item.bestScore}% / ${item.video.passingScore}%`
                                      : '—'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                                    {formatDateShort(item.lastAccessedMs)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                ))}

              {/* SUB-TAB 2: INDIVIDUAL LEARNING LOGS */}
              {userModalTab === 'learning_logs' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Chronological Learning Logs
                    </h3>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {selectedUserReport.userLearningLogs.length} recorded events
                    </span>
                  </div>
                  {selectedUserReport.userLearningLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No video viewing or questionnaire activity recorded for this learner yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-white sticky top-0">
                            <th className="py-2.5 px-4">Date &amp; Time</th>
                            <th className="py-2.5 px-4">Activity</th>
                            <th className="py-2.5 px-4">Video Module</th>
                            <th className="py-2.5 px-4">Audience</th>
                            <th className="py-2.5 px-4 text-right">Score / Watch</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {selectedUserReport.userLearningLogs.map((evt) => (
                            <tr key={evt.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                                {formatDateTime(evt.createdAt ? evt.createdAt.toMillis() : 0)}
                              </td>
                              <td
                                className={`py-2.5 px-4 font-semibold whitespace-nowrap ${
                                  evt.eventType === 'quiz_pass'
                                    ? 'text-emerald-700'
                                    : evt.eventType === 'quiz_submit'
                                      ? 'text-rose-700'
                                      : 'text-[#1F6E82]'
                                }`}
                              >
                                {formatLearningEventLabel(evt)}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-900">
                                {evt.videoTitle}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                {formatSegmentLabel(evt.segment)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                {evt.eventType === 'quiz_pass' || evt.eventType === 'quiz_submit'
                                  ? `${evt.score}%`
                                  : evt.watchSecondsDelta > 0
                                    ? `+${evt.watchSecondsDelta}s`
                                    : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: INDIVIDUAL LOGIN LOGS */}
              {userModalTab === 'login_logs' && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Sign-In Audit History
                    </h3>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {selectedUserReport.userLoginLogs.length} session(s)
                    </span>
                  </div>
                  {selectedUserReport.userLoginLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No login sessions have been recorded for this learner yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-white sticky top-0">
                            <th className="py-2.5 px-4">Date &amp; Time</th>
                            <th className="py-2.5 px-4">Outcome</th>
                            <th className="py-2.5 px-4">Access Role</th>
                            <th className="py-2.5 px-4">Device / Browser</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {selectedUserReport.userLoginLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                                {formatDateTime(log.createdAt ? log.createdAt.toMillis() : 0)}
                              </td>
                              <td
                                className={`py-2.5 px-4 font-semibold whitespace-nowrap ${
                                  log.status === 'granted'
                                    ? 'text-emerald-700'
                                    : log.status === 'rejected'
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                                }`}
                              >
                                {formatLoginStatusLabel(log.status)}
                              </td>
                              <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap">
                                {formatLoginRoleLabel(log.accessRole)}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500">
                                {log.deviceInfo || 'Web Browser'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: PER-VIDEO INDIVIDUAL LEARNER STATUS                        */}
      {/* ================================================================= */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideoId(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">
                  Per-Video Individual Learner Status
                </p>
                <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                  {selectedVideo.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatStageLabel(selectedVideo.onboardingStage)} ·{' '}
                  {formatSegmentLabel(selectedVideo.segment, selectedVideo.customEmails)} · Passing
                  score {selectedVideo.passingScore}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVideoId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
                aria-label="Close video status"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={videoModalSearch}
                  onChange={(e) => setVideoModalSearch(e.target.value)}
                  placeholder="Filter learners by email or name..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82]"
                />
              </div>
              <button
                type="button"
                onClick={() => setVideoModalOnlyPending((prev) => !prev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  videoModalOnlyPending
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {videoModalOnlyPending ? 'Showing Pending / Defaulters Only' : 'Show Pending Only'}
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-xs font-medium text-slate-600 sticky top-0">
                    <th className="py-3 px-5">Learner</th>
                    <th className="py-3 px-4">Individual Status</th>
                    <th className="py-3 px-4 text-right">Views</th>
                    <th className="py-3 px-4 text-right">Watch Time</th>
                    <th className="py-3 px-4 text-right">Attempts</th>
                    <th className="py-3 px-4 text-right">Best Score</th>
                    <th className="py-3 px-4 text-right">Last Active</th>
                    <th className="py-3 px-5 text-right">Full Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {selectedVideoLearnerRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No learners match the current filter for this video.
                      </td>
                    </tr>
                  ) : (
                    selectedVideoLearnerRows.map(({ learner, detail }) => (
                      <tr key={learner.email} className="hover:bg-slate-50">
                        <td className="py-3 px-5">
                          <p className="font-semibold text-slate-900">{learner.name}</p>
                          <p className="text-slate-500">{learner.email}</p>
                        </td>
                        <td
                          className={`py-3 px-4 whitespace-nowrap ${videoStatusTextClass(
                            detail.status,
                          )}`}
                        >
                          {videoStatusLabel(detail.status)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {detail.viewCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatWatchTime(detail.watchSeconds)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {detail.attempts}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {detail.attempts > 0 ? `${detail.bestScore}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                          {formatDateShort(detail.lastAccessedMs)}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVideoId(null);
                              openUserModal(learner.email, 'status');
                            }}
                            className="text-xs font-semibold text-[#1F6E82] hover:text-[#0D2C45] underline cursor-pointer"
                          >
                            User Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
