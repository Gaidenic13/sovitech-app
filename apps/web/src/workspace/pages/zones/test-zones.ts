/**
 * TEST responses of `GET /api/projects/:projectId/workspace/zones` for the web's component tests, in the contract's
 * shapes (packages/view-model/src/browser/contract/workspace.ts): the client parses every fake answer with the route's
 * schema. Not a test itself, and never imported by the app. Every name and value is TEST data in a digit pattern; none
 * is a figure of the mockups or of a real building. No zone exists in the live app (ADR 0045 decision 1), so these
 * stand for a TEST registry's zones, as the API's registry seam serves them (ADR 0044 decision 4).
 */
import type { Action, DisplayObject, RegisterState, ZonesQuery } from '@sovitech/view-model/browser';
import { decisionDisplay, envelope, levelsOf, notAvailableLine, type TestLevels } from '../topology/test-topology';

export interface TestZone {
  readonly zoneId: string;
  readonly code: string;
  readonly name: string;
  /** The zone's level as served (a TEST text), or Unknown when absent. */
  readonly level?: string;
  /** The zone's area as served (TEST figure in m², with its basis), or Unknown when absent. */
  readonly area?: string;
  /** The systems serving it (catalogue ids), by its equipment's own stored systems; none reads Unknown. */
  readonly systems?: readonly string[];
  /**
   * Which of its systems the TEST view flags `lifeSafety` (the catalogue's flag, served with each decision: V-6); by
   * default Fire Safety alone, as the catalogue flags it.
   */
  readonly lifeSafety?: readonly string[];
  /** The zone's description as written (a TEST text value read from a document), or Unknown when absent (V-9). */
  readonly description?: string;
  /** The documents holding its evidence. */
  readonly documents?: ReadonlyArray<{
    readonly documentId: string;
    readonly name: string;
  }>;
}

/** A TEST zone id with a two-digit suffix. */
export function zone(n: number): string {
  return `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8b${String(n).padStart(2, '0')}`;
}

/** A TEST candidate id for a zone's field. */
export function shownCandidate(zoneN: string, field: string): string {
  const suffix = { code: '01', name: '02', level: '03', area: '04', description: '05' }[field] ?? '09';
  return `${zoneN.slice(0, -4)}${zoneN.slice(-2)}${suffix}`;
}

const unknown = (valueId: string): DisplayObject => ({
  valueId,
  kind: 'field',
  text: 'Unknown',
  shape: 'missing',
  missing: 'unknown',
  badge: { id: 'unknown', label: 'Unknown' },
});

function editOf(zoneId: string, fieldKey: string, input: Extract<Action, { kind: 'edit' }>['input'], shown: readonly string[]): Action {
  return {
    kind: 'edit',
    field: { subjectId: zoneId, fieldKey },
    input,
    shownCandidateIds: [...shown],
  };
}

function textField(zoneId: string, path: string, text: string): DisplayObject {
  return {
    valueId: `zone:${zoneId}.${path}`,
    kind: 'field',
    field: { subjectId: zoneId, fieldKey: `zone.${path}` },
    text,
    shape: 'value',
    badge: { id: 'sovitech_will_check', label: 'SOVITECH will check' },
    measure: { label: `TEST zone ${path}` },
    ...(/\d/u.test(text) ? { parts: [text] } : {}),
    sourceLine: {
      id: 'document',
      kind: 'source_line',
      text: 'TEST found in TEST plan 1.pdf',
    },
    evidence: [
      {
        documentId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8f01',
        contentHash: '0000000000000000000000000000000000000000000000000000000000000001',
        excerpt: `TEST excerpt ${path}`,
      },
    ],
    actions: [editOf(zoneId, `zone.${path}`, { kind: 'text', maxLength: 500 }, [shownCandidate(zoneId, path)])],
  };
}

function areaField(zoneId: string, area: string | undefined): DisplayObject {
  const valueId = `zone:${zoneId}.area`;
  const edit = editOf(
    zoneId,
    'zone.area',
    {
      kind: 'quantity',
      unit: { code: 'm2', symbol: 'm²' },
      qualifiers: ['TEST_basis'],
      qualifierRequired: false,
    },
    area === undefined ? [] : [shownCandidate(zoneId, 'area')],
  );
  if (area === undefined)
    return {
      ...unknown(valueId),
      field: { subjectId: zoneId, fieldKey: 'zone.area' },
      actions: [edit],
    };
  return {
    valueId,
    kind: 'field',
    field: { subjectId: zoneId, fieldKey: 'zone.area' },
    text: `${area} m²`,
    parts: [area, 'm²'],
    shape: 'value',
    badge: { id: 'from_document', label: 'From document' },
    measure: {
      label: 'TEST zone area',
      unit: { code: 'm2', symbol: 'm²' },
      qualifierLabel: 'TEST basis',
    },
    sourceLine: {
      id: 'document',
      kind: 'source_line',
      text: 'TEST found in TEST plan 1.pdf',
    },
    actions: [edit],
  };
}

