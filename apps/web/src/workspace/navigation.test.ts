import { describe, expect, it } from 'vitest';
import { WORKSPACE_ACTIONS, WORKSPACE_PAGES } from '@sovitech/view-model/browser';
import { levelOfSearch, pageOfPath, pagePath, workspaceActionPath } from './navigation';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';

describe('ADR 0043 · R-146 · R-012: the workspace paths', () => {
  it('R-146 · US-ADMIN-13 AC1: every built page has one path, and each path names its page back', () => {
    for (const page of WORKSPACE_PAGES) expect(pageOfPath(pagePath(PROJECT, page))).toBe(page);
    expect(pageOfPath(`/projects/${PROJECT}/equipment/0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e00`)).toBe('equipment');
    expect(pageOfPath(`/projects/${PROJECT}/steps/3`)).toBeUndefined();
    expect(pageOfPath(`/projects/${PROJECT}/property`)).toBeUndefined();
  });

  it('ADR 0043 decision 6 · R-077: the floor selection is kept on the pages that read it only', () => {
    expect(pagePath(PROJECT, 'zones', 'upper_3')).toBe(`/projects/${PROJECT}/zones?level=upper_3`);
    expect(pagePath(PROJECT, 'equipment', 'below_ground_1')).toBe(`/projects/${PROJECT}/equipment?level=below_ground_1`);
    expect(pagePath(PROJECT, 'documents', 'upper_3')).toBe(`/projects/${PROJECT}/documents`);
    expect(pagePath(PROJECT, 'proposal', 'upper_3')).toBe(`/projects/${PROJECT}/proposal`);
  });

  it('ADR 0043 decision 6: a level of another form in the URL is ignored, never sent', () => {
    expect(levelOfSearch(new URLSearchParams('level=upper_3'))).toBe('upper_3');
    expect(levelOfSearch(new URLSearchParams('level=3'))).toBeUndefined();
    expect(levelOfSearch(new URLSearchParams('level=upper_3%3Cscript'))).toBeUndefined();
    expect(levelOfSearch(new URLSearchParams(''))).toBeUndefined();
  });

  it('rule 7 · R-012 "Until decided": each owner action beside a "Not available yet" line opens a built page', () => {
    const targets = WORKSPACE_ACTIONS.map((action) => workspaceActionPath(PROJECT, action));
    expect(targets).toEqual([`/projects/${PROJECT}/documents?upload=open`, `/projects/${PROJECT}/steps/3`, `/projects/${PROJECT}/system-scope`]);
  });
});
