/**
 * The conversion of stored IFC models for viewing in the real sandbox (the viewer step, part 1; prompt 3 section 8;
 * docs/adr/0046-viewer-spike.md decision 2; docs/build-log.md, "The viewer step", item 3). Needs Docker and the model
 * conversion image built from this repository's converter (services/model-converter/build.sh): without them the block
 * is skipped, and the pipeline's tests run with the scripted sandbox (tests/api/model-view-pipeline.test.ts).
 *
 * Over a TEST API and data folder (under the home folder, so Colima can mount it): the owner uploads the synthetic ARH
 * and MEP rev A fixtures; the conversion worker runs the image on each, one at a time, with the image's real digest and
 * source label checked against the repository; each model is converted and its record holds the converter, the image,
 * sizes and times; its view file is served by the route; its storey index holds the model's GlobalIds only; the
 * sandbox's containers and volume are gone afterwards; deleting the model erases its view files. The spike's image of
 * 2026-10-02 (`sovitech-viewer-spike:dev`, built before Finding 12's fix and with no source label), when present, is
 * refused with `stale_image` and never started.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readModelViewEvents, readProjectDocuments, withRequest } from '@sovitech/db';
import { converterSourceHash, DEFAULT_MODEL_CONVERTER_IMAGE, inspectConverterImage } from '../../apps/api/src/jobs/model-view/image';
import { storeyIndexHoldsIdsOnly } from '../../apps/api/src/jobs/model-view/outputs';
import { conversionNames, DockerModelConverter } from '../../apps/api/src/jobs/model-view/sandbox';
import { ModelViewWorker } from '../../apps/api/src/jobs/model-view/worker';
import type { FileStore } from '../../apps/api/src/storage/file-store';
import { REPOSITORY_ROOT, fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { modelView } from '../guardrails/_support/model-view';

const SPIKE_IMAGE = 'sovitech-viewer-spike:dev';

/** Whether the docker CLI answers and holds the conversion image built from this repository's converter. */
function converterImageBuilt(): boolean {
  try {
    const label = execFileSync('docker', ['image', 'inspect', '--format', '{{index .Config.Labels "org.sovitech.converter.source-hash"}}', DEFAULT_MODEL_CONVERTER_IMAGE], { encoding: 'utf8' }).trim();
    return label.startsWith('sha256:');
  } catch {
    return false;
  }
}

