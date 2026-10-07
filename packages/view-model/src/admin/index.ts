/**
 * The development-only admin area as display objects (phase 7; the contract: ../browser/contract/admin.ts; decisions:
 * docs/adr/0053-phase-7-scope-and-the-admin-area.md and docs/adr/0054-confidence-calibration.md; the build log,
 * phase 7, "Plan").
 *
 * Pure builders over what the API reads in the admin's own request (./inputs.ts). Every count, id, date and stored text
 * is a display object under the contract's value ids (rule 2; the render test); every "not counted yet", "Target not
 * set", "No approval record" and "No version received" is a served line (./copy.ts), never a zero, a dash or a blank
 * (rule 1; rule 7). A count read from the store is a count, including a count of none; a metric no stored event records
 * is "not counted yet", never estimated (D-34's interim). A section 8 type that no code of this build writes
 * (`GUARDRAIL_EVENT_TYPES_NOT_WRITTEN`) has no count of none to show: where the store counts none it reads "not counted
 * yet" too (phase 7 part B, findings V-3, A-1 and A-2; GS-2). The demo project's rows carry their demo flag, and the web
 * draws the demo line on those rows only (G10-10). Nothing here offers an action: the admin area changes nothing
 * (prompt 3 5.4; guardrails section 10, "Metrics prompt a review, never an edit").
 */
import { badgeById } from '@sovitech/registry';
import type { CalibrationSetting, Confidence, TierCalibration } from '@sovitech/domain';
import {
  ADMIN_GUARDRAIL_EVENT_TYPES,
  CALIBRATION_TIERS,
  type AdminGuardrailEventType,
  SPEED_TRUTH_PAIRS,
  VALUE_ID_PATTERN,
  type AdminAccountsResponse,
  type AdminDatasetsResponse,
  type AdminGuardrailEventsResponse,
  type AdminMetric,
  type DisplayObject,
  type GuardrailEventsView,
  type ValueId,
} from '../browser/contract';
import { DEFAULT_FORMAT_OPTIONS, formatCount, formatDate, formatDateAndTime, formatExactNumber, formatShareOfCounts } from '../formatting';
import { lineOf } from '../resolver';
import { ADMIN_COPY } from './copy';
import type { AdminAccountsInput, AdminDatasetsInput, AdminGuardrailEventsInput } from './inputs';

export * from './inputs';
export { ADMIN_COPY } from './copy';

/**
 * The section 8 types no code of this build writes (phase 7 part B, findings V-3, A-1 and A-2). An engineer's correction
 * of an accepted item (`engineer_corrected_accepted_item`) needs an engineer action, and none exists while PRD D-16 is
 * open (R-128 "Until decided"; the build log's Track E plans its writer). A count of none for such a type is set by the
 * build's scope, not measured, so it reads "not counted yet" (rule 1, "No numeric stand-in"; GS-2; D-34's own words),
 * and the truth metric it feeds ("How often engineers later correct accepted items", section 4) with it; a count the
 * store does hold is shown as counted. GS-2's case file checks this list against the app's source, both ways.
 */
export const GUARDRAIL_EVENT_TYPES_NOT_WRITTEN: readonly AdminGuardrailEventType[] = ['engineer_corrected_accepted_item'];

// ---------------------------------------------------------------------------------------------
// Display objects
// ---------------------------------------------------------------------------------------------

/** The admin views' display objects, each value id once, in the order first served. */
class AdminDisplays {
  private readonly byId = new Map<string, DisplayObject>();

