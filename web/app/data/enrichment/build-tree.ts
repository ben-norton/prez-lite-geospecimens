/**
 * Build a concept tree from broader/narrower relationships.
 *
 * Works with any concept-like objects that have iri, prefLabel, and broader[].
 * Shared between useScheme (static data) and useEditMode (N3 Store data).
 */

export interface TreeItem {
  id: string
  label: string
  icon?: string
  children?: TreeItem[]
  defaultExpanded?: boolean
}

interface TreeConcept {
  iri: string
  prefLabel: string
  broader: string[]
}

export interface BuildTreeOptions {
  /** Explicitly declared top concept IRIs (from scheme.topConcepts or topConceptOf) */
  topConceptIris?: Set<string>
  /** Max children for auto-expand at depth 0 (default: 10) */
  maxAutoExpand?: number
}

/**
 * Build a hierarchical tree from a flat list of concepts with broader references.
 *
 * Top concepts are determined by:
 * 1. Explicit topConceptIris (if provided)
 * 2. Concepts with no broader parents
 *
 * Returns sorted TreeItem[] suitable for UTree component.
 */
export function buildConceptTree(
  concepts: TreeConcept[],
  options: BuildTreeOptions = {},
): TreeItem[] {
  const { topConceptIris, maxAutoExpand = 10 } = options

  if (concepts.length === 0) return []

  // Build narrower map (parent → children)
  const narrowerMap = new Map<string, TreeConcept[]>()
  for (const c of concepts) {
    for (const b of c.broader) {
      if (!narrowerMap.has(b)) narrowerMap.set(b, [])
      narrowerMap.get(b)!.push(c)
    }
  }

  // Find top concepts
  const hasParent = new Set(
    concepts.filter(c => c.broader.length > 0).map(c => c.iri),
  )
  const topConcepts = topConceptIris
    ? concepts.filter(c => topConceptIris.has(c.iri) || !hasParent.has(c.iri))
    : concepts.filter(c => !hasParent.has(c.iri))

  // Recursive tree builder
  function buildNode(concept: TreeConcept, depth = 0): TreeItem {
    const children = narrowerMap.get(concept.iri) || []
    return {
      id: concept.iri,
      label: concept.prefLabel,
      icon: children.length > 0 ? 'i-heroicons-folder' : 'i-heroicons-document',
      defaultExpanded: depth === 0 && children.length < maxAutoExpand,
      children: children.length > 0
        ? children
            .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
            .map(c => buildNode(c, depth + 1))
        : undefined,
    }
  }

  return topConcepts
    .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
    .map(c => buildNode(c))
}
