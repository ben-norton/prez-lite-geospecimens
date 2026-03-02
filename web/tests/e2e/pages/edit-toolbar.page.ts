/**
 * Page object for the EditToolbar component.
 *
 * Handles undo/redo, save trigger, change count, and view mode toggle.
 */
import type { Page, Locator } from '@playwright/test'

export class EditToolbarPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Undo button (title is "Undo: ..." when enabled, "Nothing to undo" when disabled) */
  get undoButton(): Locator {
    return this.page.getByRole('button', { name: /undo/i })
  }

  /** Redo button (title is "Redo: ..." when enabled, "Nothing to redo" when disabled) */
  get redoButton(): Locator {
    return this.page.getByRole('button', { name: /redo/i })
  }

  /** Save button */
  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save' })
  }

  /** "No changes yet" text */
  get noChangesText(): Locator {
    return this.page.getByText('No changes yet')
  }

  /** Change count badge */
  get changeBadge(): Locator {
    return this.page.getByText(/^\d+$/).locator('xpath=ancestor::button[contains(., "change")]')
  }

  /** Click undo */
  async undo() {
    await this.undoButton.click()
  }

  /** Click redo */
  async redo() {
    await this.redoButton.click()
  }

  /** Click save to open the save modal */
  async clickSave() {
    await this.saveButton.click()
  }

  /** Open the changes popover */
  async openChanges() {
    await this.page.getByText(/\d+ changes?/).click()
  }

  /** Toggle Expert/Simple view */
  async toggleViewMode() {
    await this.page.getByRole('button', { name: /Simple|Expert/ }).click()
  }
}
