/**
 * The project's uploads in this page session (step 2; US-DOCS-01, US-DOCS-03; PRD R-013; UD-33).
 * They live at project level, not on the step 2 screen, so an upload keeps running when the owner
 * continues to step 3 (US-DOCS-03 AC9; prompt 3 section 11: "The wizard stays usable during upload
 * and analysis").
 *
 * - Files are checked on the page first (format and per-file size), and a refused file becomes a
 *   refused entry at once, with its reason, while the other files go on (US-DOCS-01 AC4, AC5; rule 7).
 * - At most PARALLEL_UPLOADS run at once; the rest wait their turn.
 * - An entry never holds or shows the file's name: a name is shown only as the step 2 view serves
 *   it, bound (prompt 3 section 7). While an upload is being created its row has no name; once the
 *   API lists it (`upload:<id>.fileName`) the row shows the served name with its progress state. A
 *   refused entry keeps the name's display object when the API's refusal serves one (DR-10), and,
 *   for a file refused on the page, which the API never saw, the file's extension when it is a
 *   short run of letters (`refusedExtensionOf`): no digit, and shorter than every reserved term of
 *   2.8's list, so it is fixed-shape interface copy, never a figure.
 * - `version` changes whenever the stored state may have changed (an upload created, stored or
 *   refused, a stop), so the step 2 screen reads its view again.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { isSignedOut } from '../api/client';
import { PARALLEL_UPLOADS, cancelUpload, checkFile, uploadFile, FORMAT_REFUSED, SIZE_REFUSED } from '../api/uploads';
import { useOnSignedOut } from '../session/SessionProvider';

export type UploadEntry =
  /** Waiting for its turn, or being created: no upload id yet. */
  | { readonly key: string; readonly phase: 'waiting' }
  /** Sending its bytes; the step 2 view lists it by `uploadId` with its served name. */
  | {
      readonly key: string;
      readonly phase: 'uploading';
      readonly uploadId: string;
    }
  /** Stored as a document; shown by the step 2 view's document row from now on. */
  | {
      readonly key: string;
      readonly phase: 'stored';
      readonly documentId: string;
    }
  /** Refused: the file's own reason; the other files go on. */
  | {
      readonly key: string;
      readonly phase: 'refused';
      readonly code: string;
      readonly message?: string;
      /** The file's name as the API's refusal serves it (`upload:<id>.fileName`), when it serves one. */
      readonly fileName?: DisplayObject;
      /** For a file refused on the page: its extension in capitals, when `refusedExtensionOf` reads one. */
      readonly extension?: string;
    };

export interface UploadsContextValue {
  readonly entries: readonly UploadEntry[];
  /** Changes whenever the stored state may have changed. */
  readonly version: number;
  readonly addFiles: (files: readonly File[]) => void;
  /** Stops an upload before it completes (nothing is stored). */
  readonly stop: (key: string) => void;
  /** Removes a refused entry from the list (it was never stored). */
  readonly dismiss: (key: string) => void;
}

const UploadsContext = createContext<UploadsContextValue | null>(null);

interface Job {
  readonly key: string;
  readonly file: File;
  readonly controller: AbortController;
  uploadId?: string;
}

/**
 * The extension of a file refused on the page, in capitals ("EXE"), when it is one to four ASCII
 * letters: never a digit (render test), and shorter than every reserved term of 2.8's list (the
 * shortest has five letters). Else undefined, and the row keeps its generic sentence.
 */
export function refusedExtensionOf(fileName: string): string | undefined {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return undefined;
  const extension = fileName.slice(dot + 1);
  return /^[A-Za-z]{1,4}$/u.test(extension) ? extension.toUpperCase() : undefined;
}

let keySequence = 0;
function nextKey(): string {
  keySequence += 1;
  return `upload-${String(keySequence)}`;
}

