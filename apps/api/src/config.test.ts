/**
 * The API's phase 3 settings (docs/adr/0037 decision 2, docs/adr/0038 decision 1): the whole connection
 * strings win over the port, name and passwords; the development accounts are read strictly, and an
 * empty setting leaves the development login off. No real value is used: every setting here is TEST text.
 */
import { describe, expect, it } from 'vitest';
import { SettingError, databaseUrl, devAccountIds, readSettings, sessionLifetimes } from './config';

const NO_FILE = '/nonexistent-sovitech-test-root';

describe('ADR 0037 · ADR 0038: the phase 3 settings', () => {
  it('ADR 0037: a whole connection string wins over the port, name and password; without either, none', () => {
    const parts = { SOVITECH_DB_PORT: '5433', SOVITECH_DB_NAME: 'test', SOVITECH_DB_APP_PASSWORD: 'TEST-password-only', SOVITECH_DB_OPERATOR_PASSWORD: 'TEST-operator-only' };
    const fromParts = readSettings(parts, NO_FILE);
    expect(databaseUrl(fromParts, 'sovitech_db_app')).toBe('postgres://sovitech_db_app:TEST-password-only@127.0.0.1:5433/test');
    const whole = readSettings({ ...parts, SOVITECH_DB_APP_URL: 'postgres://TEST@127.0.0.1:1/whole', SOVITECH_DB_OPERATOR_URL: 'postgres://TEST@127.0.0.1:2/whole' }, NO_FILE);
    expect(databaseUrl(whole, 'sovitech_db_app')).toBe('postgres://TEST@127.0.0.1:1/whole');
    expect(databaseUrl(whole, 'sovitech_db_admin')).toBe('postgres://TEST@127.0.0.1:2/whole');
    expect(databaseUrl(readSettings({}, NO_FILE), 'sovitech_db_app')).toBeUndefined();
  });

  it('ADR 0038: the development accounts are account ids, trimmed and deduplicated; empty means the login is off; anything else stops the start', () => {
    const id = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
    expect(devAccountIds(readSettings({}, NO_FILE))).toEqual([]);
    expect(devAccountIds(readSettings({ SOVITECH_DEV_ACCOUNTS: '  ' }, NO_FILE))).toEqual([]);
    expect(devAccountIds(readSettings({ SOVITECH_DEV_ACCOUNTS: ` ${id} ,${id.toUpperCase()}, ` }, NO_FILE))).toEqual([id]);
    expect(() => devAccountIds(readSettings({ SOVITECH_DEV_ACCOUNTS: `${id},owner@example.test` }, NO_FILE))).toThrow(SettingError);
  });
});

describe('A-11 · ADR 0038 decision 9: the session lifetimes', () => {
  it('A-11: unset, 30 minutes unused and 12 hours in all; set, whole minutes and hours within their bounds; anything else stops the start', () => {
    expect(sessionLifetimes(readSettings({}, NO_FILE))).toEqual({ idleMs: 30 * 60 * 1000, absoluteMs: 12 * 60 * 60 * 1000 });
    expect(sessionLifetimes(readSettings({ SOVITECH_SESSION_IDLE_MINUTES: '15', SOVITECH_SESSION_ABSOLUTE_HOURS: '2' }, NO_FILE))).toEqual({ idleMs: 15 * 60 * 1000, absoluteMs: 2 * 60 * 60 * 1000 });
    for (const bad of [{ SOVITECH_SESSION_IDLE_MINUTES: '0' }, { SOVITECH_SESSION_IDLE_MINUTES: '1.5' }, { SOVITECH_SESSION_IDLE_MINUTES: 'TEST' }, { SOVITECH_SESSION_ABSOLUTE_HOURS: '169' }, { SOVITECH_SESSION_IDLE_MINUTES: '180', SOVITECH_SESSION_ABSOLUTE_HOURS: '1' }]) {
      expect(() => sessionLifetimes(readSettings(bad, NO_FILE)), JSON.stringify(bad)).toThrow(SettingError);
    }
  });
});
