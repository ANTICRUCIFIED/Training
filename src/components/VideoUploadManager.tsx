import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  FileSpreadsheet,
  Film,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import {
  createTrainingVideo,
  deleteTrainingVideo,
  isValidEmail,
  normalizeEmail,
  updateTrainingVideo,
} from '../services/firestoreService';
import {
  BLUEPRINT_LIMITS,
  type OnboardingStage,
  type QuizQuestion,
  type Segment,
  type TeamAccessRecord,
  type TrainingVideo,
} from '../types';
import { extractDriveFileId, getDrivePreviewUrl } from '../utils/drive';
import {
  applyIndexMode,
  downloadQuestionnaireTemplate,
  parseQuestionnaireExcel,
  type IndexMode,
  type ParsedExcelResult,
} from '../utils/excelParser';

interface VideoUploadManagerProps {
  videos: TrainingVideo[];
  teamAccessList: TeamAccessRecord[];
  adminUid: string;
}

export function formatSegmentLabel(segment: Segment, customEmails?: string[]): string {
  switch (segment) {
    case 'operations':
      return 'Operations';
    case 'sales':
      return 'Sales';
    case 'both':
      return 'Ops & Sales';
    case 'custom':
      return 'Custom Window';
    case 'custom_list':
      return `Custom (${customEmails?.length ?? 0} selected)`;
  }
}

export function formatStageLabel(stage: OnboardingStage): string {
  return stage === 'post_onboarding' ? 'After Onboarding' : 'Before Onboarding';
}

