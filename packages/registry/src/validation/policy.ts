/**
 * The closed lists and proposed values that docs/guardrails.md writes out, as
 * code. Registry validation reads them, and the unapproved baseline holds
 * them. The loosening check ties each one to its sentence in
 * docs/guardrails.md (policyAnchorProblems), so a value changed here without
 * the rule text fails the check.
 *
 * Adding to any list here, or changing a value, is a change to the rules:
 * docs/guardrails.md section 10 decides who may make it.
 */

/**
 * Methods the guardrails name as estimated: points, CAPEX and consumption in
 * 2.1 ("Points from per-room tables, CAPEX from €/point, and consumption from
 * capacity × hours are always estimated"), savings, payback and ROI in rule 10
 * ("Savings, payback, ROI and performance", "Always Estimated"). Estimation is
 * `allowed` only for a field that names one of them (prompt 3 5.2).
 */
export const ESTIMATED_METHODS = ['points', 'capex', 'consumption', 'savings', 'payback', 'roi'] as const;
export type EstimatedMethod = (typeof ESTIMATED_METHODS)[number];

/** Rule 7's closed list of required fields: project name, project type, city and country. */
export const REQUIRED_SLOTS = ['project_name', 'project_type', 'city', 'country'] as const;
export type RequiredSlot = (typeof REQUIRED_SLOTS)[number];

/** Rule 7's proposed first-estimate set: building type, gross floor area and the systems in scope. */
export const FIRST_ESTIMATE_SLOTS = ['building_type', 'gross_floor_area', 'systems_in_scope'] as const;
export type FirstEstimateSlot = (typeof FIRST_ESTIMATE_SLOTS)[number];

/** The first-estimate slot that several decision fields share, one per system (2.6, multi-select). */
export const MULTI_FIELD_FIRST_ESTIMATE_SLOTS: readonly FirstEstimateSlot[] = ['systems_in_scope'];

/**
 * Rule 3, "The owner confirms facts they know": identity, use and occupancy,
 * whether the building has something, their own choices. A field with
 * `confirmBy` owner or either names which one applies; every other field is
 * checked by an engineer (prompt 3 5.2).
 */
export const OWNER_FACT_BASES = ['identity', 'use_and_occupancy', 'whether_building_has', 'owner_choice'] as const;
export type OwnerFactBasis = (typeof OWNER_FACT_BASES)[number];

/** Document stages of 2.3. */
export const DOCUMENT_STAGES = [
  'feasibility',
  'permit',
  'technical_design',
  'tender',
  'execution',
  'shop_drawing',
  'as_built',
  'site_survey',
  'nameplate_photo',
  'bill',
  'unknown',
] as const;
export type DocumentStage = (typeof DOCUMENT_STAGES)[number];

/** Rule 6: "Identity fields are a closed list. Today the list holds only the project name." */
export const IDENTITY_SLOTS: readonly RequiredSlot[] = ['project_name'];

/** Rule 5: "The approver sets N (proposed: 7)." */
export const PROPOSED_CONFIRMATION_BUDGET = 7;

/** Rule 3: "the threshold set by the approver (proposed: 10% over the last 50 decisions)". */
export const PROPOSED_CALIBRATION = { correctionRatePercent: 10, window: 50 } as const;

/** Rule 4's order of document stages for proposing an active candidate; "The approver confirms this order." */
export const PROPOSED_STAGE_ORDER: readonly (readonly DocumentStage[])[] = [
  ['site_survey', 'as_built', 'nameplate_photo'],
  ['shop_drawing'],
  ['execution'],
  ['tender'],
  ['technical_design'],
  ['permit'],
  ['feasibility'],
  ['unknown'],
];

type SettingStatus = 'rule' | 'proposed' | 'approved';

interface SettingMeta {
  status: SettingStatus;
  source: string;
  approvalRef?: string;
}

/**
 * The approver settings as the production registry carries them (D-53: "Code
 * reads each setting from the registry and never hard-codes it; the registry
 * carries each rule's proposed value, marked as not approved").
 */
export const PROPOSED_SETTINGS: {
  confirmationBudget: SettingMeta & { value: number };
  calibrationThreshold: SettingMeta & { correctionRatePercent: number; window: number };
  firstEstimateSet: SettingMeta & { members: FirstEstimateSlot[] };
  requiredSet: SettingMeta & { members: RequiredSlot[] };
  identityList: SettingMeta & { members: RequiredSlot[] };
  documentStageOrder: SettingMeta & { tiers: DocumentStage[][] };
} = {
  confirmationBudget: {
    value: PROPOSED_CONFIRMATION_BUDGET,
    status: 'proposed',
    source: 'docs/guardrails.md rule 5, "Budget" (approver setting 1; D-53)',
  },
  calibrationThreshold: {
    correctionRatePercent: PROPOSED_CALIBRATION.correctionRatePercent,
    window: PROPOSED_CALIBRATION.window,
    status: 'proposed',
    source: 'docs/guardrails.md rule 3, "Confidence is set by the evidence and capped by code" (approver setting 2; D-53)',
  },
  firstEstimateSet: {
    members: [...FIRST_ESTIMATE_SLOTS],
    status: 'proposed',
    source: 'docs/guardrails.md rule 7, "The proposed first-estimate set" (approver setting 3; D-53)',
  },
  requiredSet: {
    members: [...REQUIRED_SLOTS],
    status: 'rule',
    source: 'docs/guardrails.md rule 7, criticality table, row `required` (a closed list)',
  },
  identityList: {
    members: [...IDENTITY_SLOTS],
    status: 'rule',
    source: 'docs/guardrails.md rule 6, "Identity fields are a closed list"',
  },
  documentStageOrder: {
    tiers: PROPOSED_STAGE_ORDER.map((tier) => [...tier]),
    status: 'proposed',
    source: 'docs/guardrails.md rule 4, "Documents that disagree" (approver setting 4; D-53)',
  },
};

