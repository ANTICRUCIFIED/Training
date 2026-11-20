import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Lock,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  normalizeEmail,
  recordVideoOpen,
  recordWatchHeartbeat,
  sortTrainingVideos,
  submitQuestionnaireAttempt,
  type QuizSubmissionResult,
} from '../services/firestoreService';
import type { OnboardingStage, TrackSegment, TrainingVideo, UserVideoProgress } from '../types';
import { getDriveExternalUrl, getDrivePreviewUrl } from '../utils/drive';
import { formatSegmentLabel, formatStageLabel } from './VideoUploadManager';

interface TrainingTrackViewProps {
  track: TrackSegment;
  videos: TrainingVideo[];
  progressMap: Record<string, UserVideoProgress>;
  user: User;
  isAdmin: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export const TrainingTrackView: React.FC<TrainingTrackViewProps> = ({
  track,
  videos,
  progressMap,
  user,
  isAdmin,
}) => {
  const userEmail = normalizeEmail(user.email ?? '');

  const trackVideos = useMemo(() => {
    const filtered = videos.filter((v) => {
      if (track === 'operations') return v.segment === 'operations' || v.segment === 'both';
      if (track === 'sales') return v.segment === 'sales' || v.segment === 'both';
      // Custom Audience window
      if (v.segment === 'custom') return true;
      if (v.segment === 'custom_list') {
        return isAdmin || v.customEmails.includes(userEmail);
      }
      return false;
    });
    return sortTrainingVideos(filtered);
  }, [videos, track, isAdmin, userEmail]);

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [adminUnlockAll, setAdminUnlockAll] = useState<boolean>(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Determine unlocked status per module sequentially (Before Onboarding -> After Onboarding)
  const unlockedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    trackVideos.forEach((video, index) => {
      if (isAdmin && adminUnlockAll) {
        map[video.id] = true;
        return;
      }
      if (index === 0) {
        map[video.id] = true;
      } else {
        const prevVideo = trackVideos[index - 1];
        map[video.id] = Boolean(progressMap[prevVideo.id]?.passed);
      }
    });
    return map;
  }, [trackVideos, progressMap, isAdmin, adminUnlockAll]);

  // Select first incomplete unlocked video or first video when track changes
  useEffect(() => {
    if (trackVideos.length === 0) {
      setSelectedVideoId(null);
      return;
    }
    if (selectedVideoId && trackVideos.some((v) => v.id === selectedVideoId)) {
      return;
    }
    const firstIncomplete = trackVideos.find(
      (v) => unlockedMap[v.id] && !progressMap[v.id]?.passed,
    );
    setSelectedVideoId(firstIncomplete?.id ?? trackVideos[0].id);
  }, [trackVideos, selectedVideoId, unlockedMap, progressMap]);

  const activeVideoIndex = trackVideos.findIndex((v) => v.id === selectedVideoId);
  const activeVideo = activeVideoIndex >= 0 ? trackVideos[activeVideoIndex] : null;
  const activeProgress = activeVideo ? progressMap[activeVideo.id] : undefined;
  const nextVideo =
    activeVideoIndex >= 0 && activeVideoIndex + 1 < trackVideos.length
      ? trackVideos[activeVideoIndex + 1]
      : null;

  useEffect(() => {
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizError(null);
  }, [selectedVideoId]);

