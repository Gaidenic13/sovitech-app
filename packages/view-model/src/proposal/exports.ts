/**
 * Reports (DB-18; PRD R-119) and the Equipment register's export (R-066; US-ASSETS-11 AC6; 7.1-r25; ADR 0050
 * decision 4), from stored records only.
 *
 * - Reports lists the generated outputs the owner started (each exported proposal PDF), with its name, generation date
 *   and time and who started it as bound `record` displays (the account's name, never implying review: 7.1.1-D8), its
 *   category, search, a category filter, a date sort and previous and next only (no page numbers, "Showing", Pages or
 *   File Size: G2-1; proposal 7.2.30). No Status column, "⋯" menu, "View" or template (R-119, R-123 "Until decided").
 * - The Equipment export is the register as the page's filters narrow it, every row: for each cell its shown text, its
 *   badge and its source line in three columns (7.1-r25), a missing value as its missing wording ("Unknown", never 0 or
 *   blank: rule 1; G1-29), the demo line as the file's first line on the demo project (rule 10; G10-14), the count's
 *   "Not available yet" line as the page shows it, and no count outside the engine. A cell whose text starts with `=`,
 *   `+`, `-`, `@`, a tab or a carriage return is written with a leading apostrophe, so a spreadsheet never runs it as a
 *   formula (CSV injection; rule 14: a tag read from a document is material, never a command). A spreadsheet set to
 *   Romanian (ro-RO) splits a CSV on ';' as its list separator, so a ';', a tab, a carriage return or a line feed inside
 *   a cell starts a cell too: an `=`, `+`, `-` or `@` after one (past any spaces) gets the same apostrophe, and a cell
 *   holding ';' or a tab is quoted (phase 5 part B, A-5). The file starts with a UTF-8 byte order mark, so a spreadsheet
 *   reads its diacritics as UTF-8 (rule 8: Romanian text as written), never as Windows-1250; no `sep=` line, so the demo
 *   line stays the first line (G10-14).
 * - Times read "D MMM YYYY, HH:MM" (the formatting module's `formatDateAndTime`, as the stored proposal's generation
 *   reads), and a proposal PDF is named by its snapshot's generation date and time, so two versions of one day are two
 *   names (phase 5 part B, DR-5; US-PROPOSAL-11 AC3; draft wording).
 */
import type { DisplayObject, EquipmentExportQuery, ReportsQuery, ReportsResponse, ValueId } from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS, formatDate, formatDateAndTime } from '../formatting';
import { fillLine } from '../resolver/lines';
import { assetCellDisplays, assetTagDisplay, equipmentCountDisplay } from '../workspace/registers';
import { equipmentMatching } from '../workspace/equipment';
import type { Built, WorkspaceProject } from '../workspace/inputs';
import { CSV_COLUMNS } from './copy';
import { ProposalNotBuilt, type GeneratedOutput } from './inputs';

/** Reports' rows a page (previous and next only). */
export const REPORTS_PAGE_SIZE = 10;

function outputValueId(outputId: string, what: 'name' | 'generatedAt' | 'generatedBy' | 'superseded'): ValueId {
  return `output:${outputId}.${what}`;
}

/** "D MMM YYYY, HH:MM" (UTC, as the store writes it), from the ISO timestamp's own text (no arithmetic). */
function dateAndTime(isoTimestamp: string): string {
  try {
    return formatDateAndTime(isoTimestamp).text;
  } catch {
    throw new ProposalNotBuilt('a generated output\'s time is not a timestamp');
  }
}

/** A proposal PDF's name: what it is and the generation date and time of the snapshot it prints (bound: it holds a date). Draft wording. */
function outputName(output: GeneratedOutput): string {
  return `Preliminary proposal generated ${dateAndTime(output.snapshotCreatedAt)}`;
}

function recordDisplay(valueId: ValueId, text: string): DisplayObject {
  return { valueId, kind: 'record', text, shape: 'value', ...(/\d/u.test(text) ? { parts: [text] } : {}) };
}

