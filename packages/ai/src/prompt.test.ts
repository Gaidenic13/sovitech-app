/** The system prompt is loaded at run time from prompts/sovitech-ai-system.md, without its developer comment. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT_FILE, SystemPromptError, loadSystemPrompt, promptBody } from './prompt';

describe('loadSystemPrompt', () => {
  it('F-EXTRACT-02: reads the prompt file as it is on disk, minus the leading comment', () => {
    const prompt = loadSystemPrompt(REPO_ROOT);
    const raw = readFileSync(join(REPO_ROOT, SYSTEM_PROMPT_FILE), 'utf8');
    expect(prompt.path).toBe(SYSTEM_PROMPT_FILE);
    expect(prompt.text.startsWith('<!--')).toBe(false);
    expect(prompt.text).not.toContain('Checked against');
    expect(raw).toContain(prompt.text);
    expect(prompt.text).toContain('`verifications` and `pricingStage`');
  });

  it('F-EXTRACT-02: refuses an unclosed comment', () => {
    expect(() => promptBody('<!-- never closed\nYou work inside')).toThrow(SystemPromptError);
  });

  it('F-EXTRACT-02: keeps a prompt that has no comment', () => {
    expect(promptBody('﻿TEST prompt\n')).toBe('TEST prompt');
  });
});
