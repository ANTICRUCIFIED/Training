import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { BrandMark, RAC_FORGE_LOGO_PATH } from './BrandMark';
import { PrivacyPolicyContent, TermsOfServiceContent } from './LegalPages';

interface LoginViewProps {
  onSignIn: () => void;
  signingIn: boolean;
  authError: string | null;
  onNavigate: (path: '/' | '/privacy' | '/terms') => void;
  readTerms: boolean;
  readPrivacy: boolean;
  agreed: boolean;
  previouslyAccepted: boolean;
  onMarkRead: (docType: 'terms' | 'privacy') => void;
  onToggleAgreed: (next: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  signingIn,
  authError,
  onNavigate,
  readTerms,
  readPrivacy,
  agreed,
  previouslyAccepted,
  onMarkRead,
  onToggleAgreed,
}) => {
  const [modalDoc, setModalDoc] = useState<'terms' | 'privacy' | null>(null);
  const [gateHint, setGateHint] = useState<string | null>(null);

  const canProceedToLogin = previouslyAccepted || (readTerms && readPrivacy && agreed);

  const handleOpenDoc = (docType: 'terms' | 'privacy') => {
    setGateHint(null);
    onMarkRead(docType);
    setModalDoc(docType);
  };

  const handleFooterNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: '/privacy' | '/terms',
  ) => {
    e.preventDefault();
    onMarkRead(path === '/terms' ? 'terms' : 'privacy');
    onNavigate(path);
  };

  const handleAttemptSignIn = () => {
    if (!canProceedToLogin) {
      if (!readTerms || !readPrivacy) {
        setGateHint(
          'Please open and read both the Terms of Service and Privacy Policy above before signing in.',
        );
      } else {
        setGateHint(
          'Please check the agreement box confirming you have read and agree to the Terms of Service and Privacy Policy.',
        );
      }
      return;
    }
    setGateHint(null);
    onSignIn();
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (!readTerms || !readPrivacy) {
      setGateHint(
        'Please open and read both the Terms of Service and Privacy Policy before checking agreement.',
      );
      return;
    }
    setGateHint(null);
    onToggleAgreed(checked);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <BrandMark />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#overview"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#security"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Data &amp; Security
            </a>
            <a
              href="/privacy"
              onClick={(e) => handleFooterNav(e, '/privacy')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleFooterNav(e, '/terms')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Terms of Service
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleAttemptSignIn}
              disabled={signingIn || !canProceedToLogin}
              title={
                canProceedToLogin
                  ? 'Sign in with Google'
                  : 'Read and agree to Terms of Service & Privacy Policy first'
              }
              className="px-4 py-2 text-sm font-medium text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Public Portal Landing */}
      <main className="flex-1">
        <section
          id="overview"
          className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
        >
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-semibold text-[#1F6E82] tracking-wide mb-3">
              RAC Forge Pvt. Ltd. training portal
            </p>
            <h1
              className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-[#0D2C45] leading-[1.12] mb-5"
              style={{ textWrap: 'balance' }}
            >
              Sign in to the RAC Forge Pvt. Ltd. training portal.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-6">
              This portal provides authorized personnel of{' '}
              <a
                href="https://www.racforge.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#0D2C45] underline hover:text-[#1F6E82]"
              >
                RAC Forge Pvt. Ltd.
              </a>{' '}
              with secure access to assigned onboarding modules, compliance assessments, and
              training records. Access is restricted exclusively to approved accounts.
            </p>

            {/* Bold Pre-Login Terms & Privacy Gate */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 max-w-xl space-y-4">
              {previouslyAccepted ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      You have already agreed to the Terms of Service and Privacy Policy.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-[#1F6E82]">
                    <button
                      type="button"
                      onClick={() => handleOpenDoc('terms')}
                      className="hover:underline cursor-pointer"
                    >
                      Review Terms
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDoc('privacy')}
                      className="hover:underline cursor-pointer"
                    >
                      Review Privacy Policy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900 leading-snug">
                    Please read and agree to the Terms of Service and Privacy Policy before you can
                    proceed to login for the first time.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenDoc('terms')}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        readTerms
                          ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-[#1F6E82]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <FileText className="w-4 h-4 text-[#0D2C45] shrink-0" />
                        <span>Read Terms of Service</span>
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          readTerms ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {readTerms ? 'Read' : 'Required'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDoc('privacy')}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        readPrivacy
                          ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-[#1F6E82]'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <ShieldCheck className="w-4 h-4 text-[#0D2C45] shrink-0" />
                        <span>Read Privacy Policy</span>
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          readPrivacy ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {readPrivacy ? 'Read' : 'Required'}
                      </span>
                    </button>
                  </div>

                  <label
                    className={`flex items-start gap-2.5 pt-1 text-sm select-none ${
                      readTerms && readPrivacy ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => handleCheckboxChange(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#0D2C45] shrink-0"
                    />
                    <span className="font-semibold text-slate-900 leading-snug">
                      I have read and agree to the{' '}
                      <a
                        href="/terms"
                        onClick={(e) => handleFooterNav(e, '/terms')}
                        className="text-[#1F6E82] underline hover:text-[#0D2C45]"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="/privacy"
                        onClick={(e) => handleFooterNav(e, '/privacy')}
                        className="text-[#1F6E82] underline hover:text-[#0D2C45]"
                      >
                        Privacy Policy
                      </a>{' '}
                      of RAC Forge Pvt. Ltd.
                    </span>
                  </label>
                </>
              )}

              {gateHint && (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {gateHint}
                </p>
              )}
            </div>

            {authError && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 max-w-xl">
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleAttemptSignIn}
                disabled={signingIn || !canProceedToLogin}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#1F6E82] rounded-lg hover:bg-[#175768] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{signingIn ? 'Connecting Google Account...' : 'Sign in with Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">
                {canProceedToLogin
                  ? 'Uses Google Sign-In for identity verification only'
                  : 'Complete the reading & agreement step above to enable login'}
              </span>
            </div>
          </div>

          {/* Right Column: Official Brand Identity & OAuth Scope Disclosure */}
          <div
            id="security"
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 lg:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="pb-5 mb-6 border-b border-slate-100 flex items-center gap-4">
                <img
                  src={RAC_FORGE_LOGO_PATH}
                  alt="RAC Forge Pvt. Ltd."
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#0D2C45]">RAC Forge Pvt. Ltd.</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Shaping Compliance, Empowering Healthcare Innovation
                  </p>
                  <a
                    href="https://www.racforge.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-[#1F6E82] hover:underline mt-1"
                  >
                    https://www.racforge.com
                  </a>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <UserCheck className="w-4 h-4 text-[#1F6E82] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Basic Identity Verification
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      RAC Forge Training Portal requests only your verified Google email address,
                      display name, and profile photo to confirm your identity and check portal
                      authorization.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <Lock className="w-4 h-4 text-[#0D2C45] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Zero Access to Personal Google Data
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      We never request access to your personal Gmail, Google Drive files, Calendar,
                      or Contacts. All training records remain private within RAC Forge Pvt. Ltd.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Protected Session &amp; Compliance Records
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      Authentication is handled through Firebase Authentication with encrypted
                      HTTPS transit and strict role-based access controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Support &amp; privacy requests</span>
              <a
                href="mailto:sankhyayan@gmail.com"
                className="font-medium text-[#0D2C45] hover:text-[#1F6E82]"
              >
                sankhyayan@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer with Mandatory OAuth Verification Links */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 RAC Forge Pvt. Ltd.</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.racforge.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
            >
              www.racforge.com
            </a>
            <span aria-hidden="true">·</span>
            <span>
              Support:{' '}
              <a href="mailto:sankhyayan@gmail.com" className="hover:text-slate-900">
                sankhyayan@gmail.com
              </a>{' '}
              /{' '}
              <a href="mailto:racforge@gmail.com" className="hover:text-slate-900">
                racforge@gmail.com
              </a>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => handleFooterNav(e, '/privacy')}
              className="hover:text-slate-900 transition-colors font-medium"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleFooterNav(e, '/terms')}
              className="hover:text-slate-900 transition-colors font-medium"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>

      {/* In-Page Terms & Privacy Reader Modal */}
      {modalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#0D2C45]">
                {modalDoc === 'terms'
                  ? 'RAC Forge Pvt. Ltd. — Terms of Service'
                  : 'RAC Forge Pvt. Ltd. — Privacy Policy'}
              </span>
              <button
                type="button"
                onClick={() => setModalDoc(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label="Close document"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {modalDoc === 'terms' ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <a
                href={modalDoc === 'terms' ? '/terms' : '/privacy'}
                onClick={(e) => {
                  const target = modalDoc === 'terms' ? '/terms' : '/privacy';
                  setModalDoc(null);
                  handleFooterNav(e, target);
                }}
                className="text-xs font-medium text-[#1F6E82] hover:underline"
              >
                Open full page
              </a>
              <button
                type="button"
                onClick={() => setModalDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] cursor-pointer"
              >
                I Have Read This Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
