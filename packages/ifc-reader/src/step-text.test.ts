/**
 * The in-house STEP text reader (./step-text.ts): verbatim excerpts, literal tokens and the
 * text's problems, read the same way as the Python reader it mirrors
 * (services/extractor/src/sovitech_extractor/ifc/step.py), over the shared TEST corpus
 * ./step-text-corpus.json, which services/extractor/tests/test_step_text_parity.py reads too.
 *
 * Every value stays the token the file writes: a real or an integer is never a number here
 * (prompt 3 section 6). Problems carry codes and STEP ids, never text (guardrails rule 13).
 * All text is synthetic TEST data.
 *
 * Ids: F-IFC-01, F-EXTRACT-01, ifc-input 4.1 item 3 (the verbatim STEP text is the excerpt).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { NotStepError, StepSyntaxError, decodeString, readStepText, textOfBytes, type StepToken } from './step-text';

interface Corpus {
  readonly strings: readonly { readonly token: string; readonly text?: string; readonly error?: string }[];
  readonly files: readonly {
    readonly name: string;
    readonly text: string;
    readonly instances: readonly { readonly id: string; readonly keyword: string | null; readonly excerpt: string; readonly attributes?: readonly StepToken[]; readonly error?: string }[];
    readonly problems: readonly { readonly code: string; readonly stepIds: readonly string[] }[];
  }[];
  readonly notStep: readonly { readonly text: string; readonly error: string }[];
}

const corpus = parse(readFileSync(new URL('./step-text-corpus.json', import.meta.url), 'utf8'), { schema: 'json' }) as Corpus;

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    if (error instanceof StepSyntaxError || error instanceof NotStepError) return error.code;
    throw error;
  }
}

describe('F-IFC-01 · ifc-input 4.1 item 3: the STEP text reader', () => {
  it.each(corpus.strings)('F-IFC-01: the string $token decodes as the Python reader decodes it', (entry) => {
    if (entry.error !== undefined) expect(codeOf(() => decodeString(entry.token))).toBe(entry.error);
    else expect(decodeString(entry.token)).toBe(entry.text);
  });

  it.each(corpus.files)('F-IFC-01: $name', (file) => {
    const read = readStepText(file.text);
    expect(read.problems).toEqual(file.problems);
    expect(read.ids()).toEqual(file.instances.map((instance) => instance.id));
    for (const instance of file.instances) {
      expect(read.keyword(instance.id) ?? null).toBe(instance.keyword);
      expect(read.excerpt(instance.id)).toBe(instance.excerpt);
      if (instance.error !== undefined) expect(codeOf(() => read.attributes(instance.id))).toBe(instance.error);
      else expect(read.attributes(instance.id)).toEqual(instance.attributes);
    }
  });

  it.each(corpus.notStep)('F-IFC-01: text that is not an exchange file is refused ($error)', (entry) => {
    expect(codeOf(() => readStepText(entry.text))).toBe(entry.error);
  });

  it('US-IFC-04 · F-IFC-02 · rule 13: problems hold codes and ids only, never the text they are about', () => {
    const read = readStepText(corpus.files[2]?.text.replace('this is not a statement', 'secret TEST words here') ?? '');
    expect(read.problems.length).toBeGreaterThan(0);
    expect(JSON.stringify(read.problems)).not.toMatch(/secret/u);
  });

  it('F-IFC-01: bytes that are not UTF-8 are read as ISO 8859-1, as the Python reader reads them', () => {
    const latin = Uint8Array.from([0x27, 0x63, 0x61, 0x66, 0xe9, 0x85, 0x27]);
    expect(textOfBytes(latin)).toBe("'café\u0085'");
    expect(textOfBytes(new TextEncoder().encode("'café'"))).toBe("'café'");
  });

  it('F-IFC-01: an unknown id is a problem code, never a guess', () => {
    const read = readStepText(corpus.files[0]?.text ?? '');
    expect(codeOf(() => read.excerpt('99'))).toBe('step.unresolved_reference');
    expect(read.has('99')).toBe(false);
  });
});
