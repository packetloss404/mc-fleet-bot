import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_LIVE_URL;
const localPort = Number(process.env.PLAYWRIGHT_LIVE_PORT || 3108);
const baseURL = externalBaseURL || `http://127.0.0.1:${localPort}`;

export default defineConfig({
  testDir: './e2e-live',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'live-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // By default, start the already-built dashboard on an isolated port while
  // leaving its API rewrite pointed at the real backend on 127.0.0.1:3001.
  // Set PLAYWRIGHT_LIVE_URL to smoke an already-deployed dashboard instead.
  ...(externalBaseURL ? {} : {
    webServer: {
      command: `npm run start -- --hostname 127.0.0.1 --port ${localPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
});
