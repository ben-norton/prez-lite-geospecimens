import { defineConfig, devices } from '@playwright/test'

/** GitHub env vars baked into static build at generate time */
const githubEnv = {
  NUXT_PUBLIC_GITHUB_REPO: 'Kurrawong/prez-lite',
  NUXT_PUBLIC_GITHUB_BRANCH: 'main',
  NUXT_PUBLIC_GITHUB_VOCAB_PATH: 'data/vocabs',
  NUXT_PUBLIC_GITHUB_CLIENT_ID: 'e2e-mock-client-id',
  NUXT_PUBLIC_GITHUB_AUTH_WORKER_URL: 'http://localhost:9999',
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: process.env.CI ? 'off' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'npx serve .output/public -l 3123'
      : 'pnpm dev',
    url: 'http://localhost:3123',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: githubEnv,
  },
})
