/**
 * Edit Flow E2E Test
 *
 * Verifies: Auth → edit mode entry → toolbar state → exit edit mode
 *
 * Uses shared fixtures for auth and GitHub API mocking.
 */
import { test, expect } from './fixtures'
import { VOCABS } from './helpers/fixtures'
import { SchemeEditorPage } from './pages/scheme-editor.page'

test.describe('Edit flow', () => {
  test('authenticated user sees Edit button', async ({ authedPage }) => {
    const editor = new SchemeEditorPage(authedPage)
    await editor.goto()

    await expect(authedPage.getByRole('button', { name: 'Edit', exact: true })).toBeVisible({ timeout: 5_000 })
  })

  test('edit mode via URL param shows edit toolbar', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    await expect(page.getByText('No changes yet')).toBeVisible()
  })

  test('unauthenticated user does not see edit toolbar', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('gh_token')
    })

    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)
    await expect(page.getByText('Concepts').first()).toBeVisible({ timeout: 15_000 })

    await expect(page.getByRole('button', { name: 'Edit', exact: true })).not.toBeVisible()
  })
})
