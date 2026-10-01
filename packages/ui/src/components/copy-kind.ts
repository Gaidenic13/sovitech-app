import type { LineKind } from '@sovitech/view-model/browser';

/**
 * The `data-copy-kind` marker a line carries (guardrails 2.8, "Reserved terms", "Where they are
 * allowed"; tests/e2e/render/README.md, "For copy that holds a reserved term").
 *
 * The kit cannot read the reserved-term list (it imports nothing from the registry), so it marks
 * every badge, status line, stage label, demo line, generated sentence and action label with the
 * place 2.8 allows it in. A marker allows nothing by itself: the render check honours it only when
 * a registered allowance of that kind covers the whole text and, for badges, status lines and
 * generated sentences, a display object the screen was served carries that text among its lines.
 * Rule lines and source lines hold no reserved term (packages/registry/src/copy/rule-lines.ts), so
 * they carry no marker, and a reserved term in one would be read as plain copy and fail.
 */
export type CopyKindMarker = 'badge' | 'status-line' | 'generated-sentence' | 'action-label' | 'evidence-excerpt';

const LINE_MARKERS: Readonly<Record<LineKind, CopyKindMarker | undefined>> = {
  status_line: 'status-line',
  stage_label: 'status-line',
  demo_line: 'status-line',
  generated_sentence: 'generated-sentence',
  rule_line: undefined,
  source_line: undefined,
};

/** The marker of a line of this kind, or undefined for a rule line or a source line. */
export function copyKindOfLine(kind: LineKind): CopyKindMarker | undefined {
  return LINE_MARKERS[kind];
}

/** Whether a text holds a number character (any script); used by guards that keep numbers bound. */
export function holdsNumberCharacter(text: string): boolean {
  return /\p{N}/u.test(text);
}
