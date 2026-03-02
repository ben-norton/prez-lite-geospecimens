import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStaticJsonAdapter } from '~/data/adapters/static-json'

// Mock the useVocabData fetch functions
vi.mock('~/composables/useVocabData', () => ({
  fetchVocabMetadata: vi.fn(),
  fetchListConcepts: vi.fn(),
  fetchLabels: vi.fn(),
}))

const { fetchVocabMetadata, fetchListConcepts, fetchLabels } = await import('~/composables/useVocabData')

const mockMetadata = [
  {
    iri: 'http://example.org/vocab1',
    slug: 'vocab1',
    prefLabel: 'Vocab One',
    definition: 'First vocabulary',
    conceptCount: 3,
    topConcepts: ['http://example.org/c1'],
    modified: '2026-01-01',
    created: '2025-01-01',
    version: '1.0',
  },
]

const mockConcepts = [
  { iri: 'http://example.org/c1', prefLabel: 'Concept 1', altLabels: ['C1'], definition: 'First', notation: '01', broader: undefined },
  { iri: 'http://example.org/c2', prefLabel: 'Concept 2', broader: 'http://example.org/c1' },
  { iri: 'http://example.org/c3', prefLabel: 'Concept 3', broader: 'http://example.org/c1' },
]

const mockLabels = {
  'http://example.org/org1': { en: 'Example Org' },
}

describe('static-json adapter', () => {
  beforeEach(() => {
    vi.mocked(fetchVocabMetadata).mockResolvedValue(mockMetadata as any)
    vi.mocked(fetchListConcepts).mockResolvedValue(mockConcepts as any)
    vi.mocked(fetchLabels).mockResolvedValue(mockLabels)
  })

  it('has key "static"', () => {
    const adapter = createStaticJsonAdapter()
    expect(adapter.key).toBe('static')
  })

  it('loadScheme returns normalized scheme', async () => {
    const adapter = createStaticJsonAdapter()
    const scheme = await adapter.loadScheme('vocab1')
    expect(scheme).not.toBeNull()
    expect(scheme!.iri).toBe('http://example.org/vocab1')
    expect(scheme!.prefLabel).toBe('Vocab One')
    expect(scheme!.definition).toBe('First vocabulary')
    expect(scheme!.conceptCount).toBe(3)
    expect(scheme!.version).toBe('1.0')
  })

  it('loadScheme returns null for unknown slug', async () => {
    const adapter = createStaticJsonAdapter()
    const scheme = await adapter.loadScheme('unknown')
    expect(scheme).toBeNull()
  })

  it('loadConceptList returns normalized concepts', async () => {
    const adapter = createStaticJsonAdapter()
    const concepts = await adapter.loadConceptList('vocab1')
    expect(concepts).toHaveLength(3)
    expect(concepts[0]!.iri).toBe('http://example.org/c1')
    expect(concepts[0]!.prefLabel).toBe('Concept 1')
    expect(concepts[0]!.altLabels).toEqual(['C1'])
    expect(concepts[0]!.definition).toBe('First')
    expect(concepts[0]!.notation).toBe('01')
    expect(concepts[0]!.broader).toEqual([])
  })

  it('loadConceptList maps broader string to array', async () => {
    const adapter = createStaticJsonAdapter()
    const concepts = await adapter.loadConceptList('vocab1')
    const c2 = concepts.find(c => c.iri === 'http://example.org/c2')!
    expect(c2.broader).toEqual(['http://example.org/c1'])
  })

  it('loadConcept returns concept for known IRI', async () => {
    const adapter = createStaticJsonAdapter()
    const concept = await adapter.loadConcept('vocab1', 'http://example.org/c1')
    expect(concept).not.toBeNull()
    expect(concept!.iri).toBe('http://example.org/c1')
    expect(concept!.prefLabel).toBe('Concept 1')
  })

  it('loadConcept returns null for unknown IRI', async () => {
    const adapter = createStaticJsonAdapter()
    const concept = await adapter.loadConcept('vocab1', 'http://example.org/unknown')
    expect(concept).toBeNull()
  })

  it('loadLabels returns labels index', async () => {
    const adapter = createStaticJsonAdapter()
    const labels = await adapter.loadLabels()
    expect(labels).toEqual(mockLabels)
  })
})
