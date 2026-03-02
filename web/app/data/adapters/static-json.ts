/**
 * Static JSON adapter
 *
 * Wraps the existing useVocabData fetch functions to provide
 * the VocabSourceAdapter interface. Used when browsing logged-out
 * (data comes from pre-generated /export/ JSON files).
 */

import type { VocabSourceAdapter } from '~/data/types'
import type { NormalizedScheme, NormalizedListConcept, NormalizedConcept, NormalizedProperty } from '~/types/vocab-data'
import {
  fetchVocabMetadata,
  fetchListConcepts,
  fetchLabels,
  type LabelsIndex,
  type VocabMetadata,
} from '~/composables/useVocabData'
import {
  useAnnotatedProperties,
  extractProperties,
  parseAnnotatedJsonLd,
  type RenderedProperty,
} from '~/utils/annotated-properties'

export function createStaticJsonAdapter(): VocabSourceAdapter {
  let metadataCache: VocabMetadata[] | undefined

  async function getMetadata(): Promise<VocabMetadata[]> {
    if (!metadataCache) {
      metadataCache = await fetchVocabMetadata()
    }
    return metadataCache
  }

  function metadataToNormalizedScheme(meta: VocabMetadata): NormalizedScheme {
    return {
      iri: meta.iri,
      prefLabel: meta.prefLabel,
      definition: meta.definition,
      conceptCount: meta.conceptCount,
      topConcepts: meta.topConcepts,
      modified: meta.modified,
      created: meta.created,
      version: meta.version,
      properties: [], // populated by annotated properties when available
    }
  }

  return {
    key: 'static',

    async loadScheme(slug: string): Promise<NormalizedScheme | null> {
      const metadata = await getMetadata()
      const meta = metadata.find(v => v.slug === slug)
      if (!meta) return null
      return metadataToNormalizedScheme(meta)
    },

    async loadConceptList(slug: string): Promise<NormalizedListConcept[]> {
      const listConcepts = await fetchListConcepts(slug)
      return listConcepts.map(lc => ({
        iri: lc.iri,
        prefLabel: lc.prefLabel,
        altLabels: lc.altLabels,
        definition: lc.definition,
        notation: lc.notation,
        broader: lc.broader ? [lc.broader] : [],
      }))
    },

    async loadConcept(slug: string, conceptIri: string): Promise<NormalizedConcept | null> {
      const listConcepts = await fetchListConcepts(slug)
      const lc = listConcepts.find(c => c.iri === conceptIri)
      if (!lc) return null

      return {
        iri: lc.iri,
        prefLabel: lc.prefLabel,
        properties: [], // full properties populated by annotated JSON-LD on concept page
      }
    },

    async loadLabels(): Promise<LabelsIndex> {
      return fetchLabels()
    },
  }
}
