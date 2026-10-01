/**
 * The loading state of steps 5 to 7 (UD-35's reading for the question steps; prompt 3 section 11,
 * "Every data view has its loading … states"; PRD R-003 "no placeholder digits, zero or blank while
 * loading"; US-INTAKE-18 AC1): the step keeps its frame while its answers load, so nothing jumps
 * when they arrive and the footer stays where it is.
 *
 * - One line says what is happening ("Loading your answers"), announced once.
 * - The frame is fixed copy and empty outlines only: the question titles and helper lines from the
 *   catalogue (step 5), and one outline per option, at the option's own height. No option is drawn as
 *   chosen or not, no value, badge or digit shows, and nothing in it can be pressed (rule 1: a value
 *   not loaded yet is never drawn as a blank or a zero).
 */
import { Icon, type IconComponent } from '@sovitech/ui';
import type { ReactNode } from 'react';
import { copy } from '../../copy';

/** The one loading line of the step. */
export function LoadingLine() {
  return (
    <p role="status" aria-live="polite" className="text-[15px] leading-6 text-(--sov-text-muted)">
      {copy.step8.loading}
    </p>
  );
}

export type OutlineShape = 'tall' | 'tile' | 'pill';

/** The height each option shape takes once loaded (onboarding-spec 2.5: tiles about 68px, pill rows about 46px; tall cards clamp their description to two lines). */
const OUTLINE_HEIGHT: Readonly<Record<OutlineShape, string>> = {
  tall: 'min-h-[164px]',
  tile: 'min-h-[68px]',
  pill: 'min-h-[46px]',
};

/** Empty outlines where a question's options will be, in the question's grid. */
export function OptionOutlines({ count, columns, shape }: { readonly count: number; readonly columns: number; readonly shape: OutlineShape }) {
  return (
    <div aria-hidden="true" className="grid gap-5" style={{ gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`${OUTLINE_HEIGHT[shape]} rounded-(--sov-radius-surface) border border-(--sov-border)`} />
      ))}
    </div>
  );
}

/** The room "Skip for now" takes under a question once loaded, so the footer does not move. */
export function SkipRoom() {
  return <div aria-hidden="true" className="h-10" />;
}

/**
 * A step 5 question's frame: its gutter icon, then its title and helper line (in the kit's question
 * styles, so nothing moves when the question arrives), its option outlines and the room of its Skip link.
 */
export function QuestionFrame({
  title,
  helper,
  icon,
  children,
}: {
  readonly title: string;
  readonly helper?: string;
  readonly icon?: IconComponent;
  readonly children: ReactNode;
}) {
  return (
    <div className={QUESTION_GRID}>
      <QuestionGutter icon={icon} />
      <div className="sov-choice-group">
        <p className="sov-choice-group__legend sov-heading-group">
          <span>{title}</span>
        </p>
        {helper === undefined || helper === '' ? null : <p className="sov-choice-group__hint">{helper}</p>}
        {children}
        <SkipRoom />
      </div>
    </div>
  );
}

/**
 * Step 5's question layout (onboarding-spec 3, step 5: "each question has an icon in a left gutter,
 * then a title and a helper line, then its options"): a 56px gutter for the icon, and one left edge
 * for the title, the helper, the options and the Skip link.
 */
export const QUESTION_GRID = 'grid grid-cols-[56px_minmax(0,1fr)] items-start';

/** The gutter icon of a step 5 question (decorative, 32px). */
export function QuestionGutter({ icon }: { readonly icon: IconComponent | undefined }) {
  return <span className="text-(--sov-text-primary) leading-none">{icon === undefined ? null : <Icon icon={icon} size="large" />}</span>;
}
