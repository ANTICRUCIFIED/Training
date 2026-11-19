import React, { useMemo, useState } from 'react';
import { Plus, Search, Shield, Trash2, UserCheck } from 'lucide-react';
import { BOOTSTRAP_ADMIN_EMAILS } from '../firebase';
import {
  addAdminEmail,
  grantTeamAccessEmails,
  removeAdminEmail,
  revokeTeamAccessEmail,
} from '../services/firestoreService';
import type { AdminUserRecord, TeamAccessRecord, TrackSegment } from '../types';

interface TeamAccessWindowsProps {
  teamAccessList: TeamAccessRecord[];
  adminsList: AdminUserRecord[];
  adminUid: string;
}

interface AccessWindowPanelProps {
  team: TrackSegment;
  title: string;
  subtitle: string;
  members: TeamAccessRecord[];
  adminUid: string;
}

const AccessWindowPanel: React.FC<AccessWindowPanelProps> = ({
  team,
  title,
  subtitle,
  members,
  adminUid,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.email.toLowerCase().includes(q));
  }, [members, searchQuery]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawList = emailInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawList.length === 0) {
      setFeedback({ type: 'error', text: 'Enter one or more valid email addresses.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const { added, invalid } = await grantTeamAccessEmails(rawList, team, adminUid);
      setEmailInput('');
      if (invalid.length > 0 && added.length > 0) {
        setFeedback({
          type: 'success',
          text: `Granted access to ${added.length} email(s). Skipped invalid: ${invalid.join(', ')}`,
        });
      } else if (invalid.length > 0) {
        setFeedback({
          type: 'error',
          text: `Invalid email format: ${invalid.join(', ')}`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Granted ${team === 'operations' ? 'Operations' : 'Sales'} access to ${added.length} member(s).`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update team access.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (email: string) => {
    try {
      await revokeTeamAccessEmail(email, team, adminUid);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to revoke access.',
      });
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
      <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
          {members.length} authorized
        </span>
      </div>

      <form onSubmit={handleGrant} className="space-y-3 mb-5">
        <label className="block text-xs font-medium text-slate-700">
          Add Email IDs (single or comma/newline separated)
        </label>
        <textarea
          rows={2}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder={`e.g. alex@company.com, jordan@company.com`}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Matched on Google OAuth sign-in
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {submitting
                ? 'Saving...'
                : team === 'operations'
                  ? 'Grant Operations Access'
                  : 'Grant Sales Access'}
            </span>
          </button>
        </div>
      </form>

      {feedback && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter authorized emails..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
        />
      </div>

      {/* Authorized Emails List */}
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {members.length === 0
              ? 'No email IDs added to this window yet.'
              : 'No matching email addresses found.'}
          </div>
        ) : (
          filteredMembers.map((member) => {
            const alsoInOther =
              team === 'operations' ? member.salesAccess : member.operationsAccess;
            return (
              <div
                key={member.email}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 font-medium truncate">{member.email}</p>
                  <p className="text-xs text-slate-500">
                    {team === 'operations' ? 'Operations' : 'Sales'}
                    {alsoInOther
                      ? ` · Also authorized in ${team === 'operations' ? 'Sales' : 'Operations'}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevoke(member.email)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export const TeamAccessWindows: React.FC<TeamAccessWindowsProps> = ({
  teamAccessList,
  adminsList,
  adminUid,
}) => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);

  const operationsMembers = useMemo(
    () => teamAccessList.filter((r) => r.operationsAccess),
    [teamAccessList],
  );
  const salesMembers = useMemo(
    () => teamAccessList.filter((r) => r.salesAccess),
    [teamAccessList],
  );

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAddingAdmin(true);
    try {
      await addAdminEmail(newAdminEmail, adminUid);
      setNewAdminEmail('');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not add administrator.');
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Team Access Windows</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter authorized email IDs into the Operations and Sales windows. Users who appear in
          both windows gain access to both training tracks.
        </p>
      </div>

      {/* Two Dedicated Side-by-Side Access Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccessWindowPanel
          team="operations"
          title="Operations Team Window"
          subtitle="Emails granted access to Operations and shared training modules"
          members={operationsMembers}
          adminUid={adminUid}
        />

        <AccessWindowPanel
          team="sales"
          title="Sales Team Window"
          subtitle="Emails granted access to Sales and shared training modules"
          members={salesMembers}
          adminUid={adminUid}
        />
      </div>

      {/* Platform Administrators */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-700" />
              <span>Platform Administrators</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrators can upload training videos, import questionnaires, manage team windows,
              and view all analytics.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {adminsList.filter((a) => !(BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(a.email)).length + BOOTSTRAP_ADMIN_EMAILS.length} admins
          </span>
        </div>

        <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="email"
            required
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="Add co-admin email address..."
            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={addingAdmin}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{addingAdmin ? 'Adding...' : 'Add Administrator'}</span>
          </button>
        </form>

        {adminError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {adminError}
          </div>
        )}

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
          {BOOTSTRAP_ADMIN_EMAILS.map((primaryEmail) => (
            <div
              key={primaryEmail}
              className="px-4 py-2.5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{primaryEmail}</p>
                <p className="text-xs text-slate-500">Primary Administrator</p>
              </div>
              <span className="text-xs text-slate-400">Protected</span>
            </div>
          ))}
          {adminsList
            .filter((a) => !(BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(a.email))
            .map((admin) => (
              <div
                key={admin.email}
                className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{admin.email}</p>
                  <p className="text-xs text-slate-500">Co-Administrator</p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeAdminEmail(admin.email)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};
