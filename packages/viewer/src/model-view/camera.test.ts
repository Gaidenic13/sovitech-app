/**
 * The view's keys and buttons (docs/build-log.md, the viewer step, item 5; prompt 3 sections 8 and 11, "camera
 * controls work from the keyboard"; WCAG 2.2 AA 2.1.1, 2.1.2, 2.1.4 and 2.5.7; R-080 and US-MODEL-07 AC1: no
 * storey is stepped through, so Page Up and Page Down are not bound).
 */
import { describe, expect, test } from 'vitest';
import { CAMERA_ACTIONS, TOOLBAR_ACTIONS, actionForKey } from './camera';

describe('prompt 3 section 11 · WCAG 2.1.1: every camera move has a key and a button', () => {
  test('R-162 · WCAG 2.1.1: arrows turn and tilt, plus and minus zoom, W A S D pan, Home shows the whole model', () => {
    expect(actionForKey({ key: 'ArrowLeft' })).toBe('turn_left');
    expect(actionForKey({ key: 'ArrowRight' })).toBe('turn_right');
    expect(actionForKey({ key: 'ArrowUp' })).toBe('tilt_up');
    expect(actionForKey({ key: 'ArrowDown' })).toBe('tilt_down');
    for (const key of ['+', '=']) expect(actionForKey({ key })).toBe('zoom_in');
    for (const key of ['-', '_', '−']) expect(actionForKey({ key })).toBe('zoom_out');
    for (const key of ['w', 'W']) expect(actionForKey({ key })).toBe('pan_forward');
    for (const key of ['s', 'S']) expect(actionForKey({ key })).toBe('pan_back');
    for (const key of ['a', 'A']) expect(actionForKey({ key })).toBe('pan_left');
    for (const key of ['d', 'D']) expect(actionForKey({ key })).toBe('pan_right');
    expect(actionForKey({ key: 'Home' })).toBe('home');
  });

  test('R-080 · US-MODEL-07 AC1: Page Up and Page Down step through no storey (no action bound)', () => {
    expect(actionForKey({ key: 'PageUp' })).toBeNull();
    expect(actionForKey({ key: 'PageDown' })).toBeNull();
  });

  test('WCAG 2.1.2: Tab and Shift+Tab are never taken, so the view traps no one', () => {
    expect(actionForKey({ key: 'Tab' })).toBeNull();
    expect(actionForKey({ key: 'Tab', shiftKey: true })).toBeNull();
    expect(actionForKey({ key: 'Escape' })).toBeNull();
  });

  test('WCAG 2.1.4: a key with Control, Alt or Meta held is the browser\'s, never the view\'s (no shortcut is shadowed)', () => {
    for (const modifier of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      expect(actionForKey({ key: 'ArrowLeft', ...modifier })).toBeNull();
      expect(actionForKey({ key: 'w', ...modifier })).toBeNull();
      expect(actionForKey({ key: '+', ...modifier })).toBeNull();
    }
  });

  test('WCAG 2.5.7: the toolbar holds the seven moves a drag makes, each once, and none steps through storeys', () => {
    expect(TOOLBAR_ACTIONS).toEqual(['turn_left', 'turn_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'home']);
    for (const action of TOOLBAR_ACTIONS) expect(CAMERA_ACTIONS).toContain(action);
    expect(CAMERA_ACTIONS.some((action) => /storey|level|floor/iu.test(action))).toBe(false);
  });
});
