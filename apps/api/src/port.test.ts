import { describe, expect, it } from 'vitest';
import { readPort } from './port';

// The API listen port (configuration, not a value-model field; ADR 0007 allowlist).
describe('readPort', () => {
  it('uses the default port when the variable is unset or empty', () => {
    expect(readPort(undefined)).toBe(3000);
    expect(readPort('')).toBe(3000);
  });

  it('reads a whole number of digits', () => {
    expect(readPort('4100')).toBe(4100);
    expect(readPort('65535')).toBe(65535);
  });

  it.each(['0', '-1', '65536', '12.5', '3000abc', ' 3000', 'abc', '0x10', '1e3'])('refuses %j', (raw) => {
    expect(() => readPort(raw)).toThrow('SOVITECH_API_PORT');
  });
});
