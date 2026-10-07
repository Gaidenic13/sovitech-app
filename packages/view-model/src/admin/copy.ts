/**
 * The admin area's server copy (phase 7; docs/adr/0053): the words of the display objects the admin builders serve.
 * Draft wording, each line with its source, for the owner's OK with the rest of the draft copy (build log, phase 7,
 * "Where copy lives"). No reserved term (guardrails 2.8; the reserved-term check reads this file), and no digit: every
 * number reaches the page inside a bound display object, filled into a slot here.
 */
export const ADMIN_COPY = {
  /** R-150 "Until decided": "reads that it has no approval record while no approver is named". */
  noApprovalRecord: 'No approval record',
  /** R-150: "its approval status read from stored approval records", when one resolves (none can while no approver is named, D-05). */
  approvalHeld: 'Approval record held',
  /** R-150: a dataset the gates wait for whose version has not been received. */
  noVersion: 'No version received',
  /** A dataset's gates and decision: "Waited for by {gates} ({dId})". */
  waitsFor: 'Waited for by {gates} ({dId})',
  /** A dataset the registry declares that no gate waits for (phase 7 part B, A-7): said, never an empty "Waited for by". */
  noGateWaits: 'No gate waits for it',
  /** D-34's interim: "The speed metrics that no event records are reported as 'not counted yet', never estimated". */
  notCountedYet: 'not counted yet',
  /** D-34's interim: "every target reads 'Target not set'". */
  targetNotSet: 'Target not set',
  /** R-151 "for each release" with no release recorded with the events (a product doc issue). */
  byRelease: 'By release: not counted yet. No release is recorded with the events.',
  /** R-152 "Until decided" and D-53: the threshold's state. Slots: the proposed rate and window, from the registry. */
  thresholdNotSet: 'Not set: the approver sets it (the guardrails propose {rate}% over the last {window} decisions). No tier\'s wording changes until then.',
  /** Rule 3: the threshold the approver set, once set (never in this build: D-53). Slots: its rate and window. */
  thresholdSet: 'Set: {rate}% over the last {window} decisions.',
  /** A tier's wording as shown, unchanged. Slot: the 2.8 badge label. */
  tierUnchanged: '{label}, unchanged',
  /** A tier's wording, dropped one step (only when a threshold is set). Slots: the two 2.8 badge labels. */
  tierDropped: '{label} now reads {lower}',
  /** The operator's login, as the actor of a role event (ADR 0013 decision 2). */
  operatorLogin: 'The operator\'s login',
  /** The system, as the actor of an erasure (2.3's `DocumentEvent` roles). */
  system: 'The system',
  /** What an erasure removed. Slots: the counts. */
  removed: '{excerpts} excerpts erased, {texts} text parts deleted, {values} values withdrawn',
  /** Section 4's owner correction rate on inferences when the store holds no owner decision on an inference for the project: no rate, never a zero. */
  noDecisions: 'No decision on an inference recorded',
  /** The low tier's wording: 2.8's two labels (rule 3: "Low ('Please check' for the owner, 'SOVITECH will check' for engineer fields)"). Slots: the labels. */
  lowTier: '{owner} or {engineer}',
  /** A rate with its basis. Slots: the corrections, the decisions and the rate. */
  correctionRate: '{corrections} of {decisions} decisions corrected ({rate}%)',
} as const;
