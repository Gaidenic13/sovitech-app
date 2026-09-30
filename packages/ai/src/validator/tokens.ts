/**
 * Value, calculation and product tokens in AI prose (guardrails rule 2, "Numbers in prose
 * are references, not text": "AI-drafted text refers to values and prices only through
 * tokens such as `{{value:totalArea}}` or `{{calc:bmsPoints}}`, and to products only
 * through `{{product:<catalogueId>}}`. The renderer fills each token").
 */

/** The three token kinds of rule 2. */
export const TOKEN_KINDS = ['value', 'calc', 'product'] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];

const ID = String.raw`[A-Za-z][A-Za-z0-9_.:-]*`;

/** One whole token. */
export const TOKEN_SHAPE = new RegExp(String.raw`^\{\{(?:value|calc|product):${ID}\}\}$`);

const TOKEN_IN_TEXT = new RegExp(String.raw`\{\{(value|calc|product):(${ID})\}\}`, 'g');

export interface TokenMatch {
  readonly kind: TokenKind;
  readonly id: string;
  /** The token as written. */
  readonly raw: string;
  readonly index: number;
  readonly length: number;
}

/** Every well-formed token in `text`, in order. */
export function findTokens(text: string): TokenMatch[] {
  const found: TokenMatch[] = [];
  TOKEN_IN_TEXT.lastIndex = 0;
  for (let match = TOKEN_IN_TEXT.exec(text); match !== null; match = TOKEN_IN_TEXT.exec(text)) {
    const kind = match[1] as TokenKind;
    const id = match[2] ?? '';
    found.push({ kind, id, raw: match[0], index: match.index, length: match[0].length });
  }
  return found;
}

/**
 * The character that stands in for a masked span: not a letter, digit or space, so it
 * joins no word and holds no digit, and a run of it marks where a token stood.
 */
export const MASK = '■';

/** `text` with each span replaced by MASK characters of the same length, so indices stay put. */
export function maskSpans(text: string, spans: readonly { readonly index: number; readonly length: number }[]): string {
  const characters = [...text.split('')];
  for (const span of spans) {
    for (let offset = 0; offset < span.length; offset += 1) characters[span.index + offset] = MASK;
  }
  return characters.join('');
}

/** Braces left over once the well-formed tokens are masked: a malformed or foreign token. */
export function strayBraces(masked: string): { readonly index: number; readonly length: number }[] {
  const found: { index: number; length: number }[] = [];
  const pattern = /\{\{|\}\}/g;
  for (let match = pattern.exec(masked); match !== null; match = pattern.exec(masked)) found.push({ index: match.index, length: 2 });
  return found;
}
