/**
 * Version-sync check (docs/guardrails.md section 10, "Versioning"; CLAUDE.md
 * definition of done item 4; build-readiness 2 "Principles"). The guardrails
 * version at the top of docs/guardrails.md must equal:
 * - every "Checked against" line of CLAUDE.md (at least one);
 * - the "Checked against" line in the header comment of
 *   prompts/sovitech-ai-system.md, and any other such line in it;
 * - every "Checked against" line of .claude/skills/<name>/SKILL.md and
 *   .claude/agents/*.md. A project skill must carry one; a third-party skill
 *   recorded in skills-lock.json is only checked when it has one.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fail, listFiles, pass } from '../lib';
import type { CheckResult } from '../types';

export const NAME = 'version-sync';

export interface VersionSyncLayout {
  /** Absolute directory the paths below are relative to. */
  readonly root: string;
  readonly guardrails: string;
  /** CLAUDE.md. */
  readonly instructions: string;
  /** prompts/sovitech-ai-system.md. */
  readonly prompt: string;
  readonly skillFiles: readonly string[];
  readonly agentFiles: readonly string[];
  /** skills-lock.json, which names the third-party skills. */
  readonly skillsLock?: string;
  readonly label?: string;
}

/** The layout of this repository. */
export function repositoryLayout(root: string, skillFiles: readonly string[] = [], agentFiles: readonly string[] = []): VersionSyncLayout {
  return {
    root,
    guardrails: 'docs/guardrails.md',
    instructions: 'CLAUDE.md',
    prompt: 'prompts/sovitech-ai-system.md',
    skillFiles,
    agentFiles,
    skillsLock: 'skills-lock.json',
  };
}

/** Lists the repository's skill and agent files, then builds its layout. */
export async function discoverRepositoryLayout(root: string): Promise<VersionSyncLayout> {
  const skillFiles = await listFiles('.claude/skills/*/SKILL.md', { cwd: root });
  const agentFiles = await listFiles('.claude/agents/*.md', { cwd: root });
  return repositoryLayout(root, skillFiles, agentFiles);
}

const VERSION_LINE = /^\*\*Version:\*\*\s*v?(\d+\.\d+)\b/;
const CHECKED_AGAINST = /Checked against:?\s*`?docs\/guardrails\.md`?,?\s*v?(\d+\.\d+)\b/i;
const MENTION = /checked against/i;
/** The version must sit in the file's opening lines. */
const HEADER_LINES = 20;

/** The MAJOR.MINOR version stated at the top of docs/guardrails.md, if any. */
export function readGuardrailsVersion(text: string): string | undefined {
  const found = text
    .split('\n')
    .slice(0, HEADER_LINES)
    .map((line) => VERSION_LINE.exec(line.trim())?.[1])
    .filter((version): version is string => version !== undefined);
  return found.length === 1 ? found[0] : undefined;
}

/** Every "Checked against" line, with its one-based line number; lines that mention it but cannot be read. */
export function readCheckedAgainst(text: string): { lines: Array<{ line: number; version: string }>; unreadable: number[] } {
  const lines: Array<{ line: number; version: string }> = [];
  const unreadable: number[] = [];
  text.split('\n').forEach((content, position) => {
    if (!MENTION.test(content)) return;
    const version = CHECKED_AGAINST.exec(content)?.[1];
    if (version === undefined) unreadable.push(position + 1);
    else lines.push({ line: position + 1, version });
  });
  return { lines, unreadable };
}

/** The line span of the HTML comment the file opens with, if it opens with one. */
export function headerComment(text: string): { firstLine: number; lastLine: number } | undefined {
  const body = text.replace(/^\uFEFF/, '');
  const leading = /^\s*/.exec(body)?.[0] ?? '';
  if (!body.startsWith('<!--', leading.length)) return undefined;
  const end = body.indexOf('-->', leading.length);
  if (end < 0) return undefined;
  const lineAt = (index: number): number => body.slice(0, index).split('\n').length;
  return { firstLine: lineAt(leading.length), lastLine: lineAt(end) };
}

