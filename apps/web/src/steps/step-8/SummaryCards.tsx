/**
 * Step 8's summary cards (US-INTAKE-15; onboarding-spec 3, step 8, "Summary cards", and 6.2 "Card
 * heights": one height per grid; guardrails section 5, step 8; steps.ts `ReviewCardSchema`): the
 * seven input cards in the approved 4 x 2 grid, each with an Edit link that opens its step, then the
 * Proposal card with no Edit link.
 *
 * - Every row is a served display object through the Value component, with its badge on the same line
 *   as its value and its source line (AC2; 2.8 "Prominence"). The Documents card's count and the
 *   Building card's area are the served value ids (AC3, AC4; G2-1, G2-7).
 * - **A decision row** (a system in scope, a goal, an automation area: one decision field per option,
 *   2.6) is one compact row, named by the option's short name from the catalogue (`systems.<id>`,
 *   `goals.<id>`, `automation.<id>`), with its served value and badge beside it, in the order served
 *   (the chosen options first). The card then reads as the approved one list ("Selected systems"),
 *   and no value or badge is left out.
 * - **A skipped multi-select** reads "You can provide this later." once, under its question's rows
 *   (rule 7: "The question then shows 'You can provide this later.' once, inline"; AC5; G7-12; the
 *   card's served `skippedQuestions`), never once per option; each row itself reads "Not provided
 *   yet" as served, never blank, a dash or zero. A skipped question of one field keeps the line on
 *   its own row, as served.
 * - Cards of one grid row share one height (spec 6.2); their rows sit at the top, and the decision
 *   lists are dense (14px, one line where the name, value and badge fit), so the tallest card sets a
 *   short row and the others are not left as large empty frames. Nothing is clipped or collapsed (2.8
 *   "Prominence").
 * - While the summary loads, the cards show their titles and no figure (US-INTAKE-18 AC1).
 * - Edit opens the card's step (PRD R-008 "Until decided": Continue from there moves on in order);
 *   its accessible name says which card.
 */
