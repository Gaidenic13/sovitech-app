import { describe, expect, it } from 'vitest';
import { BAD_CASES, GOOD_CASES, runCase } from './cases';
import { classifyClassifiers, classifyLicence, classifyLicenceFileText, parsePnpmLicences } from './licences';

describe('classifying licence expressions', () => {
  it('reads SPDX ids', () => {
    expect(classifyLicence('MIT')).toBe('other');
    expect(classifyLicence('Apache-2.0')).toBe('other');
    expect(classifyLicence('MPL-2.0')).toBe('mpl');
    expect(classifyLicence('LGPL-3.0-or-later')).toBe('lgpl');
    expect(classifyLicence('LGPL-2.1+')).toBe('lgpl');
    expect(classifyLicence('GPL-2.0-only')).toBe('gpl');
    expect(classifyLicence('GPL-3.0+')).toBe('gpl');
    expect(classifyLicence('AGPL-3.0-or-later')).toBe('agpl');
  });

  it('takes the most permissive branch of OR and the least permissive part of AND', () => {
    expect(classifyLicence('(MIT OR GPL-3.0-only)')).toBe('other');
    expect(classifyLicence('MIT or Apache-2.0')).toBe('other');
    expect(classifyLicence('(MIT AND GPL-3.0-only)')).toBe('gpl');
    expect(classifyLicence('(LGPL-3.0-only OR MPL-2.0) AND BSD-3-Clause')).toBe('mpl');
  });

  it('keeps the base licence of a WITH exception', () => {
    expect(classifyLicence('Apache-2.0 WITH LLVM-exception')).toBe('other');
    expect(classifyLicence('GPL-2.0-only WITH Classpath-exception-2.0')).toBe('gpl');
  });

  it('reads free text when the expression is not SPDX', () => {
    expect(classifyLicence('GNU Affero General Public License v3')).toBe('agpl');
    expect(classifyLicence('GNU Lesser General Public License v3 (LGPLv3)')).toBe('lgpl');
    expect(classifyLicence('GNU General Public License, version 2')).toBe('gpl');
    expect(classifyLicence('BSD style, see LICENSE')).toBe('other');
  });

  it('treats a missing or unstated licence as unknown', () => {
    for (const text of ['', 'UNKNOWN', 'Unknown', 'UNLICENSED', 'NOASSERTION', 'SEE LICENSE IN LICENSE.md']) {
      expect(classifyLicence(text)).toBe('unknown');
    }
  });

  it('reads Python trove classifiers', () => {
    expect(classifyClassifiers(['License :: OSI Approved :: GNU Lesser General Public License v3 (LGPLv3)'])).toBe('lgpl');
    expect(classifyClassifiers(['License :: OSI Approved :: GNU General Public License v3 (GPLv3)'])).toBe('gpl');
    expect(classifyClassifiers(['License :: OSI Approved :: GNU Affero General Public License v3'])).toBe('agpl');
    expect(classifyClassifiers(['License :: OSI Approved :: MIT License'])).toBe('other');
    expect(classifyClassifiers(['License :: OSI Approved'])).toBeUndefined();
    expect(classifyClassifiers([])).toBeUndefined();
  });

  it('reads licence file titles', () => {
    expect(classifyLicenceFileText('GNU GENERAL PUBLIC LICENSE\nVersion 3')).toBe('gpl');
    expect(classifyLicenceFileText('GNU LESSER GENERAL PUBLIC LICENSE\nVersion 3')).toBe('lgpl');
    expect(classifyLicenceFileText('GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3')).toBe('agpl');
    expect(classifyLicenceFileText('MIT License\n\nPermission is hereby granted')).toBe('other');
  });

  it('reads the JSON of `pnpm licenses ls --json`', () => {
    const packages = parsePnpmLicences({
      MIT: [{ name: 'a', versions: ['1.0.0', '1.1.0'], license: 'MIT', paths: ['/x/node_modules/a'] }],
      'MPL-2.0': [{ name: 'b', versions: ['2.0.0'], license: 'MPL-2.0', paths: [] }],
    });
    expect(packages).toEqual([
      { name: 'a', version: '1.0.0, 1.1.0', licence: 'MIT' },
      { name: 'b', version: '2.0.0', licence: 'MPL-2.0' },
    ]);
  });
});

describe('licences check on seeded inputs', () => {
  it.each(GOOD_CASES.map((goodCase) => [goodCase.id, goodCase] as const))('passes %s and reports LGPL and MPL', async (_id, goodCase) => {
    const result = await runCase(goodCase);
    expect(result.ok).toBe(true);
    for (const expected of goodCase.expect) expect(`${result.summary}\n${result.details.join('\n')}`).toContain(expected);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
  });
});
