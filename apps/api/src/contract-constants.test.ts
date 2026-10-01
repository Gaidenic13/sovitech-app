/**
 * The constants the wizard contract restates for the browser equal the API's own (the contract's
 * uploads.ts: "a server-side test (the API builder's) asserts these constants equal
 * apps/api/src/documents/formats.ts and apps/api/src/uploads/service.ts"; docs/adr/0036 Consequences),
 * and the badge ids it mirrors equal the registry's (2.8).
 */
import { BADGE_IDS as REGISTRY_BADGE_IDS } from '@sovitech/registry';
import { ACCEPTED_EXTENSIONS, BADGE_IDS, MAX_FILE_BYTES, RESUMABLE_UPLOAD_CODES } from '@sovitech/view-model/browser';
import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES as API_MAX_FILE_BYTES, formatOfFileName } from './documents/formats';
import { CHUNK_CUT_CODES } from './errors';

describe('ADR 0036: the contract\'s restated constants', () => {
  it('US-DOCS-01 · R-013 · 5.2 "500 MB limit": the per-file limit and the accepted extensions are the API\'s', () => {
    expect(MAX_FILE_BYTES).toBe(API_MAX_FILE_BYTES);
    for (const extension of ACCEPTED_EXTENSIONS) expect(formatOfFileName(`TEST.${extension}`), extension).toBeDefined();
    for (const refused of ['exe', 'txt', 'dxf', 'xls', 'doc']) expect(formatOfFileName(`TEST.${refused}`), refused).toBeUndefined();
  });

  it('phase 2 "Next" · ADR 0019: the codes the client resumes on include every chunk-cut code the API answers', () => {
    for (const code of CHUNK_CUT_CODES) expect(RESUMABLE_UPLOAD_CODES).toContain(code);
    for (const code of ['upload_busy', 'chunk_timeout', 'offset_mismatch'] as const) expect(RESUMABLE_UPLOAD_CODES).toContain(code);
  });

  it('2.8: the contract\'s badge ids are the registry\'s, in its order', () => {
    expect([...BADGE_IDS]).toEqual([...REGISTRY_BADGE_IDS]);
  });
});
