/**
 * The domain's closed lists against the authoritative text of docs/guardrails.md
 * (sections 2.1, 2.3, 2.4 and 8). When a guardrails version changes one of these
 * lists, this test fails until the domain follows it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  CANDIDATE_EVENT_TYPES,
  DOCUMENT_EVENT_TYPES,
  DOCUMENT_KINDS,
  DOCUMENT_STAGES,
  EVIDENCE_CHECKS,
  EVIDENCE_LOCATOR_KEYS,
  EVIDENCE_MATCHES,
  FIELD_EVENT_TYPES,
  FIELD_STATE_PRECEDENCE,
  FIELD_STATES,
  GUARDRAIL_EVENT_TYPES,
  SOURCE_PRECEDENCE,
  SOURCES,
  VERIFICATION_PRECEDENCE,
  VERIFICATIONS,
  type EvidenceLocator,
} from './index';

const guardrails = readFileSync(new URL('../../../docs/guardrails.md', import.meta.url), 'utf8');

/** The text between a heading line and the next heading of the same or a higher level. */
function section(heading: string): string {
  const start = guardrails.indexOf(`\n${heading}\n`);
  if (start < 0) throw new Error(`heading not found in docs/guardrails.md: ${heading}`);
  const level = heading.indexOf(' ');
  const rest = guardrails.slice(start + heading.length + 2);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return next < 0 ? rest : rest.slice(0, next);
}

/** The body of `interface <name> { ... }` inside a code block. */
function interfaceBody(text: string, name: string): string {
  const match = new RegExp(`interface ${name} \\{([\\s\\S]*?)\\n\\}`).exec(text);
  if (!match?.[1]) throw new Error(`interface ${name} not found`);
  return match[1];
}

/** The quoted keys of the union assigned to `<property>:` in an interface body, comments removed. */
function unionOf(body: string, property: string): string[] {
  const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const match = new RegExp(`\\b${property}: ([^;]*);`).exec(code);
  if (!match?.[1]) throw new Error(`property ${property} not found`);
  return [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1] ?? '');
}

/** The first-column code values of a markdown table that starts with `| <header> |`. */
function tableKeys(text: string, header: string): string[] {
  const start = text.indexOf(`| ${header} |`);
  if (start < 0) throw new Error(`table ${header} not found`);
  const lines = text.slice(start).split('\n');
  const keys: string[] = [];
  for (const line of lines.slice(2)) {
    const match = /^\| `([a-z_]+)` \|/.exec(line);
    if (!match?.[1]) break;
    keys.push(match[1]);
  }
  return keys;
}

const sources21 = section('### 2.1 Sources and verification: two separate axes');
const documents23 = section('### 2.3 Documents');
const candidates24 = section('### 2.4 Candidates, evidence and events');
const rule1 = section('### Rule 1. Never invent engineering data');
const events8 = section('## 8. Guardrail events');

describe('domain lists follow docs/guardrails.md', () => {
  test('2.1: the six sources and the four verification levels', () => {
    expect([...SOURCES]).toEqual(tableKeys(sources21, 'Source'));
    expect([...VERIFICATIONS]).toEqual(tableKeys(sources21, 'Verification'));
  });

  test('2.3: document kinds, stages and document event types', () => {
    const record = interfaceBody(documents23, 'DocumentRecord');
    expect([...DOCUMENT_KINDS]).toEqual(unionOf(record, 'kind'));
    expect([...DOCUMENT_STAGES]).toEqual(unionOf(record, 'stage'));
    expect([...DOCUMENT_EVENT_TYPES]).toEqual(unionOf(interfaceBody(documents23, 'DocumentEvent'), 'type'));
  });

  test('2.4: candidate and field event types, and the evidence match set by code', () => {
    expect([...CANDIDATE_EVENT_TYPES]).toEqual(unionOf(interfaceBody(candidates24, 'CandidateEvent'), 'type'));
    expect([...FIELD_EVENT_TYPES]).toEqual(unionOf(interfaceBody(candidates24, 'FieldEvent'), 'type'));
    expect([...EVIDENCE_MATCHES]).toEqual(unionOf(interfaceBody(candidates24, 'Evidence'), 'check'));
  });

  test('2.4: the evidence locator has the fields of 2.4 and no IFC field', () => {
    const evidence = interfaceBody(candidates24, 'Evidence');
    const locator = /locator: \{([^}]*)\}/.exec(evidence)?.[1] ?? '';
    const keys = [...locator.matchAll(/(\w+)\?:/g)].map((m) => m[1]);
    expect([...EVIDENCE_LOCATOR_KEYS]).toEqual(keys);
    for (const key of EVIDENCE_LOCATOR_KEYS) expect(key).not.toMatch(/ifc|global|step/i);

    // A locator that names a model element is not an EvidenceLocator (ifc-input 6.2.1 is a proposal).
    const ifcLocator = { page: 1, ifc: { globalId: 'TEST-GUID', stepIds: [1] } };
    // @ts-expect-error The 2.4 locator has no IFC fields.
    const typed: EvidenceLocator = { page: 1, ifc: { globalId: 'TEST-GUID', stepIds: [1] } };
    expect(Object.keys(typed)).toEqual(Object.keys(ifcLocator));
  });

  test('2.4: the field states and their precedence', () => {
    expect([...FIELD_STATES].sort()).toEqual(tableKeys(candidates24, 'State').sort());
    const order = /the order is: ([a-z_, ]+)\./.exec(candidates24)?.[1]?.split(', ');
    expect([...FIELD_STATE_PRECEDENCE]).toEqual(order);
  });

  test('2.4: the active-candidate order, by verification and then by source', () => {
    const byVerification = /1\. verification: ([a-z_, ]+);/.exec(candidates24)?.[1]?.split(/, then |, /);
    const bySource = /2\. source: ([a-z_, ]+);/.exec(candidates24)?.[1]?.split(', ');
    expect([...VERIFICATION_PRECEDENCE]).toEqual(byVerification);
    expect([...SOURCE_PRECEDENCE]).toEqual(bySource);
  });

  test('rule 1: the verifier runs five evidence checks', () => {
    expect(rule1).toContain('code checks five things');
    expect(EVIDENCE_CHECKS).toHaveLength(5);
    expect(new Set(EVIDENCE_CHECKS).size).toBe(5);
  });

  test('section 8: the guardrail event types', () => {
    const listed = [...events8.matchAll(/^- `([a-z_]+)`/gm)].map((m) => m[1]);
    expect([...GUARDRAIL_EVENT_TYPES]).toEqual(listed);
  });
});
