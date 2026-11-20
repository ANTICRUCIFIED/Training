import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { BOOTSTRAP_ADMIN_EMAILS } from '../firebase';
import {
  addAdminEmail,
  approveSalesAccessRequest,
  grantTeamAccessEmails,
  rejectSalesAccessRequest,
  removeAdminEmail,
  revokeTeamAccessEmail,
} from '../services/firestoreService';
import type {
  AccessRequestRecord,
  AdminUserRecord,
  TeamAccessRecord,
  TrackSegment,
} from '../types';

interface TeamAccessWindowsProps {
  teamAccessList: TeamAccessRecord[];
  adminsList: AdminUserRecord[];
  accessRequests: AccessRequestRecord[];
  adminUid: string;
}

interface AccessWindowPanelProps {
  team: TrackSegment;
  title: string;
  subtitle: string;
  members: TeamAccessRecord[];
  adminUid: string;
}

function formatDateTime(ts: AccessRequestRecord['createdAt']): string {
  if (!ts) return 'Just now';
  return ts.toDate().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.displayName && m.displayName.toLowerCase().includes(q)),
    );
  }, [members, searchQuery]);

  const teamLabel =
    team === 'operations' ? 'Operations' : team === 'sales' ? 'Sales' : 'Custom Audience';

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
          text: `Granted ${teamLabel} access to ${added.length} member(s).`,
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
          placeholder="e.g. alex@company.com, jordan@company.com"
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white transition-colors"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Matched on Google Sign-In</span>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{submitting ? 'Saving...' : `Grant ${teamLabel}`}</span>
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
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
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
            const otherWindows: string[] = [];
            if (team !== 'operations' && member.operationsAccess) otherWindows.push('Operations');
            if (team !== 'sales' && member.salesAccess) otherWindows.push('Sales');
            if (team !== 'custom' && member.customAccess) otherWindows.push('Custom');

            return (
              <div
                key={member.email}
                className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 font-medium truncate">{member.email}</p>
                  <p className="text-xs text-slate-500">
                    {member.displayName && member.displayName !== member.email
                      ? `${member.displayName} · `
                      : ''}
                    {teamLabel}
                    {otherWindows.length > 0 ? ` · Also in ${otherWindows.join(', ')}` : ''}
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
  accessRequests,
  adminUid,
}) => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Approval queue state
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all'>('pending');
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const pendingRequests = useMemo(
    () => accessRequests.filter((r) => r.status === 'pending'),
    [accessRequests],
  );

  const visibleRequests = useMemo(
    () => (requestFilter === 'pending' ? pendingRequests : accessRequests),
    [requestFilter, pendingRequests, accessRequests],
  );

  const operationsMembers = useMemo(
    () => teamAccessList.filter((r) => r.operationsAccess),
    [teamAccessList],
  );
  const salesMembers = useMemo(
    () => teamAccessList.filter((r) => r.salesAccess),
    [teamAccessList],
  );
  const customMembers = useMemo(
    () => teamAccessList.filter((r) => r.customAccess),
    [teamAccessList],
  );

  const handleApproveRequest = async (reqRecord: AccessRequestRecord) => {
    setProcessingEmail(reqRecord.email);
    setApprovalFeedback(null);
    try {
      await approveSalesAccessRequest(reqRecord, adminUid, 'Approved for Sales Team (BDM)');
      setApprovalFeedback({
        type: 'success',
        text: `Approved ${reqRecord.email} and granted Sales Team Window access.`,
      });
    } catch (err) {
      setApprovalFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to approve access request.',
      });
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleRejectRequest = async (email: string) => {
    setProcessingEmail(email);
    setApprovalFeedback(null);
    try {
      await rejectSalesAccessRequest(email, adminUid, 'Declined by administrator');
      setApprovalFeedback({
        type: 'success',
        text: `Declined Sales access request for ${email}.`,
      });
    } catch (err) {
      setApprovalFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to decline access request.',
      });
    } finally {
      setProcessingEmail(null);
    }
  };

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
        <h1 className="text-xl font-bold text-slate-900">
          Team Access Windows &amp; Sales BDM Approvals
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Approve incoming Sales Team (BDM) signup requests or manage allowlisted emails directly
          across Operations (admin-added only), Sales, and Custom Audience windows.
        </p>
      </div>

      {/* Pending Sales BDM Signup Approval Queue */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Sales Team (BDM) Signup Approval Queue</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unlisted Google sign-ins automatically request Sales Team access here. Approving adds
              them directly to the Sales Team Window. Operations Team remains admin-added only.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRequestFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                requestFilter === 'pending'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending{' '}
              <span className="font-mono tabular-nums ml-1 text-amber-700 font-semibold">
                {pendingRequests.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRequestFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                requestFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Requests{' '}
              <span className="font-mono tabular-nums ml-1 text-slate-500">
                {accessRequests.length}
              </span>
            </button>
          </div>
        </div>

        {approvalFeedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg text-xs border ${
              approvalFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {approvalFeedback.text}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-5">Applicant</th>
                <th className="py-3 px-4">Requested Window</th>
                <th className="py-3 px-4">Applicant Details / Note</th>
                <th className="py-3 px-4">Requested On</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {visibleRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    {requestFilter === 'pending'
                      ? 'No pending Sales BDM signup requests at the moment.'
                      : 'No access requests recorded yet.'}
                  </td>
                </tr>
              ) : (
                visibleRequests.map((req) => {
                  const busy = processingEmail === req.email;
                  return (
                    <tr key={req.email} className="hover:bg-slate-50">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900">
                          {req.displayName || req.email}
                        </p>
                        <p className="text-xs text-slate-500">{req.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#1F6E82] whitespace-nowrap">
                        Sales Team (BDM)
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                        {req.note ? req.note : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(req.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {req.status === 'pending' ? (
                          <span className="font-semibold text-amber-700">Pending Approval</span>
                        ) : req.status === 'approved' ? (
                          <span className="font-semibold text-emerald-700">Approved</span>
                        ) : (
                          <span className="font-semibold text-rose-700">Declined</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {req.status !== 'approved' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleApproveRequest(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{busy ? 'Saving...' : 'Approve Sales Access'}</span>
                            </button>
                          )}
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleRejectRequest(req.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          )}
                          {req.status === 'approved' && (
                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                              {formatDateTime(req.reviewedAt)}
                            </span>
                          )}
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

      {/* Three Dedicated Access Windows */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <AccessWindowPanel
          team="operations"
          title="Operations Team Window"
          subtitle="Admin-added only · Operations and shared Ops & Sales modules"
          members={operationsMembers}
          adminUid={adminUid}
        />

        <AccessWindowPanel
          team="sales"
          title="Sales Team Window"
          subtitle="Approved BDMs & admin-added Sales members"
          members={salesMembers}
          adminUid={adminUid}
        />

        <AccessWindowPanel
          team="custom"
          title="Custom Audience Window"
          subtitle="Outside Sales/Ops — custom cohorts & invited learners"
          members={customMembers}
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
              Administrators can upload training videos, import questionnaires, approve Sales BDM
              signups, manage team windows, and view all individual reports and activity logs.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {adminsList.filter(
              (a) => !(BOOTSTRAP_ADMIN_EMAILS as readonly string[]).includes(a.email),
            ).length + BOOTSTRAP_ADMIN_EMAILS.length}{' '}
            admins
          </span>
        </div>

        <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="email"
            required
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="Add co-admin email address..."
            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
          />
          <button
            type="submit"
            disabled={addingAdmin}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0D2C45] rounded-lg hover:bg-[#133b5c] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
