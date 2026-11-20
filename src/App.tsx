import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  BarChart3,
  Briefcase,
  FileText,
  Film,
  LogOut,
  Menu,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { BrandMark } from './components/BrandMark';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  LegalPage,
  PrivacyPolicyContent,
  TermsOfServiceContent,
} from './components/LegalPages';
import { LoginView } from './components/LoginView';
import { TeamAccessWindows } from './components/TeamAccessWindows';
import { TrainingTrackView } from './components/TrainingTrackView';
import { VideoUploadManager } from './components/VideoUploadManager';
import { auth, googleProvider } from './firebase';
import {
  LEGAL_POLICY_VERSION,
  recordLegalAcceptance,
  resolveUserAccess,
  subscribeAdminsList,
  subscribeAllProgress,
  subscribeEngagementEvents,
  subscribeTeamAccessList,
  subscribeTrainingVideos,
  subscribeUserProgress,
  syncSignedInUserProfile,
} from './services/firestoreService';
import type {
  AdminUserRecord,
  AuthAccessState,
  EngagementEvent,
  TeamAccessRecord,
  TrainingVideo,
  UserVideoProgress,
} from './types';

type AppTab =
  | 'operations'
  | 'sales'
  | 'admin-videos'
  | 'admin-access'
  | 'admin-analytics';

const LS_READ_TERMS = 'racforge_read_terms_v1';
const LS_READ_PRIVACY = 'racforge_read_privacy_v1';
const LS_ACCEPTED_LEGAL = 'racforge_legal_accepted_version';

function readStorageFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function readAcceptedVersion(): boolean {
  try {
    return window.localStorage.getItem(LS_ACCEPTED_LEGAL) === LEGAL_POLICY_VERSION;
  } catch {
    return false;
  }
}

function TrainingWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [readTerms, setReadTerms] = useState<boolean>(() => readStorageFlag(LS_READ_TERMS));
  const [readPrivacy, setReadPrivacy] = useState<boolean>(() => readStorageFlag(LS_READ_PRIVACY));
  const [agreedOnHome, setAgreedOnHome] = useState<boolean>(() => readAcceptedVersion());
  const [previouslyAccepted, setPreviouslyAccepted] = useState<boolean>(() =>
    readAcceptedVersion(),
  );
  const [hasAcceptedLegalInDb, setHasAcceptedLegalInDb] = useState<boolean>(false);
  const [postLoginModalDoc, setPostLoginModalDoc] = useState<'terms' | 'privacy' | null>(null);
  const [savingAcceptance, setSavingAcceptance] = useState<boolean>(false);

  const [access, setAccess] = useState<AuthAccessState | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('operations');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((path: '/' | '/privacy' | '/terms') => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleMarkRead = useCallback((docType: 'terms' | 'privacy') => {
    try {
      if (docType === 'terms') {
        window.localStorage.setItem(LS_READ_TERMS, 'true');
        setReadTerms(true);
      } else {
        window.localStorage.setItem(LS_READ_PRIVACY, 'true');
        setReadPrivacy(true);
      }
    } catch {
      if (docType === 'terms') setReadTerms(true);
      else setReadPrivacy(true);
    }
  }, []);

  // Shared Firestore state
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserVideoProgress>>({});
  const [teamAccessList, setTeamAccessList] = useState<TeamAccessRecord[]>([]);
  const [adminsList, setAdminsList] = useState<AdminUserRecord[]>([]);
  const [allProgress, setAllProgress] = useState<UserVideoProgress[]>([]);
  const [engagementEvents, setEngagementEvents] = useState<EngagementEvent[]>([]);

  const loadAccess = useCallback(
    async (currentUser: User, recordAcceptanceNow: boolean) => {
      setAccessLoading(true);
      try {
        const { hasAcceptedLegal } = await syncSignedInUserProfile(
          currentUser,
          recordAcceptanceNow,
        );
        setHasAcceptedLegalInDb(hasAcceptedLegal);
        if (hasAcceptedLegal) {
          try {
            window.localStorage.setItem(LS_ACCEPTED_LEGAL, LEGAL_POLICY_VERSION);
            window.localStorage.setItem(LS_READ_TERMS, 'true');
            window.localStorage.setItem(LS_READ_PRIVACY, 'true');
          } catch {
            // ignore storage errors
          }
          setPreviouslyAccepted(true);
        }
        const resolved = await resolveUserAccess(currentUser);
        setAccess(resolved);
      } finally {
        setAccessLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        const clientAgreed = readAcceptedVersion() || (readTerms && readPrivacy && agreedOnHome);
        void loadAccess(currentUser, clientAgreed);
      } else {
        setAccess(null);
        setHasAcceptedLegalInDb(false);
        setVideos([]);
        setUserProgress({});
        setTeamAccessList([]);
        setAdminsList([]);
        setAllProgress([]);
        setEngagementEvents([]);
      }
    });
    return () => unsub();
  }, [loadAccess, readTerms, readPrivacy, agreedOnHome]);

  // Attach Firestore listeners only when auth, legal acceptance, and access are resolved
  useEffect(() => {
    if (!user || !access || !hasAcceptedLegalInDb) return;
    if (!access.isAdmin && !access.operationsAccess && !access.salesAccess) return;

    const unsubVideos = subscribeTrainingVideos(access, setVideos);
    const unsubProgress = subscribeUserProgress(user.uid, setUserProgress);

    let unsubTeam = () => {};
    let unsubAdmins = () => {};
    let unsubAllProgress = () => {};
    let unsubEvents = () => {};

    if (access.isAdmin) {
      unsubTeam = subscribeTeamAccessList(setTeamAccessList);
      unsubAdmins = subscribeAdminsList(setAdminsList);
      unsubAllProgress = subscribeAllProgress(setAllProgress);
      unsubEvents = subscribeEngagementEvents(setEngagementEvents);
    }

    return () => {
      unsubVideos();
      unsubProgress();
      unsubTeam();
      unsubAdmins();
      unsubAllProgress();
      unsubEvents();
    };
  }, [user, access, hasAcceptedLegalInDb]);

  // Available navigation tabs based on RBAC
  const navItems = useMemo(() => {
    if (!access) return [];
    const items: Array<{
      id: AppTab;
      label: string;
      section: 'Training Windows' | 'Admin Portal';
      icon: React.ComponentType<{ className?: string }>;
    }> = [];

    if (access.isAdmin || access.operationsAccess) {
      items.push({
        id: 'operations',
        label: 'Operations Window',
        section: 'Training Windows',
        icon: Wrench,
      });
    }
    if (access.isAdmin || access.salesAccess) {
      items.push({
        id: 'sales',
        label: 'Sales Window',
        section: 'Training Windows',
        icon: Briefcase,
      });
    }

    if (access.isAdmin) {
      items.push(
        {
          id: 'admin-videos',
          label: 'Upload & Videos',
          section: 'Admin Portal',
          icon: Film,
        },
        {
          id: 'admin-access',
          label: 'Team Access Windows',
          section: 'Admin Portal',
          icon: Users,
        },
        {
          id: 'admin-analytics',
          label: 'Engagement Analytics',
          section: 'Admin Portal',
          icon: BarChart3,
        },
      );
    }

    return items;
  }, [access]);

  // Keep activeTab valid for user's resolved role
  useEffect(() => {
    if (!access || navItems.length === 0) return;
    if (navItems.some((i) => i.id === activeTab)) return;
    if (access.isAdmin) {
      setActiveTab('admin-videos');
    } else {
      setActiveTab(navItems[0].id);
    }
  }, [access, navItems, activeTab]);

  const handleGoogleSignIn = async () => {
    if (!previouslyAccepted && !(readTerms && readPrivacy && agreedOnHome)) {
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      try {
        window.localStorage.setItem(LS_ACCEPTED_LEGAL, LEGAL_POLICY_VERSION);
      } catch {
        // ignore
      }
      setPreviouslyAccepted(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleConfirmFirstTimeLegal = async () => {
    if (!user || !readTerms || !readPrivacy || !agreedOnHome) return;
    setSavingAcceptance(true);
    try {
      await recordLegalAcceptance(user);
      try {
        window.localStorage.setItem(LS_ACCEPTED_LEGAL, LEGAL_POLICY_VERSION);
      } catch {
        // ignore
      }
      setPreviouslyAccepted(true);
      setHasAcceptedLegalInDb(true);
    } finally {
      setSavingAcceptance(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (currentPath === '/privacy') {
    return <LegalPage page="privacy" onNavigate={navigateTo} />;
  }

  if (currentPath === '/terms') {
    return <LegalPage page="terms" onNavigate={navigateTo} />;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Initializing RAC Forge Training Portal...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onSignIn={() => void handleGoogleSignIn()}
        signingIn={signingIn}
        authError={authError}
        onNavigate={navigateTo}
        readTerms={readTerms}
        readPrivacy={readPrivacy}
        agreed={agreedOnHome}
        previouslyAccepted={previouslyAccepted}
        onMarkRead={handleMarkRead}
        onToggleAgreed={setAgreedOnHome}
      />
    );
  }

  if (accessLoading || !access) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-500">Verifying team permissions...</div>
      </div>
    );
  }

  // First-time per-account Firestore legal acceptance gate (e.g. shared browser)
  if (!hasAcceptedLegalInDb) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
          <BrandMark />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 space-y-5">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                First-Time Agreement Required
              </h1>
              <p className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                Please read the Terms of Service and Privacy Policy and agree before accessing the
                portal for the first time ({user.email}).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  handleMarkRead('terms');
                  setPostLoginModalDoc('terms');
                }}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-left cursor-pointer ${
                  readTerms
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-blue-400'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>Read Terms of Service</span>
                </span>
                <span className="text-xs font-medium">
                  {readTerms ? 'Read' : 'Required'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMarkRead('privacy');
                  setPostLoginModalDoc('privacy');
                }}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-left cursor-pointer ${
                  readPrivacy
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-blue-400'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Read Privacy Policy</span>
                </span>
                <span className="text-xs font-medium">
                  {readPrivacy ? 'Read' : 'Required'}
                </span>
              </button>
            </div>

            <label
              className={`flex items-start gap-2.5 text-sm ${
                readTerms && readPrivacy ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={agreedOnHome}
                disabled={!readTerms || !readPrivacy}
                onChange={(e) => setAgreedOnHome(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
              />
              <span className="font-semibold text-slate-900">
                I have read and agree to the Terms of Service and Privacy Policy.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Decline &amp; Sign Out
              </button>
              <button
                type="button"
                disabled={!readTerms || !readPrivacy || !agreedOnHome || savingAcceptance}
                onClick={() => void handleConfirmFirstTimeLegal()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingAcceptance ? 'Saving...' : 'Agree & Continue'}
              </button>
            </div>
          </div>
        </main>

        {postLoginModalDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">
                  {postLoginModalDoc === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </span>
                <button
                  type="button"
                  onClick={() => setPostLoginModalDoc(null)}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {postLoginModalDoc === 'terms' ? (
                  <TermsOfServiceContent />
                ) : (
                  <PrivacyPolicyContent />
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPostLoginModalDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  I Have Read This Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasAnyAccess = access.isAdmin || access.operationsAccess || access.salesAccess;

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
          <BrandMark />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center">
            <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-slate-900">Team Access Pending</h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              You are signed in as <span className="font-medium text-slate-900">{user.email}</span>
              , which has not yet been added to the Operations or Sales access windows.
            </p>
            <p className="text-xs text-slate-500 mt-3">
              Ask your administrator to add your email ID to the Operations or Sales window in the
              Admin Portal.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadAccess(user, true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Access Again</span>
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentNav = navItems.find((i) => i.id === activeTab);
  const roleSummary = access.isAdmin
    ? 'Administrator'
    : access.operationsAccess && access.salesAccess
      ? 'Operations & Sales'
      : access.operationsAccess
        ? 'Operations Team'
        : 'Sales Team';

  const trainingNav = navItems.filter((i) => i.section === 'Training Windows');
  const adminNav = navItems.filter((i) => i.section === 'Admin Portal');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <BrandMark size="sm" />
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {trainingNav.length > 0 && (
            <div>
              <p className="px-3 text-xs font-medium text-slate-400 mb-2">Training Windows</p>
              <div className="space-y-1">
                {trainingNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {adminNav.length > 0 && (
            <div>
              <p className="px-3 text-xs font-medium text-slate-400 mb-2">Admin Portal</p>
              <div className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-900 truncate">
            {user.displayName || user.email}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {user.email} · {roleSummary}
          </p>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <BrandMark size="sm" />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
              {[...trainingNav, ...adminNav].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">{currentNav?.section ?? 'Workspace'}</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {currentNav?.label ?? 'Training'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 whitespace-nowrap">
              {roleSummary}
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'operations' && (
            <TrainingTrackView
              track="operations"
              videos={videos}
              progressMap={userProgress}
              user={user}
              isAdmin={access.isAdmin}
            />
          )}

          {activeTab === 'sales' && (
            <TrainingTrackView
              track="sales"
              videos={videos}
              progressMap={userProgress}
              user={user}
              isAdmin={access.isAdmin}
            />
          )}

          {activeTab === 'admin-videos' && access.isAdmin && (
            <VideoUploadManager videos={videos} adminUid={user.uid} />
          )}

          {activeTab === 'admin-access' && access.isAdmin && (
            <TeamAccessWindows
              teamAccessList={teamAccessList}
              adminsList={adminsList}
              adminUid={user.uid}
            />
          )}

          {activeTab === 'admin-analytics' && access.isAdmin && (
            <AnalyticsDashboard
              videos={videos}
              allProgress={allProgress}
              engagementEvents={engagementEvents}
              teamAccessList={teamAccessList}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TrainingWorkspace />
    </ErrorBoundary>
  );
}