/** The names of the approver settings, in the order reports list them. */
export const SETTING_NAMES = [
  'confirmationBudget',
  'calibrationThreshold',
  'firstEstimateSet',
  'requiredSet',
  'identityList',
  'documentStageOrder',
] as const;
export type SettingName = (typeof SETTING_NAMES)[number];

/** Words a change-log row uses for each setting, for approval references (see approvals). */
export const SETTING_MENTIONS: Record<SettingName, string[]> = {
  confirmationBudget: ['confirmation budget'],
  calibrationThreshold: ['calibration threshold', 'correction threshold'],
  firstEstimateSet: ['first-estimate set'],
  requiredSet: ['required fields', 'required list'],
  identityList: ['identity list', 'identity field'],
  documentStageOrder: ['stage order', 'document-stage order'],
};

const SLOT_WORDS: Record<RequiredSlot | FirstEstimateSlot, string> = {
  project_name: 'project name',
  project_type: 'project type',
  city: 'city',
  country: 'country',
  building_type: 'building type',
  gross_floor_area: 'gross floor area',
  systems_in_scope: 'the systems in scope',
};

const STAGE_WORDS: Record<DocumentStage, string> = {
  feasibility: 'feasibility',
  permit: 'permit',
  technical_design: 'technical design',
  tender: 'tender',
  execution: 'execution',
  shop_drawing: 'shop drawing',
  as_built: 'as-built',
  site_survey: 'site survey',
  nameplate_photo: 'nameplate photo',
  bill: 'bill',
  unknown: 'unknown',
};

const METHOD_ANCHORS: Record<EstimatedMethod, string> = {
  points: 'Points from per-room tables',
  capex: 'CAPEX from €/point',
  consumption: 'consumption from capacity × hours are always estimated',
  savings: 'Savings, payback, ROI and performance.',
  payback: 'Savings, payback, ROI and performance.',
  roi: 'Savings, payback, ROI and performance.',
};

const BASIS_ANCHORS: Record<OwnerFactBasis, string> = {
  identity: '- identity,',
  use_and_occupancy: '- use and occupancy,',
  whether_building_has: '- whether the building has something,',
  owner_choice: '- their own choices.',
};

function englishList(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1] ?? ''}`;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/** One sentence that must occur in docs/guardrails.md for a value in this file to stand. */
export interface PolicyAnchor {
  what: string;
  phrase: string;
}

/** The anchors, built from the values above, so a changed value needs a changed rule text. */
export function policyAnchors(): PolicyAnchor[] {
  const anchors: PolicyAnchor[] = [
    { what: 'confirmation budget (rule 5)', phrase: `The approver sets N (proposed: ${PROPOSED_CONFIRMATION_BUDGET})` },
    {
      what: 'calibration threshold (rule 3)',
      phrase: `(proposed: ${PROPOSED_CALIBRATION.correctionRatePercent}% over the last ${PROPOSED_CALIBRATION.window} decisions)`,
    },
    {
      what: 'first-estimate set (rule 7)',
      phrase: `**The proposed first-estimate set** is ${englishList(FIRST_ESTIMATE_SLOTS.map((slot) => SLOT_WORDS[slot]))}.`,
    },
    {
      what: 'required list (rule 7)',
      phrase: `It is a closed list: ${englishList(REQUIRED_SLOTS.map((slot) => SLOT_WORDS[slot]))}.`,
    },
    {
      what: 'identity list (rule 6)',
      phrase: `Today the list holds only the ${englishList(IDENTITY_SLOTS.map((slot) => SLOT_WORDS[slot]))}.`,
    },
    {
      what: 'document-stage order (rule 4)',
      phrase: PROPOSED_STAGE_ORDER.map(
        (tier, position) =>
          `${position + 1}. ${englishList(tier.map((stage) => STAGE_WORDS[stage]))}${position === PROPOSED_STAGE_ORDER.length - 1 ? '.' : ','}`,
      ).join(' '),
    },
  ];
  for (const method of ESTIMATED_METHODS) {
    anchors.push({ what: `estimated method ${method} (2.1, rule 10)`, phrase: METHOD_ANCHORS[method] });
  }
  anchors.push({ what: 'estimated methods savings, payback and ROI (rule 10)', phrase: '- **Always Estimated.**' });
  for (const basis of OWNER_FACT_BASES) {
    anchors.push({ what: `owner fact ${basis} (rule 3)`, phrase: BASIS_ANCHORS[basis] });
  }
  return anchors;
}

/** Each anchor that docs/guardrails.md no longer contains. */
export function policyAnchorProblems(guardrailsText: string): string[] {
  const text = collapse(guardrailsText);
  return policyAnchors()
    .filter((anchor) => !text.includes(collapse(anchor.phrase)))
    .map(
      (anchor) =>
        `packages/registry/src/validation/policy.ts: the ${anchor.what} in code is not what docs/guardrails.md says; ` +
        `the rule text no longer contains "${anchor.phrase}"`,
    );
}
