import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Building2, Globe, Pencil } from 'lucide-react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Button } from './Button';
import { ChoiceCard, ChoiceGroup, Choice } from './Choice';
import { FieldError } from './FieldError';
import { SelectField } from './SelectField';
import { TextField } from './TextField';
import { Value } from './Value';
import type { DisplayObject } from '@sovitech/view-model/browser';

afterEach(cleanup);

describe('US-INTAKE-01 AC3 · AC6 · G7-6 · rule 7: buttons are never disabled', () => {
  test('US-INTAKE-01 AC3 · G7-6: a real button of type "button", with no disabled state, marked as an action label', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" size="wizard" onClick={onClick}>
        TEST continue
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'TEST continue' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('data-variant')).toBe('primary');
    expect(button.getAttribute('data-copy-kind')).toBe('action-label');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('US-INTAKE-01 AC6: icons are decorative and hidden from assistive technology', () => {
    render(
      <Button variant="secondary" size="wizard" icon={Building2}>
        TEST back
      </Button>,
    );
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(['16', '24', '32']).toContain(svg?.getAttribute('width'));
  });
});

describe('US-INTAKE-02 · US-INTAKE-03 · G7-6: step 1 fields with inline errors', () => {
  test('US-INTAKE-02 AC2 · G7-6: an empty required field shows its inline error, tied to the field, which is marked invalid; the browser never blocks the form itself', () => {
    render(<TextField label="TEST name" value="" onChange={vi.fn()} required error="TEST fill in this field" />);
    const input = screen.getByLabelText('TEST name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.hasAttribute('required')).toBe(false);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('TEST fill in this field');
  });

  test('US-INTAKE-02: typing hands back the new text; the label stays visible with the inside placement', () => {
    const onChange = vi.fn();
    render(<TextField label="TEST city" labelPlacement="inside" icon={Globe} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('TEST city'), { target: { value: 'TEST town' } });
    expect(onChange).toHaveBeenCalledWith('TEST town');
    expect(screen.getByText('TEST city').tagName).toBe('LABEL');
  });

  test('rule 2 "character counters": the counter reads the field\'s own length against its maxlength, marked for the render allowlist', () => {
    render(<TextField label="TEST note" value="abcd" onChange={vi.fn()} maxLength={40} showCounter />);
    const input = screen.getByLabelText('TEST note');
    const counter = document.querySelector('[data-render-allow="character-counter"]');
    expect(counter?.textContent?.replace(/\s+/gu, ' ')).toBe('4 / 40');
    expect(counter?.getAttribute('data-counter-for')).toBe(input.id);
  });

  test('US-INTAKE-03 AC1 · rule 3: the country select offers an empty first choice, so nothing is preselected', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="TEST country"
        placeholder="TEST choose"
        options={[
          { value: 'RO', label: 'TEST Romania' },
          { value: 'BG', label: 'TEST Bulgaria' },
        ]}
        value=""
        onChange={onChange}
        error="TEST fill in this field"
      />,
    );
    const select = screen.getByLabelText<HTMLSelectElement>('TEST country');
    expect(select.value).toBe('');
    expect(select.options[0]?.textContent).toBe('TEST choose');
    fireEvent.change(select, { target: { value: 'RO' } });
    expect(onChange).toHaveBeenCalledWith('RO');
    expect(select.getAttribute('aria-invalid')).toBe('true');
  });

  test('G7-6: an error message is fixed copy and holds no number', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<FieldError id="TEST-error" message="TEST 12" />)).toThrow(/no number/u);
    quiet.mockRestore();
  });
});

