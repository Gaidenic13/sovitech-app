/**
 * `pnpm --filter @sovitech/db migrate`: applies the migrations to the local
 * development database (docker-compose.yml). Settings come from the environment,
 * or from the repository's .env file when present (see .env.example). Prints the
 * migrations applied; never prints a password.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../migrate';

const ENV_FILE = fileURLToPath(new URL('../../../../.env', import.meta.url));

function setting(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const administratorUrl = new URL('postgres://127.0.0.1');
administratorUrl.username = encodeURIComponent(setting('SOVITECH_DB_ADMINISTRATOR_USER'));
administratorUrl.password = encodeURIComponent(setting('SOVITECH_DB_ADMINISTRATOR_PASSWORD'));
administratorUrl.port = setting('SOVITECH_DB_PORT');
administratorUrl.pathname = `/${setting('SOVITECH_DB_NAME')}`;

const report = await runMigrations({
  administratorUrl: administratorUrl.toString(),
  passwords: {
    migrator: setting('SOVITECH_DB_MIGRATOR_PASSWORD'),
    app: setting('SOVITECH_DB_APP_PASSWORD'),
    operator: setting('SOVITECH_DB_OPERATOR_PASSWORD'),
  },
});
process.stdout.write(
  `Applied ${report.applied.length === 0 ? 'nothing new' : report.applied.join(', ')}; the guards hold.\n`,
);
