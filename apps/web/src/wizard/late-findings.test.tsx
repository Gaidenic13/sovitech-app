import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { SessionProvider } from '../session/SessionProvider';
import { AS_OF, PROJECT, installFakeApi, json, projectList } from '../test/harness';
import { WizardProvider, useWizard } from './WizardProvider';
import { WizardStepper } from './WizardStepper';
import { Notice, NoticeRegion } from '@sovitech/ui';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const LEFT_STEP_3 = '2026-09-30T09:00:00.000Z';
const NOTICE: DisplayObject = { valueId: `project:${PROJECT}.lateFindings.notice`, kind: 'line', text: 'TEST notice with a count', shape: 'value' };

/** The owner left step 3 (its view's asOf in the ledger) and is on step 6. */
function OnStepSix() {
  const { leave, enterStep, notice, dismissNotice } = useWizard();
  useEffect(() => {
    leave(3, LEFT_STEP_3);
    enterStep(6);
    return () => enterStep(null);
  }, [leave, enterStep]);
  return (
    <>
      <WizardStepper step={6} />
      <NoticeRegion label="TEST notices">{notice === null ? null : <Notice display={notice.display} dismissLabel="TEST dismiss" onDismiss={dismissNotice} />}</NoticeRegion>
      <p>TEST step six answers</p>
    </>
  );
}

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT}/steps/6`]}>
      <SessionProvider>
        <WizardProvider projectId={PROJECT}>
          <OnStepSix />
        </WizardProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('G7-4 · US-INTAKE-19 · US-INTAKE-01 AC7 · F-QUESTION-09: late findings never interrupt (web half)', () => {
  it('G7-4 · US-INTAKE-19 AC1, AC3: a finding on step 3 while the owner is on step 6 gives step 3 a dot and one quiet notice; no dialog opens and the owner stays on step 6', async () => {
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [NOTICE], dots: [3], notice: NOTICE.valueId }),
    });
    renderWizard();

    const notice = await screen.findByText('TEST notice with a count');
    // The notice's count is bound to its served value id, in the one polite region.
    expect(notice.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(NOTICE.valueId);
    expect(notice.closest('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    // Step 3 carries the dot, described for assistive technology; step 6 is the current step.
    const items = document.querySelectorAll('[data-render-stepper="wizard-step-number"] > li');
    expect(items).toHaveLength(8);
    expect(items[2]?.getAttribute('data-dot')).toBe('true');
    expect(items[2]?.getAttribute('data-state')).toBe('done');
    expect(items[5]?.getAttribute('aria-current')).toBe('step');
    expect(items[5]?.getAttribute('data-dot')).toBe('false');
    // Nothing interrupts: no dialog, no alert dialog, the step's content is still on screen.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('TEST step six answers')).toBeTruthy();
    // The ledger went out: the step on screen and the left step with the time it was left.
    const poll = seen.find((request) => request.path === `/api/projects/${PROJECT}/late-findings`);
    expect(poll?.url.searchParams.get('current')).toBe('6');
    expect(poll?.url.searchParams.getAll('left')).toEqual([`3@${LEFT_STEP_3}`]);
  });

  it('G7-4 · US-INTAKE-19 AC4: the notice is one notice the owner may dismiss; the dot stays on its step', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [NOTICE], dots: [3], notice: NOTICE.valueId }),
    });
    renderWizard();
    await screen.findByText('TEST notice with a count');
    expect(screen.getAllByText('TEST notice with a count')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'TEST dismiss' }));
    expect(screen.queryByText('TEST notice with a count')).toBeNull();
    expect(document.querySelectorAll('[data-render-stepper="wizard-step-number"] > li')[2]?.getAttribute('data-dot')).toBe('true');
  });

  it('ADR 0039: the ledger is polled again while the step is on screen, sending the previous answer as `since`', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderWizard();
    await waitFor(() => expect(seen.filter((request) => request.path.endsWith('/late-findings'))).toHaveLength(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await waitFor(() => expect(seen.filter((request) => request.path.endsWith('/late-findings')).length).toBeGreaterThanOrEqual(2));
    const second = seen.filter((request) => request.path.endsWith('/late-findings'))[1];
    expect(second?.url.searchParams.get('since')).toBe(AS_OF);
  });
});
