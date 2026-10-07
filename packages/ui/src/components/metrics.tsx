/**
 * The Metrics pages' tile and panel (phase 6; docs/adr/0052-metrics-pages-and-series.md; approved screens 02, 12, 13,
 * 21 and 22): layout only, like ./frame.tsx. No data and no copy of their own: the label or heading is the caller's
 * catalogue copy (no number: the render test reads it), and the content is the caller's Value, Price, StatusLine,
 * NotAvailableYet or SeriesChart. Styled in ui.css ("metrics: tiles and panels").
 */
import type { ReactNode } from 'react';
import { useId } from 'react';
import { Icon, type IconComponent } from './Icon';

export interface MetricTileProps {
  /** What the tile shows ("Total BMS investment"), catalogue copy; the group's name. */
  readonly label: string;
  /** A decorative icon at the tile's start (24px), as the approved tiles draw one. */
  readonly icon?: IconComponent;
  /** The id of the label's element, for the content's Add buttons to point at (DR-1). Generated when not given. */
  readonly labelId?: string;
  /** The tile's value: one served display through the kit's value components (2.8: its badge on its line). */
  readonly children: ReactNode;
}

/**
 * One figure of a Metrics page's row of tiles (DB-02's TOTAL BMS INVESTMENT, DB-21's payback tile): a group named by
 * its label, the icon and the label on the tile's first line and the value under them at the tile's full width (a
 * range or a "Not available yet" line is long text). The value keeps its own size (Price, Value: DR-11's roles, no new size) and its
 * badge, source and status lines (2.8 "Prominence": never behind a hover).
 */
export function MetricTile({ label, icon, labelId, children }: MetricTileProps) {
  const own = useId();
  const id = labelId ?? own;
  return (
    <div className="sov-metric-tile" role="group" aria-labelledby={id} data-metric-tile="">
      <div className="sov-metric-tile__header">
        {icon === undefined ? null : (
          <span className="sov-metric-tile__icon">
            <Icon icon={icon} />
          </span>
        )}
        <p id={id} className="sov-metric-tile__label">
          {label}
        </p>
      </div>
      <div className="sov-metric-tile__body">{children}</div>
    </div>
  );
}

export interface MetricPanelProps {
  /** The panel's heading ("Cost breakdown"), catalogue copy. */
  readonly heading: string;
  /** The heading's id, for the content's Add buttons and a chart to point at (DR-1). Generated when not given. */
  readonly headingId?: string;
  /** The heading's level: 2 on a page, 3 inside a titled section. */
  readonly headingLevel?: 2 | 3;
  /** A control at the end of the header (a filter). */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** A titled panel of a Metrics page (COST BREAKDOWN, KEY FINANCIAL INDICATORS): a region named by its heading. */
export function MetricPanel({ heading, headingId, headingLevel = 2, actions, children }: MetricPanelProps) {
  const own = useId();
  const id = headingId ?? own;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <section className="sov-metric-panel" aria-labelledby={id} data-metric-panel="">
      <div className="sov-metric-panel__header">
        <Heading id={id} className="sov-metric-panel__heading">
          {heading}
        </Heading>
        {actions}
      </div>
      {children}
    </section>
  );
}
