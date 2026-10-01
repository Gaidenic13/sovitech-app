/**
 * The loading and load-failure states every data view has (prompt 3 section 11: "Every data view has
 * its loading, empty, partial and error states"; PRD R-003: "no placeholder digits, zero or blank
 * while loading, and Back and retry on error with no answer lost").
 *
 * Loading shows words, never a skeleton of figures; a failure says what could not be loaded and
 * offers "Try again". Neither shows a number.
 */
import { CircleAlert } from 'lucide-react';
import { Button, Icon } from '@sovitech/ui';
import { copy } from '../copy';

/**
 * The one loading line of a screen whose frame stays in place (DR-12): the step's own frame (titles,
 * columns, card outlines) is drawn by the screen, and this line says what is coming, once, politely.
 * `align` places it in its column: centred under a centred title, or at the start of a left column.
 */
export function Loading({ label = copy.app.loading, align = 'center' }: { readonly label?: string; readonly align?: 'center' | 'start' }) {
  return (
    <p role="status" aria-live="polite" className={`${align === 'start' ? 'text-left' : 'py-10 text-center'} text-[15px] text-(--sov-text-muted)`}>
      {label}
    </p>
  );
}

/** A load that failed: what could not be loaded, with the alert glyph beside it as the kit's FieldError draws it, and "Try again". */
export function LoadFailed({ message = copy.app.loadFailed, onRetry }: { readonly message?: string; readonly onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-[640px] flex-col items-center gap-4 py-10 text-center">
      <p className="flex items-start gap-2 text-[15px] text-(--sov-text-primary)">
        <span className="mt-0.5 shrink-0">
          <Icon icon={CircleAlert} size="small" />
        </span>
        <span>{message}</span>
      </p>
      {onRetry === undefined ? null : (
        <Button variant="secondary" onClick={onRetry}>
          {copy.app.retry}
        </Button>
      )}
    </div>
  );
}
