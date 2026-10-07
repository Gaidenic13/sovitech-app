/**
 * The model viewer stays off every live page until its canvas has a reviewed entry (the viewer step, part 1;
 * docs/build-log.md, "The viewer step", item 6, P-V-CANVAS-UNREADABLE; G2-1; the owner's decision of 2026-10-05 on
 * D-03).
 *
 * Found by the review of part 1 (A-2): the render test cannot hold the mount on its own. Its headless Chromium renders
 * with SwiftShader, so the viewer's probe answers "none", no canvas is ever made, and a viewer mounted on step 3 or
 * System Scope today would pass `pnpm check` while owners with hardware graphics saw an unreviewed canvas. So this test
 * fails while any file of the web app imports `@sovitech/viewer` (statically, by `import()`, or re-exported) and the
 * render test's reviewed `unreadable` list holds no `model-view` entry for the view's one component. It adds no entry
 * and allows nothing: the entry is the approver's (P-V-CANVAS-UNREADABLE), and with it this test only checks that the
 * entry names that component.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import { RENDER_ALLOWLIST } from '../../../tests/e2e/render/allowlist';
import type { UnreadableEntry } from '../../../tests/e2e/render/contract';
import { repoRoot } from '../lib';

/** The view's one component: the only file the reviewed entry may name (the plan, item 6). */
const VIEW_COMPONENT = 'packages/viewer/src/model-view/ModelView.tsx';
/** A module specifier naming the viewer package or one of its entries. */
const VIEWER_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"`])@sovitech\/viewer(?:\/[^'"`]*)?\1/u;

/** The viewer's module specifiers in one file's text (empty when it names none). */
function viewerImports(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => VIEWER_SPECIFIER.test(line))
    .map((line) => line.trim());
}

/** Every source and config file of the web app (its src/ and the files beside it), as paths from the repository root. */
function webAppFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(?:[cm]?[jt]sx?|html)$/u.test(entry.name)) found.push(relative(root, path));
    }
  };
  walk(join(root, 'apps/web'));
  return found.sort();
}

describe('P-V-CANVAS-UNREADABLE · G2-1 · D-03: the model viewer is mounted on no live page until its canvas has a reviewed entry', () => {
  test('P-V-CANVAS-UNREADABLE · G2-1: the scan finds the viewer however a file names it, and nothing else', () => {
    expect(viewerImports("import { ModelViewer } from '@sovitech/viewer';")).toHaveLength(1);
    expect(viewerImports("const viewer = await import('@sovitech/viewer');")).toHaveLength(1);
    expect(viewerImports('export { ModelViewer } from "@sovitech/viewer";')).toHaveLength(1);
    expect(viewerImports("import '@sovitech/viewer/viewer.css';")).toHaveLength(1);
    expect(viewerImports("import { probe } from '@sovitech/viewer/testing';")).toHaveLength(1);
    expect(viewerImports("import { ModelArea } from '@sovitech/ui/components';\n// the viewer comes in part 2")).toEqual([]);
    expect(viewerImports("import { x } from '@sovitech/viewer-spike';")).toEqual([]);
  });

  test('P-V-CANVAS-UNREADABLE · G2-1 · D-03: no file of the web app imports the viewer while the render test has no reviewed entry for its canvas', () => {
    const root = repoRoot;
    const reviewed = (RENDER_ALLOWLIST.unreadable as readonly UnreadableEntry[]).find((entry) => entry.id === 'model-view');
    const files = webAppFiles(root);
    expect(files.length).toBeGreaterThan(0);
    const importing = files.filter((path) => viewerImports(readFileSync(join(root, path), 'utf8')).length > 0);
    if (reviewed === undefined) {
      expect(importing, 'the viewer is mounted while its canvas has no reviewed render entry (P-V-CANVAS-UNREADABLE)').toEqual([]);
    } else {
      expect({ element: reviewed.element, component: reviewed.component }).toEqual({ element: 'canvas', component: VIEW_COMPONENT });
    }
  });
});
