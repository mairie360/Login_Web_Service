import { defineConfig, devices } from '@playwright/test';

// Journeys run against an already started front (E2E_BASE_URL): ./e2e_test.sh starts the
// docker-compose-e2e.yml stack and runs them from the `playwright` service, and a developer
// iterates with `npm run e2e` against that same stack published on localhost.
const reportDir = process.env.E2E_REPORT_DIR ?? '../e2e-report';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  // The journeys write in the shared seeded database: one worker, in file order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: `${reportDir}/test-results`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${reportDir}/html`, open: 'never' }],
    // Read by the promotion job for its summary (actions/e2e/fronts of mairie360/CICD).
    ['json', { outputFile: `${reportDir}/results.json` }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5000',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    // Kept for the failed journeys only: the promotion job publishes them with the HTML report.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
