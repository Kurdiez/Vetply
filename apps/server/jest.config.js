module.exports = {
  maxWorkers: process.env.CI ? 2 : 8,

  collectCoverageFrom: ['**/*.ts'],
  coverageDirectory: '../coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
        },
        useESM: true,
      },
    ],
  },

  globalSetup: '<rootDir>/commons/test/jest-setup.ts',
  globalTeardown: '<rootDir>/commons/test/jest-teardown.ts',

  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/commons/test/jest-setup-env.ts'],

  workerIdleMemoryLimit: process.env.CI ? '256MB' : '512MB',

  ...(process.env.CI && {
    maxConcurrency: 1,
    bail: 1,
    verbose: false,
  }),
};
