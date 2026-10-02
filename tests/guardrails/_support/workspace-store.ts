/**
 * TEST states of the workspace over a TEST database (phase 4), for the API's workspace cases (G3-20, G4-39, G4-40,
 * G9-6, G13-9 and the extensions of G2-14, G4-38, G5-3) and tests/api/workspace-*.test.ts:
 * - `newOwnerProject`: a project created through the API by the TEST development owner (step 1's four answers);
 * - `testDocumentIn`: a TEST document registered by a TEST extraction service account, analysed, with its text stored
 *   per page (as the extractor's output would be) and its file name as uploaded;
 * - `documentValue`: a `document` candidate read from it, written through the store's one path with its verified
 *   evidence (the store's guards check the evidence's project and revision, and the unit's dimension);
 * - `testRegistry`: the production registry with TEST fields, the steps of those fields and TEST suggestion rules,
 *   handed to the API through its registry seam (apps/api/src/wizard/registry.ts; docs/adr/0044 decision 4).
 * Every account, document, text and value is TEST data. Nothing here catches an error.
 */
import { fileNamePart, insertCandidate, newId, registerDocument, storeDocumentTexts, withRequest, type Request } from '@sovitech/db';
import { createTestService, testContentHash } from '@sovitech/db/testing';
import type { DocumentRecord } from '@sovitech/domain';
import { productionRegistry } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import type { StepNumber } from '@sovitech/view-model/browser';
import type { SuggestionRule } from '@sovitech/view-model/server';
import { apiRegistryOf, type ApiRegistry } from '../../../apps/api/src/wizard/registry';
import type { Auth, TestApi } from './api';

/** A project created through the API by a signed-in TEST owner, with its building subject. */
export async function newOwnerProject(api: TestApi, owner: Auth, label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST ${label}`, projectType: 'new_construction', countryCode: 'RO', city: `TEST city ${label}` } });
  if (created.statusCode !== 201) throw new Error(`project creation answered ${String(created.statusCode)}`);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

/** A TEST extraction service account, a member of the project (2.1: document values come only from such an account). */
export function serviceOf(api: TestApi, projectId: string, label: string): Promise<string> {
  return createTestService(api.database, { projectId, label });
}

/** A TEST document: registered by the service, analysed in full, its pages' text and its file name stored. */
export async function testDocumentIn(
  api: TestApi,
  input: { readonly projectId: string; readonly serviceId: string; readonly label: string; readonly fileName: string; readonly pages: readonly string[] },
): Promise<DocumentRecord> {
  const contentHash = testContentHash(`${input.projectId} ${input.label}`);
  return withRequest(api.database.app, { userId: input.serviceId, projectId: input.projectId }, async (request) => {
    const document = await registerDocument(request, {
      contentHash,
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'analysed', coverage: `pages 1-${String(input.pages.length)} of ${String(input.pages.length)}` },
      createdBy: input.serviceId,
    });
    await storeDocumentTexts(request, {
      contentHash,
      parts: [...input.pages.map((text, index) => ({ part: `page:${String(index + 1)}`, text })), { part: fileNamePart(document.id), text: input.fileName }],
      createdBy: input.serviceId,
    });
    return document;
  });
}

/** A `document` candidate on a field, read from pages of TEST documents (one evidence entry per document). */
export async function documentValue(
  api: TestApi,
  input: {
    readonly projectId: string;
    readonly serviceId: string;
    readonly subjectId: string;
    readonly field: RegistryFieldDefinition;
    readonly value: { readonly quantity: { readonly value: number; readonly unit: string; readonly qualifier?: string } } | { readonly choice: string } | { readonly text: string };
    readonly from: readonly { readonly document: DocumentRecord; readonly page: number; readonly excerpt: string }[];
  },
): Promise<string> {
  return withRequest(api.database.app, { userId: input.serviceId, projectId: input.projectId }, async (request: Request) => {
    const id = newId();
    const written = await insertCandidate(
      request,
      {
        id,
        subjectId: input.subjectId,
        fieldKey: input.field.key,
        ...input.value,
        source: 'document',
        evidence: input.from.map((entry) => ({ documentId: entry.document.id, contentHash: entry.document.contentHash, locator: { page: entry.page }, excerpt: entry.excerpt, check: 'text_match' as const })),
        createdBy: input.serviceId,
      },
      input.field,
    );
    if (written.outcome !== 'stored') throw new Error(`the store did not keep the TEST value: ${written.outcome}`);
    return id;
  });
}

/** The production registry's field by key. */
export function productionFieldOf(key: string): RegistryFieldDefinition {
  const field = productionRegistry.fields.find((entry) => entry.key === key);
  if (field === undefined) throw new Error(`no production field ${key}`);
  return field;
}

/** The production registry with TEST fields (keys starting `test.` or naming TEST), their steps and TEST suggestion rules. */
export function testRegistry(input: { readonly fields?: readonly RegistryFieldDefinition[]; readonly steps?: ReadonlyMap<string, StepNumber>; readonly suggestionRules?: readonly SuggestionRule[] }): ApiRegistry {
  return apiRegistryOf(
    { ...productionRegistry, id: 'TEST production-with-test-fields', fields: [...productionRegistry.fields, ...(input.fields ?? [])] },
    { ...(input.steps === undefined ? {} : { steps: input.steps }), ...(input.suggestionRules === undefined ? {} : { suggestionRules: input.suggestionRules }) },
  );
}
