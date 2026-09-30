/**
 * The in-app AI's system prompt, loaded at run time from prompts/sovitech-ai-system.md
 * (prompt 3 section 2, row 10, and section 6: "packages/ai ... loads
 * prompts/sovitech-ai-system.md"). The file is never copied into code, so a change to
 * it reaches the model and changes the prompt hash the eval results record
 * (tools/checks/index/eval-runs.ts), which makes the evals run again (CLAUDE.md,
 * definition of done item 2).
 *
 * The leading HTML comment (the file's purpose and its "Checked against" line for the
 * version-sync check) is for developers and is not sent.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Root-relative path of the system prompt. */
export const SYSTEM_PROMPT_FILE = 'prompts/sovitech-ai-system.md';

export interface SystemPrompt {
  /** The text sent as the system prompt. */
  readonly text: string;
  /** Root-relative path it was read from. */
  readonly path: string;
}

export class SystemPromptError extends Error {
  override name = 'SystemPromptError';
}

/** The prompt text without its leading developer comment. */
export function promptBody(raw: string): string {
  const text = raw.replace(/^\uFEFF/, '').trimStart();
  if (!text.startsWith('<!--')) return text.trim();
  const end = text.indexOf('-->');
  if (end < 0) throw new SystemPromptError(`${SYSTEM_PROMPT_FILE}: the leading comment is not closed`);
  return text.slice(end + '-->'.length).trim();
}

/** Reads the system prompt under `root` (the repository root). Throws when it is missing or empty. */
export function loadSystemPrompt(root: string): SystemPrompt {
  const text = promptBody(readFileSync(join(root, SYSTEM_PROMPT_FILE), 'utf8'));
  if (text === '') throw new SystemPromptError(`${SYSTEM_PROMPT_FILE} holds no prompt text`);
  return Object.freeze({ text, path: SYSTEM_PROMPT_FILE });
}
