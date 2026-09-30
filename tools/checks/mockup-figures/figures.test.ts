import { describe, expect, it } from 'vitest';
import { BAD_CASES, GOOD_CASE, runCase, runRealListCase } from './cases';
import { displayForms, documentKind, readZip, xmlText } from './document-text';
import { findFigures, parseList, readingsOf, type FigureEntry } from './figures';
import { pdfBytes, textContent, workbookBytes, zipBytes } from './seeded-documents';

const values = (token: string): string[] => readingsOf(token).map((value) => value.toString()).sort();

describe('number readings', () => {
  it('reads plain, English, Romanian, space and underscore grouping', () => {
    expect(values('34500')).toEqual(['34500']);
    expect(values('34,500')).toEqual(['34.5', '34500']);
    expect(values('34.500')).toEqual(['34.5', '34500']);
    expect(values('1,280,000.50')).toEqual(['1280000.5']);
    expect(values('1.280.000,5')).toEqual(['1280000.5']);
    expect(values('34 500')).toEqual(['34', '34500', '500']);
    expect(values('1_280_000')).toEqual(['1280000']);
  });

  it('gives no reading for dates, versions and other dotted strings', () => {
    expect(values('17.09.2025')).toEqual([]);
    expect(values('1.2.3')).toEqual([]);
  });
});

/** Entries of a TEST list. Its spec does not exist here, so the only problems are the missing source files. */
function entries(list: string): FigureEntry[] {
  const parsed = parseList(list, 'TEST list', '/nonexistent');
  expect(parsed.problems.every((problem) => problem.includes('does not exist'))).toBe(true);
  return [...parsed.entries];
}

describe('finding figures', () => {
  const list = [
    'number | 98,765 | design/t.md:1',
    'number | €2,750,000 | design/t.md:1',
    'quantity | 8.3 years | design/t.md:1',
    'quantity | €47 / m² | design/t.md:1',
    'text | Hotel Nowhere Testville | design/t.md:1',
    'text | 7Q + GF + 3 | design/t.md:1',
  ].join('\n');
  const found = (text: string, path = 'a.ts'): string[] => findFigures(path, text, entries(list)).map((hit) => `${hit.entry.figure}=${hit.text}`);

  it('finds a number in any format and scale', () => {
    expect(found("'98.765'")).toEqual(['98,765=98.765']);
    expect(found('98_765')).toEqual(['98,765=98_765']);
    expect(found('98 765 m²')).toEqual(['98,765=98 765']);
    expect(found('€2.75M')).toEqual(['€2,750,000=2.75M']);
    expect(found('2,75 mil. EUR')).toEqual(['€2,750,000=2,75 mil.']);
    expect(found('2750k')).toEqual(['€2,750,000=2750k']);
  });

  it('finds a quantity only with its unit, in its usual spellings', () => {
    expect(found('8,3 ani')).toEqual(['8.3 years=8,3 ani']);
    expect(found('payback 8.3 yrs')).toEqual(['8.3 years=8.3 yrs']);
    expect(found('8.3 metres')).toEqual([]);
    expect(found('47 €/mp')).toEqual(['€47 / m²=47 €/mp']);
    expect(found('47 points')).toEqual([]);
  });

  it('finds text ignoring case, diacritics and spacing, with digit edges kept', () => {
    expect(found('HOTEL  NOWHERE TESTVILLE')).toEqual(['Hotel Nowhere Testville=hotel  nowhere testville']);
    expect(found('7Q+GF+3')).toEqual(['7Q + GF + 3=7q+gf+3']);
    expect(found('7Q + GF + 31')).toEqual([]);
    expect(found('17Q + GF + 3')).toEqual([]);
  });

  it('skips numbers inside identifiers, hex strings and SVG geometry', () => {
    expect(found('id_98765 a98765 98765abc G98-765')).toEqual([]);
    expect(found('<path d="M98765 0"/>', 'icon.svg')).toEqual([]);
    expect(found('<text>98765</text>', 'icon.svg')).toEqual(['98,765=98765']);
  });
});

