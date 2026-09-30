/**
 * The accepted formats and what the app does with each (prompt 3 section 5.2,
 * "Parsing scope" and "500 MB limit"; PRD R-013, R-014, R-022; F-INGEST-01,
 * F-INGEST-03; docs/adr/0025-document-storage-and-ingestion.md).
 *
 * - The accepted-format line of step 2: "PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG,
 *   ZIP". Any other file is refused on its own row; nothing else is blocked (rule 7).
 * - The size limit, per file (5.2): "Max file size 500 MB", on the render test's
 *   reviewed allowlist (ADR 0006).
 * - Native-text PDF and XLSX are analysed. An IFC model is stored with the status line
 *   "Not analysed: IFC model stored, not analysed" (prompt 3 5.4), and, until the owner
 *   decides D-01, not read at all (PRD R-023, R-024 "Until decided"; ./model-reading.ts):
 *   the IFC reader that would make the engineer's record stays built, for tests. RVT, DWG,
 *   DOCX, images and ZIP archives are stored and not analysed (G12-1); nothing inside an
 *   archive is read or listed (R-014).
 *
 * The G12-1 line names the file type in its slot (prompt 3 5.3). The words here are
 * the extraction contract's closed list (StoredOnlyStatus.formatWord); every one but
 * "RVT model" is a substitution the build log lists for the approver as a wording
 * clarification of 2.8, and "PDF scan" is new (ADR 0022; a PDF with no text layer on
 * any page, with no OCR in this build).
 */
import type { UploadFormat } from '@sovitech/db';

/** The per-file size limit shown on step 2, in bytes (5.2: per file). */
export const MAX_FILE_BYTES = 500 * 1024 * 1024;

/** The accepted formats, by file extension as written (case ignored). */
const EXTENSIONS: ReadonlyMap<string, UploadFormat> = new Map([
  ['pdf', 'pdf'],
  ['dwg', 'dwg'],
  ['ifc', 'ifc'],
  ['rvt', 'rvt'],
  ['xlsx', 'xlsx'],
  ['docx', 'docx'],
  ['jpg', 'jpg'],
  ['jpeg', 'jpg'],
  ['png', 'png'],
  ['zip', 'zip'],
]);

/** The format of a file name, by its extension, or undefined when it is not on the accepted-format line. */
export function formatOfFileName(fileName: string): UploadFormat | undefined {
  const match = /\.([A-Za-z0-9]{1,8})$/u.exec(fileName.trim());
  return match?.[1] === undefined ? undefined : EXTENSIONS.get(match[1].toLowerCase());
}

/** The G12-1 slot word of each format stored and not analysed (the contract's StoredOnlyStatus.formatWord). */
export const STORED_ONLY_WORD = {
  ifc: 'IFC model',
  rvt: 'RVT model',
  dwg: 'DWG drawing',
  docx: 'DOCX file',
  jpg: 'JPG image',
  png: 'PNG image',
  zip: 'ZIP archive',
} as const satisfies Partial<Record<UploadFormat, string>>;

export type StoredOnlyWord = (typeof STORED_ONLY_WORD)[keyof typeof STORED_ONLY_WORD] | 'PDF scan';

/** What happens to an accepted file once stored. */
export type Routing =
  /** Read by the extractor; its values can be stored (native-text PDF, XLSX). */
  | { readonly kind: 'analyse' }
  /**
   * Stored with the G12-1 line. `engineerRecord`: a reader exists that could read the file for
   * the engineer's record (the header, the schema check and rule 14 findings; R-023, R-024) while
   * the line stays; for IFC, the IFC reader. It runs only where models are read, which the live
   * app does not do until D-01 is decided (./model-reading.ts).
   */
  | { readonly kind: 'stored_only'; readonly word: StoredOnlyWord; readonly engineerRecord: boolean };

export function routingOf(format: UploadFormat): Routing {
  switch (format) {
    case 'pdf':
    case 'xlsx':
      return { kind: 'analyse' };
    case 'ifc':
      return { kind: 'stored_only', word: STORED_ONLY_WORD.ifc, engineerRecord: true };
    default:
      return { kind: 'stored_only', word: STORED_ONLY_WORD[format], engineerRecord: false };
  }
}
