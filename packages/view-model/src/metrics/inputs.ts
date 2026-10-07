/**
 * What the Metrics builders read (phase 6; docs/adr/0052-metrics-pages-and-series.md; the contract:
 * ../browser/contract/metrics.ts). The API assembles each from the store in the user's own request; nothing here reads
 * the store, a module-level registry or a gate source.
 */
import type { Action, ProjectHeader } from '../browser/contract';
import type { ProposalBuildInput } from '../proposal/inputs';
import type { WorkspaceProject } from '../workspace/inputs';

/** Thrown by a Metrics builder asked for something its input cannot give, or not yet written (the API answers 500, never a guess). */
export class MetricsNotBuilt extends Error {
  constructor(what: string) {
    super(`@sovitech/view-model metrics: ${what}`);
    this.name = 'MetricsNotBuilt';
  }
}

/**
 * What a snapshot-reading Metrics page reads (Financial Overview, CAPEX, Payback Analysis, Lifecycle Analysis): the
 * stored version it shows, as the stored proposal's own builders read it (`ProposalBuildInput`: the snapshot, its
 * candidates, the engine's readings, the catalogue), so every value the proposal also shows is the proposal's own
 * display under the proposal's own value id (G2-7), or null when the project has no stored proposal (the page then
 * reads "Not available yet: a generated preliminary proposal", with `open_proposal`).
 */
export interface MetricsBuildInput {
  readonly projectId: string;
  readonly header: ProjectHeader;
  readonly proposal: ProposalBuildInput | null;
}

/**
 * What OPEX & Savings reads (the building's operating cost before any BMS, from the project's documents now; R-095
 * "Until decided"):
 * - the project as the workspace reads it now (`WorkspaceProject`): its scope decisions, each resolved as System Scope
 *   resolves it (`project:<id>.scope.<system>`, the same display on both pages: G2-7), so SYSTEM OPEX COMPARISON has a
 *   row per system whose recorded decision is include (G10-7); and its project type (an existing building can have
 *   bills: "upload_document" beside the energy cost, US-FIN-13 AC8; new construction cannot: AC9, no upload);
 * - what an estimate of a new building's energy cost would wait for: the annual energy consumption's own line as step 8
 *   plans it (the intake module's `outputMissingItems` over `outputAvailability`: the SOVITECH datasets, then each
 *   first-estimate input still missing, with its Add action, in that order; US-FIN-13 AC9, "naming what an estimate
 *   lacks"; phase 6 part B, V-4), read by the API; the energy-price unit and the open question on annual amounts are
 *   added here.
 */
export interface OpexBuildInput {
  readonly header: ProjectHeader;
  readonly project: WorkspaceProject;
  readonly newBuildEstimate: { readonly names: readonly string[]; readonly actions: readonly Action[] };
}
