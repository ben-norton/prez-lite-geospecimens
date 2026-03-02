/**
 * Page object for the SaveConfirmModal component.
 *
 * Handles reviewing changes, editing commit message, and confirming/cancelling save.
 */
import type { Page, Locator } from '@playwright/test'

export class SaveModalPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** The summary tab button */
  get summaryTab(): Locator {
    return this.page.getByRole('button', { name: 'Summary' })
  }

  /** The TTL Diff tab button */
  get diffTab(): Locator {
    return this.page.getByRole('button', { name: 'TTL Diff' })
  }

  /** The commit message input */
  get commitMessageInput(): Locator {
    return this.page.locator('input[type="text"]').last()
  }

  /** The Save to GitHub button */
  get confirmButton(): Locator {
    return this.page.getByRole('button', { name: /Save to GitHub/i })
  }

  /** The Cancel button */
  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel' })
  }

  /** Wait for the modal to be visible */
  async waitForModal() {
    await this.confirmButton.waitFor({ timeout: 5_000 })
  }

  /** Switch to summary tab */
  async showSummary() {
    await this.summaryTab.click()
  }

  /** Switch to TTL diff tab */
  async showDiff() {
    await this.diffTab.click()
  }

  /** Set a custom commit message */
  async setCommitMessage(message: string) {
    await this.commitMessageInput.fill(message)
  }

  /** Confirm save */
  async confirm() {
    await this.confirmButton.click()
  }

  /** Cancel save */
  async cancel() {
    await this.cancelButton.click()
  }

  /** Get all subject change entries in the summary tab */
  getSubjectEntries(): Locator {
    return this.page.locator('div').filter({ hasText: /Added|Removed|Modified/ })
  }
}
