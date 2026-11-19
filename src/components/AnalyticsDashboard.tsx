import React, { useMemo, useState } from 'react';
import { BarChart3, Download, Search } from 'lucide-react';
import type {
  EngagementEvent,
  Segment,
  TeamAccessRecord,
  TrainingVideo,
  UserVideoProgress,
} from '../types';
import { exportAnalyticsWorkbook } from '../utils/excelParser';

interface AnalyticsDashboardProps {
  videos: TrainingVideo[];
  allProgress: UserVideoProgress[];
  engagementEvents: EngagementEvent[];
  teamAccessList: TeamAccessRecord[];
}

function formatWatchTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  videos,
  allProgress,
  engagementEvents,
  teamAccessList,
}) => {
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'operations' | 'sales'>('all');
  const [learnerSearch, setLearnerSearch] = useState('');

  const filteredVideos = useMemo(() => {
    if (segmentFilter === 'all') return videos;
    return videos.filter((v) => v.segment === segmentFilter || v.segment === 'both');
  }, [videos, segmentFilter]);

  const filteredVideoIds = useMemo(
    () => new Set(filteredVideos.map((v) => v.id)),
    [filteredVideos],
  );

  const filteredProgress = useMemo(
    () => allProgress.filter((p) => filteredVideoIds.has(p.videoId)),
    [allProgress, filteredVideoIds],
  );

  // Aggregate KPI metrics
  const kpis = useMemo(() => {
    const totalViews = filteredProgress.reduce((acc, p) => acc + p.viewCount, 0);
    const totalWatchSeconds = filteredProgress.reduce((acc, p) => acc + p.watchSeconds, 0);
    const totalAttempts = filteredProgress.reduce((acc, p) => acc + p.attempts, 0);
    const passedCount = filteredProgress.filter((p) => p.passed).length;
    const activeLearners = new Set(filteredProgress.map((p) => p.userEmail)).size;
    const passRate =
      filteredProgress.length > 0 ? Math.round((passedCount / filteredProgress.length) * 100) : 0;

    return {
      totalViews,
      totalWatchSeconds,
      totalAttempts,
      passedCount,
      passRate,
      activeLearners,
    };
  }, [filteredProgress]);

  // Per-video breakdown
  const videoMetrics = useMemo(() => {
    return filteredVideos.map((video) => {
      const records = allProgress.filter((p) => p.videoId === video.id);
      const views = records.reduce((sum, r) => sum + r.viewCount, 0);
      const watchSeconds = records.reduce((sum, r) => sum + r.watchSeconds, 0);
      const uniqueLearners = records.length;
      const attempts = records.reduce((sum, r) => sum + r.attempts, 0);
      const completions = records.filter((r) => r.passed).length;
      const passRate = uniqueLearners > 0 ? Math.round((completions / uniqueLearners) * 100) : 0;
      const avgBestScore =
        uniqueLearners > 0
          ? Math.round(records.reduce((sum, r) => sum + r.bestScore, 0) / uniqueLearners)
          : 0;

      return {
        video,
        views,
        watchSeconds,
        uniqueLearners,
        attempts,
        completions,
        passRate,
        avgBestScore,
      };
    });
  }, [filteredVideos, allProgress]);

  const maxViews = Math.max(1, ...videoMetrics.map((m) => m.views));

  // Per-learner progress matrix
  const learnerMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        email: string;
        name: string;
        operationsAccess: boolean;
        salesAccess: boolean;
        videosStarted: number;
        videosPassed: number;
        totalWatchSeconds: number;
        scores: number[];
        lastAccessedMs: number;
      }
    >();

    teamAccessList.forEach((member) => {
      if (segmentFilter === 'operations' && !member.operationsAccess) return;
      if (segmentFilter === 'sales' && !member.salesAccess) return;
      map.set(member.email, {
        email: member.email,
        name: member.displayName || member.email,
        operationsAccess: member.operationsAccess,
        salesAccess: member.salesAccess,
        videosStarted: 0,
        videosPassed: 0,
        totalWatchSeconds: 0,
        scores: [],
        lastAccessedMs: 0,
      });
    });

    filteredProgress.forEach((p) => {
      const existing = map.get(p.userEmail) ?? {
        email: p.userEmail,
        name: p.userName || p.userEmail,
        operationsAccess: p.segment === 'operations' || p.segment === 'both',
        salesAccess: p.segment === 'sales' || p.segment === 'both',
        videosStarted: 0,
        videosPassed: 0,
        totalWatchSeconds: 0,
        scores: [],
        lastAccessedMs: 0,
      };

      if (p.userName) existing.name = p.userName;
      existing.videosStarted += 1;
      if (p.passed) existing.videosPassed += 1;
      existing.totalWatchSeconds += p.watchSeconds;
      if (p.attempts > 0) existing.scores.push(p.bestScore);
      const accessedMs = p.lastAccessedAt ? p.lastAccessedAt.toMillis() : 0;
      if (accessedMs > existing.lastAccessedMs) existing.lastAccessedMs = accessedMs;

      map.set(p.userEmail, existing);
    });

    const q = learnerSearch.trim().toLowerCase();
    return Array.from(map.values())
      .filter((l) => !q || l.email.includes(q) || l.name.toLowerCase().includes(q))
      .sort((a, b) => b.videosPassed - a.videosPassed || b.totalWatchSeconds - a.totalWatchSeconds);
  }, [teamAccessList, filteredProgress, segmentFilter, learnerSearch]);

  // Recent engagement events
  const recentEvents = useMemo(
    () =>
      engagementEvents
        .filter((e) => filteredVideoIds.has(e.videoId))
        .slice(0, 12),
    [engagementEvents, filteredVideoIds],
  );

  const handleExport = () => {
    const videoRows = videoMetrics.map((m) => ({
      Title: m.video.title,
      Segment: m.video.segment,
      Views: m.views,
      'Unique Learners': m.uniqueLearners,
      'Watch Seconds': m.watchSeconds,
      'Quiz Attempts': m.attempts,
      Completions: m.completions,
      'Pass Rate (%)': m.passRate,
      'Avg Best Score (%)': m.avgBestScore,
    }));

    const learnerRows = learnerMetrics.map((l) => ({
      Email: l.email,
      Name: l.name,
      'Operations Access': l.operationsAccess ? 'Yes' : 'No',
      'Sales Access': l.salesAccess ? 'Yes' : 'No',
      'Modules Started': l.videosStarted,
      'Modules Passed': l.videosPassed,
      'Total Watch Seconds': l.totalWatchSeconds,
      'Avg Score (%)':
        l.scores.length > 0
          ? Math.round(l.scores.reduce((a, b) => a + b, 0) / l.scores.length)
          : 0,
    }));

    exportAnalyticsWorkbook(videoRows, learnerRows);
  };

  const segmentLabel = (seg: Segment) =>
    seg === 'both' ? 'Operations & Sales' : seg === 'operations' ? 'Operations' : 'Sales';

  return (
    <div className="space-y-8">
      {/* Header + Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Video Engagement Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live learner views, watch durations, and questionnaire mastery across teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Teams' },
                { id: 'operations', label: 'Operations' },
                { id: 'sales', label: 'Sales' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSegmentFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  segmentFilter === tab.id
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
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .xlsx</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Video Opens</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {kpis.totalViews.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across {filteredVideos.length} active module(s)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Cumulative Watch Time</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {formatWatchTime(kpis.totalWatchSeconds)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Active player engagement tracked</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Module Completion Rate</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {kpis.passRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {kpis.passedCount} passed · {kpis.totalAttempts} quiz attempts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active Learners</p>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {kpis.activeLearners}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {teamAccessList.length} total allowlisted emails
          </p>
        </div>
      </div>

      {/* Visual Engagement Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Views vs. Completions by Module</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Relative view volume and learner pass counts
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>Blue: Views</span>
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 truncate max-w-md">
                        {m.video.title}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {m.views} views · {m.completions} passed
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
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
            <p className="text-xs text-slate-500 mt-0.5">Latest video opens and quiz submissions</p>
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
                    <p className="text-xs font-medium text-slate-900 truncate">{evt.userEmail}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {evt.eventType === 'video_open'
                        ? 'Opened video'
                        : evt.eventType === 'watch_heartbeat'
                          ? `Watched +${evt.watchSecondsDelta}s`
                          : evt.eventType === 'quiz_pass'
                            ? `Passed quiz (${evt.score}%)`
                            : `Submitted quiz (${evt.score}%)`}{' '}
                      · {evt.videoTitle}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                    {evt.createdAt
                      ? evt.createdAt.toDate().toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Just now'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Per-Video Engagement Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Module Engagement Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4 text-right">Views</th>
                <th className="py-3 px-4 text-right">Learners</th>
                <th className="py-3 px-4 text-right">Watch Time</th>
                <th className="py-3 px-4 text-right">Attempts</th>
                <th className="py-3 px-4 text-right">Pass Rate</th>
                <th className="py-3 px-4 text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {videoMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                    No modules available in this segment.
                  </td>
                </tr>
              ) : (
                videoMetrics.map((m) => (
                  <tr key={m.video.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{m.video.title}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {segmentLabel(m.video.segment)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {m.views}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {m.uniqueLearners}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {formatWatchTime(m.watchSeconds)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {m.attempts}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {m.passRate}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {m.avgBestScore}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Learner Progress Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Learner Progress Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Includes all allowlisted Operations and Sales members
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
              placeholder="Filter by email or name..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Learner</th>
                <th className="py-3 px-4">Window Access</th>
                <th className="py-3 px-4 text-right">Started</th>
                <th className="py-3 px-4 text-right">Passed</th>
                <th className="py-3 px-4 text-right">Avg Best Score</th>
                <th className="py-3 px-4 text-right">Watch Time</th>
                <th className="py-3 px-4 text-right">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {learnerMetrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No authorized learners found.
                  </td>
                </tr>
              ) : (
                learnerMetrics.map((l) => {
                  const avgScore =
                    l.scores.length > 0
                      ? Math.round(l.scores.reduce((a, b) => a + b, 0) / l.scores.length)
                      : 0;
                  const windows: string[] = [];
                  if (l.operationsAccess) windows.push('Operations');
                  if (l.salesAccess) windows.push('Sales');
                  return (
                    <tr key={l.email} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{l.name}</p>
                        <p className="text-xs text-slate-500">{l.email}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {windows.length > 0 ? windows.join(' · ') : 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {l.videosStarted}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {l.videosPassed}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {l.scores.length > 0 ? `${avgScore}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {formatWatchTime(l.totalWatchSeconds)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {l.lastAccessedMs > 0
                          ? new Date(l.lastAccessedMs).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Never'}
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
  );
};