  add(display: DisplayObject): ValueId {
    if (!VALUE_ID_PATTERN.test(display.valueId)) throw new Error(`view-model admin: "${display.valueId}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
    if (display.text.trim() === '') throw new Error(`view-model admin: ${display.valueId} would show nothing (rule 1)`);
    const existing = this.byId.get(display.valueId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(display)) {
      throw new Error(`view-model admin: ${display.valueId} served twice with two displays (G2-7)`);
    }
    this.byId.set(display.valueId, display);
    return display.valueId;
  }

  /** A stored text or id, as recorded: an account's name, a role event's reason, a project's or a document's id. */
  record(valueId: string, text: string): ValueId {
    return this.add({ valueId, kind: 'record', text, shape: 'value' });
  }

  /** A line built from stored state (a date, a rate with its basis, what an erasure removed). */
  line(valueId: string, text: string): ValueId {
    return this.add({ valueId, kind: 'line', text, shape: 'value' });
  }

  /** A whole count read from the store, a count of none included. */
  count(valueId: string, count: number): ValueId {
    const formatted = formatCount(count, DEFAULT_FORMAT_OPTIONS);
    return this.add({ valueId, kind: 'line', text: formatted.text, parts: [...formatted.parts], shape: 'value' });
  }

  /** What no stored record gives yet ("not counted yet", "Target not set", "No version received"): its own words, never a zero. */
  missing(valueId: string, text: string): ValueId {
    return this.add({ valueId, kind: 'line', text, shape: 'missing', missing: 'not_available_yet' });
  }

  /**
   * The store's count of a section 8 type: a count, a count of none included, except a count of none for a type no code
   * of this build writes, which is no measurement and reads "not counted yet" (`GUARDRAIL_EVENT_TYPES_NOT_WRITTEN`).
   */
  eventCount(valueId: string, type: AdminGuardrailEventType, count: number): ValueId {
    return count === 0 && GUARDRAIL_EVENT_TYPES_NOT_WRITTEN.includes(type) ? this.missing(valueId, ADMIN_COPY.notCountedYet) : this.count(valueId, count);
  }

  list(): DisplayObject[] {
    return [...this.byId.values()];
  }
}

/** Fills a copy line's slots ("{name}") with their texts; throws for a slot left unfilled. */
function filled(template: string, slots: Readonly<Record<string, string>>): string {
  const text = template.replace(/\{([a-zA-Z]+)\}/gu, (_, name: string) => {
    const value = slots[name];
    if (value === undefined) throw new Error(`view-model admin: no text for the slot {${name}}`);
    return value;
  });
  return text;
}

const figure = (value: number): string => formatExactNumber(value, DEFAULT_FORMAT_OPTIONS);

/**
 * 2.8's demo line on the demo project's row, and none on any other (rule 10, "Demo data"; G10-10), as the project list
 * serves it: the registry's `demo_data` status line (phase 7 integrator; P-7-ADMIN-ROW-DEMO-LINE).
 */
function demoLineOf(isDemo: boolean) {
  return isDemo ? lineOf('demo_data') : null;
}

// ---------------------------------------------------------------------------------------------
// UD-39
// ---------------------------------------------------------------------------------------------

/** UD-39: accounts with their roles, every role event, projects by id, and no processor chosen (R-143 "Until decided"). */
export function adminAccountsView(input: AdminAccountsInput): AdminAccountsResponse {
  const displays = new AdminDisplays();
  const names = new Map(input.accounts.map((account) => [account.userId, account.displayName]));
  const accounts = input.accounts.map((account) => ({
    userId: account.userId,
    name: displays.record(`account:${account.userId}.displayName`, account.displayName),
    kind: account.kind,
    roles: account.roles.map((held) => ({ role: held.role, since: displays.line(`account:${account.userId}.roles.${held.role}.since`, formatDate(held.since).text) })),
    development: account.development,
  }));
  const roleEvents = input.roleEvents.map((event) => {
    let by: string;
    if (event.byUserId === null) by = ADMIN_COPY.operatorLogin;
    else {
      const name = names.get(event.byUserId);
      if (name === undefined) throw new Error('view-model admin: a role event names an account the store did not list');
      by = name;
    }
    return {
      eventId: event.eventId,
      userId: event.userId,
      role: event.role,
      change: event.change,
      by: displays.record(`role_event:${event.eventId}.by`, by),
      at: displays.line(`role_event:${event.eventId}.at`, formatDateAndTime(event.at).text),
      reason: displays.record(`role_event:${event.eventId}.reason`, event.reason),
    };
  });
  const projects = input.projects.map((project) => ({
    projectId: project.projectId,
    id: displays.record(`admin_project:${project.projectId}.id`, project.projectId),
    isDemo: project.isDemo,
    demoLine: demoLineOf(project.isDemo),
    createdOn: displays.line(`admin_project:${project.projectId}.createdOn`, formatDate(project.createdAt).text),
    members: [...project.memberIds],
  }));
  return {
    asOf: input.asOf,
    displayObjects: displays.list(),
    view: { accounts, roleEvents, projects, processors: { state: 'none_chosen' } },
  };
}

// ---------------------------------------------------------------------------------------------
// UD-40
// ---------------------------------------------------------------------------------------------

/** UD-40: each dataset with its version, its approval status and what waits for it (R-150 "Until decided"). */
export function adminDatasetsView(input: AdminDatasetsInput): AdminDatasetsResponse {
  const displays = new AdminDisplays();
  const datasets = input.datasets.map((dataset) => {
    const key = dataset.datasetKey;
    const gates = dataset.gates.map((gate) => gate.gateId).join(', ');
    const dIds = [...new Set(dataset.gates.map((gate) => gate.dId))].join(', ');
    return {
      datasetKey: key,
      name: displays.record(`dataset:${key}.name`, dataset.name),
      version: dataset.version === null ? displays.missing(`dataset:${key}.version`, ADMIN_COPY.noVersion) : displays.record(`dataset:${key}.version`, dataset.version),
      approval: displays.line(`dataset:${key}.approval`, dataset.approved ? ADMIN_COPY.approvalHeld : ADMIN_COPY.noApprovalRecord),
      // A dataset no gate waits for says so, never "Waited for by  ()" (A-7).
      waitsFor: displays.line(`dataset:${key}.waitsFor`, dataset.gates.length === 0 ? ADMIN_COPY.noGateWaits : filled(ADMIN_COPY.waitsFor, { gates, dId: dIds })),
    };
  });
  return { asOf: input.asOf, displayObjects: displays.list(), view: { datasets } };
}

// ---------------------------------------------------------------------------------------------
// UD-41
// ---------------------------------------------------------------------------------------------

/** The 2.8 label a tier's wording reads (rule 3's tiers), from the registry's badges. */
function tierLabel(tier: Confidence): string {
  if (tier === 'high') return badgeById('likely').label;
  if (tier === 'medium') return badgeById('possible').label;
  return filled(ADMIN_COPY.lowTier, { owner: badgeById('please_check').label, engineer: badgeById('sovitech_will_check').label });
}

/** One step lower (rule 3: "that tier's wording drops one step"); low stays low. */
const lowerOf = (tier: Confidence): Confidence => (tier === 'high' ? 'medium' : 'low');

/** The owner correction rate on inferences (section 4): corrections of decisions, with its basis; no rate without a decision. */
function correctionRate(displays: AdminDisplays, valueId: string, decided: { readonly confirmations: number; readonly corrections: number } | undefined): ValueId {
  if (decided === undefined) throw new Error('view-model admin: the store gave no inference decisions for a project');
  const decisions = decided.confirmations + decided.corrections;
  if (decisions === 0) return displays.line(valueId, ADMIN_COPY.noDecisions);
  // The share is rounded at display, in the formatting module (rule 9).
  const rate = formatShareOfCounts(decided.corrections, decisions, DEFAULT_FORMAT_OPTIONS);
  return displays.line(valueId, filled(ADMIN_COPY.correctionRate, { corrections: figure(decided.corrections), decisions: figure(decisions), rate }));
}

/** UD-41: counts, the paired metrics, rule 3's calibration counts and the erasure log (R-151; R-152 and R-155 "Until decided"). */
export function adminGuardrailEventsView(input: AdminGuardrailEventsInput): AdminGuardrailEventsResponse {
  const displays = new AdminDisplays();
  // Every count is the store's (migration 0018 counts every type for every project and in all): none is made here.
  const countOf = (projectId: string, type: string): number => {
    const row = input.counts.find((entry) => entry.projectId === projectId && entry.type === type);
    if (row === undefined) throw new Error(`view-model admin: the store gave no count of ${type} for a project`);
    return row.count;
  };

  const projects: GuardrailEventsView['projects'] = input.projects.map((project) => ({
    projectId: project.projectId,
    id: displays.record(`admin_project:${project.projectId}.id`, project.projectId),
    isDemo: project.isDemo,
    demoLine: demoLineOf(project.isDemo),
    counts: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: displays.eventCount(`guardrail_count:${project.projectId}.${type}`, type, countOf(project.projectId, type)) })),
  }));
  const totals = ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => {
    const row = input.totals.find((entry) => entry.type === type);
    if (row === undefined) throw new Error(`view-model admin: the store gave no count of ${type} in all projects`);
    return { type, count: displays.eventCount(`guardrail_count:all.${type}`, type, row.count) };
  });
  const byRelease = displays.missing('guardrail_count:all.byRelease', ADMIN_COPY.byRelease);

  // Section 4, "Measure it". Only two of the six are recorded by stored events: the owner correction rate on inferences
  // (the owner's confirmations and corrections of inferences) and the engineers' corrections of accepted items (section
  // 8's engineer_corrected_accepted_item, which no code of this build writes while D-16 is open: "not counted yet" where
  // the store counts none). The other four no event records: "not counted yet" (D-34's interim).
  const metrics: GuardrailEventsView['metrics'] = input.projects.map((project) => {
    const cell = (metric: AdminMetric) => {
      const valueId = `metric:${project.projectId}.${metric}`;
      let value: ValueId;
      if (metric === 'owner_correction_rate') value = correctionRate(displays, valueId, input.inferenceDecisions.find((row) => row.projectId === project.projectId));
      else if (metric === 'engineer_corrections_of_accepted_items') value = displays.eventCount(valueId, 'engineer_corrected_accepted_item', countOf(project.projectId, 'engineer_corrected_accepted_item'));
      else value = displays.missing(valueId, ADMIN_COPY.notCountedYet);
      return { metric, value, target: displays.missing(`${valueId}.target`, ADMIN_COPY.targetNotSet) };
    };
    return {
      projectId: project.projectId,
      id: displays.record(`admin_project:${project.projectId}.id`, project.projectId),
      isDemo: project.isDemo,
      demoLine: demoLineOf(project.isDemo),
      pairs: SPEED_TRUTH_PAIRS.map((pair) => ({ speed: cell(pair.speed), truth: cell(pair.truth) })),
    };
  });

  const calibration = calibrationView(displays, input.calibration, input.threshold, input.proposedThreshold);

  const erasures: GuardrailEventsView['erasures'] = input.erasures.map((entry) => {
    const id = entry.documentEventId;
    let by: string;
    if (entry.role === 'system') by = ADMIN_COPY.system;
    else if (entry.byName === null) throw new Error('view-model admin: an owner\'s erasure names no account');
    else by = entry.byName;
    return {
      documentEventId: id,
      projectId: entry.projectId,
      isDemo: entry.isDemo,
      demoLine: demoLineOf(entry.isDemo),
      project: displays.record(`erasure:${id}.project`, entry.projectId),
      document: displays.record(`erasure:${id}.document`, entry.documentId),
      role: entry.role,
      by: displays.record(`erasure:${id}.by`, by),
      at: displays.line(`erasure:${id}.at`, formatDateAndTime(entry.at).text),
      removed: displays.line(
        `erasure:${id}.removed`,
        filled(ADMIN_COPY.removed, { excerpts: figure(entry.excerptsErased), texts: figure(entry.textPartsDeleted), values: figure(entry.candidatesWithdrawn) }),
      ),
    };
  });

  return {
    asOf: input.asOf,
    displayObjects: displays.list(),
    view: { projects, totals, byRelease, metrics, calibration, erasures },
  };
}

/** Rule 3's calibration counts (R-152): the threshold's state, each tier's wording as shown, corrections per item type. */
function calibrationView(
  displays: AdminDisplays,
  calibration: readonly TierCalibration[],
  setting: CalibrationSetting | null,
  proposed: CalibrationSetting,
): GuardrailEventsView['calibration'] {
  const thresholdSet = setting !== null;
  const shown = setting ?? proposed;
  const threshold = displays.line(
    'calibration:all.threshold',
    filled(thresholdSet ? ADMIN_COPY.thresholdSet : ADMIN_COPY.thresholdNotSet, { rate: figure(shown.correctionRatePercent), window: figure(shown.window) }),
  );
  const tiers = CALIBRATION_TIERS.map((tier) => {
    const entry = calibration.find((candidate) => candidate.tier === tier);
    if (entry === undefined) throw new Error(`view-model admin: no calibration for the ${tier} tier`);
    // Rule 3: a tier drops only while a threshold is set (D-53); never shown dropped otherwise.
    const dropped = thresholdSet && entry.dropped && tier !== 'low';
    const wording = dropped ? filled(ADMIN_COPY.tierDropped, { label: tierLabel(tier), lower: tierLabel(lowerOf(tier)) }) : filled(ADMIN_COPY.tierUnchanged, { label: tierLabel(tier) });
    return {
      tier,
      wording: displays.line(`calibration:${tier}.wording`, wording),
      dropped,
      items: Object.entries(entry.correctionsByField).map(([fieldKey, corrections]) => ({
        fieldKey,
        corrections: displays.count(`calibration:${tier}.items.${fieldKey}.corrections`, corrections),
      })),
    };
  });
  return { threshold, tiers };
}