export const VideoUploadManager: React.FC<VideoUploadManagerProps> = ({
  videos,
  teamAccessList,
  adminUid,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [segment, setSegment] = useState<Segment>('operations');
  const [onboardingStage, setOnboardingStage] = useState<OnboardingStage>('pre_onboarding');
  const [customEmailsText, setCustomEmailsText] = useState('');
  const [orderIndex, setOrderIndex] = useState<number>(() => videos.length + 1);
  const [passingScore, setPassingScore] = useState<number>(70);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [rawExcelRows, setRawExcelRows] = useState<ParsedExcelResult['rawRows'] | null>(null);
  const [indexMode, setIndexMode] = useState<IndexMode>('one-based');
  const [excelWarnings, setExcelWarnings] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);

  const [showPreviewEmbed, setShowPreviewEmbed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const [segmentFilter, setSegmentFilter] = useState<'all' | 'operations' | 'sales' | 'both' | 'custom'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | OnboardingStage>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractedDriveId = useMemo(() => extractDriveFileId(driveUrl), [driveUrl]);

  const parsedCustomEmails = useMemo(() => {
    const rawTokens = customEmailsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    for (const token of rawTokens) {
      const email = normalizeEmail(token);
      if (isValidEmail(email)) {
        if (!seen.has(email)) {
          seen.add(email);
          valid.push(email);
        }
      } else {
        invalid.push(token);
      }
    }
    return { valid, invalid };
  }, [customEmailsText]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter((v) => {
      if (segmentFilter === 'custom') {
        if (v.segment !== 'custom' && v.segment !== 'custom_list') return false;
      } else if (segmentFilter !== 'all' && v.segment !== segmentFilter) {
        return false;
      }
      if (stageFilter !== 'all' && v.onboardingStage !== stageFilter) return false;
      if (q && !v.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, segmentFilter, stageFilter, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setDriveUrl('');
    setSegment('operations');
    setOnboardingStage('pre_onboarding');
    setCustomEmailsText('');
    setOrderIndex(videos.length + 1);
    setPassingScore(70);
    setQuestions([]);
    setRawExcelRows(null);
    setIndexMode('one-based');
    setExcelWarnings([]);
    setExcelFileName(null);
    setShowPreviewEmbed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadEdit = (video: TrainingVideo) => {
    setEditingId(video.id);
    setTitle(video.title);
    setDescription(video.description);
    setDriveUrl(video.driveUrl);
    setSegment(video.segment);
    setOnboardingStage(video.onboardingStage);
    setCustomEmailsText(video.customEmails.join(', '));
    setOrderIndex(video.orderIndex);
    setPassingScore(video.passingScore);
    setQuestions(video.questions);
    setRawExcelRows(null);
    setExcelWarnings([]);
    setExcelFileName(null);
    setFormMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAddCustomEmail = (email: string) => {
    const existing = new Set(parsedCustomEmails.valid);
    if (existing.has(email)) return;
    setCustomEmailsText((prev) => (prev.trim() ? `${prev.trim()}, ${email}` : email));
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormMessage(null);
    try {
      const parsed = await parseQuestionnaireExcel(file);
      setRawExcelRows(parsed.rawRows);
      setIndexMode(parsed.detectedMode);
      setQuestions(parsed.questions);
      setExcelWarnings(parsed.warnings);
      setExcelFileName(file.name);
    } catch (err) {
      setFormMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to parse uploaded Excel file.',
      });
    }
  };

  const handleToggleIndexMode = (mode: IndexMode) => {
    setIndexMode(mode);
    if (rawExcelRows) {
      const res = applyIndexMode(rawExcelRows, mode);
      setQuestions(res.questions);
      setExcelWarnings(res.warnings);
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddManualQuestion = () => {
    if (questions.length >= BLUEPRINT_LIMITS.MAX_QUESTIONS) return;
    setQuestions((prev) => [
      ...prev,
      {
        question: 'New question',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctIndex: 0,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!title.trim()) {
      setFormMessage({ type: 'error', text: 'Please enter a video name.' });
      return;
    }

    if (!extractedDriveId) {
      setFormMessage({
        type: 'error',
        text: 'Enter a valid Google Drive file link (e.g., https://drive.google.com/file/d/FILE_ID/view).',
      });
      return;
    }

    if (segment === 'custom_list') {
      if (parsedCustomEmails.valid.length === 0) {
        setFormMessage({
          type: 'error',
          text: 'Enter at least one valid email address for Specific Custom Audience access.',
        });
        return;
      }
      if (parsedCustomEmails.invalid.length > 0) {
        setFormMessage({
          type: 'error',
          text: `Invalid email address(es): ${parsedCustomEmails.invalid.join(', ')}`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        driveUrl: driveUrl.trim(),
        driveFileId: extractedDriveId,
        segment,
        onboardingStage,
        customEmails: segment === 'custom_list' ? parsedCustomEmails.valid : [],
        orderIndex,
        passingScore,
        questions,
      };

      if (editingId) {
        await updateTrainingVideo(editingId, payload);
        setFormMessage({ type: 'success', text: `Updated module "${title.trim()}".` });
      } else {
        await createTrainingVideo(payload, adminUid);
        setFormMessage({
          type: 'success',
          text: `Published "${title.trim()}" (${formatStageLabel(onboardingStage)}) with ${questions.length} questionnaire item(s).`,
        });
      }
      resetForm();
    } catch (err) {
      setFormMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save training video.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: TrainingVideo) => {
    try {
      await deleteTrainingVideo(video.id);
      if (editingId === video.id) resetForm();
    } catch (err) {
      setFormMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to delete video.',
      });
    }
  };

  const isCustomSegment = segment === 'custom' || segment === 'custom_list';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {editingId ? 'Edit Training Module' : 'Upload Training Video & Questionnaire'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Paste a Google Drive link, assign Before/After Onboarding stage and audience access, and
            attach an Excel questionnaire.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadQuestionnaireTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Sample .xlsx Template</span>
        </button>
      </div>

      {/* Upload / Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        {formMessage && (
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              formMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {formMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 cols: Video Details */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Video Name *
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Compliance Induction & Quality Protocols"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Google Drive Video Link *
                </label>
                {extractedDriveId && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewEmbed((p) => !p)}
                    className="text-xs font-medium text-[#1F6E82] hover:underline cursor-pointer"
                  >
                    {showPreviewEmbed ? 'Hide Embed Preview' : 'Preview Drive Video'}
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.DRIVE_URL_MAX}
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white font-mono text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                {driveUrl.trim()
                  ? extractedDriveId
                    ? `Detected Drive File ID: ${extractedDriveId}`
                    : 'Waiting for a valid Google Drive /file/d/{id} or ?id={id} link'
                  : 'Ensure the Google Drive video sharing permission is set so team members can view it.'}
              </p>
            </div>

            {showPreviewEmbed && extractedDriveId && (
              <div className="aspect-video w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  src={getDrivePreviewUrl(extractedDriveId)}
                  title="Google Drive preview"
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Module Summary (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key takeaways or instructions for this training video..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
              />
            </div>

            {/* Stage + Order + Passing Score */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
              <div className="sm:col-span-6">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Onboarding Stage *
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      { id: 'pre_onboarding', label: 'Before Onboarding' },
                      { id: 'post_onboarding', label: 'After Onboarding' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOnboardingStage(opt.id)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        onboardingStage === opt.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Level / Order
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Pass Score (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
                />
              </div>
            </div>

            {/* Audience Access */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-medium text-slate-700">
                Audience Access *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'operations', label: 'Operations' },
                    { id: 'sales', label: 'Sales' },
                    { id: 'both', label: 'Ops & Sales' },
                    { id: 'custom', label: 'Custom Audience' },
                  ] as const
                ).map((opt) => {
                  const active =
                    opt.id === 'custom' ? isCustomSegment : segment === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setSegment(
                          opt.id === 'custom'
                            ? segment === 'custom_list'
                              ? 'custom_list'
                              : 'custom'
                            : opt.id,
                        )
                      }
                      className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {isCustomSegment && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#1F6E82]" />
                      <span>Custom Audience Scope</span>
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-md">
                      <button
                        type="button"
                        onClick={() => setSegment('custom')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                          segment === 'custom'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        All Custom Window Members
                      </button>
                      <button
                        type="button"
                        onClick={() => setSegment('custom_list')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                          segment === 'custom_list'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        Specific Email IDs Only
                      </button>
                    </div>
                  </div>

                  {segment === 'custom' ? (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Visible to every user authorized in the <strong>Custom Audience Window</strong>{' '}
                      (outside Sales and Operations teams).
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      <label className="block text-xs text-slate-600">
                        Enter specific email IDs allowed to watch this video (up to{' '}
                        {BLUEPRINT_LIMITS.MAX_CUSTOM_EMAILS}, comma or newline separated):
                      </label>
                      <textarea
                        rows={2}
                        value={customEmailsText}
                        onChange={(e) => setCustomEmailsText(e.target.value)}
                        placeholder="e.g. qa.lead@racforge.com, partner@client.com"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82]"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {parsedCustomEmails.valid.length} valid email(s) selected
                          {parsedCustomEmails.invalid.length > 0
                            ? ` · ${parsedCustomEmails.invalid.length} invalid`
                            : ''}
                        </span>
                      </div>
                      {teamAccessList.length > 0 && (
                        <div className="pt-1">
                          <p className="text-xs text-slate-500 mb-1.5">
                            Quick-add from authorized users:
                          </p>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {teamAccessList.slice(0, 12).map((member) => {
                              const selected = parsedCustomEmails.valid.includes(member.email);
                              return (
                                <button
                                  key={member.email}
                                  type="button"
                                  onClick={() => handleQuickAddCustomEmail(member.email)}
                                  className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                                    selected
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#1F6E82]'
                                  }`}
                                >
                                  {selected ? '✓ ' : '+ '}
                                  {member.email}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 cols: Excel Questionnaire Uploader */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Questionnaire Excel Upload</span>
                </h2>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {questions.length} loaded
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Column 1: Question text · Columns 2–5: Four answer options · Column 6: Correct
                answer index.
              </p>

              <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white rounded-lg p-5 text-center hover:border-[#1F6E82] transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-slate-500 mb-2" />
                <span className="text-xs font-medium text-slate-900">
                  {excelFileName ? `Uploaded: ${excelFileName}` : 'Choose .xlsx, .xls, or .csv'}
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Up to {BLUEPRINT_LIMITS.MAX_QUESTIONS} questions per video
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>

              {rawExcelRows && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Column 6 Index Format:</span>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-200 rounded-md">
                    <button
                      type="button"
                      onClick={() => handleToggleIndexMode('one-based')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        indexMode === 'one-based'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      1–4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleIndexMode('zero-based')}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        indexMode === 'zero-based'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      0–3
                    </button>
                  </div>
                </div>
              )}

              {excelWarnings.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  {excelWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleAddManualQuestion}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question Row</span>
              </button>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestions([]);
                    setRawExcelRows(null);
                    setExcelFileName(null);
                  }}
                  className="text-xs text-red-700 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Parsed / Editable Questions Preview */}
        {questions.length > 0 && (
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Questionnaire Preview ({questions.length})
            </h3>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={q.question}
                      maxLength={BLUEPRINT_LIMITS.QUESTION_MAX}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, question: val } : item)),
                        );
                      }}
                      className="w-full text-sm font-medium text-slate-900 bg-transparent border-b border-transparent focus:border-[#1F6E82] focus:outline-none pb-0.5"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correctIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <button
                              type="button"
                              title="Mark as correct option"
                              onClick={() =>
                                setQuestions((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, correctIndex: oIdx } : item,
                                  ),
                                )
                              }
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isCorrect && <Check className="w-2.5 h-2.5" />}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              maxLength={BLUEPRINT_LIMITS.OPTION_MAX}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions((prev) =>
                                  prev.map((item, i) => {
                                    if (i !== idx) return item;
                                    const nextOpts: [string, string, string, string] = [
                                      ...item.options,
                                    ];
                                    nextOpts[oIdx] = val;
                                    return { ...item, options: nextOpts };
                                  }),
                                );
                              }}
                              className="w-full bg-transparent focus:outline-none truncate"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer shrink-0"
                    title="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1F6E82] rounded-lg hover:bg-[#175768] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>
              {saving
                ? 'Saving Module...'
                : editingId
                  ? 'Save Module Changes'
                  : 'Publish Training Module'}
            </span>
          </button>
        </div>
      </form>

      {/* Published Video Library Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Published Video Library</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Modules run sequentially: Before Onboarding levels first, then After Onboarding
                levels.
              </p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F6E82] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All Audiences' },
                  { id: 'operations', label: 'Operations' },
                  { id: 'sales', label: 'Sales' },
                  { id: 'both', label: 'Ops & Sales' },
                  { id: 'custom', label: 'Custom Audience' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegmentFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    segmentFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Stages' },
                  { id: 'pre_onboarding', label: 'Before Onboarding' },
                  { id: 'post_onboarding', label: 'After Onboarding' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStageFilter(tab.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    stageFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Video Name</th>
                <th className="py-3 px-4">Onboarding Stage</th>
                <th className="py-3 px-4">Audience</th>
                <th className="py-3 px-4 text-right">Questions</th>
                <th className="py-3 px-4 text-right">Pass %</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    No training videos match the current filter.
                  </td>
                </tr>
              ) : (
                filteredVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      #{String(video.orderIndex).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{video.title}</p>
                      <p className="text-xs text-slate-500 font-mono truncate max-w-xs">
                        Drive ID: {video.driveFileId}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatStageLabel(video.onboardingStage)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      <p>{formatSegmentLabel(video.segment, video.customEmails)}</p>
                      {video.segment === 'custom_list' && video.customEmails.length > 0 && (
                        <p className="text-slate-400 truncate max-w-[200px]">
                          {video.customEmails.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {video.questions.length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {video.passingScore}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadEdit(video)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(video)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
