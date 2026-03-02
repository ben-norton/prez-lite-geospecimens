import { describe, it, expect, beforeEach } from 'vitest'
import { cacheGet, cacheSet, cacheDel, cacheClear, cacheKey } from '~/data/cache/idb-cache'

// Tests run without IndexedDB, so the memory fallback is used

describe('idb-cache (memory fallback)', () => {
  beforeEach(async () => {
    await cacheClear()
  })

  it('returns null for missing keys', async () => {
    const result = await cacheGet('nonexistent')
    expect(result).toBeNull()
  })

  it('stores and retrieves values', async () => {
    await cacheSet('test-key', { name: 'Alpha', count: 42 })
    const result = await cacheGet<{ name: string; count: number }>('test-key')
    expect(result).toEqual({ name: 'Alpha', count: 42 })
  })

  it('overwrites existing values', async () => {
    await cacheSet('key', { v: 1 })
    await cacheSet('key', { v: 2 })
    const result = await cacheGet<{ v: number }>('key')
    expect(result).toEqual({ v: 2 })
  })

  it('deletes values', async () => {
    await cacheSet('key', 'value')
    await cacheDel('key')
    const result = await cacheGet('key')
    expect(result).toBeNull()
  })

  it('clears all values', async () => {
    await cacheSet('a', 1)
    await cacheSet('b', 2)
    await cacheClear()
    expect(await cacheGet('a')).toBeNull()
    expect(await cacheGet('b')).toBeNull()
  })

  it('stores complex objects', async () => {
    const data = {
      iri: 'http://example.org/scheme',
      prefLabel: 'Test',
      concepts: [
        { iri: 'http://example.org/c1', broader: [] },
        { iri: 'http://example.org/c2', broader: ['http://example.org/c1'] },
      ],
    }
    await cacheSet('complex', data)
    expect(await cacheGet('complex')).toEqual(data)
  })
})

describe('cacheKey', () => {
  it('builds key without sha', () => {
    expect(cacheKey('static', 'my-vocab')).toBe('static/my-vocab')
  })

  it('builds key with sha', () => {
    expect(cacheKey('github:main', 'my-vocab', 'abc123')).toBe('github:main/my-vocab/abc123')
  })
})