/** `reports.list`: the generated outputs, filtered, sorted and paged (previous and next only). */
export function reportsView(outputs: readonly GeneratedOutput[], query: ReportsQuery): Built<ReportsResponse['view']> {
  const displays = new Map<ValueId, DisplayObject>();
  const add = (display: DisplayObject): ValueId => {
    displays.set(display.valueId, display);
    return display.valueId;
  };
  const search = query.search?.trim().toLocaleLowerCase('en');
  const filtered = outputs
    .filter((output) => query.category === undefined || output.kind === query.category)
    .filter((output) => search === undefined || search === '' || outputName(output).toLocaleLowerCase('en').includes(search) || output.startedByName.toLocaleLowerCase('en').includes(search))
    .sort((a, b) => (query.sort === 'oldest' ? a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id) : b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id)));
  const page = query.page ?? 1;
  const start = (page - 1) * REPORTS_PAGE_SIZE;
  const rows = filtered.slice(start, start + REPORTS_PAGE_SIZE).map((output) => {
    let superseded: ValueId | null = null;
    if (output.superseded !== null) {
      // 2.8, "Quotation whose inputs changed"; rule 10 (US-REPORTS-05 AC15): never in the live app (no record exists).
      const filled = fillLine('superseded_inputs_changed', { date: formatDate(output.superseded.changedOn).text }, DEFAULT_FORMAT_OPTIONS);
      superseded = add({ valueId: outputValueId(output.id, 'superseded'), kind: 'line', text: filled.line.text, shape: 'value', parts: [...filled.parts], lines: [filled.line] });
    }
    return {
      outputId: output.id,
      kind: output.kind,
      snapshotId: output.snapshotId,
      name: add(recordDisplay(outputValueId(output.id, 'name'), outputName(output))),
      generatedAt: add(recordDisplay(outputValueId(output.id, 'generatedAt'), dateAndTime(output.startedAt))),
      generatedBy: add(recordDisplay(outputValueId(output.id, 'generatedBy'), output.startedByName)),
      superseded,
    };
  });
  return {
    view: { state: outputs.length === 0 ? 'none_generated' : 'listed', rows, page: { hasPrevious: page > 1, hasNext: start + REPORTS_PAGE_SIZE < filtered.length } },
    displayObjects: [...displays.values()],
  };
}

// ---------------------------------------------------------------------------------------------
// The Equipment export (CSV)
// ---------------------------------------------------------------------------------------------

/**
 * A cell as written: the CSV-injection guard, then RFC 4180 quoting.
 * - A leading apostrophe before a first character `=`, `+`, `-`, `@`, a tab or a CR.
 * - An apostrophe before an `=`, `+`, `-` or `@` that follows a ';', a tab, a CR or an LF (past any spaces or quote
 *   marks): a spreadsheet that splits on ';' (Romanian Excel's list separator) or on lines starts a cell there, and a
 *   quoted field protects only a cell at the start of such a split.
 * - Quoted (with `""` for `"`) when it holds `"`, `,`, ';', a tab, a CR or an LF.
 */
export function csvCell(text: string): string {
  const leading = /^[=+\-@\t\r]/u.test(text) ? `'${text}` : text;
  const guarded = leading.replace(/([;\t\r\n][ "]*)(?=[=+\-@])/gu, "$1'");
  return /[",;\t\r\n]/u.test(guarded) ? `"${guarded.replace(/"/gu, '""')}"` : guarded;
}

/** The UTF-8 byte order mark the Equipment export starts with, so a spreadsheet reads the file as UTF-8 (rule 8). */
export const CSV_BYTE_ORDER_MARK = '\uFEFF';

/** A display's three columns: its shown text (the missing wording when it has no value), its badge and its source line. */
function cellColumns(display: DisplayObject | undefined): [string, string, string] {
  if (display === undefined) throw new ProposalNotBuilt('an Equipment cell has a display');
  if (display.text.trim() === '') throw new ProposalNotBuilt('an Equipment cell never exports blank (rule 1)');
  return [display.text, display.badge?.label ?? '', display.sourceLine?.text ?? ''];
}

const HEADINGS = [CSV_COLUMNS.tag, CSV_COLUMNS.type, CSV_COLUMNS.system, CSV_COLUMNS.location, CSV_COLUMNS.level, CSV_COLUMNS.zone] as const;

/**
 * `exports.equipment`: the CSV text (UTF-8 with a byte order mark, CRLF line ends, a header row; the demo line first on the demo project; the
 * count's "Not available yet" line last, as the page shows it). Each cell is the display Equipment serves for it (a
 * level by the level register's label and a zone by its name: G8-24; one display per value id: G2-7).
 */
export function equipmentCsv(project: WorkspaceProject, query: EquipmentExportQuery, demoLine: string | null): string {
  const lines: string[] = [];
  if (demoLine !== null) lines.push(csvCell(demoLine));
  lines.push(HEADINGS.flatMap((heading) => [heading, CSV_COLUMNS.badge(heading), CSV_COLUMNS.source(heading)]).map(csvCell).join(','));
  for (const assetId of equipmentMatching(project, query)) {
    const cells = [
      assetTagDisplay(project, assetId),
      ...(['type', 'system', 'location', 'level', 'zone'] as const).map((cell) => assetCellDisplays(project, assetId, cell)[0]),
    ];
    lines.push(cells.flatMap((display) => cellColumns(display)).map(csvCell).join(','));
  }
  const total = equipmentCountDisplay(project, 'total');
  lines.push([CSV_COLUMNS.total, total.text].map(csvCell).join(','));
  return `${CSV_BYTE_ORDER_MARK}${lines.join('\r\n')}\r\n`;
}
