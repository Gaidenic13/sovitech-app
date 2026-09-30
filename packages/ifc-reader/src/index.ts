/**
 * @sovitech/ifc-reader: the IFC data pass on web-ifc (owner decision, 2026-09-26: "web-ifc
 * instead"; docs/adr/0018, docs/adr/0031). It reads an IFC model into the extraction
 * contract's output (ADR 0022) in its own no-network sandbox (./Dockerfile); the API's worker
 * sends it IFC jobs and the Python extractor PDF and XLSX jobs (apps/api/src/jobs/sandbox.ts).
 *
 * What this entry hands out:
 * - main: the command line the image runs (the Python extractor's arguments and exit statuses);
 * - runIfcJob, checkOutput, checkedRequest: one job in process, for tests and the API's
 *   in-process runner in tests;
 * - readIfcModel and register: the data pass and the element register, for the reader's own
 *   ground-truth tests (IFC-11 at reader level) and measurements.
 */
export { EXIT_INTERNAL, EXIT_JOB, EXIT_OK, EXIT_REQUEST, main } from './cli';
export { JobError, OutputError, RequestError, checkOutput, checkedRequest, contentHashOf, runIfcJob, type Mounts } from './job';
export { IfcModel, webIfcVersion } from './model';
export { READER_VERSION } from './output';
export { readModel, type ModelReading } from './reading';
export { register, type RegisterRow } from './register';
export { readStepText, textOfBytes } from './step-text';
