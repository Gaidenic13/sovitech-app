/**
 * The viewer in the main bundle: the graphics probe first, then the lazily loaded chunk (docs/build-log.md, the
 * viewer step, items 3 and 4; prompt 3 section 11, "The viewer is code-split"; the owner's answer of 2026-10-05:
 * "with no GPU, the model area reads 'Not available yet' instead of a slow view").
 *
 * - The probe answers "none": the view says "graphics" to its area at once, and the chunk (three.js, Fragments,
 *   camera-controls) is never imported.
 * - The probe answers "hardware": the chunk is imported and given the view's props.
 * The browser's own answers and the chunk's requests are proven in Chromium in tests/proposed/model-view.test.ts.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ModelViewLabels } from './model-view/ModelView';

const seen = vi.hoisted(() => ({ imported: 0, props: [] as unknown[], probe: { kind: 'none', reason: 'no_context' } as unknown }));

vi.mock('./probe', () => ({ graphicsOnThisPage: () => seen.probe }));
vi.mock('./model-view/entry', () => {
  seen.imported += 1;
  return {
    default: (props: { readonly labelledBy: string }) => {
      seen.props.push(props);
      return <div data-testid="lazy-view" aria-labelledby={props.labelledBy} />;
    },
  };
});

const { ModelViewer } = await import('./ModelViewer');

const LABELS: ModelViewLabels = {
  toolbar: 'TEST View controls',
  actions: { turn_left: 'TEST a', turn_right: 'TEST b', tilt_up: 'TEST c', tilt_down: 'TEST d', zoom_in: 'TEST e', zoom_out: 'TEST f', home: 'TEST g' },
  keyHelp: 'TEST keys',
  loading: 'TEST Loading the model view',
};

afterEach(cleanup);

describe('D-03 · PRD section 11 · prompt 3 section 11: the probe decides before the chunk loads', () => {
  test('D-03 · the viewer step, item 4: with no hardware graphics the view says "graphics" once, shows nothing, and never imports the chunk', async () => {
    seen.probe = { kind: 'none', reason: 'software_renderer' };
    const onUnavailable = vi.fn();
    const { container } = render(<ModelViewer src="/api/TEST/model-view" labelledBy="TEST-name" labels={LABELS} onUnavailable={onUnavailable} />);
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith('graphics'));
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(container.querySelector('canvas, [role="application"], [role="progressbar"]')).toBeNull();
    expect(seen.imported).toBe(0);
  });

  test('prompt 3 section 11 ("The viewer is code-split"): with hardware graphics the chunk is imported and given the view\'s props', async () => {
    seen.probe = { kind: 'hardware' };
    const onUnavailable = vi.fn();
    render(<ModelViewer src="/api/TEST/model-view" labelledBy="TEST-name" labels={LABELS} onUnavailable={onUnavailable} />);
    expect(await screen.findByTestId('lazy-view')).toBeTruthy();
    expect(seen.imported).toBe(1);
    expect(seen.props.at(-1)).toMatchObject({ src: '/api/TEST/model-view', labelledBy: 'TEST-name', labels: LABELS });
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});
