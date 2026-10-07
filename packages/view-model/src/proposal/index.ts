/**
 * The stored proposal, its print view, Reports and the Equipment export, as display objects (phase 5; the contract:
 * ../browser/contract/proposal.ts; decisions: docs/adr/0048, 0049, 0050).
 *
 * Pure builders over what the API reads in the user's own request: the stored snapshot (its outputs, candidate ids,
 * pending documents, drafted paragraphs), the snapshot's candidates and the project's current derived state (for
 * staleness and the open items), the engine's readings (stage, changes, headline), the stored quotation records with
 * their standing, and the generated outputs. Every value through the one resolver or the formatting module (the same
 * display for the same value id everywhere, G2-7); every number in a line bound; no copy that 2.8 or the rules do not
 * write (badges, status lines, stage labels, rule lines from the registry; ./copy.ts for the rest, each with its source).
 *
 * What each builder never does (each with its source):
 * - mix a newer value into a stored proposal (US-PROPOSAL-03 AC3): the snapshot's inputs show under
 *   `proposal:<sid>.inputs.*`, as used; a figure whose inputs changed carries "Out of date, recalculating" (2.4);
 * - name a stage the stored records do not give (rule 10; G10-1, G10-9, G10-11): the stage comes from the engine's
 *   `priceStageOf`, never from a parameter;
 * - show a zero, a dash or a blank for a missing value (rule 1): "Not available yet", naming what is missing, with the
 *   owner's action where there is one (rule 7);
 * - claim compliance, or describe a life-safety system as anything but monitored (rule 11): the life-safety sentences
 *   are section 5's and rule 11's words, generated from stored state;
 * - say "not found" over what no completed AI run searched (rule 12; G12-8, G12-10).
 */
export { BASED_ON, CSV_COLUMNS, EXPORT_FILE_NAMES, FIRE_SAFETY_MONITORING_ONLY, INDICATOR_MISSING, INTERFACE_POINTS, OUTPUT_LABELS } from './copy';
export { CSV_BYTE_ORDER_MARK, REPORTS_PAGE_SIZE, csvCell, equipmentCsv, reportsView } from './exports';
export { ProposalNotBuilt, type GeneratedOutput, type OpenItems, type OpenItemsNow, type ProposalBuildInput, type ProposalField, type StoredVersion } from './inputs';
export { inputPath, outputMissingOf, proposalPrintView, proposalValueId, proposalView, snapshotOutput, usedExclusionsOf, usedReading, versionsView } from './view';
