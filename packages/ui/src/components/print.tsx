/**
 * The printed document's parts (phase 5; docs/adr/0050-exports-print-route-and-pdf.md decision 1; PRD R-118;
 * US-REPORTS-01 to US-REPORTS-03; guardrails 2.8 "Prominence": "Printed and exported proposals show badges, ranges
 * and sources inline. They add an appendix listing every value's source, verification and method, and the open
 * items"; rule 10, "Labelled everywhere": "Every screen and export for them shows 'Demo data, not an assessment of the
 * real building'").
 *
 * - `PrintFrame`: the page frame of a printed document. A layout table (`role="presentation"`) whose header row holds
 *   the demo line on the demo project: a browser printing the page repeats a table's header row at the top of every
 *   page the table breaks onto, so the one demo line element of the page is printed on every page of the PDF (G10-13),
 *   and on screen it is the first thing the page shows and the first thing read. On any other project the frame has
 *   no header row and prints no demo line (US-REVIEW-03 AC7; G10-10).
 * - `PrintValue`: one value as a printed page shows it: the one value element its display object gives (the Value,
 *   "Not available yet" or status-line component, with its one badge on the figure's line and its source and status
 *   lines inline), with no action (paper has no button), and, where the document asks for them (the appendix), the
 *   value's evidence excerpts printed in full, each bound to the same value id and marked as verbatim document text,
 *   as stored ("[erased]" after erasure: G13-3, G13-12), never behind a disclosure that paper cannot open.
 *
 * Every colour comes from the tokens; the print route sets the brand's light values (tokens.css, the print scope).
 * The kit holds no copy: fixed labels come from the app's catalogue, everything else in display objects.
 */
import type { ReactNode } from 'react';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { DemoLine } from './DemoLine';
import { NotAvailableYet } from './NotAvailableYet';
import { StatusLine } from './StatusLine';
import { Value } from './Value';

export interface PrintFrameProps {
  /** The project header's `demoLine` as the API served it: 2.8's demo line on the demo project, null on every other. */
  readonly demoLine: Line | null;
  readonly children: ReactNode;
}

/** The printed document's frame: the demo line repeated at the top of every printed page of the demo project. */
export function PrintFrame({ demoLine, children }: PrintFrameProps) {
  return (
    <table className="sov-print-frame" role="presentation">
      {demoLine === null ? null : (
        <thead className="sov-print-frame__running">
          <tr>
            <td>
              <DemoLine line={demoLine} />
            </td>
          </tr>
        </thead>
      )}
      <tbody>
        <tr>
          <td className="sov-print-frame__body">{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Whether a display reads "Not available yet" (an output or field missing an input, naming it: rule 7). */
export function isNotAvailableYet(display: DisplayObject): boolean {
  return display.missing === 'not_available_yet' || display.badge?.id === 'not_available_yet';
}

export interface PrintValueProps {
  readonly display: DisplayObject;
  /**
   * What the value measures, shown beside it and outside its bound element (rule 8). Default: the served measure's
   * label, as the Value component reads it. `null` shows none (the row already names the value).
   */
  readonly label?: ReactNode;
  /** Print the value's evidence excerpts in full under it (the appendix). Default false. */
  readonly excerpts?: boolean;
}

/** One printed value: its one element, no action, and its excerpts in full where asked for. */
export function PrintValue({ display, label, excerpts = false }: PrintValueProps) {
  const element = isNotAvailableYet(display) ? (
    <NotAvailableYet display={display} />
  ) : display.kind === 'line' ? (
    <StatusLine display={display} />
  ) : (
    <Value display={display} layout="stack" {...(label === undefined ? {} : { label })} />
  );
  const evidence = excerpts ? (display.evidence ?? []) : [];
  if (evidence.length === 0) return element;
  return (
    <div className="sov-print-value">
      {element}
      {evidence.map((item) => (
        <blockquote
          key={`${item.documentId}:${item.excerpt}`}
          className="sov-excerpt"
          data-value-id={display.valueId}
          data-copy-kind="evidence-excerpt"
          data-document-id={item.documentId}
          data-content-hash={item.contentHash}
        >
          {item.excerpt}
        </blockquote>
      ))}
    </div>
  );
}
