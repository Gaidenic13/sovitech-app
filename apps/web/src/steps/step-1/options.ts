/**
 * Step 1's options (onboarding-spec 3, step 1; guardrails section 5, step 1).
 *
 * - The four project types, one single choice, none preselected (US-INTAKE-02 AC4; rule 3; PRD
 *   R-010 "Until decided"), with their labels from the catalogue (`options.project.type`) and the
 *   icons of the approved screen, redrawn from Lucide at 32px (onboarding-spec 6.2, "Icon
 *   glitches").
 * - The countries: ISO 3166-1 alpha-2 codes from the contract (prompt 3 5.2, "City": "Country first
 *   from ISO 3166-1"), named by the browser's own locale data (`Intl.DisplayNames`), so no list of
 *   names is shipped and none is a dataset (D-94). Sorted by name; nothing preselected.
 */
import { Building2, ChartNoAxesColumnIncreasing, Construction, RefreshCw, type LucideIcon } from 'lucide-react';
import { COUNTRY_CODES, PROJECT_TYPES } from '@sovitech/view-model/browser';
import { copy } from '../../copy';

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_ICONS: Readonly<Record<ProjectType, LucideIcon>> = {
  new_construction: Construction,
  renovation: RefreshCw,
  existing_building: Building2,
  bms_modernization: ChartNoAxesColumnIncreasing,
};

export function projectTypeLabel(type: ProjectType): string {
  return copy.options['project.type'][type];
}

export function isProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

export interface CountryOption {
  readonly value: string;
  readonly label: string;
}

let names: Intl.DisplayNames | null | undefined;

/** A country's name in English (the app's language, prompt 3 5.2 "UI language"), or its code when the browser has none. */
export function countryName(code: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
    } catch {
      names = null;
    }
  }
  return names?.of(code) ?? code;
}

let sorted: readonly CountryOption[] | undefined;

export function countryOptions(): readonly CountryOption[] {
  if (sorted === undefined) {
    sorted = COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })).sort((left, right) => left.label.localeCompare(right.label, 'en'));
  }
  return sorted;
}
