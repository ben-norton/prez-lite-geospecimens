/**
 * Page object for the scheme page in edit mode.
 *
 * Handles navigation, entering/exiting edit mode, and concept selection.
 */
import type { Page, Locator } from '@playwright/test'
import { VOCABS } from '../helpers/fixtures'

export class SchemeEditorPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Navigate to a scheme page */
  async goto(schemeIri: string = VOCABS.alterationForm.iri) {
    const uri = encodeURIComponent(schemeIri)
    await this.page.goto(`/scheme?uri=${uri}`)
    await this.waitForTree()
  }

  /** Navigate directly into edit mode */
  async gotoEdit(mode: 'full' | 'inline' = 'full', schemeIri: string = VOCABS.alterationForm.iri) {
    const uri = encodeURIComponent(schemeIri)
    await this.page.goto(`/scheme?uri=${uri}&edit=${mode}`)
  }

  /** Wait for the concept tree to render */
  async waitForTree() {
    await this.page.getByText('Concepts').first().waitFor({ timeout: 30_000 })
  }

  /** Wait for edit mode to initialise (toolbar shows "No changes yet") */
  async waitForEditMode() {
    await this.page.getByText('No changes yet').waitFor({ timeout: 20_000 })
    // Extra settle time for the N3 store to finish building
    await this.page.waitForTimeout(500)
  }

  /** Enter edit mode via toolbar dropdown */
  async enterEditMode(mode: 'full' | 'inline' = 'full') {
    // Click the Edit dropdown button (exact to avoid matching DevTools "Open in editor")
    await this.page.getByRole('button', { name: 'Edit', exact: true }).click()
    // Select mode from dropdown
    const label = mode === 'full' ? 'Full edit mode' : 'Inline edit mode'
    await this.page.getByText(label).click()
    await this.waitForEditMode()
  }

  /** Click a concept in the tree */
  async selectConcept(label: string) {
    await this.page.locator('span.text-sm', { hasText: label }).first().click()
    // Wait for concept detail to load
    await this.page.waitForTimeout(500)
  }

  /** Exit edit mode via toolbar X button */
  async exitEditMode() {
    await this.page.getByLabel('Exit edit mode').click()
  }

  /** Get the change count badge text */
  get changeCount(): Locator {
    return this.page.locator('.inline-flex', { hasText: /\d+ changes?/ })
  }

  /** Get the "No changes yet" text */
  get noChangesText(): Locator {
    return this.page.getByText('No changes yet')
  }
}
