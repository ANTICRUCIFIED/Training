import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from './BrandMark';

export const PrivacyPolicyContent: React.FC = () => (
  <>
    <header className="pb-6 border-b border-slate-200">
      <p className="text-xs font-medium text-slate-500">
        Application: RAC Forge Pvt. Ltd. training portal (https://training.racforge.com) · Effective
        Date: November 19, 2026
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
        ) accesses, uses, stores, protects, retains, deletes, and discloses information when you use
        the <strong>RAC Forge Pvt. Ltd. training portal</strong> hosted at{' '}
        <a
          href="https://training.racforge.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://training.racforge.com
        </a>
        , including Google user data obtained via Google OAuth 2.0 and Firebase Authentication.
      </p>
    </header>

    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#0D2C45]">1. Google User Data We Access</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        When you sign in with Google, the <strong>RAC Forge Pvt. Ltd. training portal</strong>{' '}
        requests only standard, non-sensitive identity scopes via Firebase Authentication:
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[#0D2C45]">
              <th className="py-2.5 px-3 font-semibold">OAuth Scope</th>
              <th className="py-2.5 px-3 font-semibold">Google User Data Accessed</th>
              <th className="py-2.5 px-3 font-semibold">Purpose in Application</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            <tr>
              <td className="py-2.5 px-3 font-mono text-slate-900">openid</td>
              <td className="py-2.5 px-3">Unique Google / Firebase user identifier (UID)</td>
              <td className="py-2.5 px-3">
                Authenticate your session and link training records to your account.
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-mono text-slate-900">email</td>
              <td className="py-2.5 px-3">
                Verified Google email address and verification status
              </td>
              <td className="py-2.5 px-3">
                Confirm portal authorization against organization allowlists.
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-mono text-slate-900">profile</td>
              <td className="py-2.5 px-3">Display name and profile picture URL (if set)</td>
              <td className="py-2.5 px-3">
                Display your name in the portal and in internal completion reports.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        <strong>No Sensitive or Restricted Google API Scopes:</strong> The RAC Forge Pvt. Ltd.
        training portal does <strong>not</strong> request, access, read, or modify your Gmail
        messages, personal Google Drive files, Google Calendar, Contacts, Photos, or any other
        Google Workspace data. Embedded training videos are administrator-supplied links and do not
        access a learner&apos;s personal Google Drive via OAuth.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        2. Additional Portal Activity Data We Collect
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Once an authorized user signs in and agrees to our Terms of Service and Privacy Policy, we
        record learning activity required to operate the training portal:
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>First-time legal agreement timestamp and policy version identifier.</li>
        <li>Assigned training track permissions managed by RAC Forge Pvt. Ltd. administrators.</li>
        <li>
          Module completion state, quiz scores, attempt counts, and active watch duration for
          compliance verification.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">3. How We Use Google User Data</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd. uses Google user data strictly to provide and maintain the core
        functionality of the <strong>RAC Forge Pvt. Ltd. training portal</strong>:
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>Authenticating authorized personnel and preventing unauthorized access.</li>
        <li>Granting access solely to the training curriculum assigned to your email address.</li>
        <li>Persisting learner progress, quiz outcomes, and policy consent across sessions.</li>
        <li>
          Providing completion and compliance reporting to authorized RAC Forge Pvt. Ltd.
          administrators.
        </li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed">
        We do <strong>not</strong> use Google user data for targeted advertising, behavioral
        profiling, data brokerage, marketing campaigns, creditworthiness assessments, or training
        generalized AI or machine learning models.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        4. Google API Services User Data Policy &amp; Limited Use
      </h2>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed">
        <strong>Limited Use Compliance:</strong> RAC Forge Pvt. Ltd. training portal&apos;s use and
        transfer to any other app of information received from Google APIs will adhere to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </div>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        5. Sharing, Transfer, and Disclosure of Google User Data
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        <strong>
          RAC Forge Pvt. Ltd. does not sell, rent, trade, or transfer Google user data to third
          parties
        </strong>{' '}
        for advertising or any purpose outside operating the training portal. Access is strictly
        restricted to:
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>
          <strong>Google Cloud / Firebase (Infrastructure Sub-processor):</strong> Used solely to
          authenticate sessions (Firebase Authentication) and securely host portal records (Cloud
          Firestore).
        </li>
        <li>
          <strong>Authorized RAC Forge Pvt. Ltd. Administrators:</strong> Designated company
          administrators can inspect learner names, emails, and training progress solely for
          workforce onboarding and compliance auditing. Learners cannot view other learners&apos;
          data.
        </li>
        <li>
          <strong>Legal Obligations:</strong> Only if strictly required by applicable law, court
          order, or enforceable governmental demand.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        6. Data Protection &amp; Security Mechanisms
      </h2>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>
          <strong>Encryption in Transit:</strong> All traffic to{' '}
          <span className="font-mono text-xs">https://training.racforge.com</span> and Firebase is
          protected via HTTPS / TLS 1.2+.
        </li>
        <li>
          <strong>Encryption at Rest:</strong> Stored profile and training records are encrypted at
          rest using Google Cloud AES-256 encryption.
        </li>
        <li>
          <strong>Server-Enforced Access Controls:</strong> Firestore Security Rules enforce a
          default-deny posture, verify Google email claims (
          <span className="font-mono text-xs">email_verified == true</span>), and isolate personal
          records strictly to the owner and authorized administrators.
        </li>
        <li>
          <strong>Zero Password Handling:</strong> Google OAuth handles authentication; RAC Forge
          Pvt. Ltd. never sees or stores your Google password.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">7. Data Retention &amp; Deletion</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        <strong>Retention:</strong> Identity profile fields and training progress are retained while
        your account remains authorized in the portal, and for up to <strong>12 months</strong>{' '}
        after access revocation or offboarding when required for internal compliance auditing,
        unless earlier deletion is requested.
      </p>
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
        <li>
          <strong>Revoke Google Access:</strong> Revoke portal access anytime at{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1F6E82] hover:underline font-medium"
          >
            https://myaccount.google.com/permissions
          </a>
          .
        </li>
        <li>
          <strong>Permanent Deletion or Export Request:</strong> Email{' '}
          <a
            href="mailto:sankhyayan@gmail.com"
            className="text-[#1F6E82] hover:underline font-medium"
          >
            sankhyayan@gmail.com
          </a>{' '}
          or{' '}
          <a
            href="mailto:racforge@gmail.com"
            className="text-[#1F6E82] hover:underline font-medium"
          >
            racforge@gmail.com
          </a>{' '}
          with the subject{' '}
          <em>&ldquo;Data Deletion Request — RAC Forge Pvt. Ltd. training portal&rdquo;</em>.
          Verified requests are completed within <strong>15 business days</strong>, permanently
          deleting profile, allowlist, progress, and telemetry records from Firestore and Firebase
          Authentication.
        </li>
      </ul>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        8. Changes to This Privacy Policy &amp; User Notification
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        We keep this Privacy Policy current. If RAC Forge Pvt. Ltd. changes how the{' '}
        <strong>RAC Forge Pvt. Ltd. training portal</strong> accesses, uses, stores, or shares
        Google user data, we will update the Effective Date and Policy Version, display an in-portal
        re-consent notification on next sign-in, and notify authorized users via email before
        material changes take effect.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">9. Contact Information</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd. · Website:{' '}
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>{' '}
        · Support &amp; Privacy Contact:{' '}
        <a
          href="mailto:sankhyayan@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          sankhyayan@gmail.com
        </a>{' '}
        /{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          racforge@gmail.com
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
        Application: RAC Forge Pvt. Ltd. training portal (https://training.racforge.com) · Effective
        Date: November 19, 2026
      </p>
      <h1 className="font-display text-3xl font-bold text-[#0D2C45] mt-2">Terms of Service</h1>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        By accessing or signing in to the <strong>RAC Forge Pvt. Ltd. training portal</strong>{' '}
        hosted at{' '}
        <a
          href="https://training.racforge.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://training.racforge.com
        </a>{' '}
        and operated by <strong>RAC Forge Pvt. Ltd.</strong> (
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        ), you agree to be bound by these Terms of Service and our Privacy Policy.
      </p>
    </header>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        1. Authorized Access &amp; Account Eligibility
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        The RAC Forge Pvt. Ltd. training portal is a private workforce learning and compliance
        portal operated by RAC Forge Pvt. Ltd. Access to training modules and assessments is
        restricted strictly to users whose verified Google email address has been authorized by a
        RAC Forge Pvt. Ltd. administrator. You are responsible for maintaining the security of your
        Google Account credentials.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">2. Acceptable Use</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        You agree to use the RAC Forge Pvt. Ltd. training portal solely for completing assigned
        training coursework and assessments. You must not attempt to bypass role-based access
        controls, inspect unauthorized records, share login sessions, redistribute training
        materials externally, or disrupt platform availability.
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
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        4. Privacy &amp; Google Authentication
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        Your use of Google Sign-In and all personal data collected through this portal is governed
        by our Privacy Policy, including our adherence to the Google API Services User Data Policy
        and Limited Use requirements.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">5. Suspension &amp; Termination</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd. administrators may modify, suspend, or revoke your portal access at any
        time, including upon role changes or termination of employment or engagement with RAC Forge
        Pvt. Ltd.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">
        6. Disclaimer &amp; Limitation of Liability
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        The portal is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. To
        the maximum extent permitted by applicable law, RAC Forge Pvt. Ltd. and its officers
        disclaim all implied warranties and shall not be liable for indirect, incidental, or
        consequential damages arising from portal use or service interruptions.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">7. Updates to These Terms</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        RAC Forge Pvt. Ltd. may update these Terms of Service from time to time. Material updates
        will be reflected with a new Effective Date and Policy Version, requiring re-acknowledgement
        on next sign-in.
      </p>
    </section>

    <section className="space-y-2.5">
      <h2 className="text-lg font-semibold text-[#0D2C45]">8. Contact</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        For questions regarding these Terms of Service, please contact RAC Forge Pvt. Ltd. at{' '}
        <a
          href="mailto:sankhyayan@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          sankhyayan@gmail.com
        </a>{' '}
        or{' '}
        <a
          href="mailto:racforge@gmail.com"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          racforge@gmail.com
        </a>{' '}
        (
        <a
          href="https://www.racforge.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1F6E82] hover:underline font-medium"
        >
          https://www.racforge.com
        </a>
        ).
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
            <span aria-hidden="true">·</span>
            <span>
              Support:{' '}
              <a href="mailto:sankhyayan@gmail.com" className="hover:text-slate-900">
                sankhyayan@gmail.com
              </a>
            </span>
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
