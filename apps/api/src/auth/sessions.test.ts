/**
 * Sessions end (part B, A-11; prompt 3 section 11, "Security basics"; docs/adr/0038 decision 9): on sign-out,
 * after the idle lifetime unused, and after the absolute lifetime however much they are used. A TEST clock
 * stands in for time; every id is a TEST id.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SESSION_LIFETIMES, SessionStore } from './sessions';

const USER = '0192f0e4-7e57-7000-8000-000000000001';
const MINUTE = 60 * 1000;

function clock(): { now: () => number; advance: (ms: number) => void } {
  let at = 0;
  return { now: () => at, advance: (ms) => (at += ms) };
}

describe('A-11 · ADR 0038 decision 9 · prompt 3 section 11: session lifetimes', () => {
  it('A-11: a session unused for longer than its idle lifetime ends; using it restarts its idle time', () => {
    const time = clock();
    const sessions = new SessionStore({ lifetimes: { idleMs: 30 * MINUTE, absoluteMs: 12 * 60 * MINUTE }, now: time.now });
    const id = sessions.create(USER);
    time.advance(29 * MINUTE);
    expect(sessions.userOf(id)).toBe(USER);
    time.advance(29 * MINUTE);
    expect(sessions.userOf(id)).toBe(USER);
    time.advance(31 * MINUTE);
    expect(sessions.userOf(id)).toBeUndefined();
    time.advance(1);
    expect(sessions.userOf(id)).toBeUndefined();
  });

  it('A-11: a session older than its absolute lifetime ends, however often it was used', () => {
    const time = clock();
    const sessions = new SessionStore({ lifetimes: { idleMs: 30 * MINUTE, absoluteMs: 60 * MINUTE }, now: time.now });
    const id = sessions.create(USER);
    for (let step = 0; step < 6; step += 1) {
      time.advance(10 * MINUTE);
      expect(sessions.userOf(id)).toBe(USER);
    }
    time.advance(1);
    expect(sessions.userOf(id)).toBeUndefined();
  });

  it('A-11: sign-out ends a session at once; the defaults are 30 minutes unused and 12 hours in all; an idle lifetime past the absolute one is refused', () => {
    const sessions = new SessionStore();
    const id = sessions.create(USER);
    expect(sessions.userOf(id)).toBe(USER);
    sessions.end(id);
    expect(sessions.userOf(id)).toBeUndefined();
    expect(DEFAULT_SESSION_LIFETIMES).toEqual({ idleMs: 30 * MINUTE, absoluteMs: 12 * 60 * MINUTE });
    expect(() => new SessionStore({ lifetimes: { idleMs: 2 * MINUTE, absoluteMs: MINUTE } })).toThrow();
    expect(() => new SessionStore({ lifetimes: { idleMs: 0, absoluteMs: MINUTE } })).toThrow();
  });
});
