/**
 * Table-driven IFC candidate proposals: each comes from a rule of a mounted dataset.
 *
 * A proposal is never a candidate: the API verifies it, decides its source (rule 1; 2.1) and,
 * while the gates it names are closed, never opens it (the contract's sealed `ifcValues`).
 * Every proposal names the dataset rule that shaped it and the gates its mechanism waits for,
 * at least (the contract's x-mechanism-rules), plus any the rule adds. A rule's match reads
 * what the data pass read: an element's class (named as IFC4 names it) and resolved predefined
 * type, an attribute, a property or quantity, the engineering tag's prefix, a term in its name,
 * a relation.
 *
 * Each proposal is about one object and carries one value: a fact, or a choice from the table.
 * Nothing here counts: no proposal is a count of elements or of storeys (rule 8; ifc-input 6.2.5
 * and 6.2.8; the `ifc-untagged-count` gate).
 */
import type { IfcCandidateProposal } from '@sovitech/extraction-contract';
import type { Dataset, Match, Rule } from './datasets';
import { normalise } from './instructions';
import { ElementRead, type ModelReading, type ObjectRead, type Through } from './reading';
import { engineeringTag, ifc4Class, resolvedType } from './register';
import { attributeKey, propertyKey, relationKey, type FactIndex } from './values';

const NAME_ATTRIBUTES = ['Name', 'ObjectType', 'LongName', 'Description'] as const;
const TAG_SEPARATOR = /^[-.\s_/]/u;
const EVIDENCE_MAX = 64;

function classOf(reading: ModelReading, item: ObjectRead): string {
  return item instanceof ElementRead ? ifc4Class(reading, item) : item.ifcClass;
}

