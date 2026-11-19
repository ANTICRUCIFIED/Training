import * as XLSX from 'xlsx';
import { BLUEPRINT_LIMITS, type QuizQuestion } from '../types';

export type IndexMode = 'one-based' | 'zero-based';

export interface ParsedExcelResult {
  questions: QuizQuestion[];
  rawRows: Array<{
    question: string;
    options: [string, string, string, string];
    rawIndex: number;
  }>;
  detectedMode: IndexMode;
  warnings: string[];
}

function normalizeCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function isLikelyHeaderRow(cols: string[]): boolean {
  const first = cols[0].toLowerCase();
  const sixth = cols[5].toLowerCase();
  if (
    (first.includes('question') || first === 'q' || first.includes('prompt')) &&
    Number.isNaN(Number(sixth))
  ) {
    return true;
  }
  if (sixth.includes('correct') || sixth.includes('answer') || sixth.includes('index')) {
    return true;
  }
  return false;
}

export function applyIndexMode(
  rawRows: ParsedExcelResult['rawRows'],
  mode: IndexMode,
): { questions: QuizQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const questions: QuizQuestion[] = [];

  rawRows.forEach((row, idx) => {
    let zeroIdx = mode === 'one-based' ? row.rawIndex - 1 : row.rawIndex;
    if (zeroIdx < 0 || zeroIdx > 3 || !Number.isInteger(zeroIdx)) {
      warnings.push(
        `Row ${idx + 1}: Correct index "${row.rawIndex}" is out of range for ${
          mode === 'one-based' ? '1–4' : '0–3'
        } mode; defaulted to option 1.`,
      );
      zeroIdx = 0;
    }

    questions.push({
      question: row.question.slice(0, BLUEPRINT_LIMITS.QUESTION_MAX),
      options: [
        row.options[0].slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        row.options[1].slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        row.options[2].slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        row.options[3].slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
      ],
      correctIndex: zeroIdx,
    });
  });

  return { questions, warnings };
}

export async function parseQuestionnaireExcel(
  file: File,
  preferredMode?: IndexMode,
): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded spreadsheet contains no worksheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (matrix.length === 0) {
    throw new Error('The uploaded worksheet is empty.');
  }

  const rawRows: ParsedExcelResult['rawRows'] = [];
  const parseWarnings: string[] = [];

  matrix.forEach((rawRow, rowIdx) => {
    const cols = [0, 1, 2, 3, 4, 5].map((i) => normalizeCell(rawRow[i]));
    if (cols.every((c) => c === '')) return;

    if (rowIdx === 0 && isLikelyHeaderRow(cols)) {
      return;
    }

    const questionText = cols[0];
    const options: [string, string, string, string] = [cols[1], cols[2], cols[3], cols[4]];
    const rawIdxStr = cols[5];

    if (!questionText) {
      parseWarnings.push(`Row ${rowIdx + 1}: Skipped because Column 1 (question text) is empty.`);
      return;
    }

    if (options.some((opt) => opt === '')) {
      parseWarnings.push(
        `Row ${rowIdx + 1}: One or more option columns (Columns 2–5) were blank; filled missing slots with "—".`,
      );
    }

    const parsedNum = Number(rawIdxStr);
    if (rawIdxStr === '' || Number.isNaN(parsedNum)) {
      parseWarnings.push(
        `Row ${rowIdx + 1}: Column 6 ("${rawIdxStr}") is not a valid number; defaulted to 1.`,
      );
    }

    rawRows.push({
      question: questionText.slice(0, BLUEPRINT_LIMITS.QUESTION_MAX),
      options: [
        (options[0] || '—').slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        (options[1] || '—').slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        (options[2] || '—').slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
        (options[3] || '—').slice(0, BLUEPRINT_LIMITS.OPTION_MAX),
      ],
      rawIndex: rawIdxStr !== '' && !Number.isNaN(parsedNum) ? Math.trunc(parsedNum) : 1,
    });
  });

  if (rawRows.length === 0) {
    throw new Error(
      'No valid questionnaire rows found. Ensure Column 1 has the question, Columns 2–5 have the 4 options, and Column 6 has the correct index.',
    );
  }

  if (rawRows.length > BLUEPRINT_LIMITS.MAX_QUESTIONS) {
    parseWarnings.push(
      `Only the first ${BLUEPRINT_LIMITS.MAX_QUESTIONS} questions were imported (maximum allowed per video).`,
    );
    rawRows.splice(BLUEPRINT_LIMITS.MAX_QUESTIONS);
  }

  // Auto-detect 0-based vs 1-based indexing unless user explicitly chose a mode
  const hasZero = rawRows.some((r) => r.rawIndex === 0);
  const hasFour = rawRows.some((r) => r.rawIndex === 4);
  const detectedMode: IndexMode = preferredMode
    ? preferredMode
    : hasZero && !hasFour
      ? 'zero-based'
      : 'one-based';

  const applied = applyIndexMode(rawRows, detectedMode);

  return {
    questions: applied.questions,
    rawRows,
    detectedMode,
    warnings: [...parseWarnings, ...applied.warnings],
  };
}

export function downloadQuestionnaireTemplate(): void {
  const rows = [
    ['Question Text', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Index (1-4)'],
    [
      'What is the primary goal during the first 5 minutes of a discovery call?',
      'Pitch pricing tiers immediately',
      'Understand the prospect workflow and pain points',
      'Send a PDF brochure and end the call',
      'Ask for a legal contract signature',
      2,
    ],
    [
      'Which team owns SLA escalation tracking after handoff?',
      'Marketing',
      'External Vendors',
      'Operations',
      'Facilities',
      3,
    ],
    [
      'How should high-priority incidents be logged before escalating?',
      'With reproduction steps, timestamp, and impact scope',
      'With a one-word message in chat',
      'Wait 48 hours to see if it resolves',
      'Email only after the week ends',
      1,
    ],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 52 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 30 },
    { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Questionnaire');
  XLSX.writeFile(wb, 'cadence_questionnaire_template.xlsx');
}

export function exportAnalyticsWorkbook(
  videoRows: Array<Record<string, string | number>>,
  learnerRows: Array<Record<string, string | number>>,
): void {
  const wb = XLSX.utils.book_new();
  const videoSheet = XLSX.utils.json_to_sheet(videoRows);
  const learnerSheet = XLSX.utils.json_to_sheet(learnerRows);
  XLSX.utils.book_append_sheet(wb, videoSheet, 'Video Engagement');
  XLSX.utils.book_append_sheet(wb, learnerSheet, 'Learner Progress');
  XLSX.writeFile(wb, 'cadence_training_analytics.xlsx');
}
