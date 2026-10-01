/**
 * The project list, "New project" and step 1's project creation (UD-37; PRD R-001, R-136, R-137;
 * US-INTAKE-02, US-INTAKE-03, US-ADMIN-05, US-ADMIN-15; guardrails rule 7's four required fields;
 * G7-6).
 *
 * - The list shows only the projects the user is a member of (rule 13; the store's
 *   `request_user_projects()`, migration 0014, which the API builder adds), each under the name
 *   the owner entered on step 1, bound (it may hold digits). The demo project's row carries 2.8's
 *   demo line (R-136). A row shows no engineering value in phase 3.
 * - "New project" opens step 1 with no project: nothing is stored until Next sends all four
 *   required fields. The API refuses with 422 `required_fields_missing`, naming each empty field,
 *   and creates nothing (G7-6: "These are the only blocking cases"). Next is never disabled.
 * - Location (guardrails section 5, step 1; prompt 3 5.2 "City"): the country first, as an ISO
 *   3166-1 alpha-2 code picked from COUNTRY_CODES (names from the browser's
 *   `Intl.DisplayNames`, so no list of names is shipped); the city as the owner typed it. The
 *   city id stays Unknown until the SIRUTA licence is confirmed (D-94), so no city list is
 *   offered and nothing is looked up. Changing the country clears the typed city (US-INTAKE-03 AC3).
 * - On creation the API writes, in the owner's request: the project (createProject), its building
 *   subject (so value ids of building facts are stable from the start), and the four answers as
 *   `user` candidates with `user_confirmed` events (2.1: the owner's own entry on an owner field).
 */
import { z } from 'zod';
import { DisplayObjectsSchema, LineSchema, UuidSchema, ValueIdSchema } from './display';

/** Step 1's project types (registry field `project.type`; onboarding-spec 3 step 1). None is preselected (US-INTAKE-02 AC4). */
export const PROJECT_TYPES = ['new_construction', 'renovation', 'existing_building', 'bms_modernization'] as const;
export const ProjectTypeSchema = z.enum(PROJECT_TYPES);

/** The longest project name and city the API stores (the registry's `text` fields; the step 1 inputs' maxlength). */
export const PROJECT_NAME_MAX = 200;
export const CITY_MAX = 120;

/**
 * ISO 3166-1 alpha-2 codes (prompt 3 5.2 "City": "Country first from ISO 3166-1"). Interface
 * options for the owner's own answer, stored as `user` text; not a reference dataset and never a
 * `reference` candidate (the list with names and its approval stay D-94). The API refuses a code
 * not listed here with `country_invalid`.
 */
export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
] as const;
export const CountryCodeSchema = z.enum(COUNTRY_CODES);

/** One row of the project list. */
export const ProjectRowSchema = z.strictObject({
  projectId: UuidSchema,
  /** The project name's display object (`project:<id>.name`). */
  name: ValueIdSchema,
  /** Optional, additive (part B; DR-22): the stored project type's display object (`project:<id>.type`), resolved like the name. */
  projectType: ValueIdSchema.optional(),
  /** Optional, additive (part B; DR-22): the stored city's display object (`project:<id>.city`), resolved like the name. */
  city: ValueIdSchema.optional(),
  isDemo: z.boolean(),
  demoLine: LineSchema.nullable(),
});
export type ProjectRow = z.infer<typeof ProjectRowSchema>;

/**
 * `GET /api/projects`. Opening a row opens step 1 (PRD R-009 "Until decided": a project reopened before Generate opens at step 1).
 * The rows are newest first, by the store's creation time (part B; DR-22).
 */
export const ProjectListResponseSchema = z.strictObject({
  displayObjects: DisplayObjectsSchema,
  projects: z.array(ProjectRowSchema),
});
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

/**
 * `POST /api/projects`: step 1's Next on a new project. Every field is optional in the schema so
 * that an empty one is answered with 422 `required_fields_missing` naming it (G7-6), not with a
 * generic 400. Blank strings count as empty.
 */
export const CreateProjectRequestSchema = z.strictObject({
  name: z.string().max(PROJECT_NAME_MAX).optional(),
  projectType: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().max(CITY_MAX).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

/** The names the refusal's `fields` uses for the four required fields (rule 7's closed list). */
export const REQUIRED_FIELD_NAMES = ['name', 'projectType', 'countryCode', 'city'] as const;

export const CreateProjectResponseSchema = z.strictObject({
  projectId: UuidSchema,
  /** Always 2: Next opens step 2 (US-INTAKE-02 AC3). */
  nextStep: z.literal(2),
});
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
