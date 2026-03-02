/**
 * Page object for the ConceptForm component (full edit mode).
 *
 * Handles property editing, value add/remove, language tags, and concept deletion.
 */
import type { Page, Locator } from '@playwright/test'

export class ConceptFormPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Get the form container (concept detail panel) */
  get form(): Locator {
    return this.page.locator('[class*="space-y"]').filter({ has: this.page.locator('input, textarea') }).first()
  }

  /** Get an input/textarea by its property label */
  getPropertyInput(label: string): Locator {
    // Find the property section by its label link, then get the input within
    return this.page.locator(`a[href*="${label}"]`)
      .locator('xpath=ancestor::div[contains(@class, "space-y")]')
      .locator('input, textarea')
      .first()
  }

  /** Get all inputs for a property by looking near its label text */
  getPropertyInputsByLabel(labelText: string): Locator {
    return this.page.locator('div')
      .filter({ hasText: labelText })
      .locator('input:not([type="date"]), textarea')
  }

  /** Clear and type into the first input matching a property predicate fragment */
  async editProperty(predicateFragment: string, value: string) {
    const section = this.page.locator(`a[href*="${predicateFragment}"]`)
      .locator('xpath=ancestor::div[contains(@class, "space-y")]')
    const input = section.locator('input, textarea').first()
    await input.fill(value)
    // Wait for 300ms debounce
    await this.page.waitForTimeout(350)
  }

  /** Click the "+" button to add a value for a property */
  async addValue(predicateFragment: string) {
    const section = this.page.locator(`a[href*="${predicateFragment}"]`)
      .locator('xpath=ancestor::div[contains(@class, "space-y")]')
    await section.getByRole('button').filter({ has: this.page.locator('[class*="i-heroicons-plus"]') }).click()
  }

  /** Click the "x" button to remove a value for a property (by index) */
  async removeValue(predicateFragment: string, index: number = 0) {
    const section = this.page.locator(`a[href*="${predicateFragment}"]`)
      .locator('xpath=ancestor::div[contains(@class, "space-y")]')
    const removeButtons = section.locator('button').filter({ has: this.page.locator('[class*="i-heroicons-x-mark"]') })
    await removeButtons.nth(index).click()
  }

  /** Set language tag on a value */
  async setLanguage(predicateFragment: string, language: string, valueIndex: number = 0) {
    const section = this.page.locator(`a[href*="${predicateFragment}"]`)
      .locator('xpath=ancestor::div[contains(@class, "space-y")]')
    const selects = section.locator('select')
    await selects.nth(valueIndex).selectOption(language === '' ? '_none' : language)
    await this.page.waitForTimeout(100)
  }

  /** Delete the current concept */
  async deleteConcept() {
    // Click the delete button
    await this.page.locator('button').filter({ has: this.page.locator('[class*="i-heroicons-trash"]') }).click()
    // Confirm deletion
    await this.page.getByRole('button', { name: 'Yes, delete' }).click()
  }
}
