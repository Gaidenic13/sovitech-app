/**
 * The file name as served (file-names.ts; phase 3 part B, the final verification's fourth new problem): the
 * format and bidirectional controls dropped, every other character kept, nothing left read as no name. The
 * controls are written as escapes. TEST names only.
 */
import { describe, expect, it } from 'vitest';
import { servedFileName } from './file-names';

describe('A-8 (file names): servedFileName', () => {
  it('A-8 · rule 2: drops the override U+202E, the isolates U+2066 to U+2069, the marks U+200E, U+200F and U+061C, the embeddings U+202A to U+202D, and the other format characters', () => {
    expect(servedFileName('TEST plan\u202efdp.xlsx.pdf')).toBe('TEST planfdp.xlsx.pdf');
    expect(servedFileName('TEST \u2066a\u2069 \u2067b\u2069 \u2068c\u2069\u200f\u200e\u061c.pdf')).toBe('TEST a b c.pdf');
    expect(servedFileName('TEST \u202aa\u202c\u202bb\u202c\u202dc\u202c.pdf')).toBe('TEST abc.pdf');
    expect(servedFileName('TEST​‌‍⁠﻿­ name.pdf')).toBe('TEST name.pdf');
  });

  it('A-8 · rule 2: keeps letters of any script, Romanian diacritics, spaces and punctuation as stored', () => {
    expect(servedFileName('TEST Memoriu tehnic – Șantier Iași (rev. 2).pdf')).toBe('TEST Memoriu tehnic – Șantier Iași (rev. 2).pdf');
    expect(servedFileName('TEST מסמך تقرير.pdf')).toBe('TEST מסמך تقرير.pdf');
  });

  it('A-8 · rule 7 "never a blank": a name with nothing left to show, or none stored, is no name', () => {
    expect(servedFileName('\u202e\u2066\u2069\u200f')).toBeUndefined();
    expect(servedFileName(' \u202e ')).toBeUndefined();
    expect(servedFileName(null)).toBeUndefined();
    expect(servedFileName(undefined)).toBeUndefined();
  });
});
