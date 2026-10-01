import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../../test/harness';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CANDIDATE = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e93';
const SUBJECT = PROJECT;

function answer(key: string, text: string, input: NonNullable<Extract<NonNullable<DisplayObject['actions']>[number], { kind: 'edit' }>['input']>): DisplayObject {
  return {
    valueId: `project:${PROJECT}.${key}`,
    kind: 'field',
    text,
    shape: 'value',
    badge: { id: 'provided_by_you', label: 'TEST provided badge' },
    field: { subjectId: SUBJECT, fieldKey: `project.${key}` },
    actions: [{ kind: 'edit', field: { subjectId: SUBJECT, fieldKey: `project.${key}` }, input, shownCandidateIds: [CANDIDATE] }],
  };
}

function stepOne(cityText: string) {
  const displays = [
    answer('type', 'TEST renovation', { kind: 'choice', options: ['new_construction', 'renovation', 'existing_building', 'bms_modernization'] }),
    answer('country', 'TEST country', { kind: 'choice', options: ['RO', 'BG'] }),
    answer('city', cityText, { kind: 'text', maxLength: 120 }),
  ];
  const withName = envelope(PROJECT, displays);
  return {
    ...withName,
    view: { step: 1, name: `project:${PROJECT}.name`, projectType: `project:${PROJECT}.type`, country: `project:${PROJECT}.country`, city: `project:${PROJECT}.city` },
  };
}

describe('US-INTAKE-21 AC2 · US-INTAKE-02 AC6 · R-009: step 1 of an existing project', () => {
  it('R-009 "Until decided" · rule 5: the four stored answers show through the value component with their badges, and none is asked again', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => json(200, stepOne('TEST city')),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/1`);
    const city = await screen.findByText('TEST city');
    expect(city.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.city`);
    expect(document.querySelector(`main [data-value-id="project:${PROJECT}.name"]`)).not.toBeNull();
    expect(screen.getAllByText('TEST provided badge').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('Skip for now')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    // The header shows the stored name, bound.
    expect(document.querySelector(`header [data-value-id="project:${PROJECT}.name"]`)?.textContent).toBe('TEST project');
  });

  it('F-VALUE-05 · rule 4 · G4-5: Edit then Save sends the owner\'s answer with the candidates the screen showed as `corrects`, and the step reads its view again', async () => {
    let city = 'TEST city';
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => json(200, stepOne(city)),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`POST /api/projects/${PROJECT}/fields/edit`]: () => {
        city = 'TEST other city';
        return json(200, { displayObjects: [] });
      },
    });
    renderAt(`/projects/${PROJECT}/steps/1`);
    await screen.findByText('TEST city');
    const edits = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(edits[edits.length - 1] as HTMLElement);
    const field = screen.getByRole('textbox', { name: 'City' });
    expect((field as HTMLInputElement).value).toBe('TEST city');
    fireEvent.change(field, { target: { value: 'TEST other city' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('TEST other city')).toBeTruthy();
    const edit = seen.find((request) => request.path === `/api/projects/${PROJECT}/fields/edit`);
    expect(edit?.body).toEqual({
      field: { subjectId: SUBJECT, fieldKey: 'project.city' },
      value: { kind: 'text', text: 'TEST other city' },
      corrects: [CANDIDATE],
    });
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });

  it('US-INTAKE-01 AC3 · R-008: Next is never disabled, sends an empty step, and opens step 2', async () => {
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => json(200, stepOne('TEST city')),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`POST /api/projects/${PROJECT}/steps/1/continue`]: () => json(200, { nextStep: 2, displayObjects: [] }),
    });
    const { router } = renderAt(`/projects/${PROJECT}/steps/1`);
    await screen.findByText('TEST city');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/2`));
    const next = seen.find((request) => request.path.endsWith('/steps/1/continue'));
    expect(next?.body).toEqual({ answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } });
  });

  it('DR-12 · DR-9: while the answers load, the three questions keep their places at the form width with one "Loading your answers" line and no answer', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/1`);
    const line = await screen.findByText('Loading your answers');
    expect(line.closest('.max-w-\\[880px\\]')).not.toBeNull();
    for (const question of ['Project name', 'What type of project is this?', 'Where is the building located?']) expect(screen.getByText(question).classList.contains('sov-heading-group')).toBe(true);
    expect(document.querySelector('main [data-value-id]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('US-INTAKE-01 AC8 · GS-1: while a step of the demo project loads or fails to load, the demo line is on screen', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST demo hotel', demo: true }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => json(500, { code: 'internal_error' }),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/1`);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByText('TEST demo line')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(false);
  });
});

describe('A-1 · rule 4 · rule 7: one request per press on an existing project\'s step 1', () => {
  function heldApi(extra: Readonly<Record<string, Handler>>) {
    return installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/1`]: () => json(200, stepOne('TEST city')),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      ...extra,
    });
  }

  it('A-1 · rule 4 · rule 7: Save in the inline editor pressed twice before the page renders again sends one correction; Save shows aria-busy while it is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = heldApi({ [`POST /api/projects/${PROJECT}/fields/edit`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/1`);
    await screen.findByText('TEST city');
    const edits = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(edits[edits.length - 1] as HTMLElement);
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST other city' } });
    const save = screen.getByRole('button', { name: 'Save' });
    pressTwice(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(save.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(save);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/edit')).toBe(2));
  });

  it('A-1 · rule 7: Next pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = heldApi({ [`POST /api/projects/${PROJECT}/steps/1/continue`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/1`);
    await screen.findByText('TEST city');
    const next = screen.getByRole('button', { name: 'Next' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/1/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('This step could not be saved. Your other answers are kept. Try again.');
    expect(next.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/1/continue')).toBe(2));
  });
});
