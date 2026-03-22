import './jest-setup-env';
import { teardownTestDatabase } from './test-db';

export default async () => {
  await teardownTestDatabase();
};