describe('the list', () => {
  it('reads entries with trailing notes and rejects malformed ones', () => {
    const parsed = parseList('# comment\nnumber | 98,765 | x.md:1  # TEST note\nnumber | 12 | x.md:1\n', 'TEST list', '/nonexistent');
    expect(parsed.entries.map((entry) => entry.figure)).toEqual(['98,765']);
    expect(parsed.problems.some((problem) => problem.includes('fewer than 3 digits'))).toBe(true);
  });

  it('fails with no entries', () => {
    expect(parseList('# only comments\n', 'TEST list', '/nonexistent').problems).toEqual(['TEST list: no entries; the check has nothing to look for']);
  });
});

// Phase 2 review, adversarial finding 16: workbooks and PDFs are read by their text.
describe('document text', () => {
  it('ADR 0009: tells a PDF and a ZIP archive by their signatures, not by a mention of one', () => {
    expect(documentKind(pdfBytes([{ content: textContent(['TEST']), deflate: false }]))).toBe('pdf');
    expect(documentKind(zipBytes({ 'a.txt': 'TEST' }))).toBe('zip');
    expect(documentKind(Buffer.from('_PDF = re.compile(rb"\\s*%PDF-")\n'))).toBeUndefined();
  });

  it('ADR 0009: reads each string of an XML part on its own line, with rich-text runs joined', () => {
    const xml = '<?xml version="1.0"?><sst><si><r><t>98.</t></r><r><rPr><b/></rPr><t>765 mp</t></r></si><si><t>next</t></si></sst>';
    expect(xmlText(xml)).toBe('98.765 mp\nnext');
    expect(xmlText('<sheetData><row r="1"><c r="A1"><v>98765</v></c><c r="B1"><v>12</v></c></row></sheetData>')).toBe('98765\n12');
  });

  it('ADR 0009: reads the attributes that carry words, and no position, size or id', () => {
    const xml = '<workbook><sheets><sheet name="TEST Suprafete &amp; camere" sheetId="98765" r:id="rId1"/></sheets><cols><col width="98765"/></cols><numFmt numFmtId="164" formatCode="0 &quot;kW&quot;"/></workbook>';
    expect(xmlText(xml).split('\n')).toEqual(['TEST Suprafete & camere', '0 "kW"']);
  });

  it('ADR 0009: reads a number as its format displays it: percent, decimals, scaling and literals', () => {
    expect(displayForms('0.137', '0.0%')).toEqual(['13.7%']);
    expect(displayForms('0.1372', '0.0%')).toEqual(['13.7%', '13.72%']);
    expect(displayForms('93.59999999999999', '0.00')).toEqual(['93.60']);
    expect(displayForms('612.4', '0 "kW"')).toEqual(['612 kW']);
    expect(displayForms('98765', '#,##0,"k"')).toEqual(['99k']);
    expect(displayForms('47', '[$€-418]#,##0')).toEqual(['€47']);
    expect(displayForms('46000', 'dd.mm.yyyy')).toEqual([]);
    expect(displayForms('98765', 'General')).toEqual([]);
  });

  it('ADR 0009: reads the members of a ZIP archive, and says why one cannot be read', () => {
    const archive = zipBytes({ 'a.txt': 'TEST a', 'b/c.xml': '<x>TEST c</x>' });
    expect(readZip(archive, 'TEST.zip').members.map((member) => `${member.name}=${member.data.toString('utf8')}`)).toEqual(['a.txt=TEST a', 'b/c.xml=<x>TEST c</x>']);
    expect(readZip(archive.subarray(0, 40), 'TEST.zip').problems).toEqual(['TEST.zip: not a readable ZIP archive (no end of central directory), so its text was not read']);
    expect(readZip(workbookBytes('TEST', [{ number: '1' }]), 'TEST.xlsx').problems).toEqual([]);
  });
});

describe('mockup-figures check on seeded inputs', () => {
  it('ADR 0009: passes the seeded good input (near misses, case folders, SVG geometry, a clean workbook and PDF)', async () => {
    const result = await runCase(GOOD_CASE);
    expect(result.details).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary).toContain('2 documents read by their text (1 PDF, 1 ZIP-based)');
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
    for (const unexpected of badCase.notExpect ?? []) expect(result.details.join('\n')).not.toContain(unexpected);
  });

  it('finds every entry of the real list when it is planted', async () => {
    const result = await runRealListCase();
    expect(result.ok).toBe(false);
    expect(result.summary).toContain('real entries found');
  });
});