  // Record video_open once per video selection and send watch heartbeats every 15s
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeVideo || !unlockedMap[activeVideo.id]) return;

    if (openedRef.current !== activeVideo.id) {
      openedRef.current = activeVideo.id;
      void recordVideoOpen(user, activeVideo);
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void recordWatchHeartbeat(user, activeVideo, 15);
      }
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeVideo, unlockedMap, user]);

  const preVideos = useMemo(
    () => trackVideos.filter((v) => v.onboardingStage === 'pre_onboarding'),
    [trackVideos],
  );
  const postVideos = useMemo(
    () => trackVideos.filter((v) => v.onboardingStage === 'post_onboarding'),
    [trackVideos],
  );

  const prePassed = preVideos.filter((v) => progressMap[v.id]?.passed).length;
  const postPassed = postVideos.filter((v) => progressMap[v.id]?.passed).length;
  const completedCount = prePassed + postPassed;
  const remainingCount = trackVideos.length - completedCount;
  const completionPct =
    trackVideos.length > 0 ? Math.round((completedCount / trackVideos.length) * 100) : 0;

  const currentStageLabel =
    trackVideos.length === 0
      ? 'No Modules'
      : completedCount === trackVideos.length
        ? 'All Stages Completed'
        : prePassed < preVideos.length
          ? 'Stage 1: Before Onboarding'
          : 'Stage 2: After Onboarding';

  const trackTitle =
    track === 'operations'
      ? 'Operations Training Window'
      : track === 'sales'
        ? 'Sales Training Window'
        : 'Custom Audience Training Window';

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    setQuizError(null);
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo) return;

    if (activeVideo.questions.length > 0) {
      const unanswered = activeVideo.questions.findIndex(
        (_, idx) => selectedAnswers[idx] === undefined,
      );
      if (unanswered !== -1) {
        setQuizError(`Please select an answer for Question ${unanswered + 1} before submitting.`);
        return;
      }
    }

    setSubmittingQuiz(true);
    setQuizError(null);
    try {
      const result = await submitQuestionnaireAttempt(user, activeVideo, selectedAnswers);
      setQuizResult(result);
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Unable to submit questionnaire.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizError(null);
  };

  if (trackVideos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Play className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          No training modules assigned to{' '}
          {track === 'operations'
            ? 'Operations'
            : track === 'sales'
              ? 'Sales'
              : 'Custom Audience'}{' '}
          yet
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
          Once an administrator publishes training modules for this window, they will appear here
          organized by Before Onboarding and After Onboarding stages.
        </p>
      </div>
    );
  }

  const stageGroups: Array<{
    key: OnboardingStage;
    heading: string;
    items: TrainingVideo[];
    passedCount: number;
  }> = [
    {
      key: 'pre_onboarding' as const,
      heading: 'Before Onboarding',
      items: preVideos,
      passedCount: prePassed,
    },
    {
      key: 'post_onboarding' as const,
      heading: 'After Onboarding',
      items: postVideos,
      passedCount: postPassed,
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Track Summary Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{trackTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentStageLabel} · Level {completedCount} of {trackVideos.length} completed ·{' '}
            {remainingCount} remaining
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminUnlockAll((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                adminUnlockAll
                  ? 'bg-teal-50 border-teal-200 text-[#0D2C45]'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {adminUnlockAll ? 'Admin Preview: All Unlocked' : 'Admin Preview: Enforced Gating'}
            </button>
          )}
          <div className="min-w-[190px]">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Track Progress</span>
              <span className="font-mono font-medium tabular-nums">
                {completedCount}/{trackVideos.length} ({completionPct}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1F6E82] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Sequential Playlist + Active Player & Quiz */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Module Sequence Grouped by Onboarding Stage */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Curriculum Sequence</h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {trackVideos.length} levels
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {stageGroups.map((group) => (
              <div key={group.key}>
                <div className="px-5 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-semibold text-[#0D2C45]">
                  <span>{group.heading}</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    {group.passedCount}/{group.items.length} passed
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map((video) => {
                    const globalIdx = trackVideos.findIndex((v) => v.id === video.id);
                    const unlocked = Boolean(unlockedMap[video.id]);
                    const prog = progressMap[video.id];
                    const isPassed = Boolean(prog?.passed);
                    const isSelected = video.id === activeVideo?.id;

                    return (
                      <button
                        key={video.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => unlocked && setSelectedVideoId(video.id)}
                        className={`w-full text-left px-5 py-4 transition-colors flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-teal-50/70'
                            : unlocked
                              ? 'hover:bg-slate-50 cursor-pointer'
                              : 'bg-slate-50/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : unlocked ? (
                            <Play
                              className={`w-4 h-4 ${
                                isSelected ? 'text-[#1F6E82]' : 'text-slate-600'
                              }`}
                            />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-slate-500 tabular-nums">
                              Level {String(globalIdx + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`text-xs font-medium whitespace-nowrap ${
                                isPassed
                                  ? 'text-emerald-700'
                                  : unlocked
                                    ? 'text-[#1F6E82]'
                                    : 'text-slate-500'
                              }`}
                            >
                              {isPassed
                                ? `Passed · ${prog?.bestScore ?? 100}%`
                                : unlocked
                                  ? 'Unlocked'
                                  : 'Locked'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mt-1 truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {video.questions.length} questions · Pass {video.passingScore}%
                            {video.segment === 'both' ? ' · Shared' : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Video Player & Questionnaire */}
        {activeVideo && (
          <div className="lg:col-span-8 space-y-6">
            {/* Video Player Surface */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">
                      Level {String(activeVideoIndex + 1).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#0D2C45]">
                      {formatStageLabel(activeVideo.onboardingStage)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatSegmentLabel(activeVideo.segment, activeVideo.customEmails)}</span>
                    {activeProgress && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3 h-3" />
                          {formatDuration(activeProgress.watchSeconds)} watched
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{activeVideo.title}</h2>
                </div>

                <a
                  href={getDriveExternalUrl(activeVideo.driveFileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Open in Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Embedded Google Drive Player */}
              <div className="aspect-video w-full bg-slate-950">
                <iframe
                  key={activeVideo.id}
                  src={getDrivePreviewUrl(activeVideo.driveFileId)}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>

              {activeVideo.description && (
                <div className="px-6 py-4 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                  {activeVideo.description}
                </div>
              )}
            </div>

            {/* Questionnaire Assessment Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#1F6E82]" />
                    <span>Module Questionnaire</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeVideo.questions.length > 0
                      ? `Score at least ${activeVideo.passingScore}% across ${activeVideo.questions.length} questions to unlock the next level.`
                      : 'No questions configured for this video. Confirm completion to continue.'}
                  </p>
                </div>

                {activeProgress && activeProgress.attempts > 0 && (
                  <div className="text-right text-xs text-slate-600 font-mono tabular-nums">
                    <span>Best: {activeProgress.bestScore}%</span>
                    <span className="mx-2 text-slate-300">/</span>
                    <span>Attempts: {activeProgress.attempts}</span>
                  </div>
                )}
              </div>

              {(quizResult || activeProgress?.passed) && (
                <div
                  className={`mb-6 p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    (quizResult ? quizResult.passed : activeProgress?.passed)
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {quizResult
                        ? quizResult.passed
                          ? `Passed (${quizResult.score}% · ${quizResult.correctCount}/${quizResult.totalQuestions} correct)`
                          : `Score ${quizResult.score}% (${quizResult.correctCount}/${quizResult.totalQuestions} correct) — ${activeVideo.passingScore}% required`
                        : `Module Completed (Best Score: ${activeProgress?.bestScore ?? 100}%)`}
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      {(quizResult ? quizResult.passed : activeProgress?.passed)
                        ? nextVideo
                          ? `Next level unlocked: ${nextVideo.title}`
                          : 'You have completed all modules currently in this track.'
                        : 'Review the video and adjust your answers to pass.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {quizResult && !quizResult.passed && (
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    )}
                    {(quizResult ? quizResult.passed : activeProgress?.passed) && nextVideo && (
                      <button
                        type="button"
                        onClick={() => setSelectedVideoId(nextVideo.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>Continue to Next Video</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {quizError && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {quizError}
                </div>
              )}

              <form onSubmit={handleSubmitQuiz} className="space-y-6">
                {activeVideo.questions.map((q, qIdx) => (
                  <fieldset key={qIdx} className="space-y-2.5">
                    <legend className="text-sm font-medium text-slate-900">
                      <span className="font-mono text-xs text-slate-500 mr-2 tabular-nums">
                        Q{qIdx + 1}.
                      </span>
                      {q.question}
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const checked = selectedAnswers[qIdx] === oIdx;
                        return (
                          <label
                            key={oIdx}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                              checked
                                ? 'bg-teal-50 border-[#1F6E82] text-slate-900'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${activeVideo.id}-${qIdx}`}
                              value={oIdx}
                              checked={checked}
                              onChange={() => handleSelectOption(qIdx, oIdx)}
                              className="mt-0.5 accent-[#0D2C45] shrink-0"
                            />
                            <span className="leading-snug">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submittingQuiz}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <span>
                      {submittingQuiz
                        ? 'Submitting...'
                        : activeVideo.questions.length === 0
                          ? 'Mark Completed & Unlock Next'
                          : 'Submit Questionnaire'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
