/**
 * Extract concepts from an N3 Store.
 *
 * Queries all subjects with rdf:type skos:Concept and returns
 * a sorted list of NormalizedListConcept items.
 */

import type { Store, Quad } from 'n3'
import type { NormalizedListConcept } from '~/types/vocab-data'

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

export interface ConceptSummary {
  iri: string
  prefLabel: string
  broader: string[]
}

/**
 * Extract a minimal concept list from an N3 Store.
 * Returns ConceptSummary (iri, prefLabel, broader[]) sorted by prefLabel.
 */
export function extractConceptSummaries(store: Store): ConceptSummary[] {
  const conceptQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null) as Quad[]
  return conceptQuads
    .map((q: Quad) => {
      const iri = q.subject.value
      const labelQuads = store.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
      const prefLabel = labelQuads.length > 0 ? labelQuads[0]!.object.value : iri
      const broaderQuads = store.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]
      return {
        iri,
        prefLabel,
        broader: broaderQuads.map((bq: Quad) => bq.object.value),
      }
    })
    .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
}

/**
 * Extract concepts as NormalizedListConcept from an N3 Store.
 * Includes altLabels, definition, and notation when available.
 */
export function extractNormalizedConcepts(store: Store): NormalizedListConcept[] {
  const conceptQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null) as Quad[]
  return conceptQuads
    .map((q: Quad) => {
      const iri = q.subject.value

      const labelQuads = store.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
      const prefLabel = labelQuads.length > 0 ? labelQuads[0]!.object.value : iri

      const altLabelQuads = store.getQuads(iri, `${SKOS}altLabel`, null, null) as Quad[]
      const altLabels = altLabelQuads.length > 0
        ? altLabelQuads.map((aq: Quad) => aq.object.value)
        : undefined

      const defQuads = store.getQuads(iri, `${SKOS}definition`, null, null) as Quad[]
      const definition = defQuads.length > 0 ? defQuads[0]!.object.value : undefined

      const notationQuads = store.getQuads(iri, `${SKOS}notation`, null, null) as Quad[]
      const notation = notationQuads.length > 0 ? notationQuads[0]!.object.value : undefined

      const broaderQuads = store.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]
      const broader = broaderQuads.map((bq: Quad) => bq.object.value)

      return { iri, prefLabel, altLabels, definition, notation, broader }
    })
    .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
}