function predefinedOf(reading: ModelReading, item: ObjectRead): string | undefined {
  return item instanceof ElementRead ? resolvedType(reading, item).predefined : item.predefined;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Whether a term occurs in a text as a whole word or words, case and diacritics ignored. */
function termIn(term: string, text: string): boolean {
  return new RegExp(`(?<![0-9a-z])${escapeRegExp(normalise(term))}(?![0-9a-z])`, 'u').test(normalise(text));
}

function tagHasPrefix(tag: string, prefix: string): boolean {
  const normalTag = normalise(tag);
  const normalPrefix = normalise(prefix);
  if (!normalTag.startsWith(normalPrefix)) return false;
  const rest = normalTag.slice(normalPrefix.length);
  return rest === '' || TAG_SEPARATOR.test(rest);
}

function groupMatches(reading: ModelReading, groupId: string, match: Match): boolean {
  const group = reading.objects.get(groupId);
  if (group === undefined) return false;
  const wanted = match.groupPredefinedType;
  if (wanted !== undefined && !wanted.includes(group.predefined ?? '\u0000')) return false;
  const terms = match.groupNameTerm;
  if (terms !== undefined) {
    const texts = [group.text('Name'), group.text('ObjectType'), group.text('LongName')].flatMap((text) => (text === undefined || text === '' ? [] : [text]));
    if (!terms.some((term) => texts.some((text) => termIn(term, text)))) return false;
  }
  return true;
}

/**
 * The evidence of each match of a rule on one object: one list of fact ids per proposal.
 *
 * A property, quantity or relation matcher gives one proposal per fact it finds (the fact is
 * the value); an attribute, tag, name or flag matcher adds its facts to every proposal. With no
 * matcher at all (a class and type rule), the element's own line is the evidence, through its
 * PredefinedType (or its type object's), ObjectType, Name or Tag attribute fact.
 */
function evidence(reading: ModelReading, facts: FactIndex, item: ObjectRead, match: Match): string[][] {
  const gid = item.globalId;
  const throughs: readonly Through[] = match.through === 'any' ? ['occurrence', 'type_object'] : [match.through];
  const singles: string[] = [];
  const multiples: string[] = [];
  if (match.attribute !== undefined) {
    const fact = facts.attribute.get(attributeKey(gid, 'occurrence', match.attribute));
    const text = item.text(match.attribute) ?? '';
    if (fact === undefined || (match.requireLetter === true && !/\p{L}/u.test(text))) return [];
    singles.push(fact);
  }
  for (const [set, name] of [
    [match.propertySet, match.property],
    [match.quantitySet, match.quantity],
  ] as const) {
    if (set === undefined || name === undefined) continue;
    const found = throughs.flatMap((way) => facts.property.get(propertyKey(gid, way, set, name)) ?? []);
    if (found.length === 0) return [];
    multiples.push(...found);
  }
  if (match.tagPrefix !== undefined) {
    const tag = item instanceof ElementRead ? engineeringTag(item) : undefined;
    const fact = facts.attribute.get(attributeKey(gid, 'occurrence', 'Tag'));
    if (tag === undefined || fact === undefined || !match.tagPrefix.some((prefix) => tagHasPrefix(tag, prefix))) return [];
    singles.push(fact);
  }
  if (match.nameTerm !== undefined) {
    const terms = match.nameTerm;
    const hits = NAME_ATTRIBUTES.flatMap((attribute) => {
      const fact = facts.attribute.get(attributeKey(gid, 'occurrence', attribute));
      return fact !== undefined && terms.some((term) => termIn(term, item.text(attribute) ?? '')) ? [fact] : [];
    });
    const [first] = hits;
    if (first === undefined) return [];
    singles.push(first);
  }
  if (match.relation !== undefined) {
    const found = (facts.relation.get(relationKey(gid, match.relation)) ?? []).filter((entry) => groupMatches(reading, entry.relatedGlobalId, match)).map((entry) => entry.factId);
    if (found.length === 0) return [];
    multiples.push(...found);
  }
  for (const [set, name] of match.propertiesTrue ?? []) {
    const ids = (['occurrence', 'type_object'] as const).flatMap((way) => (facts.property.get(propertyKey(gid, way, set, name)) ?? []).filter((fact) => facts.tokens.get(fact) === '.T.'));
    const [first] = ids;
    if (first === undefined) return [];
    singles.push(first);
  }
  if (multiples.length > 0) return multiples.map((fact) => [fact, ...singles]);
  if (singles.length > 0) return [singles];
  for (const [way, attribute] of [
    ['occurrence', 'PredefinedType'],
    ['type_object', 'PredefinedType'],
    ['occurrence', 'ObjectType'],
    ['occurrence', 'Name'],
    ['occurrence', 'Tag'],
  ] as const) {
    const fact = facts.attribute.get(attributeKey(gid, way, attribute));
    if (fact !== undefined) return [[fact]];
  }
  return [];
}

function applies(reading: ModelReading, item: ObjectRead, rule: Rule): boolean {
  const { match } = rule;
  if (match.objectKind !== item.kind) return false;
  if (match.ifcClass !== undefined && !match.ifcClass.includes(classOf(reading, item))) return false;
  const predefined = predefinedOf(reading, item);
  return !(match.predefinedType !== undefined && (predefined === undefined || !match.predefinedType.includes(predefined)));
}

/** Every proposal the mounted datasets' rules make on the model's readable objects. */
export function buildProposals(reading: ModelReading, facts: FactIndex, datasets: readonly Dataset[]): IfcCandidateProposal[] {
  const proposals: IfcCandidateProposal[] = [];
  for (const [position, dataset] of datasets.entries()) {
    for (const item of reading.objects.values()) {
      if (item.kind === 'type' || (item instanceof ElementRead && item.hiddenLayers.length > 0)) continue;
      for (const rule of dataset.rules) {
        if (!applies(reading, item, rule)) continue;
        for (const [number, found] of evidence(reading, facts, item, rule.match).entries()) {
          const ids = [...new Set(found)].slice(0, EVIDENCE_MAX);
          const [first] = ids;
          if (first === undefined) continue;
          proposals.push({
            id: `p${String(item.stepId)}-${String(position)}-${String(rule.index)}-${String(number)}`,
            subject: { kind: rule.subjectKind, elementGlobalId: item.globalId },
            fieldKey: rule.fieldKey,
            sourceClaim: rule.sourceClaim,
            mechanism: rule.mechanism,
            requiresGates: [...rule.gates],
            datasets: [{ id: dataset.id, version: dataset.version }],
            value: rule.valueKind === 'fact' ? { kind: 'fact', factId: first } : { kind: 'choice', choice: rule.choice ?? '' },
            evidenceFactIds: ids,
            ...(rule.confidence === undefined ? {} : { confidence: rule.confidence }),
          });
        }
      }
    }
  }
  return proposals;
}
