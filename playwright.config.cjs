// @ts-check

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests',
  testMatch: 'e2e-app.spec.cjs',
  timeout: 120000,
  expect: { timeout: 30000 },
  workers: 1,
};
