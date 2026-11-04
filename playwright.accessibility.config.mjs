import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Reports never enter the production source tree. CI sets its own disposable path.
const outputDir = process.env.LOGIN_A11Y_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'login-a11y-results-'));
process.env.LOGIN_A11Y_OUTPUT_DIR = outputDir;

export default defineConfig({
  testDir: './tests/accessibility',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir,
  reporter: [['list'], ['json', { outputFile: join(outputDir, 'results.json') }]],
});
