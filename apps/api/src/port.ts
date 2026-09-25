/**
 * The API's listen port. A port is configuration, not a field of the value model,
 * so this module is the one file in apps/api where the lint ban on Number() does
 * not apply (tools/eslint-rules/allowlist.js). It holds this one function and
 * nothing else: tools/eslint-rules/config.test.ts fails if it grows.
 */
export function readPort(raw: string | undefined = process.env['SOVITECH_API_PORT']): number {
  if (raw === undefined || raw === '') return 3000;
  // Digits only, so '12.5' or '3000abc' is refused rather than read as 12 or 3000.
  const port = /^[0-9]+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('SOVITECH_API_PORT must be a whole number from 1 to 65535.');
  }
  return port;
}
