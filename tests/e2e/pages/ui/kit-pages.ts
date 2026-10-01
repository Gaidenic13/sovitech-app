/**
 * The UI kit's harness pages as the render harness lists them (tests/e2e/render/harness-pages.ts,
 * `UI_KIT_PAGES`): each must pass the render check with the display objects it declares, and axe
 * with no violation (tests/e2e/pages/ui/ui-kit.spec.ts). The pages are generated from kit.tsx.
 * Plain data: no JSX and no import of the kit, so the harness list and the repository check read it
 * without React.
 */
export interface KitHarnessPage {
  readonly file: string;
  readonly about: string;
  readonly expectKinds: [];
}

const page = (file: string, about: string): KitHarnessPage => ({ file, about, expectKinds: [] });

export const UI_KIT_PAGES: readonly KitHarnessPage[] = [
  page('ui/value.html', 'UI kit: the Value component in its layouts and states, with its actions and evidence excerpt'),
  page('ui/lines.html', 'UI kit: the demo line, StatusLine, Not available yet, the Price component and Skip for now'),
  page('ui/stepper-first-step.html', 'UI kit: the stepper on step 1'),
  page('ui/stepper-late-finding.html', 'UI kit: the stepper on step 6 with a late-finding dot on step 3'),
  page('ui/stepper-last-step.html', 'UI kit: the stepper on step 8'),
  page('ui/forms.html', 'UI kit: text fields, the country select, radio and checkbox cards, and the buttons'),
  page('ui/surfaces.html', 'UI kit: cards, the banner, action rows, the notice region, the dropzone, progress and the date'),
  page('ui/layout.html', 'UI kit: the phase 3 part B layouts (value rows, the status slot, progress text, the skip placement, isolated owner text)'),
];
