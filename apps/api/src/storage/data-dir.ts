/**
 * Where stored files live (prompt 3 section 10, phase 2: "The storage root is
 * outside the repository (`SOVITECH_DATA_DIR`, by default under the user's
 * application-support folder)"; docs/adr/0025-document-storage-and-ingestion.md).
 *
 * The root is an absolute path. It is never inside the repository, so no owner
 * document can end up in the repo, tests or fixtures by being stored (rule 13,
 * "The repo"), and no repository scan ever reads one.
 */
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

export class DataDirectoryError extends Error {
  override name = 'DataDirectoryError';
}

export interface DataDirectoryInputs {
  /** SOVITECH_DATA_DIR, as set. */
  readonly configured?: string;
  readonly platform: NodeJS.Platform;
  readonly home: string;
  /** XDG_DATA_HOME, on Linux. */
  readonly xdgDataHome?: string;
  /** LOCALAPPDATA, on Windows. */
  readonly localAppData?: string;
  /** The repository root, which the data directory must stay out of. */
  readonly repositoryRoot: string;
}

/** The default under the user's application-support folder, per platform. */
export function defaultDataDirectory(inputs: Omit<DataDirectoryInputs, 'configured' | 'repositoryRoot'>): string {
  switch (inputs.platform) {
    case 'darwin':
      return join(inputs.home, 'Library', 'Application Support', 'SOVITECH App', 'data');
    case 'win32':
      return join(inputs.localAppData ?? join(inputs.home, 'AppData', 'Local'), 'SOVITECH App', 'data');
    default:
      return join(inputs.xdgDataHome ?? join(inputs.home, '.local', 'share'), 'sovitech-app', 'data');
  }
}

/** Whether `inner` is `outer` or lies inside it. */
export function isInside(outer: string, inner: string): boolean {
  const path = relative(resolve(outer), resolve(inner));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

/** The storage root: SOVITECH_DATA_DIR when set (absolute, outside the repository), else the default. */
export function resolveDataDirectory(inputs: DataDirectoryInputs): string {
  const configured = inputs.configured?.trim();
  const directory = configured === undefined || configured === '' ? defaultDataDirectory(inputs) : configured;
  if (!isAbsolute(directory)) throw new DataDirectoryError('SOVITECH_DATA_DIR must be an absolute path.');
  if (isInside(inputs.repositoryRoot, directory)) {
    throw new DataDirectoryError('SOVITECH_DATA_DIR must lie outside the repository, so no stored document enters it (rule 13).');
  }
  return resolve(directory);
}

/** The storage root for this process. */
export function dataDirectoryFromEnvironment(repositoryRoot: string, environment: NodeJS.ProcessEnv = process.env): string {
  return resolveDataDirectory({
    ...(environment['SOVITECH_DATA_DIR'] === undefined ? {} : { configured: environment['SOVITECH_DATA_DIR'] }),
    platform: process.platform,
    home: homedir(),
    ...(environment['XDG_DATA_HOME'] === undefined ? {} : { xdgDataHome: environment['XDG_DATA_HOME'] }),
    ...(environment['LOCALAPPDATA'] === undefined ? {} : { localAppData: environment['LOCALAPPDATA'] }),
    repositoryRoot,
  });
}
