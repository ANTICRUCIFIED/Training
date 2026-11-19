import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPolicyContent: React.FC = () => (
  <>
    <header className="pb-6 border-b border-slate-200">
      <p className="text-xs font-medium text-slate-500">
        Cadence Training Portal · Effective Date: November 18, 2026
      </p>
      <h1 className="font-display text-3xl font-bold text-slate-900 mt-2">Privacy Policy</h1>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        This Privacy Policy describes how Cadence collects, uses, stores, and protects information
        obtained when you sign in using Google Authentication and use our training portal.
      </p>
    </header>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        1. Information We Collect via Google OAuth
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        When you sign in with Google, Cadence uses Firebase Authentication to request only basic
        identity scopes (<span className="font-mono text-xs">openid</span>,{' '}
        <span className="font-mono text-xs">email</span>, and{' '}
        <span className="font-mono text-xs">profile</span>). Specifically, we receive:
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>Your verified Google email address.</li>
        <li>Your display name as configured on your Google account.</li>
        <li>Your Google account profile image URL (if available).</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed">
        Cadence does not request access to your Gmail messages, personal Google Drive files, Google
        Calendar, Contacts, or any other sensitive or restricted Google Workspace scopes.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">2. Training &amp; Activity Information</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        For authorized users granted portal access by an organization administrator, we store
        training completion records, assessment scores, attempt counts, and module engagement
        duration so learners can progress through assigned coursework and administrators can verify
        compliance.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">3. How We Use Your Information</h2>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>To authenticate your identity and verify portal authorization.</li>
        <li>To grant access strictly to the training curriculum assigned to your account.</li>
        <li>To save your learning progress and assessment results across sessions.</li>
        <li>
          To provide aggregate and per-learner completion reporting to authorized administrators.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        4. Google API Services User Data Policy &amp; Limited Use
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Cadence&apos;s use and transfer to any other app of information received from Google APIs
        adheres to the Google API Services User Data Policy, including the Limited Use requirements.
        We do not sell your personal data, share it with data brokers, or use Google user data for
        advertising or marketing purposes.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        5. Data Storage, Security &amp; Retention
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        All user profile and training progress data is encrypted in transit via HTTPS/TLS and stored
        in Google Cloud Firestore with strict role-based security rules. Data is retained only for
        as long as your organization maintains your training access or as required for compliance
        auditing.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        6. Data Deletion &amp; Contact Information
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        You may revoke Cadence&apos;s access to your Google account at any time from your Google
        Account permissions settings. To request export or deletion of your stored profile and
        training records, contact the portal administrators at{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-blue-700 hover:underline font-medium"
        >
          racforge@gmail.com
        </a>{' '}
        or{' '}
        <a
          href="mailto:sankhyayan@gmail.com"
          className="text-blue-700 hover:underline font-medium"
        >
          sankhyayan@gmail.com
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
        Cadence Training Portal · Effective Date: November 18, 2026
      </p>
      <h1 className="font-display text-3xl font-bold text-slate-900 mt-2">Terms of Service</h1>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        By accessing or signing in to the Cadence Training Portal, you agree to be bound by these
        Terms of Service and all applicable organizational policies.
      </p>
    </header>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        1. Authorized Access &amp; Account Eligibility
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Cadence is a private workforce training portal. Access to training modules and assessments
        is restricted strictly to users whose verified Google email address has been authorized by
        an organization administrator. You are responsible for maintaining the security of your
        Google account credentials.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">2. Acceptable Use</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        You agree to use Cadence solely for completing assigned training coursework and
        assessments. You must not attempt to bypass access controls, inspect unauthorized records,
        share login sessions, redistribute training materials externally, or disrupt platform
        availability.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        3. Confidentiality &amp; Intellectual Property
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        All training videos, assessment questions, documentation, and portal software remain the
        confidential intellectual property of their respective owners. Copying, recording,
        downloading, or distributing proprietary training content outside your authorized organization
        is prohibited.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">4. Suspension &amp; Termination</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Administrators may modify, suspend, or revoke your portal access at any time, including upon
        role changes or termination of engagement with the organization.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">
        5. Disclaimer &amp; Limitation of Liability
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To
        the maximum extent permitted by law, Cadence and its operators disclaim all implied
        warranties and shall not be liable for indirect, incidental, or consequential damages arising
        from portal use or service interruptions.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-slate-900">6. Contact</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        For questions regarding these Terms of Service, please contact{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-blue-700 hover:underline font-medium"
        >
          racforge@gmail.com
        </a>{' '}
        or{' '}
        <a
          href="mailto:sankhyayan@gmail.com"
          className="text-blue-700 hover:underline font-medium"
        >
          sankhyayan@gmail.com
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
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Cadence
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
                page === 'privacy' ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              onClick={(e) => handleNav(e, '/terms')}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                page === 'terms' ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Terms of Service
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
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
          <span>© 2026 Cadence Training Portal</span>
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
