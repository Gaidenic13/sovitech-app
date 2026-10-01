import type { Badge as BadgeData } from '@sovitech/view-model/browser';

export interface BadgeProps {
  /**
   * The one 2.8 badge of a value, as the API served it: the registry id and its label. The kit
   * never holds a badge label of its own, so no label outside 2.8 can reach the screen (2.8: "These
   * are the only badges the owner sees on values").
   */
  readonly badge: BadgeData;
}

/**
 * A 2.8 badge (F-RENDER-03; US-REVIEW-01 AC2, AC12): 12px or larger, weight 500, on the same line
 * as its figure, AA contrast (white on the page, 17:1; ADR 0040), never only on hover. Every badge
 * is one neutral pill: the words carry the meaning, never a colour (the badge colour families of
 * "App theme" are proposals pending the owner's OK, D-19). Marked `data-copy-kind="badge"`, the
 * place 2.8 allows "Confirmed by you" and "Verified by SOVITECH".
 */
export function Badge({ badge }: BadgeProps) {
  return (
    <span className="sov-badge" data-badge={badge.id} data-copy-kind="badge">
      {badge.label}
    </span>
  );
}
