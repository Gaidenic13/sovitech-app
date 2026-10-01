/**
 * The project list and step 1's project creation (UD-37, OB-1; PRD R-001, R-136, R-137; US-INTAKE-02,
 * US-INTAKE-03, US-ADMIN-05, US-ADMIN-15; guardrails rule 7's four required fields; G7-6).
 *
 * - The list shows only the projects the user is a member of (rule 13; the store's
 *   `request_user_projects()`, migration 0014), newest first by the store's creation time, each under the
 *   name the owner entered on step 1, with its stored project type and city, each as its display object
 *   (they may hold digits; part B, DR-22), and the demo project's row carries 2.8's demo line (R-136; on
 *   no other row: rule 10, "Demo data").
 * - Creation: nobody is blocked except by the four required fields (rule 7): each empty one is named in
 *   422 `required_fields_missing` and nothing is created ("the project is not created until all four
 *   are filled", G7-6). Then, in one transaction of the owner's own request: the project (the store flags
 *   it demo only for the demo seed, ADR 0015), its building subject (so building value ids are stable
 *   from the start), and the four answers, each a `user` candidate with `user_confirmed` (2.1). The
 *   country is an ISO 3166-1 code (5.2 "City"); the city is stored as typed, and its id stays Unknown
 *   until the SIRUTA licence is confirmed (D-94). A refusal of the store at any point creates nothing.
 */
import { createProject, ensureBuildingSubject, newId, readUserProjects, readUserRoles, withRequest, type UserProject } from '@sovitech/db';
import { olderFirst } from '@sovitech/domain';
import { FIELD } from '@sovitech/registry';
import {
  COUNTRY_CODES,
  PROJECT_TYPES,
  isBlankOwnerText,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type ProjectListResponse,
  type ProjectRow,
} from '@sovitech/view-model/browser';
import { lineOf } from '@sovitech/view-model/server';
import { inProject } from '../documents/service';
import { ApiRefusal } from '../errors';
import type { ApiServices } from '../services';
import type { OwnerValue } from '@sovitech/domain';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { ownerValueOf, writeFirstAnswer } from '../wizard/answers';
import { Displays, resolveWizardField } from '../wizard/displays';
import { planProject } from '../wizard/plan';
import { readProjectState } from '../wizard/project-state';
import { fieldOf } from '../wizard/registry';

const COUNTRIES: ReadonlySet<string> = new Set(COUNTRY_CODES);
const TYPES: ReadonlySet<string> = new Set(PROJECT_TYPES);

/** Newest first by the store's creation time, then by id (DR-22); a time that does not parse sorts by its text. */
function newestFirst(a: UserProject, b: UserProject): number {
  const order = olderFirst(b.createdAt, a.createdAt);
  return order !== 0 ? order : b.projectId.localeCompare(a.projectId);
}

export async function listProjects(services: ApiServices, userId: string): Promise<ProjectListResponse> {
  const listed = [...(await withRequest(services.store, { userId }, (request) => readUserProjects(request)))].sort(newestFirst);
  const displays = new Displays();
  const projects: ProjectRow[] = [];
  for (const row of listed) {
    // Each row's name, project type and city (DR-22): the stored step 1 answers, resolved as every screen resolves them.
    const own = await inProject(services, { userId, projectId: row.projectId }, async (request) => {
      const state = await readProjectState(request, { userId, projectId: row.projectId });
      const plan = planProject(state);
      const idOf = (key: string): string => {
        const [first] = displays.addAll(resolveWizardField(state, key, plan.confirmationOf.get(key), plan.suggestions));
        if (first === undefined) throw new Error(`the resolver gave no display for ${key}`);
        return first;
      };
      return { name: idOf(FIELD.projectName), projectType: idOf(FIELD.projectType), city: idOf(FIELD.city) };
    });
    projects.push({ projectId: row.projectId, ...own, isDemo: row.isDemo, demoLine: row.isDemo ? lineOf('demo_data') : null });
  }
  return { displayObjects: displays.list(), projects };
}

/** A step 1 field of the registry (each of the four is registered). */
function stepOneField(key: string): RegistryFieldDefinition {
  const field = fieldOf(key);
  if (field === undefined) throw new Error(`no registry field ${key}`);
  return field;
}

/** Step 1's Next on a new project (G7-6). */
export async function createProjectFor(services: ApiServices, userId: string, body: CreateProjectRequest): Promise<CreateProjectResponse> {
  const name = body.name ?? '';
  const projectType = body.projectType?.trim() ?? '';
  const countryCode = body.countryCode?.trim().toUpperCase() ?? '';
  const city = body.city ?? '';
  // Text that shows nothing (white space, zero-width and format characters, blank letters) is empty (G7-9).
  const missing = [
    ...(isBlankOwnerText(name) ? ['name'] : []),
    ...(isBlankOwnerText(projectType) ? ['projectType'] : []),
    ...(isBlankOwnerText(countryCode) ? ['countryCode'] : []),
    ...(isBlankOwnerText(city) ? ['city'] : []),
  ];
  // Rule 7: the four required fields are the only blocking case; each empty one is named, and nothing is created.
  if (missing.length > 0) throw new ApiRefusal(422, 'required_fields_missing', undefined, undefined, missing);
  if (!TYPES.has(projectType)) throw new ApiRefusal(422, 'project_type_invalid');
  if (!COUNTRIES.has(countryCode)) throw new ApiRefusal(422, 'country_invalid');

  // Each answer is read as an Edit of that field reads it (ownerValueOf, through the question engine's
  // parseOwnerAnswer), before anything is stored: text that would not be stored or shown as typed is refused
  // `answer_invalid` (G2-13), and nothing is created.
  const answers: readonly (readonly [RegistryFieldDefinition, OwnerValue])[] = [
    [stepOneField(FIELD.projectName), ownerValueOf(stepOneField(FIELD.projectName), { kind: 'text', text: name })],
    [stepOneField(FIELD.projectType), ownerValueOf(stepOneField(FIELD.projectType), { kind: 'choice', choice: projectType })],
    [stepOneField(FIELD.country), ownerValueOf(stepOneField(FIELD.country), { kind: 'text', text: countryCode })],
    [stepOneField(FIELD.city), ownerValueOf(stepOneField(FIELD.city), { kind: 'text', text: city })],
  ];
  const projectId = newId();
  await withRequest(services.store, { userId, projectId }, async (request) => {
    // The owner creates a project (R-136); roles come only from the roles table (R-153).
    if (!(await readUserRoles(request, userId)).includes('owner')) throw new ApiRefusal(403, 'owner_only');
    await createProject(request, { isDemo: false, projectId });
    await ensureBuildingSubject(request, userId);
    for (const [field, value] of answers) await writeFirstAnswer(request, { userId, subjectId: projectId, field, value });
  });
  services.log({ event: 'project_created', projectId });
  return { projectId, nextStep: 2 };
}
