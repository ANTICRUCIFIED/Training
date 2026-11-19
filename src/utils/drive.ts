import { BLUEPRINT_LIMITS } from '../types';

/**
 * Extracts a Google Drive file ID from standard Drive sharing links:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=download
 * - Raw file ID (if valid characters and length >= 10)
 */
export function extractDriveFileId(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Pattern 1: /file/d/<ID> or /d/<ID>
  const pathMatch = trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_\-]{10,128})/);
  if (pathMatch?.[1] && BLUEPRINT_LIMITS.ID_PATTERN.test(pathMatch[1])) {
    return pathMatch[1];
  }

  // Pattern 2: ?id=<ID> or &id=<ID>
  try {
    const url = new URL(trimmed);
    const idParam = url.searchParams.get('id');
    if (
      idParam &&
      idParam.length >= 10 &&
      idParam.length <= BLUEPRINT_LIMITS.DRIVE_FILE_ID_MAX &&
      BLUEPRINT_LIMITS.ID_PATTERN.test(idParam)
    ) {
      return idParam;
    }
  } catch {
    // Not a full URL; fall through to raw ID check
  }

  // Pattern 3: Raw Google Drive ID
  if (
    trimmed.length >= 15 &&
    trimmed.length <= BLUEPRINT_LIMITS.DRIVE_FILE_ID_MAX &&
    BLUEPRINT_LIMITS.ID_PATTERN.test(trimmed)
  ) {
    return trimmed;
  }

  return null;
}

export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export function getDriveExternalUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}
