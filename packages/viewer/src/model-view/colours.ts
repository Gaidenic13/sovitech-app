/**
 * The scene's colours, read from the brand tokens at run time (prompt 3 section 6: "The viewer reads colours from
 * the CSS custom properties at runtime, so three.js materials carry no colour literals"; docs/build-log.md, the
 * viewer step, item 2: token colours, never the model's own).
 *
 * Every shape is drawn in the App theme's surface colour, lit by the scene's two white lights so its faces read
 * apart; the canvas is transparent, so the page's own background shows behind the model. Whether edges need a
 * second tone (an Extension colour) is for the design review (D-19), in part 2. A token is resolved through the
 * browser (a computed colour), so whatever the tokens file writes reaches three.js in a form it reads.
 */

/** The tokens the scene uses, as CSS values (packages/ui/src/tokens.css). */
export const SCENE_TOKENS = {
  /** Every face of the model, and the far-away line drawing Fragments uses for small items. */
  face: { property: '--sov-surface', value: 'var(--sov-surface)' },
} as const;

export interface SceneColours {
  /** A computed CSS colour, `rgb(r, g, b)` or the token's own form. */
  readonly face: string;
}

/** Resolves each token on the page that holds the view; a token the page does not define is an error, never a fallback colour. */
export function readSceneColours(host: Element): SceneColours {
  const page = host.ownerDocument;
  const window = page.defaultView;
  if (window === null) throw new Error('scene colours: the view is not in a page');
  const defined = window.getComputedStyle(page.documentElement).getPropertyValue(SCENE_TOKENS.face.property).trim();
  if (defined === '') throw new Error(`scene colours: ${SCENE_TOKENS.face.property} is not defined on this page`);
  const probe = page.createElement('span');
  probe.style.color = SCENE_TOKENS.face.value;
  page.documentElement.appendChild(probe);
  try {
    const face = window.getComputedStyle(probe).color.trim();
    return { face: face === '' ? defined : face };
  } finally {
    probe.remove();
  }
}
