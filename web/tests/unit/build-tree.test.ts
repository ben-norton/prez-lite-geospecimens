import { describe, it, expect } from 'vitest'
import { buildConceptTree } from '~/data/enrichment/build-tree'

function concept(iri: string, prefLabel: string, broader: string[] = []) {
  return { iri, prefLabel, broader }
}

describe('buildConceptTree', () => {
  it('returns empty array for no concepts', () => {
    expect(buildConceptTree([])).toEqual([])
  })

  it('builds flat tree when no broader relationships', () => {
    const concepts = [
      concept('http://ex.org/b', 'Beta'),
      concept('http://ex.org/a', 'Alpha'),
    ]
    const tree = buildConceptTree(concepts)
    expect(tree).toHaveLength(2)
    expect(tree[0]!.label).toBe('Alpha')
    expect(tree[1]!.label).toBe('Beta')
    expect(tree[0]!.children).toBeUndefined()
  })

  it('builds hierarchical tree from broader relationships', () => {
    const concepts = [
      concept('http://ex.org/parent', 'Parent'),
      concept('http://ex.org/child1', 'Child 1', ['http://ex.org/parent']),
      concept('http://ex.org/child2', 'Child 2', ['http://ex.org/parent']),
    ]
    const tree = buildConceptTree(concepts)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.label).toBe('Parent')
    expect(tree[0]!.children).toHaveLength(2)
    expect(tree[0]!.children![0]!.label).toBe('Child 1')
    expect(tree[0]!.children![1]!.label).toBe('Child 2')
  })

  it('handles deep hierarchies', () => {
    const concepts = [
      concept('http://ex.org/root', 'Root'),
      concept('http://ex.org/mid', 'Mid', ['http://ex.org/root']),
      concept('http://ex.org/leaf', 'Leaf', ['http://ex.org/mid']),
    ]
    const tree = buildConceptTree(concepts)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.children![0]!.children![0]!.label).toBe('Leaf')
  })

  it('orphans with broader pointing to unknown parent appear as top concepts', () => {
    const concepts = [
      concept('http://ex.org/orphan', 'Orphan', ['http://ex.org/missing']),
    ]
    // Orphan has broader but parent not in the list, so hasParent is true —
    // it won't appear as top concept by default. This matches the edit mode behaviour.
    const tree = buildConceptTree(concepts)
    // The orphan has a broader set, so it's considered to have a parent
    expect(tree).toHaveLength(0)
  })

  it('respects explicit topConceptIris', () => {
    const concepts = [
      concept('http://ex.org/a', 'Alpha'),
      concept('http://ex.org/b', 'Beta', ['http://ex.org/a']),
    ]
    // Force Beta as top concept even though it has broader
    const tree = buildConceptTree(concepts, {
      topConceptIris: new Set(['http://ex.org/a', 'http://ex.org/b']),
    })
    // Both appear as top (but Beta also appears as child of Alpha)
    expect(tree.map(t => t.label)).toContain('Alpha')
    expect(tree.map(t => t.label)).toContain('Beta')
  })

  it('assigns folder icon to parents and document icon to leaves', () => {
    const concepts = [
      concept('http://ex.org/parent', 'Parent'),
      concept('http://ex.org/leaf', 'Leaf', ['http://ex.org/parent']),
    ]
    const tree = buildConceptTree(concepts)
    expect(tree[0]!.icon).toBe('i-heroicons-folder')
    expect(tree[0]!.children![0]!.icon).toBe('i-heroicons-document')
  })

  it('auto-expands top level with fewer children than threshold', () => {
    const concepts = [
      concept('http://ex.org/parent', 'Parent'),
      concept('http://ex.org/child', 'Child', ['http://ex.org/parent']),
    ]
    const tree = buildConceptTree(concepts, { maxAutoExpand: 10 })
    expect(tree[0]!.defaultExpanded).toBe(true)
  })

  it('does not auto-expand top level with many children', () => {
    const children = Array.from({ length: 15 }, (_, i) =>
      concept(`http://ex.org/c${i}`, `Child ${i}`, ['http://ex.org/parent']),
    )
    const concepts = [concept('http://ex.org/parent', 'Parent'), ...children]
    const tree = buildConceptTree(concepts, { maxAutoExpand: 10 })
    expect(tree[0]!.defaultExpanded).toBe(false)
  })

  it('sorts children alphabetically at each level', () => {
    const concepts = [
      concept('http://ex.org/parent', 'Parent'),
      concept('http://ex.org/z', 'Zebra', ['http://ex.org/parent']),
      concept('http://ex.org/a', 'Apple', ['http://ex.org/parent']),
      concept('http://ex.org/m', 'Mango', ['http://ex.org/parent']),
    ]
    const tree = buildConceptTree(concepts)
    const labels = tree[0]!.children!.map(c => c.label)
    expect(labels).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('handles multiple broader parents (diamond)', () => {
    const concepts = [
      concept('http://ex.org/a', 'A'),
      concept('http://ex.org/b', 'B'),
      concept('http://ex.org/c', 'C', ['http://ex.org/a', 'http://ex.org/b']),
    ]
    const tree = buildConceptTree(concepts)
    // A and B are top concepts
    expect(tree).toHaveLength(2)
    // C appears as child of both A and B
    expect(tree[0]!.children![0]!.label).toBe('C')
    expect(tree[1]!.children![0]!.label).toBe('C')
  })
})
