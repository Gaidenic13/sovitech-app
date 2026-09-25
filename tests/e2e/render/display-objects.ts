/**
 * The display objects a render check compares value elements with (guardrails rule 2,
 * "Render test"; docs/adr/0006-render-test.md, decision 1).
 *
 * A display object is what the screen was served for one value id: the formatted value or
 * range (`text`), the badge, source and status lines it carries (`lines`), the pieces a
 * component may render in separate elements (`parts`, each inside `text` or a line), and the
 * evidence excerpts shown with it (`evidence`). Inside a value element, every text holding a
 * number must be made of these strings; nothing else with a number is tied by the element.
 *
 * Where they come from:
 * - an app screen: the display objects the page itself received from the API, collected by the
 *   one registered adapter (api-display-objects.ts). Nothing typed in a test supplies them.
 * - a harness page (tests/e2e/pages/): the page declares them in a
 *   `<script type="application/json" data-render-display-objects>` tag, read here from the
 *   file before the page loads. The in-page harness never reads that tag.
 */
import { z } from 'zod';
import { DISPLAY_OBJECTS_SCRIPT_ATTRIBUTE, VALUE_ID_PATTERN, type DisplayObjects, type ServedDisplay } from './contract';

/** Whitespace collapsed and trimmed: the form both sides are compared in. */
export function normaliseShown(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

const shownText = z
  .string()
  .transform(normaliseShown)
  .refine((value) => value !== '', 'must not be empty');

const evidenceSchema = z.strictObject({ documentId: shownText, contentHash: shownText, excerpt: shownText });

const displaySchema = z.strictObject({
  text: shownText,
  lines: z.array(shownText).optional(),
  parts: z.array(shownText).optional(),
  evidence: z.array(evidenceSchema).optional(),
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export interface DisplayObjectValidation {
  ok: boolean;
  problems: string[];
  displayObjects: Record<string, ServedDisplay>;
}

/**
 * Validates display objects: a plain object from value ids to displays, each with a non-empty
 * text, optional lines, parts and evidence, no other field, and every part found in the text
 * or in one line. Texts come back with whitespace collapsed.
 */
export function validateDisplayObjects(input: unknown): DisplayObjectValidation {
  if (!isPlainObject(input)) {
    const what = typeof input === 'function' ? 'a function' : Array.isArray(input) ? 'a list' : String(input);
    return {
      ok: false,
      problems: [`display objects must be an object from value ids to what each shows, not ${what}`],
      displayObjects: {},
    };
  }
  const problems: string[] = [];
  const displayObjects: Record<string, ServedDisplay> = {};
  for (const [valueId, raw] of Object.entries(input)) {
    if (!VALUE_ID_PATTERN.test(valueId)) {
      problems.push(`"${valueId}" is not a value id`);
      continue;
    }
    const parsed = displaySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = [valueId, ...issue.path.map(String)].join('.');
        if (issue.code === 'unrecognized_keys') problems.push(`${path}: has fields no display object has (${issue.keys.join(', ')})`);
        else problems.push(`${path}: ${issue.message}`);
      }
      continue;
    }
    const display = parsed.data;
    const containers = [display.text, ...(display.lines ?? [])];
    for (const part of display.parts ?? []) {
      if (!containers.some((container) => container.includes(part))) {
        problems.push(`${valueId}: part "${part}" occurs neither in its text "${display.text}" nor in one of its lines`);
      }
    }
    displayObjects[valueId] = display;
  }
  return { ok: problems.length === 0, problems, displayObjects };
}

/** Validated display objects; throws with every problem when they are not valid. */
export function checkedDisplayObjects(input: unknown, label = 'display objects'): Record<string, ServedDisplay> {
  const validation = validateDisplayObjects(input);
  if (!validation.ok) throw new Error(`${label} are not valid:\n  ${validation.problems.join('\n  ')}`);
  return validation.displayObjects;
}

const DECLARATION = new RegExp(
  `<script\\b(?=[^>]*\\btype\\s*=\\s*["']application/json["'])(?=[^>]*\\b${DISPLAY_OBJECTS_SCRIPT_ATTRIBUTE}\\b)[^>]*>([\\s\\S]*?)</script>`,
  'giu',
);

/**
 * The display objects a harness page declares in its one
 * `<script type="application/json" data-render-display-objects>` tag. Throws when the page
 * declares none, declares them twice, or declares invalid ones.
 */
export function readDeclaredDisplayObjects(html: string, label: string): DisplayObjects {
  const found = [...html.matchAll(DECLARATION)];
  if (found.length !== 1) {
    throw new Error(
      `${label} must declare its display objects in exactly one <script type="application/json" ${DISPLAY_OBJECTS_SCRIPT_ATTRIBUTE}> tag; it has ${String(found.length)}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(found[0]?.[1] ?? '');
  } catch (error) {
    throw new Error(`${label}: its display-object declaration is not JSON: ${String(error)}`, { cause: error });
  }
  return checkedDisplayObjects(parsed, `${label}: the declared display objects`);
}

/** The same display objects without one value id (to show that an id the screen was not served fails). */
export function withoutDisplayObject(displayObjects: DisplayObjects, valueId: string): DisplayObjects {
  return Object.fromEntries(Object.entries(displayObjects).filter(([id]) => id !== valueId));
}
