import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { COPY_ALLOWANCES } from './copy/allowances';
import {
  NO_ALLOWANCES,
  RESERVED_TERMS,
  RESERVED_TERMS_EN,
  RESERVED_TERMS_RO,
  ReservedTermAllowanceError,
  createAllowanceSet,
  findReservedTerms,
  parseGuardrailsReservedTerms,
  registeredAllowances,
  scanCopy,
  type ReservedTermAllowance,
} from './reserved-terms';

const guardrailsPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/guardrails.md');

/** The list spellings of the terms found in `text`, in order of appearance. */
function terms(text: string): string[] {
  return findReservedTerms(text).map((match) => match.term);
}

/** Strips combining marks, the way a keyboard without Romanian letters types. */
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

describe('reserved-term list (docs/guardrails.md 2.8)', () => {
  it('holds the English and Romanian lists of 2.8 character for character, in their order', () => {
    const parsed = parseGuardrailsReservedTerms(readFileSync(guardrailsPath, 'utf8'));
    expect(parsed.en).toEqual([...RESERVED_TERMS_EN]);
    expect(parsed.ro).toEqual([...RESERVED_TERMS_RO]);
  });

  it('holds 21 English and 14 Romanian terms', () => {
    expect(RESERVED_TERMS_EN).toHaveLength(21);
    expect(RESERVED_TERMS_RO).toHaveLength(14);
  });

  it('keeps one entry for a term both lists share, with both languages', () => {
    const shared = RESERVED_TERMS.filter((entry) => entry.languages.length === 2).map((entry) => entry.term);
    expect(shared.sort()).toEqual(['exact', 'final']);
    expect(RESERVED_TERMS).toHaveLength(21 + 14 - 2);
  });

  it('refuses to parse a guardrails text without the two list lines', () => {
    expect(() => parseGuardrailsReservedTerms('# Nothing here\n')).toThrow();
  });
});