function readThirdPartySkills(root: string, lock: string | undefined): Set<string> {
  if (lock === undefined || !existsSync(join(root, lock))) return new Set();
  const data = JSON.parse(readFileSync(join(root, lock), 'utf8')) as { skills?: Record<string, unknown> };
  return new Set(Object.keys(data.skills ?? {}));
}

export async function checkVersionSync(layout: VersionSyncLayout): Promise<CheckResult> {
  const prefix = layout.label === undefined ? '' : `[${layout.label}] `;
  const problems: string[] = [];
  const notes: string[] = [];
  const read = (path: string): string | undefined => {
    const full = join(layout.root, path);
    if (!existsSync(full)) {
      problems.push(`${path}: missing`);
      return undefined;
    }
    return readFileSync(full, 'utf8');
  };

  const guardrailsText = read(layout.guardrails);
  if (guardrailsText === undefined) return fail(NAME, `${prefix}cannot read ${layout.guardrails}`, problems);
  const version = readGuardrailsVersion(guardrailsText);
  if (version === undefined) {
    return fail(NAME, `${prefix}no single "**Version:** MAJOR.MINOR" line in the first ${HEADER_LINES} lines of ${layout.guardrails}`, [
      `${layout.guardrails}: the version line is missing or repeated near the top`,
    ]);
  }

  /** Checks one file's lines; returns how many lines it carries. */
  const checkLines = (path: string, text: string): number => {
    const { lines, unreadable } = readCheckedAgainst(text);
    for (const line of unreadable) {
      problems.push(`${path}:${line}: a "Checked against" line whose version cannot be read (write "Checked against: docs/guardrails.md v${version}")`);
    }
    for (const { line, version: stated } of lines) {
      if (stated !== version) problems.push(`${path}:${line}: checked against v${stated}, but ${layout.guardrails} is v${version}`);
    }
    return lines.length + unreadable.length;
  };

  const instructions = read(layout.instructions);
  if (instructions !== undefined && checkLines(layout.instructions, instructions) === 0) {
    problems.push(`${layout.instructions}: no "Checked against: docs/guardrails.md v${version}" line`);
  }

  const prompt = read(layout.prompt);
  if (prompt !== undefined) {
    checkLines(layout.prompt, prompt);
    const header = headerComment(prompt);
    const inHeader = readCheckedAgainst(prompt).lines.filter(
      (line) => header !== undefined && line.line >= header.firstLine && line.line <= header.lastLine,
    );
    if (header === undefined) {
      problems.push(`${layout.prompt}: does not open with a header comment holding "Checked against: docs/guardrails.md v${version}"`);
    } else if (inHeader.length === 0) {
      problems.push(`${layout.prompt}:${header.firstLine}: the header comment has no "Checked against: docs/guardrails.md v${version}" line`);
    }
  }

  const thirdParty = readThirdPartySkills(layout.root, layout.skillsLock);
  for (const path of layout.skillFiles) {
    const text = read(path);
    if (text === undefined) continue;
    const skill = basename(dirname(path));
    if (checkLines(path, text) > 0) continue;
    if (thirdParty.has(skill)) {
      notes.push(`note: ${path} has no "Checked against" line; ${skill} is a third-party skill recorded in ${layout.skillsLock ?? 'skills-lock.json'}`);
    } else {
      problems.push(`${path}: a project skill without "Checked against: docs/guardrails.md v${version}" (build-readiness 2, "Principles")`);
    }
  }
  for (const path of layout.agentFiles) {
    const text = read(path);
    if (text !== undefined) checkLines(path, text);
  }

  const scope = `${layout.instructions}, ${layout.prompt} header, ${layout.skillFiles.length} skills, ${layout.agentFiles.length} agents`;
  if (problems.length > 0) {
    return fail(NAME, `${prefix}${problems.length} version lines differ from ${layout.guardrails} v${version} or are missing (${scope})`, [
      ...problems,
      ...notes,
    ]);
  }
  const thirdPartyNote = notes.length > 0 ? `; ${notes.length} third-party skills carry no line` : '';
  return pass(NAME, `${prefix}every version line states v${version}, as ${layout.guardrails} does (${scope}${thirdPartyNote})`, notes);
}
