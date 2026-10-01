import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, heldHandler, installFakeApi, json, pressTwice, renderAt, sentTo, settle } from '../../test/harness';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function next() {
  return screen.getByRole('button', { name: 'Next' });
}

describe('US-INTAKE-02 · US-INTAKE-03 · F-QUESTION-05: step 1 of a new project (OB-1)', () => {
  it('G7-6 · US-INTAKE-02 AC2 · US-ADMIN-05 AC3: Next with the four fields empty shows an inline error on each, stays enabled, and creates no project', async () => {
    const seen = installFakeApi({});
    renderAt('/projects/new');
    await screen.findByRole('textbox', { name: 'Project name' });
    fireEvent.click(next());
    await screen.findAllByText('Fill in this field to create the project.');
    expect(screen.getAllByText('Fill in this field to create the project.')).toHaveLength(2);
    expect(screen.getByText('Choose a project type to create the project.')).toBeTruthy();
    expect(screen.getByText('Choose a country to create the project.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Project name' }).getAttribute('aria-invalid')).toBe('true');
    expect(next().hasAttribute('disabled')).toBe(false);
    expect(next().getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(next());
    expect(seen.some((request) => request.method === 'POST' && request.path === '/api/projects')).toBe(false);
  });

  it('G7-6: one field left empty is the only one with an error, and still nothing is sent', async () => {
    const seen = installFakeApi({});
    renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'TEST project' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    fireEvent.click(next());
    expect(await screen.findByText('Fill in this field to create the project.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'City' }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'Project name' }).getAttribute('aria-invalid')).toBeNull();
    expect(seen.some((request) => request.method === 'POST' && request.path === '/api/projects')).toBe(false);
  });

  it('US-INTAKE-02 AC1, AC4: three questions, no "Skip for now", no project type preselected, no Back; country before city (section 5)', async () => {
    installFakeApi({});
    renderAt('/projects/new');
    await screen.findByRole('textbox', { name: 'Project name' });
    expect(screen.queryByText('Skip for now')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => (radio as HTMLInputElement).checked)).toEqual([false, false, false, false]);
    expect(within(screen.getByRole('group', { name: 'What type of project is this?' })).getAllByRole('radio')).toHaveLength(4);
    const country = screen.getByRole('combobox', { name: 'Country' });
    const city = screen.getByRole('textbox', { name: 'City' });
    expect(country.compareDocumentPosition(city) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((country as HTMLSelectElement).value).toBe('');
  });

  it('US-INTAKE-03 AC3 · ADR 0039: changing the country clears the typed city', async () => {
    installFakeApi({});
    renderAt('/projects/new');
    const country = await screen.findByRole('combobox', { name: 'Country' });
    fireEvent.change(country, { target: { value: 'RO' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
    fireEvent.change(country, { target: { value: 'BG' } });
    expect((screen.getByRole('textbox', { name: 'City' }) as HTMLInputElement).value).toBe('');
  });

  it('US-INTAKE-02 AC3 · G7-6: with all four filled, Next sends them once and step 2 opens', async () => {
    const seen = installFakeApi({
      'POST /api/projects': () => json(201, { projectId: PROJECT, nextStep: 2 }),
    });
    const { router } = renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: '  TEST project  ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Existing building' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
    fireEvent.click(next());
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/2`));
    const creates = seen.filter((request) => request.method === 'POST' && request.path === '/api/projects');
    expect(creates).toHaveLength(1);
    expect(creates[0]?.body).toEqual({ name: 'TEST project', projectType: 'existing_building', countryCode: 'RO', city: 'TEST city' });
    expect(creates[0]?.headers.get('csrf-token')).toBe('TEST-token');
  });

  it('G7-6: when the API names an empty required field, that field shows its inline error and the page stays on step 1', async () => {
    installFakeApi({
      'POST /api/projects': () => json(422, { code: 'required_fields_missing', fields: ['city'] }),
    });
    const { router } = renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'TEST project' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'City' }).getAttribute('aria-invalid')).toBe('true'));
    expect(router.state.location.pathname).toBe('/projects/new');
    expect(next().hasAttribute('disabled')).toBe(false);
  });

  it('G2-13 · A-8 · G7-6: a name the API refuses for a direction control (422 answer_invalid) shows the inline error on that field, keeps the form as typed and creates nothing', async () => {
    installFakeApi({ 'POST /api/projects': () => json(422, { code: 'answer_invalid' }) });
    const { router } = renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'TEST \u202Eeman' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Project name' }).getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText('This answer could not be read. Check it and save again.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'City' }).getAttribute('aria-invalid')).toBeNull();
    expect(router.state.location.pathname).toBe('/projects/new');
  });

  it('DR-9 · DR-18 · onboarding-spec 2.4: the form and its footer share the drawn form width, and both questions\' legends take the group heading role', async () => {
    installFakeApi({});
    renderAt('/projects/new');
    const form = (await screen.findByRole('textbox', { name: 'Project name' })).closest('form') as HTMLElement;
    expect(form.classList.contains('max-w-[880px]')).toBe(true);
    expect(next().closest('.max-w-\\[880px\\]')).not.toBeNull();
    const legends = [...form.querySelectorAll('legend')];
    expect(legends.map((legend) => legend.textContent)).toEqual(['What type of project is this?', 'Where is the building located?']);
    for (const legend of legends) expect(legend.classList.contains('sov-heading-group'), legend.textContent ?? '').toBe(true);
  });
});

describe('A-1 · G7-6 · rule 7: one project per press on a new project\'s step 1', () => {
  it('A-1 · G7-6 · rule 7: Next pressed twice before the page renders again, then Enter in a field, creates one project; Next shows aria-busy while it is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = installFakeApi({ 'POST /api/projects': held.handler });
    renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'TEST project' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    const city = screen.getByRole('textbox', { name: 'City' });
    fireEvent.change(city, { target: { value: 'TEST city' } });
    pressTwice(next());
    fireEvent.submit(city.closest('form') as HTMLFormElement);
    await settle();
    expect(sentTo(seen, 'POST', '/api/projects')).toBe(1);
    expect(next().getAttribute('aria-busy')).toBe('true');
    expect(next().hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('The project could not be created. What you entered is kept. Try again.');
    expect(next().getAttribute('aria-busy')).toBe('false');
    fireEvent.click(next());
    await waitFor(() => expect(sentTo(seen, 'POST', '/api/projects')).toBe(2));
  });

  it('G7-6 · rule 7: Next with a field empty sends nothing and leaves Next taking presses (the guard is released at once)', async () => {
    const seen = installFakeApi({ 'POST /api/projects': () => json(201, { projectId: PROJECT, nextStep: 2 }) });
    const { router } = renderAt('/projects/new');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'TEST project' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    fireEvent.click(next());
    await screen.findByText('Fill in this field to create the project.');
    expect(next().getAttribute('aria-busy')).toBe('false');
    fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
    fireEvent.click(next());
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/2`));
    expect(sentTo(seen, 'POST', '/api/projects')).toBe(1);
  });
});
