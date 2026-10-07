/**
 * TEST responses of the three admin routes (phase 7; the contract's admin.ts), for the admin pages' component tests. Not
 * a test itself, and never imported by the app. Every name, id, count and date is TEST data in the contract's shapes;
 * none is a figure of the mockups, of a real building or of a real person. The words of the served lines ("not counted
 * yet", "Target not set", "No approval record") stand in for the server's copy (packages/view-model/src/admin/copy.ts),
 * prefixed TEST where the page must not depend on them.
 */
import {
  ADMIN_GUARDRAIL_EVENT_TYPES,
  AdminAccountsResponseSchema,
  AdminDatasetsResponseSchema,
  AdminGuardrailEventsResponseSchema,
  CALIBRATION_TIERS,
  SPEED_TRUTH_PAIRS,
  type AdminAccountsResponse,
  type AdminDatasetsResponse,
  type AdminGuardrailEventsResponse,
  type DisplayObject,
  type Line,
  type SessionUser,
} from '@sovitech/view-model/browser';

export const AS_OF = '2026-10-07T09:00:00.000Z';

export const ADMIN_ID = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b01';
export const OWNER_ID = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b02';
export const ENGINEER_ID = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b03';
export const REVIEWER_ID = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b04';
export const SEED_ID = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b05';
export const DEMO_PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b10';
export const OWN_PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b11';
export const GRANT_EVENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b20';
export const REVOKE_EVENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b21';
export const ERASED_EVENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b30';
export const ERASED_DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b31';

/** The development accounts as the session names them (synthetic; ADR 0038, amended). */
export const ADMIN_USER: SessionUser = { userId: ADMIN_ID, displayName: 'TEST development admin', roles: ['sovitech_admin'] };
export const ADMIN_OWNER_USER: SessionUser = { userId: ADMIN_ID, displayName: 'TEST development admin and owner', roles: ['owner', 'sovitech_admin'] };
export const ENGINEER_USER: SessionUser = { userId: ENGINEER_ID, displayName: 'TEST development engineer', roles: ['sovitech_engineer'] };
export const REVIEWER_USER: SessionUser = { userId: REVIEWER_ID, displayName: 'TEST development commercial reviewer', roles: ['sovitech_commercial_reviewer'] };
export const OWNER_USER: SessionUser = { userId: OWNER_ID, displayName: 'TEST development owner', roles: ['owner'] };

