/**
 * Pure-logic unit tests run in a plain node environment with babel-preset-expo
 * (the same transform Metro uses) — no React Native runtime needed, since we
 * only test pure functions (route optimizer, file naming, status transitions,
 * sync-outbox reducer, CSV parsing, RBAC, checklist validation).
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
