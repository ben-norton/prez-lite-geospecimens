import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createGitHubTTLAdapter } from '~/data/adapters/github-ttl'

// Mock profile.json endpoint
const mockProfileJson = {
  conceptScheme: {
    propertyOrder: [
      { path: 'http://www.w3.org/2004/02/skos/core#prefLabel', order: 1 },
      { path: 'http://www.w3.org/2004/02/skos/core#definition', order: 2 },
    ],
  },
  concept: {
    propertyOrder: [
      { path: 'http://www.w3.org/2004/02/skos/core#prefLabel', order: 1 },
      { path: 'http://www.w3.org/2004/02/skos/core#broader', order: 2 },
    ],
  },
}

const sampleTTL = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<http://example.org/scheme> a skos:ConceptScheme ;
    skos:prefLabel "Test Scheme"@en ;
    skos:definition "A test scheme"@en .

<http://example.org/c1> a skos:Concept ;
    skos:prefLabel "Alpha"@en ;
    skos:definition "First concept"@en ;
    skos:altLabel "A"@en ;
    skos:notation "01" ;
    skos:inScheme <http://example.org/scheme> ;
    skos:topConceptOf <http://example.org/scheme> .

<http://example.org/c2> a skos:Concept ;
    skos:prefLabel "Beta"@en ;
    skos:broader <http://example.org/c1> ;
    skos:inScheme <http://example.org/scheme> .
`

function encodeBase64(text: string): string {
  return btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''))
}

describe('github-ttl adapter', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString()

      // GitHub Contents API
      if (urlStr.includes('api.github.com/repos') && urlStr.includes('contents')) {
        return new Response(JSON.stringify({
          content: encodeBase64(sampleTTL),
          sha: 'abc123',
          name: 'test.ttl',
        }), { status: 200 })
      }

      // Profile JSON
      if (urlStr.includes('profile.json')) {
        return new Response(JSON.stringify(mockProfileJson), { status: 200 })
      }

      // Labels JSON
      if (urlStr.includes('labels.json')) {
        return new Response(JSON.stringify({}), { status: 200 })
      }

      return new Response('Not found', { status: 404 })
    }) as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function makeAdapter() {
    return createGitHubTTLAdapter({
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      vocabPath: 'data/vocabs',
      token: 'test-token',
    })
  }

  it('has key with branch name', () => {
    const adapter = makeAdapter()
    expect(adapter.key).toBe('github:main')
  })

  it('loadScheme fetches and parses TTL', async () => {
    const adapter = makeAdapter()
    const scheme = await adapter.loadScheme('test')
    expect(scheme).not.toBeNull()
    expect(scheme!.iri).toBe('http://example.org/scheme')
    expect(scheme!.prefLabel).toBe('Test Scheme')
    expect(scheme!.definition).toBe('A test scheme')
    expect(scheme!.conceptCount).toBe(2)
  })

  it('loadScheme includes profile-ordered properties', async () => {
    const adapter = makeAdapter()
    const scheme = await adapter.loadScheme('test')
    expect(scheme!.properties.length).toBeGreaterThan(0)
    // First property should be prefLabel (order 1 in profile)
    expect(scheme!.properties[0]!.predicate).toBe('http://www.w3.org/2004/02/skos/core#prefLabel')
  })

  it('loadConceptList returns normalized concepts', async () => {
    const adapter = makeAdapter()
    const concepts = await adapter.loadConceptList('test')
    expect(concepts).toHaveLength(2)

    const alpha = concepts.find(c => c.iri === 'http://example.org/c1')!
    expect(alpha.prefLabel).toBe('Alpha')
    expect(alpha.altLabels).toEqual(['A'])
    expect(alpha.definition).toBe('First concept')
    expect(alpha.notation).toBe('01')
    expect(alpha.broader).toEqual([])

    const beta = concepts.find(c => c.iri === 'http://example.org/c2')!
    expect(beta.broader).toEqual(['http://example.org/c1'])
  })

  it('loadConcept returns full concept with properties', async () => {
    const adapter = makeAdapter()
    const concept = await adapter.loadConcept('test', 'http://example.org/c1')
    expect(concept).not.toBeNull()
    expect(concept!.iri).toBe('http://example.org/c1')
    expect(concept!.prefLabel).toBe('Alpha')
    expect(concept!.properties.length).toBeGreaterThan(0)
  })

  it('loadConcept returns null for unknown IRI', async () => {
    const adapter = makeAdapter()
    const concept = await adapter.loadConcept('test', 'http://example.org/unknown')
    expect(concept).toBeNull()
  })

  it('caches parsed store (second call does not re-fetch)', async () => {
    const adapter = makeAdapter()
    await adapter.loadScheme('test')
    await adapter.loadConceptList('test')
    // fetch should only be called once for the TTL file + once for profile
    const fetchCalls = (globalThis.fetch as any).mock.calls.filter(
      (c: any[]) => c[0].toString().includes('contents'),
    )
    expect(fetchCalls).toHaveLength(1)
  })

  it('checkFreshness returns true on 304', async () => {
    const adapter = makeAdapter()
    // Populate cache first
    await adapter.loadScheme('test')

    // Override fetch to return 304 for freshness check
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 304 })) as any

    const fresh = await adapter.checkFreshness!('test')
    expect(fresh).toBe(true)
  })

  it('loadLabels returns labels index', async () => {
    const adapter = makeAdapter()
    const labels = await adapter.loadLabels()
    expect(labels).toEqual({})
  })

  it('loadScheme returns null when file not found', async () => {
    globalThis.fetch = vi.fn(async () => new Response('Not found', { status: 404 })) as any
    const adapter = makeAdapter()
    const scheme = await adapter.loadScheme('missing')
    expect(scheme).toBeNull()
  })
})
