import { describe, it, expect } from 'vitest'
import { Store, DataFactory } from 'n3'
import { extractConceptSummaries, extractNormalizedConcepts } from '~/data/enrichment/extract-concepts'

const { namedNode, literal, defaultGraph } = DataFactory
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

function makeStore(concepts: Array<{
  iri: string
  prefLabel?: string
  altLabels?: string[]
  definition?: string
  notation?: string
  broader?: string[]
}>): Store {
  const store = new Store()
  for (const c of concepts) {
    store.addQuad(namedNode(c.iri), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
    if (c.prefLabel) {
      store.addQuad(namedNode(c.iri), namedNode(`${SKOS}prefLabel`), literal(c.prefLabel, 'en'), defaultGraph())
    }
    if (c.altLabels) {
      for (const alt of c.altLabels) {
        store.addQuad(namedNode(c.iri), namedNode(`${SKOS}altLabel`), literal(alt, 'en'), defaultGraph())
      }
    }
    if (c.definition) {
      store.addQuad(namedNode(c.iri), namedNode(`${SKOS}definition`), literal(c.definition, 'en'), defaultGraph())
    }
    if (c.notation) {
      store.addQuad(namedNode(c.iri), namedNode(`${SKOS}notation`), literal(c.notation), defaultGraph())
    }
    if (c.broader) {
      for (const b of c.broader) {
        store.addQuad(namedNode(c.iri), namedNode(`${SKOS}broader`), namedNode(b), defaultGraph())
      }
    }
  }
  return store
}

describe('extractConceptSummaries', () => {
  it('returns empty array for empty store', () => {
    const store = new Store()
    expect(extractConceptSummaries(store)).toEqual([])
  })

  it('extracts concepts with prefLabel and broader', () => {
    const store = makeStore([
      { iri: 'http://ex.org/a', prefLabel: 'Alpha', broader: ['http://ex.org/b'] },
      { iri: 'http://ex.org/b', prefLabel: 'Beta' },
    ])
    const result = extractConceptSummaries(store)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ iri: 'http://ex.org/a', prefLabel: 'Alpha', broader: ['http://ex.org/b'] })
    expect(result[1]).toEqual({ iri: 'http://ex.org/b', prefLabel: 'Beta', broader: [] })
  })

  it('falls back to IRI when no prefLabel', () => {
    const store = makeStore([{ iri: 'http://ex.org/no-label' }])
    const result = extractConceptSummaries(store)
    expect(result[0]!.prefLabel).toBe('http://ex.org/no-label')
  })

  it('sorts alphabetically by prefLabel', () => {
    const store = makeStore([
      { iri: 'http://ex.org/c', prefLabel: 'Zeta' },
      { iri: 'http://ex.org/a', prefLabel: 'Alpha' },
      { iri: 'http://ex.org/b', prefLabel: 'Mu' },
    ])
    const result = extractConceptSummaries(store)
    expect(result.map(c => c.prefLabel)).toEqual(['Alpha', 'Mu', 'Zeta'])
  })

  it('handles multiple broader parents', () => {
    const store = makeStore([
      { iri: 'http://ex.org/child', prefLabel: 'Child', broader: ['http://ex.org/p1', 'http://ex.org/p2'] },
    ])
    const result = extractConceptSummaries(store)
    expect(result[0]!.broader).toEqual(['http://ex.org/p1', 'http://ex.org/p2'])
  })
})

describe('extractNormalizedConcepts', () => {
  it('returns empty array for empty store', () => {
    const store = new Store()
    expect(extractNormalizedConcepts(store)).toEqual([])
  })

  it('includes altLabels, definition, and notation', () => {
    const store = makeStore([{
      iri: 'http://ex.org/a',
      prefLabel: 'Alpha',
      altLabels: ['Alt1', 'Alt2'],
      definition: 'A definition',
      notation: 'A01',
      broader: ['http://ex.org/parent'],
    }])
    const result = extractNormalizedConcepts(store)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      iri: 'http://ex.org/a',
      prefLabel: 'Alpha',
      altLabels: ['Alt1', 'Alt2'],
      definition: 'A definition',
      notation: 'A01',
      broader: ['http://ex.org/parent'],
    })
  })

  it('omits optional fields when not present', () => {
    const store = makeStore([{ iri: 'http://ex.org/simple', prefLabel: 'Simple' }])
    const result = extractNormalizedConcepts(store)
    expect(result[0]).toEqual({
      iri: 'http://ex.org/simple',
      prefLabel: 'Simple',
      altLabels: undefined,
      definition: undefined,
      notation: undefined,
      broader: [],
    })
  })

  it('sorts alphabetically by prefLabel', () => {
    const store = makeStore([
      { iri: 'http://ex.org/z', prefLabel: 'Zeta' },
      { iri: 'http://ex.org/a', prefLabel: 'Alpha' },
    ])
    const result = extractNormalizedConcepts(store)
    expect(result.map(c => c.prefLabel)).toEqual(['Alpha', 'Zeta'])
  })
})
