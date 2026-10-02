import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RENDER_READY_ATTRIBUTE, useRenderReady } from './render-ready';

afterEach(() => cleanup());

function Part({ ready }: { readonly ready: boolean }) {
  useRenderReady(ready);
  return null;
}

const isReady = () => document.body.hasAttribute(RENDER_READY_ATTRIBUTE);

describe('tests/e2e/render/README.md · ADR 0043: data-render-ready', () => {
  it('one part: the attribute follows its readiness, and goes when it unmounts (phase 3 behaviour)', () => {
    const view = render(<Part ready={false} />);
    expect(isReady()).toBe(false);
    view.rerender(<Part ready />);
    expect(isReady()).toBe(true);
    view.unmount();
    expect(isReady()).toBe(false);
  });

  it('the workspace frame and its page: set only once both parts have rendered what they asked for', () => {
    const view = render(
      <>
        <Part ready />
        <Part ready={false} />
      </>,
    );
    expect(isReady()).toBe(false);
    view.rerender(
      <>
        <Part ready />
        <Part ready />
      </>,
    );
    expect(isReady()).toBe(true);
    view.rerender(
      <>
        <Part ready={false} />
        <Part ready />
      </>,
    );
    expect(isReady()).toBe(false);
  });
});