export function UploadsProvider({ projectId, children }: { readonly projectId: string; readonly children: ReactNode }) {
  const onSignedOut = useOnSignedOut();
  const [entries, setEntries] = useState<readonly UploadEntry[]>([]);
  const [version, setVersion] = useState(0);
  const queue = useRef<Job[]>([]);
  const running = useRef(new Map<string, Job>());
  const mounted = useRef(true);

  const update = useCallback((key: string, entry: UploadEntry | null) => {
    if (!mounted.current) return;
    setEntries((previous) => {
      const others = previous.filter((candidate) => candidate.key !== key);
      if (entry === null) return others;
      const index = previous.findIndex((candidate) => candidate.key === key);
      if (index === -1) return [...previous, entry];
      return previous.map((candidate) => (candidate.key === key ? entry : candidate));
    });
  }, []);

  const changed = useCallback(() => {
    if (mounted.current) setVersion((previous) => previous + 1);
  }, []);

  const pump = useCallback(() => {
    const start = (): void => {
      while (running.current.size < PARALLEL_UPLOADS) {
        const job = queue.current.shift();
        if (job === undefined) return;
        running.current.set(job.key, job);
        uploadFile(
          projectId,
          job.file,
          (progress) => {
            if (progress.state === 'uploading') {
              job.uploadId = progress.uploadId;
              update(job.key, {
                key: job.key,
                phase: 'uploading',
                uploadId: progress.uploadId,
              });
            } else if (progress.state === 'stored') {
              update(job.key, {
                key: job.key,
                phase: 'stored',
                documentId: progress.documentId,
              });
            } else {
              update(job.key, {
                key: job.key,
                phase: 'refused',
                code: progress.code,
                ...(progress.message === undefined ? {} : { message: progress.message }),
                ...(progress.fileName === undefined ? {} : { fileName: progress.fileName }),
              });
            }
            changed();
          },
          job.controller.signal,
        )
          .catch((error: unknown) => {
            if (isSignedOut(error)) onSignedOut();
            // An abort is the owner's stop or the page left: the stop already cleared the entry.
          })
          .finally(() => {
            running.current.delete(job.key);
            start();
          });
      }
    };
    start();
  }, [changed, onSignedOut, projectId, update]);

  const addFiles = useCallback(
    (files: readonly File[]) => {
      for (const file of files) {
        const key = nextKey();
        const check = checkFile(file);
        if (!check.ok) {
          const extension = refusedExtensionOf(file.name);
          update(key, {
            key,
            phase: 'refused',
            code: check.reason === 'format' ? FORMAT_REFUSED : SIZE_REFUSED,
            ...(extension === undefined ? {} : { extension }),
          });
          continue;
        }
        update(key, { key, phase: 'waiting' });
        queue.current.push({ key, file, controller: new AbortController() });
      }
      pump();
    },
    [pump, update],
  );

  const stop = useCallback(
    (key: string) => {
      queue.current = queue.current.filter((job) => job.key !== key);
      const job = running.current.get(key);
      update(key, null);
      if (job === undefined) return;
      job.controller.abort();
      const uploadId = job.uploadId;
      if (uploadId === undefined) return;
      cancelUpload(projectId, uploadId).then(changed, (error: unknown) => {
        if (isSignedOut(error)) onSignedOut();
      });
    },
    [changed, onSignedOut, projectId, update],
  );

  const dismiss = useCallback((key: string) => update(key, null), [update]);

  // Leaving the project (another project, sign-out) stops what is still running here; the server
  // sweeps an abandoned upload (ADR 0019).
  useEffect(() => {
    mounted.current = true;
    const runningNow = running.current;
    return () => {
      mounted.current = false;
      queue.current = [];
      for (const job of runningNow.values()) job.controller.abort();
    };
  }, []);

  const value = useMemo(() => ({ entries, version, addFiles, stop, dismiss }), [entries, version, addFiles, stop, dismiss]);
  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads(): UploadsContextValue {
  const value = useContext(UploadsContext);
  if (value === null) throw new Error('useUploads is used outside UploadsProvider');
  return value;
}