/** The demo line as the API serves it on the demo's rows (2.8's `demo_data` line; its words stand in as TEST words here). */
export const TEST_DEMO_LINE: Line = { id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' };

/** The line a row carries: the demo's only (rule 10; G10-10). */
const demoLineOf = (isDemo: boolean): Line | null => (isDemo ? TEST_DEMO_LINE : null);

function record(valueId: string, text: string): DisplayObject {
  return { valueId, kind: 'record', text, shape: 'value' };
}

function line(valueId: string, text: string): DisplayObject {
  return { valueId, kind: 'line', text, shape: 'value' };
}

// ---------------------------------------------------------------------------------------------
// UD-39
// ---------------------------------------------------------------------------------------------

export interface AccountsOptions {
  readonly roleEvents?: boolean;
  readonly projects?: boolean;
}

export function accountsResponse(options: AccountsOptions = {}): AdminAccountsResponse {
  const withEvents = options.roleEvents ?? true;
  const withProjects = options.projects ?? true;
  const accounts = [
    { userId: ADMIN_ID, name: 'TEST development admin', kind: 'person' as const, roles: [{ role: 'sovitech_admin' as const, since: 'TEST 7 Oct 2026' }], development: true },
    { userId: OWNER_ID, name: 'TEST development owner', kind: 'person' as const, roles: [{ role: 'owner' as const, since: 'TEST 6 Oct 2026' }], development: true },
    { userId: SEED_ID, name: 'TEST demo seed', kind: 'seed' as const, roles: [], development: false },
  ];
  const displayObjects: DisplayObject[] = [];
  for (const account of accounts) {
    displayObjects.push(record(`account:${account.userId}.displayName`, account.name));
    for (const held of account.roles) displayObjects.push(line(`account:${account.userId}.roles.${held.role}.since`, held.since));
  }
  const roleEvents = withEvents
    ? [
        { eventId: REVOKE_EVENT, userId: OWNER_ID, role: 'sovitech_engineer' as const, change: 'revoked' as const, by: 'TEST operator login', at: 'TEST 6 Oct 2026', reason: 'TEST reason, revoked' },
        { eventId: GRANT_EVENT, userId: ADMIN_ID, role: 'sovitech_admin' as const, change: 'granted' as const, by: 'TEST operator login', at: 'TEST 5 Oct 2026', reason: 'TEST reason, granted' },
      ]
    : [];
  for (const event of roleEvents) {
    displayObjects.push(record(`role_event:${event.eventId}.by`, event.by), line(`role_event:${event.eventId}.at`, event.at), record(`role_event:${event.eventId}.reason`, event.reason));
  }
  const projects = withProjects
    ? [
        { projectId: DEMO_PROJECT, isDemo: true, createdOn: 'TEST 1 Oct 2026', members: [OWNER_ID] },
        { projectId: OWN_PROJECT, isDemo: false, createdOn: 'TEST 2 Oct 2026', members: [] },
      ]
    : [];
  for (const project of projects) {
    displayObjects.push(record(`admin_project:${project.projectId}.id`, project.projectId), line(`admin_project:${project.projectId}.createdOn`, project.createdOn));
  }
  return AdminAccountsResponseSchema.parse({
    asOf: AS_OF,
    displayObjects,
    view: {
      accounts: accounts.map((account) => ({
        userId: account.userId,
        name: `account:${account.userId}.displayName`,
        kind: account.kind,
        roles: account.roles.map((held) => ({ role: held.role, since: `account:${account.userId}.roles.${held.role}.since` })),
        development: account.development,
      })),
      roleEvents: roleEvents.map((event) => ({
        eventId: event.eventId,
        userId: event.userId,
        role: event.role,
        change: event.change,
        by: `role_event:${event.eventId}.by`,
        at: `role_event:${event.eventId}.at`,
        reason: `role_event:${event.eventId}.reason`,
      })),
      projects: projects.map((project) => ({
        projectId: project.projectId,
        id: `admin_project:${project.projectId}.id`,
        isDemo: project.isDemo,
        demoLine: demoLineOf(project.isDemo),
        createdOn: `admin_project:${project.projectId}.createdOn`,
        members: project.members,
      })),
      processors: { state: 'none_chosen' },
    },
  });
}

// ---------------------------------------------------------------------------------------------
// UD-40
// ---------------------------------------------------------------------------------------------

export const DATASET_KEYS = ['sovitech-cost-ranges', 'sovitech-point-templates'] as const;

export function datasetsResponse(options: { readonly none?: boolean } = {}): AdminDatasetsResponse {
  const keys = options.none === true ? [] : DATASET_KEYS;
  const displayObjects = keys.flatMap((key, index) => [
    record(`dataset:${key}.name`, `TEST dataset ${String(index + 1)}`),
    line(`dataset:${key}.version`, 'No version received'),
    line(`dataset:${key}.approval`, 'No approval record'),
    line(`dataset:${key}.waitsFor`, `Waited for by TEST gate ${String(index + 1)} (D-92)`),
  ]);
  return AdminDatasetsResponseSchema.parse({
    asOf: AS_OF,
    displayObjects,
    view: {
      datasets: keys.map((key) => ({ datasetKey: key, name: `dataset:${key}.name`, version: `dataset:${key}.version`, approval: `dataset:${key}.approval`, waitsFor: `dataset:${key}.waitsFor` })),
    },
  });
}

// ---------------------------------------------------------------------------------------------
// UD-41
// ---------------------------------------------------------------------------------------------

export interface GuardrailEventsOptions {
  readonly erasures?: boolean;
  readonly corrections?: boolean;
}

export const NOT_COUNTED = 'not counted yet';
export const TARGET_NOT_SET = 'Target not set';
export const THRESHOLD_NOT_SET = "TEST threshold: not set, no tier's wording changes";
export const REMOVED = 'TEST 3 excerpts erased, 2 text parts deleted, 1 values withdrawn';

export function guardrailEventsResponse(options: GuardrailEventsOptions = {}): AdminGuardrailEventsResponse {
  const projects = [
    { projectId: DEMO_PROJECT, isDemo: true },
    { projectId: OWN_PROJECT, isDemo: false },
  ];
  const displayObjects: DisplayObject[] = [];
  for (const project of projects) displayObjects.push(record(`admin_project:${project.projectId}.id`, project.projectId));
  for (const [index, type] of ADMIN_GUARDRAIL_EVENT_TYPES.entries()) {
    displayObjects.push(line(`guardrail_count:all.${type}`, `TEST ${String(index + 10)}`));
    for (const project of projects) displayObjects.push(line(`guardrail_count:${project.projectId}.${type}`, `TEST ${String(index)}`));
  }
  displayObjects.push(line('guardrail_count:all.byRelease', 'TEST by release: not counted yet.'));
  for (const project of projects) {
    for (const pair of SPEED_TRUTH_PAIRS) {
      for (const metric of [pair.speed, pair.truth]) {
        const value = metric === 'owner_correction_rate' ? 'TEST 1 of 4 decisions corrected (25%)' : NOT_COUNTED;
        displayObjects.push(line(`metric:${project.projectId}.${metric}`, value), line(`metric:${project.projectId}.${metric}.target`, TARGET_NOT_SET));
      }
    }
  }
  displayObjects.push(line('calibration:all.threshold', THRESHOLD_NOT_SET));
  const corrections = options.corrections ?? true;
  const items: Record<(typeof CALIBRATION_TIERS)[number], readonly string[]> = {
    high: corrections ? ['building.floors', 'building.zones'] : [],
    medium: corrections ? ['building.rooms'] : [],
    low: [],
  };
  for (const tier of CALIBRATION_TIERS) {
    displayObjects.push(line(`calibration:${tier}.wording`, `TEST ${tier} wording, unchanged`));
    for (const [index, fieldKey] of items[tier].entries()) displayObjects.push(line(`calibration:${tier}.items.${fieldKey}.corrections`, `TEST ${String(index + 2)}`));
  }
  const erasures =
    options.erasures === false
      ? []
      : [{ documentEventId: ERASED_EVENT, projectId: OWN_PROJECT, isDemo: false, documentId: ERASED_DOCUMENT, role: 'owner' as const, by: 'TEST development owner', at: 'TEST 6 Oct 2026' }];
  for (const entry of erasures) {
    displayObjects.push(
      record(`erasure:${entry.documentEventId}.project`, entry.projectId),
      record(`erasure:${entry.documentEventId}.document`, entry.documentId),
      record(`erasure:${entry.documentEventId}.by`, entry.by),
      line(`erasure:${entry.documentEventId}.at`, entry.at),
      line(`erasure:${entry.documentEventId}.removed`, REMOVED),
    );
  }
  return AdminGuardrailEventsResponseSchema.parse({
    asOf: AS_OF,
    displayObjects,
    view: {
      projects: projects.map((project) => ({
        projectId: project.projectId,
        id: `admin_project:${project.projectId}.id`,
        isDemo: project.isDemo,
        demoLine: demoLineOf(project.isDemo),
        counts: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: `guardrail_count:${project.projectId}.${type}` })),
      })),
      totals: ADMIN_GUARDRAIL_EVENT_TYPES.map((type) => ({ type, count: `guardrail_count:all.${type}` })),
      byRelease: 'guardrail_count:all.byRelease',
      metrics: projects.map((project) => ({
        projectId: project.projectId,
        id: `admin_project:${project.projectId}.id`,
        isDemo: project.isDemo,
        demoLine: demoLineOf(project.isDemo),
        pairs: SPEED_TRUTH_PAIRS.map((pair) => ({
          speed: { metric: pair.speed, value: `metric:${project.projectId}.${pair.speed}`, target: `metric:${project.projectId}.${pair.speed}.target` },
          truth: { metric: pair.truth, value: `metric:${project.projectId}.${pair.truth}`, target: `metric:${project.projectId}.${pair.truth}.target` },
        })),
      })),
      calibration: {
        threshold: 'calibration:all.threshold',
        tiers: CALIBRATION_TIERS.map((tier) => ({
          tier,
          wording: `calibration:${tier}.wording`,
          dropped: false,
          items: items[tier].map((fieldKey) => ({ fieldKey, corrections: `calibration:${tier}.items.${fieldKey}.corrections` })),
        })),
      },
      erasures: erasures.map((entry) => ({
        documentEventId: entry.documentEventId,
        projectId: entry.projectId,
        isDemo: entry.isDemo,
        demoLine: demoLineOf(entry.isDemo),
        project: `erasure:${entry.documentEventId}.project`,
        document: `erasure:${entry.documentEventId}.document`,
        role: entry.role,
        by: `erasure:${entry.documentEventId}.by`,
        at: `erasure:${entry.documentEventId}.at`,
        removed: `erasure:${entry.documentEventId}.removed`,
      })),
    },
  });
}
