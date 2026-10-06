import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { InspectorLayout, PageHeader, StatusFooter, WorkspaceFrame } from './frame';
import { SideNav, type SideNavItem } from './SideNav';
import { STAGE, STILL_READING } from './test-displays';
import { Value } from './Value';
import { ChipGroup, InlinePanel, Inspector, MenuButton, Pager, Switch, Tabs } from './workspace';

afterEach(cleanup);

function quietly(run: () => void): void {
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    run();
  } finally {
    quiet.mockRestore();
  }
}

/** Rule 7 and the e2e "no dialog" rule: nothing the kit draws is a dialog, traps focus or is disabled. */
function expectNoDialogOrDisabled(container: HTMLElement): void {
  expect(container.querySelector('[role="dialog"], [role="alertdialog"], dialog, [aria-modal]')).toBeNull();
  expect(container.querySelector('[disabled], [aria-disabled="true"]')).toBeNull();
}

describe('R-052 · US-SCOPE-05 · prompt 3 section 11: the switch', () => {
  test('R-052 · rule 7: a native checkbox with role switch, named, announced by its own checked state, never disabled', () => {
    const onChange = vi.fn();
    const { container } = render(<Switch checked={false} onChange={onChange} label="TEST include HVAC in the scope" />);
    const control = screen.getByRole('switch', { name: 'TEST include HVAC in the scope' });
    expect(control.tagName).toBe('INPUT');
    expect(control.getAttribute('type')).toBe('checkbox');
    expect(control.hasAttribute('aria-checked')).toBe(false);
    expect((control as HTMLInputElement).checked).toBe(false);
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
    expectNoDialogOrDisabled(container);
  });

  test('ADR 0039 decision 11 · rule 7: while a write is on its way the switch says so with aria-busy and stays operable', () => {
    const onChange = vi.fn();
    render(<Switch checked onChange={onChange} label="TEST include HVAC in the scope" busy />);
    const control = screen.getByRole('switch');
    expect(control.getAttribute('aria-busy')).toBe('true');
    expect(control.hasAttribute('disabled')).toBe(false);
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('UD-26 · R-052 · prompt 3 section 11 (keyboard): underline tabs', () => {
  const tabs = [
    { id: 'overview', label: 'TEST overview', panel: <p>TEST overview panel</p> },
    { id: 'points', label: 'TEST points', panel: <p>TEST points panel</p> },
    { id: 'documents', label: 'TEST documents', panel: <p>TEST documents panel</p> },
  ];

  test('UD-26: one tab stop; Right, Left, Home and End move and show the panel; the panel is named by its tab', () => {
    render(<Tabs label="TEST details" tabs={tabs} />);
    const list = screen.getByRole('tablist', { name: 'TEST details' });
    const [overview, points, documents] = within(list).getAllByRole('tab');
    expect(overview?.getAttribute('tabindex')).toBe('0');
    expect(points?.getAttribute('tabindex')).toBe('-1');
    fireEvent.keyDown(overview as HTMLElement, { key: 'ArrowRight' });
    expect(points?.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(points);
    expect(screen.getByRole('tabpanel', { name: 'TEST points' }).textContent).toBe('TEST points panel');
    fireEvent.keyDown(points as HTMLElement, { key: 'End' });
    expect(documents?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(documents as HTMLElement, { key: 'ArrowRight' });
    expect(overview?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(overview as HTMLElement, { key: 'ArrowLeft' });
    expect(documents?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(documents as HTMLElement, { key: 'Home' });
    expect(overview?.getAttribute('aria-selected')).toBe('true');
  });

  test('UD-26: controlled tabs report the choice; a tab that has gone (another row shown) falls back to the first', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Tabs label="TEST details" tabs={tabs} selected="points" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'TEST points' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'TEST documents' }));
    expect(onChange).toHaveBeenCalledWith('documents');
    rerender(<Tabs label="TEST details" tabs={tabs.slice(0, 1)} selected="points" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'TEST overview' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('TEST overview panel');
  });
});

describe('UD-22 · prompt 3 section 11 (keyboard) · rule 7: the menu button', () => {
  const items = (onSelect: () => void) => [
    { id: 'download', label: 'TEST download', onSelect },
    { id: 'replace', label: 'TEST replace', onSelect },
    { id: 'delete', label: 'TEST delete', onSelect },
  ];

  test('UD-22: a click opens the menu and focuses its first item; Down, Up, Home and End move; Escape closes it and returns the focus', () => {
    const { container } = render(<MenuButton label="TEST more actions" items={items(vi.fn())} />);
    const button = screen.getByRole('button', { name: 'TEST more actions' });
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: 'TEST more actions' });
    expect(button.getAttribute('aria-controls')).toBe(menu.id);
    const [first, second, third] = within(menu).getAllByRole('menuitem');
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
    expectNoDialogOrDisabled(container);
  });

  test('UD-22: Down on the button opens at the first item, Up at the last; choosing an item closes the menu and runs it once', () => {
    const onSelect = vi.fn();
    render(<MenuButton label="TEST more actions" items={items(onSelect)} />);
    const button = screen.getByRole('button', { name: 'TEST more actions' });
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    expect(document.activeElement?.textContent).toBe('TEST delete');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('TEST download');
    fireEvent.click(screen.getByRole('menuitem', { name: 'TEST replace' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('UD-22 · WCAG 2.4.11: a press outside or Tab closes the menu; its items are action labels; no item is a number', () => {
    render(
      <>
        <MenuButton label="TEST more actions" items={items(vi.fn())} />
        <button type="button">TEST elsewhere</button>
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'TEST more actions' }));
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.getAttribute('data-copy-kind')).toBe('action-label');
      expect(item.textContent).not.toMatch(/\p{N}/u);
    }
    fireEvent.pointerDown(screen.getByRole('button', { name: 'TEST elsewhere' }));
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'TEST more actions' }));
    fireEvent.keyDown(screen.getAllByRole('menuitem')[0] as HTMLElement, { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('UD-22: the harness form opens with the menu showing and leaves the focus where it is', () => {
    render(<MenuButton label="TEST more actions" items={items(vi.fn())} defaultOpen />);
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('UD-42 · UD-21 · UD-43 · rule 7 ("never blocks"): the inline panel', () => {
  test('UD-42: a region named by its heading, focused when it opens, closed by Escape; never a dialog, nothing trapped', () => {
    const onClose = vi.fn();
    const { container } = render(
      <>
        <InlinePanel heading="TEST delete this document?" onClose={onClose}>
          <button type="button">TEST cancel</button>
        </InlinePanel>
        <button type="button">TEST page control</button>
      </>,
    );
    const region = screen.getByRole('region', { name: 'TEST delete this document?' });
    expect(document.activeElement).toBe(region);
    expect(region.querySelector('h2')?.textContent).toBe('TEST delete this document?');
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    screen.getByRole('button', { name: 'TEST page control' }).focus();
    expect(document.activeElement?.textContent).toBe('TEST page control');
    expectNoDialogOrDisabled(container);
  });

  test('UD-21: with a close label it draws a close button; a heading level fits a titled section', () => {
    const onClose = vi.fn();
    render(
      <InlinePanel heading="TEST upload documents" onClose={onClose} closeLabel="TEST close the upload panel" headingLevel={3}>
        <p>TEST body</p>
      </InlinePanel>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'TEST upload documents' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'TEST close the upload panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('R-017 "Until decided" · proposal 7.2.30: the pager and the chips show no number', () => {
  const pager = { label: 'TEST pages', previousLabel: 'TEST previous', nextLabel: 'TEST next', onPrevious: vi.fn(), onNext: vi.fn() };

  test('R-017: previous and next only, each drawn only where it leads somewhere; no page number; absent with nowhere to go', () => {
    const { container, rerender } = render(<Pager {...pager} hasPrevious={false} hasNext={false} />);
    expect(container.innerHTML).toBe('');
    rerender(<Pager {...pager} hasPrevious={false} hasNext />);
    const nav = screen.getByRole('navigation', { name: 'TEST pages' });
    expect(within(nav).getAllByRole('button').map((button) => button.textContent)).toEqual(['TEST next']);
    rerender(<Pager {...pager} hasPrevious hasNext busy />);
    expect(within(nav).getAllByRole('button').map((button) => button.textContent)).toEqual(['TEST previous', 'TEST next']);
    for (const button of within(nav).getAllByRole('button')) expect(button.getAttribute('aria-busy')).toBe('true');
    expect(nav.textContent).not.toMatch(/\p{N}/u);
    expectNoDialogOrDisabled(container);
  });

  test('R-016 · R-017: category chips are real radios in a named group, one checked, with no count', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup
        label="TEST document category"
        name="category"
        options={[
          { value: 'all', label: 'TEST all documents' },
          { value: 'mep', label: 'TEST MEP' },
        ]}
        value="all"
        onChange={onChange}
      />,
    );
    const group = screen.getByRole('group', { name: 'TEST document category' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => (radio as HTMLInputElement).checked)).toEqual([true, false]);
    fireEvent.click(radios[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith('mep');
    expect(group.textContent).not.toMatch(/\p{N}/u);
  });
});

describe('R-016 · R-066 · dashboards-spec 3.4 "Right inspector": the inspector', () => {
  test('UD-08 · R-080: a region named by its heading (not a complementary landmark or a dialog), with its close, subheading, body and footer; no media slot', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Inspector heading="TEST equipment details" subheading={<span>TEST-AHU-01</span>} closeLabel="TEST close" onClose={onClose} footer={<button type="button">TEST download</button>} id="TEST-inspector">
        <p>TEST body</p>
      </Inspector>,
    );
    const region = screen.getByRole('region', { name: 'TEST equipment details' });
    expect(region.id).toBe('TEST-inspector');
    expect(region.tagName).toBe('SECTION');
    expect(container.querySelector('aside')).toBeNull();
    expect(within(region).getByText('TEST-AHU-01')).toBeTruthy();
    fireEvent.click(within(region).getByRole('button', { name: 'TEST close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(region.querySelector('.sov-inspector__footer')?.textContent).toBe('TEST download');
    expect(region.querySelector('img, canvas, video, object, embed')).toBeNull();
    expectNoDialogOrDisabled(container);
  });
});

describe('DR-8 · ADR 0040 decision 6 · 2.8 "Prominence": a value in the 360px inspector', () => {
  test('DR-8: a two-word value with a long badge sits on the inspector\'s value line, the words in one text with no break inserted, its badge on the same tile', () => {
    const { container } = render(
      <Inspector heading="TEST document details" closeLabel="TEST close" onClose={vi.fn()}>
        <dl>
          <dt>TEST stage</dt>
          <dd>
            <Value display={STAGE} layout="bare" />
          </dd>
        </dl>
      </Inspector>,
    );
    const line = container.querySelector(`[data-value-id="${STAGE.valueId}"] .sov-value__line`);
    // The stylesheet's inspector rule selects this line (flex-wrap: wrap; the text wraps between words: ui-css.test.ts),
    // and the kit inserts nothing that could break a word (no soft hyphen, no zero-width space).
    expect(line?.matches('.sov-inspector .sov-value__line')).toBe(true);
    expect(line?.querySelector('.sov-value__text')?.matches('.sov-inspector .sov-value__text')).toBe(true);
    expect(line?.querySelector('.sov-value__text')?.textContent).toBe('Technical design');
    expect(line?.textContent).not.toMatch(/[\u00ad\u200b]/u);
    expect(line?.querySelector('[data-copy-kind="badge"]')?.textContent).toBe('From document');
  });
});

describe('R-146 · US-ADMIN-13 · ADR 0043 decision 2: the project sidebar\'s page list', () => {
  const items: SideNavItem[] = [
    { id: 'proposal', label: 'TEST proposal', href: '/projects/TEST/proposal', current: false },
    { id: 'documents', label: 'TEST documents', href: '/projects/TEST/documents', current: true },
  ];

  test('R-146 "Until decided": one flat list of links in a named navigation, no group heading, the current page marked', () => {
    const { container } = render(<SideNav label="TEST project pages" items={items} />);
    const nav = screen.getByRole('navigation', { name: 'TEST project pages' });
    expect(nav.querySelectorAll('ul')).toHaveLength(1);
    expect(nav.querySelector('h2, h3, h4, [role="heading"]')).toBeNull();
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/projects/TEST/proposal', '/projects/TEST/documents']);
    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(container.querySelector('[role="tab"], [role="tablist"]')).toBeNull();
  });

  test('ADR 0043: a plain click is handed to the router; a click with a modifier is left to the browser', () => {
    const onNavigate = vi.fn((_item: SideNavItem, event: { preventDefault: () => void }) => event.preventDefault());
    render(<SideNav label="TEST project pages" items={items} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('link', { name: 'TEST proposal' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate.mock.calls[0]?.[0].id).toBe('proposal');
    fireEvent.click(screen.getByRole('link', { name: 'TEST proposal' }), { ctrlKey: true });
    fireEvent.click(screen.getByRole('link', { name: 'TEST proposal' }), { metaKey: true });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('R-139 · ADR 0043 decision 5 · rule 10 · GS-1: the 48px status footer', () => {
  const DEMO = { id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' } as const;

  test('R-139 · US-REVIEW-03 AC1: on the demo, the served demo line first, in full, then "Still reading" bound to its value id', () => {
    const { container } = render(<StatusFooter label="TEST project status" demoLine={DEMO} stillReading={STILL_READING} />);
    const footer = container.querySelector('.sov-status-footer');
    expect(footer?.querySelector('h2')?.textContent).toBe('TEST project status');
    expect(within(footer as HTMLElement).getByRole('note').textContent).toBe('TEST demo line');
    const reading = footer?.querySelector(`[data-value-id="${STILL_READING.valueId}"]`);
    expect(reading?.textContent).toBe(STILL_READING.text);
    const order = [...(footer?.querySelectorAll('[data-demo-line], [data-value-id]') ?? [])].map((element) => (element.hasAttribute('data-demo-line') ? 'demo' : 'reading'));
    expect(order).toEqual(['demo', 'reading']);
  });

  test('US-REVIEW-03 AC7 · G10-10: on any other project no demo line, and the footer still stands', () => {
    const { container } = render(<StatusFooter label="TEST project status" demoLine={null} stillReading={null} />);
    expect(container.querySelector('.sov-status-footer')).not.toBeNull();
    expect(container.querySelector('[data-demo-line]')).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
  });

  test('R-139: the footer takes only 2.8 status lines beside the demo line and "Still reading"; a demo line that is not 2.8\'s is refused', () => {
    render(<StatusFooter label="TEST project status" demoLine={null} stillReading={null} statusLines={[{ id: 'analysis_failed', kind: 'status_line', text: 'Analysis failed' }]} />);
    expect(screen.getByText('Analysis failed').getAttribute('data-copy-kind')).toBe('status-line');
    cleanup();
    quietly(() => {
      expect(() => render(<StatusFooter label="TEST" demoLine={null} stillReading={null} statusLines={[{ id: 'provide_later', kind: 'rule_line', text: 'TEST rule line' }]} />)).toThrow(/status lines/u);
      expect(() => render(<StatusFooter label="TEST" demoLine={{ id: 'provide_later', kind: 'rule_line', text: 'TEST not a demo line' }} stillReading={null} />)).toThrow(/demo line/u);
    });
  });
});

describe('ADR 0043 decision 5 · dashboards-spec 3.4: the frame, the inspector layout and the title slot', () => {
  test('ADR 0043: the frame places the sidebar, the page and the footer; the inspector layout opens a column only for an inspector', () => {
    const { container, rerender } = render(
      <WorkspaceFrame sidebar={<p>TEST sidebar</p>} footer={<p>TEST footer</p>}>
        <InspectorLayout inspector={null}>
          <p>TEST register</p>
        </InspectorLayout>
      </WorkspaceFrame>,
    );
    expect(container.querySelector('.sov-workspace__sidebar')?.textContent).toBe('TEST sidebar');
    expect(container.querySelector('.sov-workspace__page')?.textContent).toBe('TEST register');
    expect(container.querySelector('.sov-workspace__footer')?.textContent).toBe('TEST footer');
    expect(container.querySelector('.sov-inspector-layout')?.getAttribute('data-inspector')).toBe('closed');
    rerender(
      <WorkspaceFrame sidebar={<p>TEST sidebar</p>} footer={<p>TEST footer</p>}>
        <InspectorLayout inspector={<p>TEST inspector</p>}>
          <p>TEST register</p>
        </InspectorLayout>
      </WorkspaceFrame>,
    );
    expect(container.querySelector('.sov-inspector-layout')?.getAttribute('data-inspector')).toBe('open');
    expect(container.querySelector('.sov-inspector-layout__inspector')?.textContent).toBe('TEST inspector');
  });

  test('DR-3 · V-7 · WCAG 2.4.1, 1.3.1, 2.4.3: the frame has exactly one main (the page column, the skip link\'s target), one contentinfo (the footer) and the sidebar as a complementary landmark outside main', () => {
    render(
      <WorkspaceFrame
        sidebarLabel="TEST project"
        sidebar={
          <>
            <button type="button">TEST switcher</button>
            <SideNav label="TEST project pages" items={[{ id: 'documents', label: 'TEST documents', href: '#documents', current: true }]} />
            <h2>TEST building</h2>
          </>
        }
        footer={<StatusFooter label="TEST project status" demoLine={{ id: 'demo_data', kind: 'demo_line', text: 'TEST demo line' }} stillReading={STILL_READING} />}
      >
        <h1>TEST documents</h1>
      </WorkspaceFrame>,
    );
    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    const main = mains[0] as HTMLElement;
    expect(main.tagName).toBe('MAIN');
    expect(main.id).toBe('main');
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(main.classList.contains('sov-workspace__page')).toBe(true);
    // The page column holds the page and nothing of the sidebar or the footer: its first heading is the page's.
    expect(within(main).getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['TEST documents']);
    expect(within(main).queryByRole('navigation')).toBeNull();
    expect(within(main).queryByRole('button', { name: 'TEST switcher' })).toBeNull();
    const aside = screen.getByRole('complementary', { name: 'TEST project' });
    expect(aside.tagName).toBe('ASIDE');
    expect(main.contains(aside)).toBe(false);
    expect(within(aside).getByRole('navigation', { name: 'TEST project pages' })).toBeTruthy();
    const contentinfo = screen.getAllByRole('contentinfo');
    expect(contentinfo).toHaveLength(1);
    expect(contentinfo[0]?.tagName).toBe('FOOTER');
    expect(main.contains(contentinfo[0] ?? null)).toBe(false);
    expect(within(contentinfo[0] as HTMLElement).getByRole('note').textContent).toBe('TEST demo line');
    // No footer inside the footer, and the sidebar comes before the page, the footer after it, in reading order.
    expect(contentinfo[0]?.querySelector('footer')).toBeNull();
    const order = [aside, main, contentinfo[0] as HTMLElement];
    for (let index = 1; index < order.length; index += 1) {
      expect((order[index - 1] as HTMLElement).compareDocumentPosition(order[index] as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  test('ADR 0043 decisions 4 and 7: the back link above the one h1, the eyebrow with a decorative bullet, the subtitle and the page\'s controls', () => {
    const onNavigate = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <PageHeader
        title="TEST project documents"
        subtitle="TEST subtitle"
        eyebrow="TEST documents"
        back={{ label: 'TEST back to System Scope', href: '/projects/TEST/system-scope', onNavigate }}
        actions={<button type="button">TEST upload</button>}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 1 }).map((heading) => heading.textContent)).toEqual(['TEST project documents']);
    const back = screen.getByRole('link', { name: 'TEST back to System Scope' });
    fireEvent.click(back);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    const eyebrow = document.querySelector('.sov-eyebrow');
    expect(eyebrow?.textContent).toBe('•TEST documents');
    expect(eyebrow?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('•');
    expect(screen.getByText('TEST subtitle').className).toBe('sov-page-header__subtitle');
    expect(screen.getByRole('button', { name: 'TEST upload' })).toBeTruthy();
  });

  test('phase 5 DR-16: the controls sit at the title block\'s last line by default, and at its top with `actionsAlign="start"`, so the title keeps one position whatever their height', () => {
    const { container, rerender } = render(<PageHeader title="TEST proposal" actions={<button type="button">TEST download</button>} />);
    expect(container.querySelector('.sov-page-header__row')?.hasAttribute('data-actions-align')).toBe(false);
    rerender(<PageHeader title="TEST proposal" actionsAlign="start" actions={<button type="button">TEST download</button>} />);
    expect(container.querySelector('.sov-page-header__row')?.getAttribute('data-actions-align')).toBe('start');
  });
});
