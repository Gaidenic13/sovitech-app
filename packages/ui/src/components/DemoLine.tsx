import { Info } from 'lucide-react';
import type { Line } from '@sovitech/view-model/browser';
import { holdsNumberCharacter } from './copy-kind';
import { Icon } from './Icon';

export interface DemoLineProps {
  /**
   * The project header's `demoLine` as the API served it: 2.8's demo line on a project flagged demo,
   * null on every other project. The kit never holds its words.
   */
  readonly line: Line | null;
}

/**
 * The demo line (guardrails rule 10, "Demo data": "Every screen and export for them shows 'Demo
 * data, not an assessment of the real building'"; 2.8; §5-All; GS-1; PRD R-044; US-REVIEW-03).
 *
 * Set from the project's `demo` flag by the server and rendered on every screen and every state of
 * the demo project (loading, error, analysis in progress, nothing found), persistently, never
 * behind a hover or a collapsed section; on any other project it renders nothing (US-REVIEW-03 AC7).
 * A `note` landmark-free region, so it is read once in order and never interrupts.
 */
export function DemoLine({ line }: DemoLineProps) {
  if (line === null) return null;
  if (line.kind !== 'demo_line') {
    throw new Error(`DemoLine: the line "${line.id}" is a ${line.kind}, not 2.8's demo line.`);
  }
  if (holdsNumberCharacter(line.text)) {
    throw new Error(`DemoLine: the demo line holds a number and has no value id (prompt 3 section 7).`);
  }
  return (
    <p className="sov-demo-line" role="note" data-line={line.id} data-demo-line="">
      <Icon icon={Info} size="small" />
      <span data-copy-kind="status-line">{line.text}</span>
    </p>
  );
}
