import './jest-setup-env';
import { setupTestDatabase } from './test-db';

export default async () => {
  const { container } = await setupTestDatabase();

  process.env.VETPLY_TEST_DB_HOST = container.getHost();
  process.env.VETPLY_TEST_DB_PORT = container.getMappedPort(5432).toString();
  process.env.VETPLY_TEST_DB_USERNAME = container.getUsername();
  process.env.VETPLY_TEST_DB_PASSWORD = container.getPassword();
  process.env.VETPLY_TEST_DB_DATABASE = container.getDatabase();
};
