/**
 * Playwright fixtures for authenticated edit testing.
 *
 * Provides:
 * - `authedPage`: Page with GitHub OAuth mocked (token + user)
 * - `mockGitHubAPI`: GitHub Contents API interceptor with save capture
 */
import { test as base, expect, type Page } from '@playwright/test'
import { TEST_VOCAB_TTL, TEST_SCHEME_IRI } from './vocab-data'

export interface SavedRequest {
  message: string
  content: string
  sha: string
}

export interface MockGitHubAPI {
  /** TTL content served by the mock GET endpoint */
  loadTTL: string
  /** Captured PUT requests (save operations) */
  savedRequests: SavedRequest[]
}

const MOCK_USER = {
  login: 'test-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  name: 'Test User',
}

/** Set up auth token and user mock on a page */
async function setupAuth(page: Page): Promise<void> {
  // Inject token into localStorage before any navigation
  await page.addInitScript(() => {
    localStorage.setItem('gh_token', 'mock-gh-token-e2e')
  })

  // Mock GitHub user endpoint
  await page.route('https://api.github.com/user', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    }),
  )
}

/** Set up GitHub Contents API mock (load + save interception) */
async function setupGitHubAPI(page: Page, loadTTL: string, savedRequests: SavedRequest[]): Promise<void> {
  await page.route('**/api.github.com/repos/**/contents/**', (route, request) => {
    if (request.method() === 'GET') {
      const content = Buffer.from(loadTTL, 'utf-8').toString('base64')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sha: 'mock-sha-initial', content }),
      })
    }
    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}')
      savedRequests.push({
        message: body.message,
        content: Buffer.from(body.content, 'base64').toString('utf-8'),
        sha: body.sha,
      })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: { sha: 'mock-sha-saved' } }),
      })
    }
    return route.continue()
  })

  // Mock GitHub Actions runs endpoint (build status polling)
  await page.route('**/api.github.com/repos/**/actions/runs*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflow_runs: [] }),
    }),
  )
}

export const test = base.extend<{
  authedPage: Page
  mockGitHubAPI: MockGitHubAPI
}>({
  // Authenticated page fixture
  authedPage: async ({ page }, use) => {
    await setupAuth(page)
    await use(page)
  },

  // GitHub API mock fixture (includes auth setup)
  mockGitHubAPI: async ({ page }, use) => {
    await setupAuth(page)
    const savedRequests: SavedRequest[] = []
    await setupGitHubAPI(page, TEST_VOCAB_TTL, savedRequests)
    await use({ loadTTL: TEST_VOCAB_TTL, savedRequests })
  },
})

export { expect, TEST_SCHEME_IRI }
