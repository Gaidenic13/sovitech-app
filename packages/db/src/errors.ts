/**
 * The store's refusals and errors. The database raises each refusal with its own
 * SQLSTATE (migrations 0006, 0008, 0009); the data-access layer turns it into a
 * StoreRefusal naming why, so callers never parse a message.
 *
 * Rule 13, "Logs and error reports never contain document text": a database
 * error can carry stored text in its DETAIL (the failing row of a CHECK
 * violation, the key of a unique or foreign-key violation) and in the message of
 * an input error ("invalid input syntax for type uuid: ..."). Nothing this
 * package throws keeps any of that: a refusal keeps the store's own message, any
 * other database error becomes a StoreError with its SQLSTATE and the names of
 * the constraint, table and column, and neither keeps the original error.
 */

/** SQLSTATE to refusal code. The SV codes are the store's own. */
export const STORE_REFUSALS = {
  SVA01: 'append_only',
  SVV01: 'verification_needs_an_authenticated_app_request',
  SVV02: 'verification_needs_a_person_account',
  SVV03: 'verification_needs_the_engineer_role',
  SVV04: 'candidate_not_in_scope',
  SVV05: 'demo_project',
  SVV06: 'item_not_opened',
  SVV10: 'engineer_verified_outside_the_guarded_function',
  SVE01: 'erasure_needs_an_authenticated_app_request',
  SVE02: 'already_erased',
  SVE03: 'erasure_role',
  SVE04: 'document_not_in_scope',
  SVE10: 'erased_event_outside_the_erasure_function',
  SVE11: 'document_erased',
  SVE12: 'erasure_needs_read_committed',
  SVR01: 'not_authorised',
  SVR02: 'role_state',
  SVR03: 'self_administration',
  SVR04: 'role_granted_on_the_operator_login_only',
  SVR05: 'demo_flag_follows_the_account',
  SVR10: 'written_only_by_its_guarded_function',
  SVX01: 'candidate_without_evidence',
  SVX02: 'evidence_without_excerpt',
  SVX03: 'appearance_without_evidence',
  SVX04: 'method_input_outside_project',
  SVX05: 'chosen_candidate_not_on_field',
  SVX06: 'text_without_document',
  SVX07: 'asset_event_not_from_the_requesting_engineer',
  SVX08: 'related_asset_outside_project',
  SVX09: 'event_not_from_the_requesting_user',
  SVX10: 'covered_candidate_not_on_field',
  SVX11: 'candidate_not_from_the_requesting_user',
  SVX12: 'document_without_analysis',
  SVX13: 'system_event_not_allowed',
  SVX14: 'withdrawal_not_own_value',
  SVX15: 'system_withdrawal_without_request',
  SVG01: 'guard_would_be_lost',
  '42501': 'insufficient_privilege',
} as const;

export type StoreRefusalCode = (typeof STORE_REFUSALS)[keyof typeof STORE_REFUSALS];

/** A write or call the store refused. `sqlState` is the database's code. It never keeps the database's error. */
export class StoreRefusal extends Error {
  override readonly name = 'StoreRefusal';

  constructor(
    readonly refusal: StoreRefusalCode,
    readonly sqlState: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Any other database error, with only what names where it failed: its SQLSTATE
 * and the constraint, table and column. Never the failing row, key, input or
 * statement (rule 13).
 */
export class StoreError extends Error {
  override readonly name = 'StoreError';

  constructor(
    readonly code: string,
    readonly constraint: string | undefined,
    readonly table: string | undefined,
    readonly column: string | undefined,
  ) {
    super(
      `the store refused the statement (SQLSTATE ${code}${constraint === undefined ? '' : `, constraint ${constraint}`}${
        table === undefined ? '' : `, table ${table}`
      })`,
    );
  }
}

interface DatabaseErrorShape {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly constraint?: unknown;
  readonly table?: unknown;
  readonly column?: unknown;
  readonly severity?: unknown;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;

function isKnownState(code: unknown): code is keyof typeof STORE_REFUSALS {
  return typeof code === 'string' && Object.hasOwn(STORE_REFUSALS, code);
}

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** Whether an error came from the database server: it carries a SQLSTATE and a severity. */
function isDatabaseError(error: unknown): error is DatabaseErrorShape & { readonly code: string } {
  if (typeof error !== 'object' || error === null) return false;
  const { code, severity } = error as DatabaseErrorShape;
  return typeof code === 'string' && SQLSTATE.test(code) && typeof severity === 'string';
}

/**
 * The refusal an error from the database carries, if it is one of the store's.
 * The message is the store's own text (0006, 0008, 0009: role, table and code
 * names only), or the database's for 42501, which names a relation.
 */
export function refusalOf(error: unknown): StoreRefusal | undefined {
  if (error instanceof StoreRefusal) return error;
  if (typeof error !== 'object' || error === null) return undefined;
  const { code, message } = error as DatabaseErrorShape;
  if (!isKnownState(code)) return undefined;
  return new StoreRefusal(STORE_REFUSALS[code], code, typeof message === 'string' ? message : code);
}

/**
 * The error to throw for `error`: a StoreRefusal for the store's own refusals, a
 * StoreError for any other database error, and anything else unchanged. Neither
 * keeps the database's DETAIL, hint, context, statement or message text.
 */
export function scrubbed(error: unknown): unknown {
  if (error instanceof StoreRefusal || error instanceof StoreError) return error;
  const refusal = refusalOf(error);
  if (refusal !== undefined) return refusal;
  if (!isDatabaseError(error)) return error;
  return new StoreError(error.code, textOf(error.constraint), textOf(error.table), textOf(error.column));
}

/** The SQLSTATE of a database error, if the error carries one. */
export function sqlStateOf(error: unknown): string | undefined {
  if (error instanceof StoreRefusal) return error.sqlState;
  if (typeof error !== 'object' || error === null) return undefined;
  const { code } = error as DatabaseErrorShape;
  return typeof code === 'string' ? code : undefined;
}

/** The constraint a database error names, if any. */
export function constraintOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { constraint } = error as DatabaseErrorShape;
  return typeof constraint === 'string' ? constraint : undefined;
}

/** Runs `work`, throwing only scrubbed errors: StoreRefusal, StoreError, or a non-database error unchanged. */
export async function refusing<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw scrubbed(error);
  }
}
