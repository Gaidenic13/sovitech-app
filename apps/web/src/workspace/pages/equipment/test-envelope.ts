/**
 * The screen envelope of a TEST workspace response (common.ts `screenEnvelope`), as ../../../test/harness.tsx builds it,
 * kept here so the TEST views need no test runner (a scratch mock server can serve them). Not a test itself, and never
 * imported by the app. TEST data only.
 */
import type { DisplayObject, Line } from '@sovitech/view-model/browser';

const DEMO_LINE: Line = { id: 'demo_project', kind: 'demo_line', text: 'TEST demo line' };
const AS_OF = '2026-09-30T10:00:00.000Z';

export function envelopeOf(projectId: string, displayObjects: readonly DisplayObject[], options: { readonly demo?: boolean; readonly name?: string } = {}) {
  const name: DisplayObject = { valueId: `project:${projectId}.name`, kind: 'field', text: options.name ?? 'TEST project', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
  return {
    asOf: AS_OF,
    project: { projectId, name: name.valueId, isDemo: options.demo === true, demoLine: options.demo === true ? DEMO_LINE : null },
    displayObjects: [name, ...displayObjects],
  };
}
