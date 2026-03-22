import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { config } from 'dotenv';
import { Client as PgClient } from 'pg';

config();

let container: StartedPostgreSqlContainer;

const RETRY_DELAY = 1000;
const CONNECTION_TIMEOUT = 60000;

async function waitForPostgresReady({
  host,
  port,
  username,
  password,
  database,
}: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}) {
  const start = Date.now();
  while (Date.now() - start < CONNECTION_TIMEOUT) {
    const client = new PgClient({
      host,
      port,
      user: username,
      password,
      database,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Postgres did not become ready in time');
}

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .withReuse()
    .withStartupTimeout(CONNECTION_TIMEOUT)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const username = container.getUsername();
  const password = container.getPassword();
  const database = container.getDatabase();

  await waitForPostgresReady({ host, port, username, password, database });

  return { container };
}

export async function teardownTestDatabase() {
  if (container) {
    await container.stop();
    container = null as unknown as StartedPostgreSqlContainer;
  }
}

export { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
