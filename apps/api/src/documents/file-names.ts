/**
 * A file name as the API serves it in a display object: a step 2 row (`document:<id>.fileName`,
 * `upload:<id>.fileName`, the refused upload's name), a source line ("From <file>, page <n>") and the
 * revision notice's name (rule 2: the source the owner sees names the file the value came from; rule 14:
 * what the owner writes never changes how the app's copy reads; G2-13 holds the same for the owner's
 * typed text).
 *
 * The name stays stored as uploaded (the erasure removes it with the document's text), and no upload is
 * refused for it, which would be a new blocked state (rule 7). What is served drops every format character
 * (`\p{Cf}`: the bidirectional embedding, override and isolate controls U+202A to U+202E and U+2066 to
 * U+2069, the direction marks U+200E, U+200F and U+061C, the zero-width characters, the soft hyphen) and
 * every other bidirectional control (`\p{Bidi_Control}`). A name holding them showed in another order
 * than it was stored: "TEST plan" U+202E "fdp.xlsx.pdf" showed on step 2 as "TEST planfdp.xslx.pdf", and
 * "report" U+202E "xslx.pdf" would show as "reportfdp.xlsx", a PDF read as a spreadsheet (phase 3 part B,
 * the final verification). The value component's isolation keeps such a name from reordering the copy
 * beside it, but not the name itself.
 *
 * A name left with nothing to show once they are dropped is no name (undefined): the resolver then shows
 * its missing wording, never an empty text. The API's log carries codes and ids only, never a file name.
 */
const NOT_SERVED_IN_FILE_NAMES = /[\p{Bidi_Control}\p{Cf}]/gu;

/** The file name as served: the stored name without its format and bidirectional controls, or undefined when nothing is left to show. */
export function servedFileName(stored: string | null | undefined): string | undefined {
  if (stored === null || stored === undefined) return undefined;
  const served = stored.replace(NOT_SERVED_IN_FILE_NAMES, '');
  return served.trim() === '' ? undefined : served;
}
