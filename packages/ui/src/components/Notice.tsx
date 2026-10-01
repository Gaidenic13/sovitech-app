import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { Button } from './Button';
import { Icon } from './Icon';

export interface NoticeRegionProps {
  /** The region's name ("Notices"), from the catalogue. */
  readonly label: string;
  /** The notices on screen now; empty most of the time. */
  readonly children?: ReactNode;
}

/**
 * The one place quiet notices appear (guardrails rule 7, "Late findings never interrupt"; G7-4;
 * US-INTAKE-19). A polite live region (`role="status"`), mounted once by the shell and kept on the
 * page, so a notice that arrives later is announced without moving focus. Never a dialog, never an
 * alert: nothing opens, nothing takes the owner anywhere, nothing changes an answer.
 */
export function NoticeRegion({ label, children }: NoticeRegionProps) {
  return (
    <div className="sov-notice-region" role="status" aria-live="polite" aria-label={label}>
      {children}
    </div>
  );
}

export interface NoticeProps {
  /**
   * The notice as served: the late-findings notice is a display object (kind `line`) whose count is
   * bound ("We found <n> more things in your documents. You'll see them on the review step.").
   */
  readonly display: DisplayObject;
  /** "Dismiss", from the catalogue (`notice.dismiss`). */
  readonly dismissLabel: string;
  /** Called when the owner dismisses it; the notice's findings stay on the review step. */
  readonly onDismiss: () => void;
}

/**
 * One quiet notice inside the NoticeRegion (rule 7: "trigger one quiet notice"). Its sentence is the
 * served line, bound to its value id so its count is a bound number (prompt 3 section 7). The owner
 * may dismiss it; it never blocks anything and never asks anything.
 */
export function Notice({ display, dismissLabel, onDismiss }: NoticeProps) {
  return (
    <div className="sov-notice">
      <Icon icon={Info} size="small" />
      <p className="sov-notice__text" data-value-id={display.valueId}>
        {display.text}
      </p>
      <Button variant="quiet" onClick={onDismiss}>
        {dismissLabel}
      </Button>
    </div>
  );
}
