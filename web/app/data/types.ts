/**
 * Unified vocabulary source adapter interface.
 *
 * Each adapter (static JSON, GitHub TTL, SPARQL) implements this interface
 * to provide a consistent data loading API for UI components.
 */

import type { NormalizedScheme, NormalizedListConcept, NormalizedConcept } from '~/types/vocab-data'
import type { LabelsIndex } from '~/composables/useVocabData'

export interface VocabSourceAdapter {
  /** Unique key identifying this adapter instance (e.g. 'static', 'github:main', 'sparql:endpoint') */
  readonly key: string

  /** Load scheme metadata for a vocabulary by slug */
  loadScheme(slug: string): Promise<NormalizedScheme | null>

  /** Load the concept list for a vocabulary by slug */
  loadConceptList(slug: string): Promise<NormalizedListConcept[]>

  /** Load a single concept's full details */
  loadConcept(slug: string, conceptIri: string): Promise<NormalizedConcept | null>

  /** Load the background labels index */
  loadLabels(): Promise<LabelsIndex>

  /**
   * Check whether cached data is still fresh.
   * Returns true if cache is valid, false if data should be refetched.
   * Optional — adapters that don't support freshness checks skip this.
   */
  checkFreshness?(slug: string): Promise<boolean>
}
