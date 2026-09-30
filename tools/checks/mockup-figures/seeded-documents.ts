/**
 * TEST documents for the figure checks' seeded inputs, built in memory at run
 * time: a document-type file may not sit in the repository outside fixtures/
 * (the fixture-manifest check), so the seeded workbooks, PDFs and archives are
 * written into a temporary copy of a seeded tree, never committed. Shared by the
 * mockup-figure and company-figure cases.
 *
 * - zipBytes: a ZIP archive of deflated members (the container of XLSX, DOCX
 *   and ODF files).
 * - workbookBytes: a minimal XLSX: shared strings, inline strings, numeric
 *   cells, and number formats (a percent format and a format with a quoted unit).
 * - pdfBytes: a minimal PDF with Helvetica text, each page's content stream
 *   optionally deflated (so the raw bytes do not show the text), and an
 *   information dictionary in UTF-16BE hex strings.
 */
import { crc32, deflateRawSync, deflateSync } from 'node:zlib';

/** A ZIP archive whose members are deflated, with their names in UTF-8. */
export function zipBytes(members: Readonly<Record<string, string | Buffer>>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(members)) {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    const packed = deflateRawSync(data);
    const nameBytes = Buffer.from(name, 'utf8');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(members).length, 8);
  end.writeUInt16LE(Object.keys(members).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const escapeXml = (text: string): string => text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

/** A TEST cell: a shared string, an inline string, or a number with a cell style (0: General, 1: "0.0%", 2: '0 "kW"'). */
export type TestCell = { readonly shared: string } | { readonly inline: string } | { readonly number: string; readonly style?: 0 | 1 | 2 };

/** A minimal XLSX with one sheet, one cell per row in column A. */
export function workbookBytes(sheetName: string, cells: readonly TestCell[]): Buffer {
  const shared: string[] = [];
  const rows = cells.map((cell, index) => {
    const ref = `A${index + 1}`;
    if ('shared' in cell) {
      shared.push(cell.shared);
      return `<row r="${index + 1}"><c r="${ref}" t="s"><v>${shared.length - 1}</v></c></row>`;
    }
    if ('inline' in cell) return `<row r="${index + 1}"><c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell.inline)}</t></is></c></row>`;
    return `<row r="${index + 1}"><c r="${ref}" s="${cell.style ?? 0}"><v>${cell.number}</v></c></row>`;
  });
  const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zipBytes({
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="${main}" xmlns:r="${relationships}"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relationships}/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="${relationships}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${main}"><numFmts count="2"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="0 &quot;kW&quot;"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    // Each shared string is written as two rich-text runs, split in the middle, as spreadsheet programs write styled text.
    'xl/sharedStrings.xml': `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="${main}" count="${shared.length}" uniqueCount="${shared.length}">${shared
      .map((text) => {
        const middle = Math.floor(text.length / 2);
        return `<si><r><t xml:space="preserve">${escapeXml(text.slice(0, middle))}</t></r><r><rPr><b/></rPr><t xml:space="preserve">${escapeXml(text.slice(middle))}</t></r></si>`;
      })
      .join('')}</sst>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${main}"><sheetData>${rows.join('')}</sheetData></worksheet>`,
  });
}

const pdfString = (text: string): string => `(${text.replace(/[\\()]/gu, '\\$&')})`;

/** A text string in UTF-16BE hex, as many producers write the information dictionary: its words do not show in the raw bytes. */
const pdfHexString = (text: string): string => `<FEFF${Buffer.from(text, 'utf16le').swap16().toString('hex').toUpperCase()}>`;

/** A TEST PDF page: its content stream, deflated or not. */
export interface TestPage {
  readonly content: string;
  readonly deflate: boolean;
}

/** A minimal PDF: Helvetica, one content stream per page, and an information dictionary. */
export function pdfBytes(pages: readonly TestPage[], info: Readonly<Record<string, string>> = {}): Buffer {
  const objects: Buffer[] = [];
  const pageIds = pages.map((_page, index) => 4 + index * 2);
  const infoId = 4 + pages.length * 2;
  objects.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`));
  objects.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  pages.forEach((page, index) => {
    const content = Buffer.from(page.content, 'latin1');
    const stream = page.deflate ? deflateSync(content) : content;
    const contentsId = (pageIds[index] ?? 0) + 1;
    objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentsId} 0 R >>`));
    objects.push(Buffer.concat([Buffer.from(`<< /Length ${stream.length}${page.deflate ? ' /Filter /FlateDecode' : ''} >>\nstream\n`), stream, Buffer.from('\nendstream')]));
  });
  objects.push(Buffer.from(`<< ${Object.entries(info).map(([key, value]) => `/${key} ${pdfHexString(value)}`).join(' ')} >>`));
  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%âãÏÓ\n', 'latin1')];
  let length = chunks[0]?.length ?? 0;
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(length);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
    chunks.push(chunk);
    length += chunk.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n', ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

/** A content stream that shows each line in Helvetica, 12 pt, top to bottom. */
export function textContent(lines: readonly string[]): string {
  return lines.map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 20} Td ${line.startsWith('[') ? `${line} TJ` : `${pdfString(line)} Tj`} ET`).join('\n');
}
