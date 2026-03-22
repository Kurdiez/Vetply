import { join } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: join(__dirname, '../..'),
  paths: {
    '~/*': ['./*'],
    '@/*': ['./*'],
  },
});

process.env.SERVER_TYPE = process.env.SERVER_TYPE ?? 'api';

console.log = () => {};
console.warn = () => {};
console.info = () => {};