describe('matching: whole word, ignoring case and diacritics', () => {
  it('matches whole words only', () => {
    expect(terms('Unconfirmed items')).toEqual([]);
    expect(terms('user_confirmed')).toEqual([]);
    expect(terms('Confirm')).toEqual([]);
    expect(terms('Quotes and offers')).toEqual([]);
    expect(terms('devize')).toEqual([]);
    expect(terms('re-verified')).toEqual(['verified']);
    expect(terms('(final)')).toEqual(['final']);
  });

  it('ignores case', () => {
    expect(terms('FINAL PRICE')).toEqual(['final']);
    expect(terms('Will Save energy')).toEqual(['will save']);
  });

  it('matches "oferta ferma" to the term "ofertă fermă"', () => {
    expect(terms('oferta ferma')).toEqual(['ofertă fermă']);
    expect(terms('OFERTĂ FERMĂ')).toEqual(['ofertă fermă']);
  });

  it('treats the cedilla and comma-below letters alike', () => {
    const cedilla = 'Cota\u0163ie';
    const commaBelow = 'Cotație';
    expect(terms(cedilla)).toEqual(['cotație']);
    expect(terms(commaBelow)).toEqual(['cotație']);
    expect(terms('COTATIE')).toEqual(['cotație']);
    expect(terms('în conformitate cu')).toEqual(['în conformitate cu']);
    expect(terms('i\u0302n conformitate cu')).toEqual(['în conformitate cu']);
  });

  it('matches multi-word terms across any run of whitespace', () => {
    expect(terms('in line\nwith')).toEqual(['in line with']);
    expect(terms('will\u00A0save')).toEqual(['will save']);
    expect(terms('în  conformitate\tcu')).toEqual(['în conformitate cu']);
    expect(terms('achieves\r\n class')).toEqual(['achieves class']);
  });

  it('does not join words across a placeholder or punctuation', () => {
    expect(terms('in line{}with')).toEqual([]);
    expect(terms('firm, price')).toEqual([]);
  });

  it('ignores soft hyphens and zero-width characters inside a word', () => {
    expect(terms('con\u00ADfirmed')).toEqual(['confirmed']);
    expect(terms('veri\u200Bfied')).toEqual(['verified']);
  });

  it('reports the longest term once where terms overlap', () => {
    expect(terms('oferta ferma')).toEqual(['ofertă fermă']);
    expect(terms('in conformitate cu')).toEqual(['în conformitate cu']);
    expect(terms('ofertă, apoi ofertă fermă')).toEqual(['ofertă', 'ofertă fermă']);
  });

  it('reports positions in the original text', () => {
    const text = 'Preț: ofertă fermă.';
    const [match] = findReservedTerms(text);
    expect(match).toBeDefined();
    if (match === undefined) return;
    expect(text.slice(match.index, match.index + match.length)).toBe('ofertă fermă');
    expect(match.text).toBe('ofertă fermă');
    expect(match.languages).toEqual(['ro']);
  });

  it('keeps positions right after characters that fold to nothing or to two units', () => {
    const text = 'ﬁne con\u00ADfirmed';
    const [match] = findReservedTerms(text);
    expect(match?.text).toBe('con\u00ADfirmed');
  });

  it('finds every term of both lists inside a sentence', () => {
    for (const entry of RESERVED_TERMS) {
      expect(terms(`Some text, ${entry.term}; more text.`)).toContain(entry.term);
    }
  });

  it('property: any mix of letter case, with or without diacritics, still matches', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RESERVED_TERMS.map((entry) => entry.term)),
        fc.array(fc.boolean(), { minLength: 40, maxLength: 40 }),
        fc.boolean(),
        (term, flips, stripMarks) => {
          const cased = [...term].map((char, position) => (flips[position % flips.length] === true ? char.toUpperCase() : char)).join('');
          const typed = stripMarks ? plain(cased) : cased;
          return terms(`x ${typed} y`).includes(term);
        },
      ),
    );
  });

  it('property: a term glued to a letter or digit on either side never matches', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RESERVED_TERMS.map((entry) => entry.term)),
        fc.constantFrom('a', 'z', 'ă', 'Q', '7', '_'),
        fc.boolean(),
        (term, glue, before) => {
          const glued = before ? `${glue}${term}` : `${term}${glue}`;
          return !terms(glued).includes(term);
        },
      ),
    );
  });
});

