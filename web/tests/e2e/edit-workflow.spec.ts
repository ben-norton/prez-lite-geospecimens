/**
 * Edit Workflow E2E Tests
 *
 * Tests the core editing operations: enter edit mode, modify properties,
 * undo/redo, save with commit message, and exit without saving.
 *
 * All GitHub API calls are mocked. No real commits are made.
 */
import { test, expect } from './fixtures'
import { SchemeEditorPage } from './pages/scheme-editor.page'
import { EditToolbarPage } from './pages/edit-toolbar.page'
import { SaveModalPage } from './pages/save-modal.page'

test.describe('Edit workflow', () => {
  test('enter full edit mode from toolbar', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.goto()

    // Enter edit mode via dropdown
    await editor.enterEditMode('full')

    // Toolbar should show "No changes yet"
    await expect(page.getByText('No changes yet')).toBeVisible()

    // Save button should be disabled (no changes)
    const toolbar = new EditToolbarPage(page)
    await expect(toolbar.saveButton).toBeDisabled()
  })

  test('enter edit mode via URL param', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    await expect(page.getByText('No changes yet')).toBeVisible()
  })

  test('edit concept label shows change count', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Select the first concept in the tree
    await editor.selectConcept('Alpha')

    // Find and edit the prefLabel input
    const prefLabelInput = page.locator('input, textarea').filter({ hasText: /Alpha/ }).first()
      .or(page.locator('input[value="Alpha"]').first())
      .or(page.locator('textarea').filter({ hasText: 'Alpha' }).first())

    // If we can find a text input with "Alpha", clear and type new value
    const inputs = page.locator('input:not([type="date"]), textarea')
    const count = await inputs.count()

    // Find the input containing "Alpha" (the prefLabel)
    for (let i = 0; i < count; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => '')
      if (val === 'Alpha') {
        await inputs.nth(i).fill('Alpha Modified')
        break
      }
    }

    // Wait for debounce (300ms)
    await page.waitForTimeout(400)

    // Toolbar should now show change count
    await expect(page.getByText('No changes yet')).not.toBeVisible({ timeout: 3_000 })
    await expect(page.getByText(/\d+ change/)).toBeVisible()
  })

  test('undo reverts edit', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Select concept and edit
    await editor.selectConcept('Alpha')

    const inputs = page.locator('input:not([type="date"]), textarea')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => '')
      if (val === 'Alpha') {
        await inputs.nth(i).fill('Alpha Changed')
        break
      }
    }
    await page.waitForTimeout(400)

    // Should have changes
    await expect(page.getByText(/\d+ change/)).toBeVisible()

    // Undo
    await toolbar.undo()

    // Should revert to no changes
    await expect(page.getByText('No changes yet')).toBeVisible({ timeout: 3_000 })
  })

  test('redo reapplies undone edit', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    await editor.selectConcept('Alpha')

    const inputs = page.locator('input:not([type="date"]), textarea')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => '')
      if (val === 'Alpha') {
        await inputs.nth(i).fill('Alpha Changed')
        break
      }
    }
    await page.waitForTimeout(400)

    // Undo then redo
    await toolbar.undo()
    await expect(page.getByText('No changes yet')).toBeVisible({ timeout: 3_000 })

    await toolbar.redo()
    await expect(page.getByText(/\d+ change/)).toBeVisible({ timeout: 3_000 })
  })

  test('save opens modal and commits to GitHub', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    const saveModal = new SaveModalPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Edit a concept
    await editor.selectConcept('Alpha')

    const inputs = page.locator('input:not([type="date"]), textarea')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const val = await inputs.nth(i).inputValue().catch(() => '')
      if (val === 'Alpha') {
        await inputs.nth(i).fill('Alpha Updated')
        break
      }
    }
    await page.waitForTimeout(400)

    // Click save
    await toolbar.clickSave()
    await saveModal.waitForModal()

    // Set commit message and confirm
    await saveModal.setCommitMessage('test: update Alpha label')
    await saveModal.confirm()

    // Verify PUT request was captured
    await page.waitForTimeout(1000)
    expect(mockGitHubAPI.savedRequests.length).toBeGreaterThan(0)
    expect(mockGitHubAPI.savedRequests[0]!.message).toBe('test: update Alpha label')
    expect(mockGitHubAPI.savedRequests[0]!.content).toContain('Alpha Updated')
  })

  test('exit edit mode without saving', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Exit edit mode
    await editor.exitEditMode()

    // Should return to non-edit view (no toolbar save button)
    await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible({ timeout: 3_000 })
  })

  test('switch between full and inline edit modes', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Should show "Full" mode indicator
    await expect(page.getByRole('button', { name: 'Full' })).toBeVisible()

    // Click to switch to inline
    await page.getByRole('button', { name: 'Full' }).click()

    // Should now show "Inline" mode indicator
    await expect(page.getByRole('button', { name: 'Inline' })).toBeVisible({ timeout: 5_000 })
  })

  test('expert toggle disabled outside edit mode', async ({ authedPage }) => {
    const editor = new SchemeEditorPage(authedPage)
    await editor.goto()

    // Expert button should be visible but disabled
    const expertButton = authedPage.getByRole('button', { name: /Simple|Expert/ })
    await expect(expertButton).toBeVisible()
    await expect(expertButton).toBeDisabled()
  })

  test('expert toggle works in edit mode', async ({ page, mockGitHubAPI }) => {
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    await editor.gotoEdit('full')
    await editor.waitForEditMode()

    // Toggle should be enabled in edit mode
    const expertButton = page.getByRole('button', { name: /Simple|Expert/ })
    await expect(expertButton).toBeEnabled()
  })
})