function imagePresent(image: string): boolean {
  try {
    execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe.runIf(converterImageBuilt())('the viewer step: conversions in the real sandbox (needs Docker and the model conversion image)', { timeout: 300_000 }, () => {
  let api: TestApi;
  let ownerId: string;
  let projectId: string;
  let auth: Auth;
  let sourceHash: string;
  // Colima mounts the home folder only: the stored originals must lie under it.
  const dataRoot = mkdtempSync(join(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir(), 'sovitech-test-conversion-'));

  beforeAll(async () => {
    api = await startTestApi({ dataRoot });
    ({ ownerId, projectId } = await ownerWithProject(api, 'real conversion'));
    auth = await signIn(api, ownerId);
    sourceHash = await converterSourceHash(REPOSITORY_ROOT);
  }, 240_000);

  afterAll(async () => {
    await api.stop();
    await rm(dataRoot, { recursive: true, force: true });
  });

  /** The worker over the TEST API's store, with a data folder Colima can mount, the real image and the repository's source hash. */
  function worker(files: FileStore, image = DEFAULT_MODEL_CONVERTER_IMAGE): ModelViewWorker {
    return new ModelViewWorker({ store: api.services.store, files, log: api.services.log }, new DockerModelConverter(), {
      workerId: 'test-real-converter',
      serviceId: api.extractionAccountId,
      image,
      sourceHash,
      inspect: (name) => inspectConverterImage(name),
      maxAttempts: 1,
      retryAfterSeconds: 0,
      staleAfterSeconds: 1500,
    });
  }

  it('R-025 · prompt 3 section 8 · rule 13: the ARH and MEP rev A fixtures convert in the sandbox, one at a time; each record names the converter and the image, the view file is served, the storey index holds GlobalIds only, and the sandbox is removed', async () => {
    const image = await inspectConverterImage(DEFAULT_MODEL_CONVERTER_IMAGE);
    expect(image?.sourceHash).toBe(sourceHash);
    const models: { documentId: string; contentHash: string; path: string }[] = [];
    for (const path of ['fixtures/ifc/demo-hotel-arh.ifc', 'fixtures/ifc/demo-hotel-mep-rev-a.ifc']) {
      const documentId = (await upload(api, auth, projectId, path.split('/').at(-1) ?? 'model.ifc', fixtureBytes(path))).body.documentId ?? '';
      const { documents } = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request));
      models.push({ documentId, contentHash: documents.find((document) => document.id === documentId)?.contentHash ?? '', path });
    }
    const steps = await worker(api.files).drain();
    expect(steps.map((step) => ('code' in step ? `${step.kind}:${step.code}` : step.kind))).toEqual(['converted', 'converted']);
    const events = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request));
    for (const model of models) {
      const converted = events.find((event) => event.contentHash === model.contentHash && event.type === 'converted');
      expect(converted).toMatchObject({ converter: { name: 'sovitech-model-converter', version: sourceHash, imageDigest: image?.digest }, inputBytes: readFileSync(join(REPOSITORY_ROOT, model.path)).length });
      expect(converted?.viewBytes).toBeGreaterThan(0);
      const served = await modelView(api, auth, projectId, model.documentId);
      expect(served.status).toBe(200);
      expect(served.body.length).toBe(converted?.viewBytes);
      expect(served.body.equals(readFileSync(api.files.derivedPath(projectId, model.contentHash, 'viewer.frag')))).toBe(true);
      const index = api.files.derivedPath(projectId, model.contentHash, 'storeys.json');
      expect(await storeyIndexHoldsIdsOnly(index)).toBe(true);
      const source = readFileSync(join(REPOSITORY_ROOT, model.path), 'latin1');
      const ids = [...readFileSync(index, 'latin1').matchAll(/"([0-9A-Za-z_$]{22})"/g)].map((match) => match[1] ?? '');
      expect(ids.length).toBeGreaterThan(1);
      expect(ids.filter((id) => !source.includes(`'${id}'`))).toEqual([]);
      // The job's containers and its volume are gone.
      for (const step of steps) {
        if (!('job' in step) || step.job.contentHash !== model.contentHash) continue;
        const names = conversionNames(step.job.id);
        expect(() => execFileSync('docker', ['volume', 'inspect', names.volume], { stdio: 'ignore' })).toThrow();
        expect(() => execFileSync('docker', ['container', 'inspect', names.container], { stdio: 'ignore' })).toThrow();
        expect(() => execFileSync('docker', ['container', 'inspect', names.holder], { stdio: 'ignore' })).toThrow();
      }
    }
    // Logs carry codes and ids only (rule 13): no file name, no model word.
    expect(JSON.stringify(api.log)).not.toMatch(/demo-hotel|Generic Model|Ignore previous/u);

    // Deleting a model erases its view files with it (ifc-input 6.2.16).
    const [arh] = models;
    if (arh === undefined) throw new Error('no TEST model');
    expect((await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${arh.documentId}`, headers: { ...auth } })).statusCode).toBe(200);
    expect(await api.files.filesKeyedTo(projectId, arh.contentHash)).toEqual([]);
  });

  it.runIf(imagePresent(SPIKE_IMAGE))('R-025: the spike\'s image of 2026-10-02 (before Finding 12\'s fix, no source label) is refused with `stale_image`, and never started', async () => {
    const documentId = (await upload(api, auth, projectId, 'demo-hotel-mep-ifc2x3.ifc', fixtureBytes('fixtures/ifc/demo-hotel-mep-ifc2x3.ifc'))).body.documentId ?? '';
    const steps = await worker(api.files, SPIKE_IMAGE).drain();
    expect(steps.map((step) => ('code' in step ? `${step.kind}:${step.code}` : step.kind))).toEqual(['failed:stale_image']);
    const events = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readModelViewEvents(request));
    expect(events.filter((event) => event.documentId === documentId).map((event) => event.code ?? event.type)).toEqual(['queued', 'stale_image']);
    const containers = execFileSync('docker', ['ps', '--all', '--filter', 'name=sovitech-convert-', '--format', '{{.Names}}'], { encoding: 'utf8' }).trim();
    expect(containers).toBe('');
  });
});
