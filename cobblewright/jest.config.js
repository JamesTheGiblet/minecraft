/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};

module.exports = config;