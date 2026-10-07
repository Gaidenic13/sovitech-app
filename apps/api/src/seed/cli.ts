/**
 * `pnpm --filter @sovitech/api seed:demo [--no-analysis]`: builds the demo project on the
 * local database (./demo-seed.ts; docs/adr/0029-demo-seed.md).
 *
 * Like the API and the worker, it refuses to start while any gate fails the loosening
 * check (prompt 3 5.4): assertGatesStartupSafe() runs before anything is opened. It needs
 * the app's and the operator's logins, the extraction service account
 * (SOVITECH_EXTRACTION_ACCOUNT_ID; `pnpm --filter @sovitech/api extraction-account`) and,
 * unless `--no-analysis` is given, Docker with the extractor image (ADR 0018) and the IFC
 * reader's image (ADR 0031), whose runs it drives as the worker does, with both images named
 * as worker-main.ts names them, and, since the viewer step, the model conversion image
 * (services/model-converter/build.sh), whose conversions of the two demo models it runs as the
 * worker does. The data folder must lie under the home folder when Docker
 * runs in Colima. It prints ids, answer keys, fixture paths and 2.8 status lines: never
 * document text (rule 13).
 */
import { openStore } from '@sovitech/db';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { REPOSITORY_ROOT, extractorImage, ifcReaderImage, databaseUrl, modelConverterImage, readSettings } from '../config';
import { converterSourceHash, inspectConverterImage } from '../jobs/model-view/image';
import { DockerModelConverter } from '../jobs/model-view/sandbox';
import { DockerExtractorRunner } from '../jobs/sandbox';
import { stderrApiLog } from '../services';
import { dataDirectoryFromEnvironment } from '../storage/data-dir';
import { FileStore } from '../storage/file-store';
import { fixtureUploadGuard } from '../uploads/fixture-guard';
import { seedDemo } from './demo-seed';

const gates = assertGatesStartupSafe();
const settings = readSettings();
const appUrl = databaseUrl(settings, 'sovitech_db_app');
const operatorUrl = databaseUrl(settings, 'sovitech_db_admin');
const extractionAccountId = settings.SOVITECH_EXTRACTION_ACCOUNT_ID;
if (appUrl === undefined || operatorUrl === undefined || extractionAccountId === undefined) {
  throw new Error('The demo seed needs the local database settings, both logins and SOVITECH_EXTRACTION_ACCOUNT_ID (see .env.example).');
}
const analyse = !process.argv.slice(2).includes('--no-analysis');
const app = openStore(appUrl);
const operator = openStore(operatorUrl);
try {
  const files = new FileStore(
    dataDirectoryFromEnvironment(REPOSITORY_ROOT, { ...process.env, ...(settings.SOVITECH_DATA_DIR === undefined ? {} : { SOVITECH_DATA_DIR: settings.SOVITECH_DATA_DIR }) }),
  );
  const report = await seedDemo({
    gates,
    app,
    operator,
    files,
    uploadGuard: fixtureUploadGuard(REPOSITORY_ROOT),
    extractionAccountId,
    repositoryRoot: REPOSITORY_ROOT,
    ...(analyse ? { runner: new DockerExtractorRunner({ extractor: extractorImage(settings), ifcReader: ifcReaderImage(settings) }) } : {}),
    ...(analyse
      ? {
          converter: {
            runner: new DockerModelConverter(),
            image: modelConverterImage(settings),
            sourceHash: await converterSourceHash(REPOSITORY_ROOT),
            inspect: (image: string) => inspectConverterImage(image),
          },
        }
      : {}),
    log: stderrApiLog,
  });
  const lines = [
    `Demo project: ${report.projectId} (${report.outcome === 'seeded' ? 'created' : 'already seeded; nothing written'})`,
    `Demo seed account: ${report.seedAccountId}`,
    `Owner answers written: ${report.answers.length}`,
    ...report.answers.map((answer) => `  step ${answer.step}: ${answer.fieldKey}`),
    `Documents: ${report.documents.length}`,
    ...report.documents.map((document) => `  ${document.path ?? document.documentId}: ${JSON.stringify(document.statusLine)}`),
    analyse ? `Analysis steps run: ${report.analysis.length}` : 'Analysis: left queued for the worker (--no-analysis)',
    analyse ? `Model conversions run: ${report.conversions.map((step) => step.kind).join(', ') || 'none'}` : 'Model conversions: left queued for the worker (--no-analysis)',
    `AI: ${report.ai.reason}`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
} finally {
  await app.close();
  await operator.close();
}
