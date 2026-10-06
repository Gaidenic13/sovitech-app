/**
 * Documents' filter bar (DB-15; US-DOCS-13 AC3, AC5; US-DOCS-15 AC4; UD-22; PRD R-017): the category
 * chips (single-select radios, no counts), the search by file name, and the filter button, which opens a
 * panel of filters over stored record fields only (the stage as served, the file's format); each active
 * filter is shown on the page with its own remove control. Filters change the view only: nothing is
 * written, and nothing is sent to the API.
 *
 * The filter panel is a disclosure: its button opens and closes it, it opens as a row under the bar
 * (never over the register or the sidebar, never a dialog), and Escape inside it closes it and returns
 * the focus to the button; its lists are listboxes (Up, Down, Home, End, then Enter or Space).
 *
 * Undesigned (UD-22's filter menu), per the frontend-design skill within the brand: the panel is a row
 * on the surface colour under the bar, with one list per stored field side by side, and the active
 * filters as chips under it.
 */
import { SlidersHorizontal } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ActiveFilters, ChipGroup, SearchField, SelectionList, ValueName, type ActiveFilter } from '@sovitech/ui';
import { DOCUMENT_CATEGORIES, DOCUMENT_FORMATS, type DocumentRow } from '@sovitech/view-model/browser';
import { copy } from '../../../copy';
import type { Displays } from '../../../wizard/use-step-view';
import { formatOptions, stageOptions, type CategoryChip, type DocumentFilters as Filters } from './document-list';

const DOC = copy.workspace.documents;
const ALL = '__all__';

const CHIP_OPTIONS = [{ value: 'all', label: DOC.chips.all }, ...DOCUMENT_CATEGORIES.map((category) => ({ value: category, label: DOC.chips[category] }))];

function isChip(value: string): value is CategoryChip {
  return value === 'all' || (DOCUMENT_CATEGORIES as readonly string[]).includes(value);
}

export interface DocumentFilterBarProps {
  readonly rows: readonly DocumentRow[];
  readonly displays: Displays;
  readonly filters: Filters;
  readonly onChange: (filters: Filters) => void;
}

export function DocumentFilterBar({ rows, displays, filters, onChange }: DocumentFilterBarProps) {
  const [open, setOpen] = useState(false);
  const searchId = useId();
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const stages = stageOptions(rows, displays);
  const formats = formatOptions(rows, DOCUMENT_FORMATS);

  const active: ActiveFilter[] = [];
  if (filters.stage !== undefined) {
    const stage = stages.find((option) => option.text === filters.stage);
    active.push({ id: 'stage', name: DOC.filterStage, value: stage === undefined ? filters.stage : <ValueName display={stage.display} showBadge={false} /> });
  }
  if (filters.format !== undefined) active.push({ id: 'format', name: DOC.filterFormat, value: DOC.formatNames[filters.format] });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ChipGroup
          label={DOC.chipsLabel}
          name="document-category"
          options={CHIP_OPTIONS}
          value={filters.category}
          onChange={(value) => {
            if (isChip(value)) onChange({ ...filters, category: value });
          }}
        />
        <div className="flex items-center gap-3">
          <SearchField label={DOC.searchLabel} placeholder={DOC.searchPlaceholder} value={filters.search} onChange={(search) => onChange({ ...filters, search })} maxLength={80} id={searchId} />
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((previous) => !previous)}
            className="flex h-10 items-center gap-2 rounded-(--sov-radius-control) border border-(--sov-secondary-border) px-3 text-[14px] text-(--sov-text-primary) transition-colors duration-300 hover:border-(--sov-border-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            <span>{DOC.filters}</span>
          </button>
        </div>
      </div>
      <div
        id={panelId}
        hidden={!open}
        role="group"
        aria-label={DOC.filtersLabel}
        className="flex gap-6 rounded-(--sov-radius-surface) border border-(--sov-border) bg-(--sov-surface) p-4"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        {open ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-[13px] font-semibold text-(--sov-text-primary)">{DOC.filterStage}</p>
              <SelectionList
                label={DOC.filterStage}
                options={[{ id: ALL, content: DOC.allStages }, ...stages.map((option) => ({ id: option.display.valueId, content: <ValueName display={option.display} showBadge={false} /> }))]}
                selected={stages.find((option) => option.text === filters.stage)?.display.valueId ?? ALL}
                onSelect={(id) => onChange({ ...filters, stage: stages.find((option) => option.display.valueId === id)?.text })}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-[13px] font-semibold text-(--sov-text-primary)">{DOC.filterFormat}</p>
              <SelectionList
                label={DOC.filterFormat}
                options={[{ id: ALL, content: DOC.allFormats }, ...formats.map((format) => ({ id: format, content: DOC.formatNames[format] }))]}
                selected={filters.format ?? ALL}
                onSelect={(id) => {
                  const format = formats.find((candidate) => candidate === id);
                  onChange({ ...filters, format });
                }}
              />
            </div>
          </>
        ) : null}
      </div>
      <ActiveFilters
        label={DOC.activeFilters}
        filters={active}
        removeLabel={DOC.removeFilter}
        onRemove={(id) => onChange(id === 'stage' ? { ...filters, stage: undefined } : { ...filters, format: undefined })}
        clearLabel={DOC.clearFilters}
        onClear={() => onChange({ ...filters, stage: undefined, format: undefined })}
      />
    </div>
  );
}
