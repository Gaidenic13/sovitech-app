/**
 * Shapes every route of the wizard contract shares: the refusal body, timestamps, step numbers,
 * the session user and the project header every screen of a project carries.
 */
import { z } from 'zod';
import { DisplayObjectsSchema, LineSchema, UuidSchema, ValueIdSchema } from './display';

/** A moment as the API writes it (ISO 8601 with a time zone). Used for ordering and late findings, never shown as a value. */
export const IsoTimestampSchema = z.iso.datetime({ offset: true });
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

/** A wizard step (onboarding-spec 3): 1 Project, 2 Documents, 3 Building, 4 Systems, 5 Operations, 6 Goals, 7 Automation, 8 Proposal. */
export const STEP_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const StepNumberSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);
export type StepNumber = (typeof STEP_NUMBERS)[number];

/** The step titles, in order, as the stepper shows them (US-INTAKE-01 AC2; the render allowlist's `wizard-step-number` titles). */
export const STEP_TITLES = ['Project', 'Documents', 'Building', 'Systems', 'Operations', 'Goals', 'Automation', 'Proposal'] as const;

/**
 * What every refused request answers (apps/api/src/errors.ts; routes.ts names each route's
 * codes). `message` is an owner-facing sentence where the API has one (never a file name,
 * document text or an excerpt: rule 13); `fields` names the required fields left empty on
 * step 1 (G7-6); `received` is the bytes an upload holds (ADR 0019).
 */
export const RefusalBodySchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1).optional(),
  received: z.number().int().nonnegative().optional(),
  fields: z.array(z.string().min(1)).optional(),
  /**
   * Optional, additive (part B; DR-10): on a refused upload whose upload id exists (the fixtures-only guard's
   * `not_a_fixture`), the value id of the file name as the owner uploaded it (`upload:<id>.fileName`), whose
   * display object is in `displayObjects`, so the refused row can name the file, bound.
   */
  fileName: ValueIdSchema.optional(),
  displayObjects: DisplayObjectsSchema.optional(),
});
export type RefusalBody = z.infer<typeof RefusalBodySchema>;

/**
 * What counts as nothing in an owner's typed text (rule 7's four required fields; G7-6, G7-9): white
 * space of every kind, the default-ignorable and format characters (zero-width spaces and joiners, word
 * joiners, direction marks, the Mongolian vowel separator) and the blank letters that show as nothing
 * (the Hangul fillers U+115F, U+1160, U+3164 and U+FFA0, the Braille blank U+2800). Text made only of
 * them names nothing on the screen, so it is empty.
 */
const INVISIBLE_OWNER_TEXT = /[\p{White_Space}\p{Default_Ignorable_Code_Point}\p{Cf}\u180E\u3164\u2800\u115F\u1160\uFFA0]/gu;

/** Whether an owner's typed text shows nothing once the characters that show as nothing are removed (G7-9). */
export function isBlankOwnerText(text: string): boolean {
  return text.replace(INVISIBLE_OWNER_TEXT, '') === '';
}

/**
 * Characters an owner's text answer may not hold (G2-13; rule 2, what is shown is what is stored): control
 * characters (NUL among them, which the store cannot hold), lone surrogates (which would be stored as a
 * replacement character, not as typed), and the bidirectional embedding, override and isolate controls
 * U+202A to U+202E and U+2066 to U+2069 (which would make the text show in another order than it was
 * typed and is stored). Letters of any script, Romanian diacritics among them, are never refused.
 */
const REFUSED_OWNER_TEXT = /[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069]/u;

/** Whether an owner's text holds a character the API refuses (`answer_invalid`; G2-13). */
export function holdsRefusedOwnerTextCharacter(text: string): boolean {
  return REFUSED_OWNER_TEXT.test(text);
}

/** The app roles of the proposal phase (PRD 3.7; migration 0001). */
export const APP_ROLES = ['owner', 'sovitech_engineer', 'sovitech_commercial_reviewer', 'sovitech_admin'] as const;
export const AppRoleSchema = z.enum(APP_ROLES);

/**
 * The signed-in user (UD-36; R-133): the account's display name and the roles the roles table
 * records now. Development accounts are synthetic ("Development owner"); no real person's name.
 */
export const SessionUserSchema = z.strictObject({
  userId: UuidSchema,
  displayName: z.string().min(1),
  roles: z.array(AppRoleSchema),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

/**
 * What every screen of a project carries for the shell (US-INTAKE-01 AC1; R-044, R-139):
 * - `name`: the value id of the project name's display object (project.name, the owner's step 1
 *   answer), shown in the header, bound (it may hold digits);
 * - `demoLine`: 2.8's demo line, set from the project's `demo` flag (rule 10; GS-1), present on
 *   every screen of the demo project and on no other project's (US-REVIEW-03 AC1, AC7).
 */
export const ProjectHeaderSchema = z.strictObject({
  projectId: UuidSchema,
  name: ValueIdSchema,
  isDemo: z.boolean(),
  demoLine: LineSchema.nullable(),
});
export type ProjectHeader = z.infer<typeof ProjectHeaderSchema>;

/**
 * The envelope of every screen response of a project: the time the server read the store
 * (`asOf`, for the late-findings ledger, never shown), the shell's header, and the display
 * objects the screen shows. Every `valueId` a view names is among `displayObjects`.
 */
export const screenEnvelope = {
  asOf: IsoTimestampSchema,
  project: ProjectHeaderSchema,
  displayObjects: DisplayObjectsSchema,
} as const;
