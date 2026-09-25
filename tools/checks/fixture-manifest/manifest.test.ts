import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BAD_CASES, GOOD_CASES, runCase } from './cases';
import { DOCUMENT_HOME_TYPES, DOCUMENT_HOMES, DOCUMENT_TYPE_FAMILIES, documentTypeOfContent, embeddedDocuments, isDocumentPath, sha256OfFile } from './manifest';

describe('document-type files', () => {
  it('recognises the document and image types step 2 accepts, in any letter case', () => {
    for (const path of ['a.pdf', 'b.DWG', 'c.dxf', 'd.rvt', 'e.ifc', 'f.xlsx', 'g.xls', 'h.docx', 'i.doc', 'j.zip', 'k.jpg', 'l.JPEG', 'm.png']) {
      expect(isDocumentPath(path)).toBe(true);
    }
  });

  it('recognises every other owner-document family: images, office, models, archives, mail', () => {
    for (const path of [
      'a.heic', 'b.HEIF', 'c.tif', 'd.tiff', 'e.webp', 'f.gif', 'g.bmp',
      'h.xlsm', 'i.xlsb', 'j.csv', 'k.odt', 'l.ods', 'm.rtf', 'n.ppt', 'o.pptx',
      'p.ifczip', 'q.ifcxml', 'r.dgn', 's.nwd', 't.nwc',
      'u.7z', 'v.rar', 'w.tar', 'x.tar.gz', 'y.msg', 'z.eml',
    ]) {
      expect(isDocumentPath(path)).toBe(true);
    }
    expect(Object.keys(DOCUMENT_TYPE_FAMILIES)).toEqual(['pdf', 'images', 'video', 'vector', 'office', 'models', 'archives', 'mail']);
  });

  it('recognises videos, AVIF photos and SVG exports (phase 0 round 2 review)', () => {
    for (const path of ['a.mp4', 'b.MOV', 'c.avif', 'd.svg', 'e.m4v', 'f.webm', 'g.avi', 'h.mkv', 'i.3gp']) {
      expect(isDocumentPath(path)).toBe(true);
    }
  });

  it('leaves source and text files alone', () => {
    for (const path of ['b.json', 'e.ts', 'f.md', 'g.woff2', 'pdf', 'notes.pdf.txt', 'csv', 'svg']) {
      expect(isDocumentPath(path)).toBe(false);
    }
  });

  it('keeps each home to its own types; fixtures/ keeps any, under the manifest', () => {
    expect(DOCUMENT_HOMES).toEqual(['fixtures/', 'packages/ui/src/brand/', 'design/reference/']);
    expect(DOCUMENT_HOME_TYPES).toEqual({ 'fixtures/': 'any', 'design/reference/': ['png', 'jpg', 'webp'], 'packages/ui/src/brand/': ['svg', 'woff2', 'woff'] });
  });

  it('reads a document type from the first bytes, and none from plain text', () => {
    const bytes = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'latin1'));
    expect(documentTypeOfContent(bytes('%PDF-1.7'))).toBe('PDF');
    expect(documentTypeOfContent(bytes('ISO-10303-21;'))).toBe('IFC (STEP physical file)');
    expect(documentTypeOfContent(bytes('\u00EF\u00BB\u00BF ISO-10303-21;'))).toBe('IFC (STEP physical file)');
    expect(documentTypeOfContent(bytes('AC1027'))).toBe('DWG');
    for (const text of ['BMS notes, TEST', 'PK: key', 'GIF is a format', '{ "rtf": 1 }', '# ISO-10303-21 notes', '', 'TEST free and wide text', '<!doctype html><svg></svg>']) {
      expect(documentTypeOfContent(bytes(text))).toBeUndefined();
    }
  });

  it('reads ISO media, Matroska, AVI and SVG from the first bytes', () => {
    const box = (type: string, brand: string): Uint8Array => new Uint8Array(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from(type + brand, 'latin1')]));
    expect(documentTypeOfContent(box('ftyp', 'avif'))).toBe('AVIF');
    expect(documentTypeOfContent(box('ftyp', 'heic'))).toBe('HEIC/HEIF');
    expect(documentTypeOfContent(box('ftyp', 'isom'))).toBe('ISO media (MP4, M4V, 3GP)');
    expect(documentTypeOfContent(box('ftyp', 'qt  '))).toBe('QuickTime movie (MOV)');
    expect(documentTypeOfContent(box('moov', '    '))).toBe('QuickTime movie (MOV)');
    expect(documentTypeOfContent(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe('Matroska or WebM video');
    expect(documentTypeOfContent(new Uint8Array(Buffer.from('RIFF\u0000\u0000\u0000\u0000AVI LIST', 'latin1')))).toBe('AVI video');
    expect(documentTypeOfContent(new Uint8Array(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="x">', 'latin1')))).toBe('SVG image');
  });

  it('finds documents embedded in text as base64, and nothing in ordinary base64-like text', () => {
    const pdf = Buffer.from('%PDF-1.7 TEST stand-in').toString('base64');
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]).toString('base64');
    const text = `a = '${pdf}';\n<img src="data:image/jpeg;base64,${jpeg}">\nconst resolveDisplayObjectsForScreen = 1;\n`;
    expect(embeddedDocuments(text)).toEqual([
      { line: 1, type: 'PDF', form: 'base64 text' },
      { line: 2, type: 'JPEG', form: 'a base64 data: URI (image/jpeg)' },
    ]);
    const font = Buffer.from('wOF2 TEST font data').toString('base64');
    expect(embeddedDocuments(`src: url(data:font/woff2;base64,${font}); url("data:image/svg+xml,%3Csvg%3E")`)).toEqual([]);
  });
});

describe('fixture-manifest check', () => {
  it('hashes files as SHA-256 hex (value from `shasum -a 256`)', () => {
    const path = fileURLToPath(new URL('./seeded/good/fixtures/data/sample.txt', import.meta.url));
    expect(sha256OfFile(path)).toBe('838636fa8f57c37c9d9180bc12931a414440905a165b1869b512c7dbf813bf17');
  });

  it.each(GOOD_CASES.map((goodCase) => [goodCase.id, goodCase] as const))('passes %s', async (_id, goodCase) => {
    const result = await runCase(goodCase);
    expect(result.details.filter((line) => !line.startsWith('note:'))).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
    for (const unexpected of badCase.notExpect ?? []) expect(result.details.join('\n')).not.toContain(unexpected);
  });
});