export interface ZonesOptions {
  readonly levels?: TestLevels;
  readonly demo?: boolean;
  /** The register's state; by default `listed` with zones, `none_read` without. */
  readonly state?: RegisterState;
  /** The filters the view was asked for (echoed as `active`); the TEST rows are the caller's. */
  readonly active?: ZonesQuery;
  readonly name?: string;
}

/** `GET /api/projects/:projectId/workspace/zones` with the given TEST zones. */
export function zonesResponse(projectId: string, zones: readonly TestZone[], options: ZonesOptions = {}) {
  const register = levelsOf(projectId, options.levels ?? 'unknown');
  const displays: DisplayObject[] = [...register.displays];
  const rows = zones.map((entry) => {
    const id = entry.zoneId;
    const code = textField(id, 'code', entry.code);
    const name = textField(id, 'name', entry.name);
    const level = entry.level === undefined ? unknown(`zone:${id}.level`) : textField(id, 'level', entry.level);
    const kind = unknown(`zone:${id}.kind`);
    const area = areaField(id, entry.area);
    const systems = entry.systems ?? [];
    const systemsLine: DisplayObject =
      systems.length === 0
        ? { ...unknown(`zone:${id}.systems`), kind: 'line' }
        : {
            valueId: `zone:${id}.systems`,
            kind: 'line',
            text: systems.map((system) => `TEST ${system}`).join(', '),
            shape: 'value',
          };
    displays.push(code, name, level, kind, area, systemsLine);
    return {
      zoneId: id,
      code: code.valueId,
      name: name.valueId,
      level: level.valueId,
      kind: kind.valueId,
      area: area.valueId,
      systems: systemsLine.valueId,
    };
  });
  const details = zones.map((entry) => {
    const id = entry.zoneId;
    const decisions = (entry.systems ?? []).map((system) => decisionDisplay(projectId, system));
    for (const decision of decisions) if (!displays.some((display) => display.valueId === decision.valueId)) displays.push(decision);
    const lifeSafety = new Set(entry.lifeSafety ?? ['fire_safety']);
    // The description: one of the zone's fields (the contract's sixth), not a column of its row (V-9).
    const description =
      entry.description === undefined
        ? {
            ...unknown(`zone:${id}.description`),
            field: { subjectId: id, fieldKey: 'zone.description' },
            actions: [editOf(id, 'zone.description', { kind: 'text', maxLength: 2000 }, [])],
          }
        : textField(id, 'description', entry.description);
    displays.push(description);
    const equipment = notAvailableLine(`project:${projectId}.register.total.zone_${id.replace(/-/gu, '')}`, 'SOVITECH asset taxonomy');
    const points = notAvailableLine(`zone:${id}.points`, 'SOVITECH point templates');
    displays.push(equipment, points);
    const documents = (entry.documents ?? []).map((document) => {
      const fileName: DisplayObject = {
        valueId: `document:${document.documentId}.fileName`,
        kind: 'record',
        text: document.name,
        shape: 'value',
      };
      const status: DisplayObject = {
        valueId: `document:${document.documentId}.coverage`,
        kind: 'record',
        text: 'TEST pages 1-4 of 4',
        shape: 'value',
        parts: ['1', '4'],
      };
      if (!displays.some((display) => display.valueId === fileName.valueId)) displays.push(fileName, status);
      return {
        documentId: document.documentId,
        fileName: fileName.valueId,
        status: status.valueId,
      };
    });
    return {
      zoneId: id,
      fields: [`zone:${id}.code`, `zone:${id}.name`, `zone:${id}.level`, `zone:${id}.kind`, `zone:${id}.area`, description.valueId],
      systemDecisions: (entry.systems ?? []).map((systemId) => ({ decision: `project:${projectId}.scope.${systemId}`, systemId, lifeSafety: lifeSafety.has(systemId) })),
      equipment: equipment.valueId,
      points: points.valueId,
      documents,
    };
  });
  return {
    ...envelope(projectId, displays, {
      demo: options.demo === true,
      ...(options.name === undefined ? {} : { name: options.name }),
    }),
    view: {
      state: options.state ?? (zones.length === 0 ? 'none_read' : 'listed'),
      rows,
      details,
      levels: register.levels,
      active: options.active ?? {},
    },
  };
}
