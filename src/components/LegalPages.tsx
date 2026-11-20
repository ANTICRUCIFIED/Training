import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from './BrandMark';

export const PrivacyPolicyContent: React.FC = () => (
  <>
    <header className="pb-6 border-b border-slate-200">
      <p className="text-xs font-medium text-slate-500">
        RAC Forge Pvt. Ltd. · Effective Date: November 19, 2026
      </p>
      <h1 className="font-display text-3xl font-bold text-[#0D2C45] mt-2">Privacy Policy</h1>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        This Privacy Policy explains how <strong>RAC Forge Pvt. Ltd.</strong> (
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        ) collects, uses, stores, and protects information obtained when you sign in using Google
        Authentication and use the RAC Forge Training Portal.
      </p>
    </header>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        1. Information We Collect via Google OAuth
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        When you sign in with Google, RAC Forge Pvt. Ltd. uses Firebase Authentication to request
        only basic identity scopes (<span className="font-mono text-xs">openid</span>,{' '}
        <span className="font-mono text-xs">email</span>, and{' '}
        <span className="font-mono text-xs">profile</span>). Specifically, we receive:
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>Your verified Google email address.</li>
        <li>Your display name as configured on your Google account.</li>
        <li>Your Google account profile image URL (if available).</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed">
        The RAC Forge Training Portal does not request access to your Gmail messages, personal
        Google Drive files, Google Calendar, Contacts, or any other sensitive or restricted Google
        Workspace scopes.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        2. Training &amp; Activity Information
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        For authorized team members granted portal access by a RAC Forge Pvt. Ltd. administrator, we
        store training completion records, assessment scores, attempt counts, policy acceptance
        timestamps, and module engagement duration so learners can progress through assigned
        coursework and administrators can verify compliance.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">3. How We Use Your Information</h2>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>To authenticate your identity and verify authorization with RAC Forge Pvt. Ltd.</li>
        <li>To grant access strictly to the training curriculum assigned to your account.</li>
        <li>To save your learning progress, assessment results, and first-time policy consent across sessions.</li>
        <li>
          To provide aggregate and per-learner completion reporting to authorized RAC Forge Pvt.
          Ltd. administrators.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        4. Google API Services User Data Policy &amp; Limited Use
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd.&apos;s use and transfer to any other app of information received from
        Google APIs adheres to the Google API Services User Data Policy, including the Limited Use
        requirements. We do not sell your personal data, share it with data brokers, or use Google
        user data for advertising or marketing purposes.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        5. Data Storage, Security &amp; Retention
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        All user profile and training progress data is encrypted in transit via HTTPS/TLS and stored
        in Google Cloud Firestore with strict role-based security rules. Data is retained only for
        as long as RAC Forge Pvt. Ltd. maintains your portal access or as required for internal
        compliance and regulatory auditing.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        6. Data Deletion &amp; Contact Information
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        You may revoke the RAC Forge Training Portal&apos;s access to your Google account at any
        time from your Google Account permissions settings. To request export or deletion of your
        stored profile and training records, contact RAC Forge Pvt. Ltd. at{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          racforge@gmail.com
        </a>{' '}
        or visit{' '}
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        .
      </p>
    </section>
  </>
);

export const TermsOfServiceContent: React.FC = () => (
  <>
    <header className="pb-6 border-b border-slate-200">
      <p className="text-xs font-medium text-slate-500">
        RAC Forge Pvt. Ltd. · Effective Date: November 19, 2026
      </p>
      <h1 className="font-display text-3xl font-bold text-[#0D2C45] mt-2">Terms of Service</h1>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        By accessing or signing in to the RAC Forge Training Portal operated by{' '}
        <strong>RAC Forge Pvt. Ltd.</strong> (
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        ), you agree to be bound by these Terms of Service and all applicable organizational
        policies.
      </p>
    </header>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        1. Authorized Access &amp; Account Eligibility
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        The RAC Forge Training Portal is a private workforce learning and compliance portal operated
        by RAC Forge Pvt. Ltd. Access to training modules and assessments is restricted strictly to
        users whose verified Google email address has been authorized by a RAC Forge Pvt. Ltd.
        administrator. You are responsible for maintaining the security of your Google account
        credentials.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">2. Acceptable Use</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        You agree to use the RAC Forge Training Portal solely for completing assigned training
        coursework and assessments. You must not attempt to bypass access controls, inspect
        unauthorized records, share login sessions, redistribute training materials externally, or
        disrupt platform availability.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        3. Confidentiality &amp; Intellectual Property
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        All training videos, assessment questions, compliance documentation, logos, and portal
        software remain the confidential intellectual property of RAC Forge Pvt. Ltd. or their
        respective licensors. Copying, recording, downloading, or distributing proprietary training
        content outside RAC Forge Pvt. Ltd. without written authorization is strictly prohibited.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">4. Suspension &amp; Termination</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd. administrators may modify, suspend, or revoke your portal access at any
        time, including upon role changes or termination of employment or engagement with RAC Forge
        Pvt. Ltd.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        5. Disclaimer &amp; Limitation of Liability
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        The portal is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To
        the maximum extent permitted by applicable law, RAC Forge Pvt. Ltd. and its officers
        disclaim all implied warranties and shall not be liable for indirect, incidental, or
        consequential damages arising from portal use or service interruptions.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">6. Contact</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        For questions regarding these Terms of Service, please contact RAC Forge Pvt. Ltd. at{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          racforge@gmail.com
        </a>{' '}
        or visit{' '}
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        .
      </p>
    </section>
  </>
);

interface LegalPageProps {
  page: 'privacy' | 'terms';
  onNavigate: (path: '/' | '/privacy' | '/terms') => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ page, onNavigate }) => {
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: '/' | '/privacy' | '/terms') => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => handleNav(e, '/')}
            className="whitespace-nowrap shrink-0"
          >
            <BrandMark />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="/privacy"
              onClick={(e) => handleNav(e, '/privacy')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                page === 'privacy' ? 'text-[#0D2C45] font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleNav(e, '/terms')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                page === 'terms' ? 'text-[#0D2C45] font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Terms of Service
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 lg:py-16">
        <article className="bg-white border border-slate-200 rounded-xl p-8 lg:p-12 space-y-8">
          {page === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
        </article>
      </main>

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
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/privacy"
              onClick={(e) => handleNav(e, '/privacy')}
              className="hover:text-slate-900 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleNav(e, '/terms')}
              className="hover:text-slate-900 transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