import { Button, Card, StatusLine, Value } from '@sovitech/ui';
import type { DisplayObject, StepView } from '@sovitech/view-model/browser';
import { Building2, FileText, Files, Layers, Pencil, Settings, Target, Users, type LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { copy } from '../../copy';
import type { Displays } from '../../wizard/use-step-view';

export type ReviewCard = Extract<StepView, { step: 8 }>['cards'][number];
export type CardId = ReviewCard['cardId'];

/** The approved order of the seven input cards (onboarding-spec 3, step 8). */
export const CARD_ORDER: readonly CardId[] = ['project', 'documents', 'building', 'systems', 'operations', 'goals', 'automation'];

const CARD_ICONS: Readonly<Record<CardId, LucideIcon>> = {
  project: FileText,
  documents: Files,
  building: Building2,
  systems: Layers,
  operations: Users,
  goals: Target,
  automation: Settings,
};

type OptionCopy = Readonly<Record<string, { readonly title: string } | undefined>>;

/**
 * The multi-select questions of steps 4, 6 and 7: the key prefix of their decision fields (2.6, one
 * decision field per option), the question that asks them, and the catalogue of their short names.
 */
const DECISION_QUESTIONS: ReadonlyArray<{ readonly prefix: string; readonly questionId: string; readonly names: OptionCopy }> = [
  { prefix: 'project.scope.', questionId: 'q.project.systemsInScope', names: copy.systems },
  { prefix: 'project.goal.', questionId: 'q.project.goals', names: copy.goals },
  { prefix: 'project.automation.', questionId: 'q.project.automationAreas', names: copy.automation },
];

/** The option's short name for a decision row, or undefined for any other row. */
export function decisionRowLabel(fieldKey: string | undefined): string | undefined {
  if (fieldKey === undefined) return undefined;
  const question = DECISION_QUESTIONS.find((entry) => fieldKey.startsWith(entry.prefix));
  return question?.names[fieldKey.slice(question.prefix.length)]?.title;
}

/** The registered question that asks a field (`q.<field key>` for a single question). */
export function questionOfField(fieldKey: string): string {
  return DECISION_QUESTIONS.find((entry) => fieldKey.startsWith(entry.prefix))?.questionId ?? `q.${fieldKey}`;
}

export interface SummaryCardsProps {
  /** The served cards, or undefined while the summary loads. */
  readonly cards: readonly ReviewCard[] | undefined;
  readonly displays: Displays;
  /** Opens a card's step. */
  readonly onEdit: (card: ReviewCard) => void;
  /** The Proposal card, the eighth in the grid. */
  readonly proposal: ReactNode;
}

function EditLink({ card, onEdit }: { readonly card: ReviewCard; readonly onEdit: (card: ReviewCard) => void }) {
  return (
    <Button variant="link" icon={Pencil} data-edit-card={card.cardId} onClick={() => onEdit(card)}>
      {copy.actions.edit}
      <span className="sr-only"> {copy.step8.cards[card.cardId]}</span>
    </Button>
  );
}

/**
 * A card of decision rows as one compact list (DR-1): hairlines between rows, the option's name and its value at
 * 14px, the value and its badge beside the name where both fit and, where they do not, on the next line,
 * right-aligned, still together (the kit's `row`). Nothing is hidden or clipped: the card is only denser.
 */
const DECISION_LIST = [
  'flex flex-col',
  '[&>.sov-field-value]:py-1.5',
  '[&>.sov-field-value]:gap-x-3',
  '[&>.sov-field-value]:gap-y-0',
  '[&>.sov-field-value:first-child]:pt-0',
  '[&>.sov-field-value:last-child]:border-b-0',
  '[&>.sov-field-value>span]:text-[14px]',
  '[&>.sov-field-value>span]:leading-5',
  '[&_bdi]:text-[14px]',
  '[&_bdi]:leading-5',
  '[&_.sov-value>div:first-child]:gap-2',
  '[&>.sov-status-line]:pt-2',
].join(' ');

function Row({ display }: { readonly display: DisplayObject }) {
  const option = decisionRowLabel(display.field?.fieldKey);
  return option === undefined ? <Value display={display} /> : <Value display={display} label={option} layout="row" />;
}

/** A card's rows in the order served, each skipped question's line once after its question's last row. */
function CardRows({ card, displays }: { readonly card: ReviewCard; readonly displays: Displays }) {
  const skipped = card.skippedQuestions ?? [];
  const rows = card.rows.flatMap((valueId) => {
    const display = displays.get(valueId);
    return display === undefined ? [] : [display];
  });
  const questionOf = (display: DisplayObject) => (display.field === undefined ? undefined : questionOfField(display.field.fieldKey));
  const lastRowOf = new Map<string, number>();
  rows.forEach((display, index) => {
    const question = questionOf(display);
    if (question !== undefined) lastRowOf.set(question, index);
  });
  const placed = new Set<string>();
  // A card of decision rows is one compact list (hairlines between rows); any other card stacks its labelled values.
  const list = rows.length > 0 && rows.every((display) => decisionRowLabel(display.field?.fieldKey) !== undefined);
  return (
    <div data-rows={list ? 'list' : 'stack'} className={list ? DECISION_LIST : 'flex flex-col gap-4'}>
      {rows.map((display, index) => {
        const question = questionOf(display);
        const line = question === undefined || lastRowOf.get(question) !== index ? undefined : skipped.find((entry) => entry.questionId === question);
        if (line !== undefined) placed.add(line.questionId);
        return (
          <Fragment key={display.valueId}>
            <Row display={display} />
            {line === undefined ? null : <StatusLine line={line.line} />}
          </Fragment>
        );
      })}
      {skipped
        .filter((entry) => !placed.has(entry.questionId))
        .map((entry) => (
          <StatusLine key={entry.questionId} line={entry.line} />
        ))}
    </div>
  );
}

export function SummaryCards({ cards, displays, onEdit, proposal }: SummaryCardsProps) {
  const byId = new Map((cards ?? []).map((card) => [card.cardId, card]));
  return (
    <div className="grid grid-cols-4 items-stretch gap-5">
      {CARD_ORDER.map((cardId) => {
        const card = byId.get(cardId);
        return (
          <Card key={cardId} title={copy.step8.cards[cardId]} headingLevel={2} icon={CARD_ICONS[cardId]} {...(card === undefined ? {} : { headerAction: <EditLink card={card} onEdit={onEdit} /> })}>
            {card === undefined ? <p className="text-[14px] text-(--sov-text-muted)">{copy.step8.loading}</p> : <CardRows card={card} displays={displays} />}
          </Card>
        );
      })}
      {proposal}
    </div>
  );
}