describe('allowances: only the places 2.8 allows, as typed entries', () => {
  const badge: ReservedTermAllowance = { kind: 'badge', badgeId: 'engineer-verified', label: 'Verified by SOVITECH' };
  const sentence: ReservedTermAllowance = {
    kind: 'generated_sentence',
    templateId: 'source-line.ai-inference.engineer',
    template: 'AI inference, verified by SOVITECH on {date}',
    readsStoredState: ['candidateEvent.engineer_verified.at'],
  };

  it('flags a reserved term in plain copy', () => {
    expect(scanCopy('This price is final', { allowances: NO_ALLOWANCES }).map((match) => match.term)).toEqual(['final']);
  });

  it('lets a registered badge label through only as the whole copy unit', () => {
    const allowances = createAllowanceSet([badge]);
    expect(scanCopy('Verified by SOVITECH', { allowances })).toEqual([]);
    expect(scanCopy('Verified  by SOVITECH ', { allowances })).toEqual([]);
    expect(scanCopy('Everything here is verified by SOVITECH', { allowances })).not.toEqual([]);
  });

  it('lets a generated sentence through when its fixed text matches the template', () => {
    const allowances = createAllowanceSet([sentence]);
    expect(scanCopy('AI inference, verified by SOVITECH on 12 Oct', { allowances })).toEqual([]);
    expect(scanCopy('Verified by SOVITECH on 12 Oct', { allowances })).not.toEqual([]);
  });

  // Phase 1 review, adversarial finding 12 (probe-terms): the {date} slot took any words, so
  // "AI inference, verified by SOVITECH on request of the designer" passed as the allowance.
  it('fills a typed slot only with its type: a date slot with a calendar date, never words or an impossible day', () => {
    const allowances = createAllowanceSet([sentence]);
    for (const shown of ['12 Oct', '1 Jan', '25 Sep 2026', '29 Feb 2028', '29 Feb', '2026-09-25', '2000-02-29']) {
      expect(scanCopy(`AI inference, verified by SOVITECH on ${shown}`, { allowances }), shown).toEqual([]);
    }
    for (const refused of ['request of the designer', 'a date', '31 Feb', '29 Feb 2027', '29 Feb 1900', '0 Oct', '32 Oct', '12 October', '2026-13-01', '2026-02-30', '{}', '{date}', '12']) {
      expect(scanCopy(`AI inference, verified by SOVITECH on ${refused}`, { allowances }), refused).not.toEqual([]);
    }
  });

  it('fills a number slot with digits only: a word never fills it', () => {
    const counted: ReservedTermAllowance = { kind: 'generated_sentence', templateId: 'test-count', template: 'TEST {count} values verified by SOVITECH', readsStoredState: ['TEST'] };
    const allowances = createAllowanceSet([counted]);
    expect(scanCopy('TEST 12 values verified by SOVITECH', { allowances })).toEqual([]);
    expect(scanCopy('TEST 1.200 values verified by SOVITECH', { allowances })).toEqual([]);
    expect(scanCopy('TEST two values verified by SOVITECH', { allowances })).not.toEqual([]);
    expect(scanCopy('TEST 12 or more values verified by SOVITECH', { allowances })).not.toEqual([]);
  });

  it('accepts a slot holding its own placeholder only as the copy registry\'s definition of the text', () => {
    const allowances = createAllowanceSet([sentence]);
    const registry = { kind: 'copy_registry' } as const;
    expect(scanCopy('AI inference, verified by SOVITECH on {date}', { allowances, context: registry })).toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on 12 Oct', { allowances, context: registry })).toEqual([]);
    // An interpolation (read as {}) or another slot name is not the definition.
    expect(scanCopy('AI inference, verified by SOVITECH on {}', { allowances, context: registry })).not.toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on {when}', { allowances, context: registry })).not.toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on request of the designer', { allowances, context: registry })).not.toEqual([]);
  });

  it('refuses a template whose slot has no type', () => {
    expect(() => createAllowanceSet([{ ...sentence, template: 'AI inference, verified by SOVITECH on {whenever}' }])).toThrow(/has the slot \{whenever\}, which has no type/);
    expect(() =>
      createAllowanceSet([{ kind: 'status_line', statusLineId: 'x', text: 'Formal quotation {suffix}' }]),
    ).toThrow(/has the slot \{suffix\}, which has no type/);
  });

  // Phase 1 review, adversarial finding 12: "Formal quotation" passed with no stage 3 condition.
  it('holds the stage 3 label only with a stored quotation record (rule 10), or as its registry definition', () => {
    const stage3: ReservedTermAllowance = { kind: 'status_line', statusLineId: 'formal_quotation', text: 'Formal quotation', requiresRecord: 'quotation_record' };
    const allowances = createAllowanceSet([stage3]);
    expect(scanCopy('Formal quotation', { allowances }).map((match) => match.term)).toEqual(['quotation']);
    expect(scanCopy('Formal quotation', { allowances, quotationRecordId: ' ' })).not.toEqual([]);
    expect(scanCopy('Formal quotation', { allowances, quotationRecordId: 'q-TEST-1' })).toEqual([]);
    expect(scanCopy('Formal quotation', { allowances, context: { kind: 'copy_registry' } })).toEqual([]);
    expect(() => createAllowanceSet([{ ...stage3, requiresRecord: 'any_record' } as unknown as ReservedTermAllowance])).toThrow(/"requiresRecord" "any_record"/);
    // The registered stage 3 label is bound to its record.
    expect(registeredAllowances().match('Formal quotation')).toBeUndefined();
    expect(registeredAllowances().match('Formal quotation', { quotationRecordId: 'q-TEST-1' })?.kind).toBe('status_line');
  });

  it('refuses a sentence whose slot text carries a reserved term itself (phase 1: templates of 2.8, ADR 0011)', () => {
    const allowances = createAllowanceSet([sentence]);
    expect(scanCopy('AI inference, verified by SOVITECH on a firm price date', { allowances }).map((match) => match.term)).toEqual(['verified', 'firm price']);
    expect(scanCopy('AI inference, verified by SOVITECH on a firm price date', { allowances, context: { kind: 'copy_registry' } })).not.toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on 12 Oct, final', { allowances })).not.toEqual([]);
    expect(scanCopy('AI inference, verified by SOVITECH on 12 Oct', { allowances })).toEqual([]);
  });

  it('never accepts an entry outside the closed set of kinds', () => {
    const freeText = { kind: 'free_text', text: 'Final price' } as unknown as ReservedTermAllowance;
    expect(() => createAllowanceSet([freeText])).toThrow(ReservedTermAllowanceError);
  });

  it('refuses extra keys on an entry', () => {
    const smuggled = { ...badge, anywhere: true } as unknown as ReservedTermAllowance;
    expect(() => createAllowanceSet([smuggled])).toThrow(ReservedTermAllowanceError);
  });

  it('refuses an entry whose text holds no reserved term', () => {
    const pointless: ReservedTermAllowance = { kind: 'action_label', actionId: 'continue', label: 'Continue' };
    expect(() => createAllowanceSet([pointless])).toThrow(/holds no reserved term/);
  });

  it('refuses a generated sentence that reads no stored state, or keeps the term only in a placeholder', () => {
    expect(() => createAllowanceSet([{ ...sentence, readsStoredState: [] }])).toThrow(ReservedTermAllowanceError);
    const hidden: ReservedTermAllowance = { ...sentence, templateId: 'x', template: 'Status: {final}' };
    expect(() => createAllowanceSet([hidden])).toThrow(/holds no reserved term/);
  });

  it('refuses two entries with the same kind and id, and empty ids', () => {
    expect(() => createAllowanceSet([badge, { ...badge }])).toThrow(/twice/);
    expect(() => createAllowanceSet([{ ...badge, badgeId: ' ' }])).toThrow(ReservedTermAllowanceError);
  });

  it('accepts one entry of each text-bearing kind', () => {
    const set = createAllowanceSet([
      badge,
      sentence,
      { kind: 'action_label', actionId: 'request-review', label: 'Request a quotation review' },
      { kind: 'status_line', statusLineId: 'price-stage-3', text: 'Formal quotation' },
      { kind: 'qualifier_label', fieldKey: 'energy.annual', qualifier: 'final', label: 'final energy' },
    ]);
    expect(set.entries).toHaveLength(5);
    expect(set.match('final energy')?.kind).toBe('qualifier_label');
  });

  it('exempts verbatim document text only with a document id and a content hash', () => {
    const context = { kind: 'verbatim_document_text', documentId: 'doc-1', contentHash: 'sha256:abc' } as const;
    expect(scanCopy('Ofertă fermă nr. 12', { allowances: NO_ALLOWANCES, context })).toEqual([]);
    expect(() =>
      scanCopy('Ofertă fermă', { allowances: NO_ALLOWANCES, context: { ...context, contentHash: '' } }),
    ).toThrow();
  });

  it('registers the copy registries\' allowances from phase 1, and nothing else', () => {
    expect(registeredAllowances().entries.map((entry) => entry.kind)).toEqual(['badge', 'badge', 'status_line', 'generated_sentence', 'generated_sentence']);
    expect(registeredAllowances().entries).toEqual(COPY_ALLOWANCES);
  });
});