describe('prompt 3 section 11 · onboarding-spec 2.5: card radios and checkboxes are real inputs', () => {
  test('US-INTAKE-02 AC4: a radio card is a real radio named by its title, described by its description, in a named group', () => {
    const onChange = vi.fn();
    render(
      <ChoiceGroup legend="TEST project type" hint="TEST why">
        <ChoiceCard type="radio" name="TEST-type" value="new" checked={false} onChange={onChange} title="TEST new" description="TEST new description" indicator="bottom-center" />
        <ChoiceCard type="radio" name="TEST-type" value="old" checked={false} onChange={vi.fn()} title="TEST old" />
      </ChoiceGroup>,
    );
    expect(screen.getByRole('group', { name: 'TEST project type' })).toBeTruthy();
    const radio = screen.getByRole('radio', { name: 'TEST new' });
    expect(radio.tagName).toBe('INPUT');
    expect(radio.getAttribute('type')).toBe('radio');
    const describedBy = radio.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('TEST new description');
    expect(screen.getAllByRole('radio').every((input) => input.getAttribute('name') === 'TEST-type')).toBe(true);
    expect(screen.getAllByRole('radio').every((input) => !(input as HTMLInputElement).checked)).toBe(true);
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('US-SCOPE-02 · US-INTAKE-09: a checkbox card reports its checked state natively, and the extra content describes it', () => {
    const onChange = vi.fn();
    render(
      <ChoiceCard type="checkbox" name="TEST-scope" value="hvac" checked onChange={onChange} title="TEST hvac" extra={<span>TEST detection</span>} />,
    );
    const box = screen.getByRole<HTMLInputElement>('checkbox', { name: 'TEST hvac' });
    expect(box.checked).toBe(true);
    const describedBy = box.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('TEST detection');
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test('prompt 3 section 11: a plain choice is a labelled real input', () => {
    render(<Choice type="checkbox" name="TEST-plain" value="a" checked={false} onChange={vi.fn()} label="TEST plain" />);
    expect(screen.getByRole('checkbox', { name: 'TEST plain' }).tagName).toBe('INPUT');
  });
});

describe('DR-24 · WCAG 1.4.1: a link-variant button with no icon is underlined, so it never reads as static text', () => {
  test('DR-24: a link with no icon is marked data-icon="false" (ui.css underlines it at a 3px offset); a link with an icon keeps the icon as its cue', () => {
    render(
      <>
        <Button variant="link">TEST looks right</Button>
        <Button variant="link" icon={Pencil}>
          TEST edit
        </Button>
        <Button variant="primary" trailingIcon={Globe}>
          TEST next
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'TEST looks right' }).getAttribute('data-icon')).toBe('false');
    expect(screen.getByRole('button', { name: 'TEST edit' }).getAttribute('data-icon')).toBe('true');
    expect(screen.getByRole('button', { name: 'TEST next' }).getAttribute('data-icon')).toBe('true');
  });
});

describe('DR-2 · DR-18 · DR-26: selectable cards on steps 4 to 7 (phase 3 design review)', () => {
  const DECISION: DisplayObject = {
    valueId: 'project:0192f000-0000-7000-8000-000000000001.systems.hvac',
    kind: 'field',
    text: 'TEST included',
    shape: 'value',
    badge: { id: 'provided_by_you', label: 'Provided by you' },
    measure: { label: 'TEST hvac' },
  };

  test('DR-2 · 2.8 "Prominence": the status slot sits on the top row beside the icon, holds the served value with its text and badge, and describes the input', () => {
    const { container } = render(
      <ChoiceCard
        type="checkbox"
        name="TEST-scope"
        value="hvac"
        checked
        onChange={vi.fn()}
        title="TEST hvac"
        description="TEST hvac description"
        icon={Building2}
        status={<Value display={DECISION} layout="compact" label={null} />}
      />,
    );
    const card = container.querySelector('.sov-choice-card');
    expect(card?.getAttribute('data-status')).toBe('true');
    const top = container.querySelector('.sov-choice-card__top');
    expect([...(top?.children ?? [])].map((child) => child.getAttribute('class'))).toEqual(['lucide lucide-building-complex lucide-building-2 sov-icon', 'sov-choice-card__status', 'sov-check']);
    const status = top?.querySelector('.sov-choice-card__status');
    expect(status?.querySelector('.sov-value__line .sov-value__text')?.textContent).toBe('TEST included');
    expect(status?.querySelector('.sov-value__line [data-copy-kind="badge"]')?.textContent).toBe('Provided by you');
    const box = screen.getByRole('checkbox', { name: 'TEST hvac' });
    const described = (box.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['TEST includedProvided by you', 'TEST hvac description']);
    expect(container.querySelector('.sov-choice-card__extra')).toBeNull();
  });

  test('DR-2: a card with no status has no slot; on a tile and a pill (too narrow beside an icon and a control) the status takes its own row under the title, text and badge together', () => {
    const { container } = render(
      <>
        <ChoiceCard type="radio" name="TEST-a" value="a" checked={false} onChange={vi.fn()} title="TEST plain" icon={Building2} />
        <ChoiceCard type="radio" name="TEST-b" value="b" checked onChange={vi.fn()} title="TEST pill" icon={Building2} shape="pill" status={<Value display={DECISION} layout="compact" label={null} />} />
        <ChoiceCard type="radio" name="TEST-c" value="c" checked onChange={vi.fn()} title="TEST tile" icon={Building2} shape="tile" status={<Value display={DECISION} layout="compact" label={null} />} />
      </>,
    );
    const [plain, pill, tile] = [...container.querySelectorAll('.sov-choice-card')];
    expect(plain?.getAttribute('data-status')).toBe('false');
    expect(plain?.querySelector('.sov-choice-card__status')).toBeNull();
    const childrenOf = (card: Element | undefined) => [...(card?.children ?? [])].map((child) => child.getAttribute('class')?.split(' ').at(-1));
    // A pill: icon, title and control on the first row (ui.css: three grid columns), the status on the second, under the title.
    expect(childrenOf(pill)).toEqual(['sov-icon', 'sov-choice-card__title', 'sov-check', 'sov-choice-card__status']);
    // A tile: the top row keeps the icon and the control; the status follows the title.
    expect(childrenOf(tile)).toEqual(['sov-choice-card__top', 'sov-choice-card__title', 'sov-choice-card__status']);
    for (const card of [pill, tile]) {
      expect(card?.getAttribute('data-status')).toBe('true');
      const line = card?.querySelector('.sov-choice-card__status .sov-value__line');
      expect([...(line?.children ?? [])].map((child) => child.className)).toEqual(['sov-value__text', 'sov-badge']);
    }
  });

  test('DR-18: a question\'s legend takes the group or question label role', () => {
    const { container } = render(
      <ChoiceGroup legend="TEST question">
        <ChoiceCard type="radio" name="TEST-q" value="a" checked={false} onChange={vi.fn()} title="TEST a" />
      </ChoiceGroup>,
    );
    expect(container.querySelector('legend')?.className).toBe('sov-choice-group__legend sov-heading-group');
  });

  test('DR-26 · ADR 0035: a tall card draws its icon at 32px (the render limit); tiles, pills and inputs at 24px', () => {
    const { container } = render(
      <>
        <ChoiceCard type="checkbox" name="TEST-t" value="t" checked={false} onChange={vi.fn()} title="TEST tall" icon={Building2} />
        <ChoiceCard type="radio" name="TEST-u" value="u" checked={false} onChange={vi.fn()} title="TEST tile" icon={Building2} shape="tile" />
        <ChoiceCard type="radio" name="TEST-v" value="v" checked={false} onChange={vi.fn()} title="TEST pill" icon={Building2} shape="pill" />
        <TextField label="TEST name" value="" onChange={vi.fn()} icon={Globe} />
      </>,
    );
    const sizes = [...container.querySelectorAll('svg.sov-icon')].map((svg) => [svg.getAttribute('data-size'), svg.getAttribute('width')]);
    expect(sizes).toEqual([
      ['large', '32'],
      ['default', '24'],
      ['default', '24'],
      ['default', '24'],
    ]);
  });
});
