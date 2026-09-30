/**
 * Latin letter forms that NFKC and diacritic removal leave outside ASCII, as the ASCII
 * letters they are drawn from (phase 2 fix round 3, the verifier's finding "small-capital
 * Latin letters pass reserved_term": "The value is ᴠᴇʀɪꜰɪᴇᴅ." passed, because NFKC keeps
 * small capitals and the confusables skeleton held only some of them). guardrails 2.8:
 * "Matching is whole-word, and ignores case and diacritics"; a small capital is a case
 * form, and a stroke, hook or bar is drawn on the letter like a diacritic.
 *
 * Derived from the Unicode character names (Unicode 13 data), not typed by hand:
 * - "LATIN LETTER SMALL CAPITAL X" and "MODIFIER LETTER SMALL CAPITAL X" (the U+1D00 block,
 *   the IPA block and the U+A7xx small capitals such as ꜰ, ꜱ and ꞯ);
 * - "LATIN SMALL LETTER DOTLESS X" and "LATIN SMALL LETTER SCRIPT X";
 * - "LATIN SMALL LETTER X WITH …" and "LATIN CAPITAL LETTER X WITH …" where the mark (a
 *   stroke, hook, bar, tail, descender, flourish) is part of the character, so NFD does not
 *   split it off;
 * leaving out the letters that are turned, reversed, sideways, open, closed, barred or
 * otherwise a different letter's shape. The negative circled, negative squared and
 * regional-indicator letters, which NFKC keeps too, are ranges (below).
 *
 * Modifier letters (ᵛᵉʳⁱᶠⁱᵉᵈ) and fullwidth forms (ｖｅｒｉｆｉｅｄ) need no entry: NFKC reads them as
 * plain letters before this table is applied (text.ts, checkedText).
 */

const GROUPS: readonly (readonly [string, string])[] = [
  ['a', 'Ⱥᴀⱥ'],
  ['ae', 'ǢǣǼǽᴁ'],
  ['av', 'Ꜻꜻ'],
  ['b', 'ƀƁƂƃɃɓʙᶀꞖꞗ'],
  ['c', 'ƇƈȻȼᴄꞒꞓꞔꟄ'],
  ['d', 'ĐđƊƋƌɖɗᴅᶁᶑꟇꟈ'],
  ['e', 'Ɇɇᴇⱸꬴ'],
  ['f', 'ƑƒᶂꜰꞘꞙ'],
  ['g', 'ƓǤǥɠɡɢʛᶃꞠꞡ'],
  ['h', 'ĦħɦʜⱧⱨꞕꞪ'],
  ['i', 'ıƗɨɪᶦ'],
  ['j', 'ȷɈɉɟʄʝᴊꞲ'],
  ['k', 'ƘƙᴋᶄⱩⱪꝀꝁꝂꝃꝄꝅꞢꞣ'],
  ['l', 'ŁłƚȽʟᴌᶅᶫꝈꝉ'],
  ['m', 'ɱᴍᶆⱮꬺ'],
  ['n', 'ƝƞȠɲɴᶇᶰꞐꞑꞤꞥꬻ'],
  ['o', 'ØøǾǿᴏⱺꝊꝋ'],
  ['oe', 'ɶ'],
  ['ou', 'ᴕ'],
  ['p', 'ƤƥᴘᵽᶈⱣꝐꝑꝒꝓꝔꝕ'],
  ['q', 'ɋʠꝖꝗꝘꝙꞯ'],
  ['r', 'ɌɍɼɽɾʀᶉⱤꞦꞧꭆꭉꭋ'],
  ['s', 'ȿʂᶊⱾꜱꞨꞩꟅꟉꟊ'],
  ['t', 'ŦŧƫƬƭȾᴛⱦ'],
  ['th', 'ᵺ'],
  ['u', 'ᴜᶸꞸꞹꭎꭒ'],
  ['v', 'ƲʋᴠᶌⱱꝞꝟ'],
  ['w', 'ᴡⱲⱳ'],
  ['x', 'ᶍꭖꭗꭘꭙ'],
  ['y', 'ƳƴɎɏʏꭚ'],
  ['z', 'ƵƶȤȥɀᴢᶎⱫⱬⱿꟆ'],
];

/** Letter symbols A to Z that NFKC keeps: negative circled, negative squared, regional indicators. */
const LETTER_SYMBOL_RANGES: readonly number[] = [0x1f150, 0x1f170, 0x1f1e6];

function build(): Readonly<Record<string, string>> {
  const table: Record<string, string> = {};
  for (const [ascii, forms] of GROUPS) for (const form of forms) table[form] = ascii;
  for (const first of LETTER_SYMBOL_RANGES) {
    for (let offset = 0; offset < 26; offset += 1) table[String.fromCodePoint(first + offset)] = String.fromCharCode(0x61 + offset);
  }
  return Object.freeze(table);
}

/** A Latin letter form (as NFKC leaves it) as its ASCII letters, lower case. */
export const LATIN_LETTER_FORMS: Readonly<Record<string, string>> = build();
