/**
 * The rule 8 parser: numbers in Romanian and English formats, quantities with
 * their units, and the regim de înălțime (docs/guardrails.md rule 8, "Parsing"
 * and "Floors"; F-REGISTRY-03). Extraction and the evidence check ("the value
 * parses from the excerpt itself", rule 1) both use it from phase 2.
 */
export { parseNumber, type NumberLocale, type NumberParse, type NumberReading, type NumberRefusal, type ParsedNumber } from './parse-number';
export { parseQuantityText, type QuantityParse, type QuantityReading, type QuantityRefusal } from './parse-quantity';
export { FLOOR_NOTATION_LETTERS, FLOOR_NOTATION_LEVEL_TYPES, LEVEL_TYPES, parseFloorNotation, type FloorNotation, type LevelType } from './floor-notation';
