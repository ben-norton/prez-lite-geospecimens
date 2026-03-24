import { fetchSchemes, fetchConcepts, fetchLabels, fetchVocabMetadata, fetchListCollections, getLabel, buildConceptMap, resolveLabel, type Scheme, type Concept, type LabelsIndex, type CollectionListItem } from '~/composables/useVocabData'
import { useAnnotatedProperties, type RenderedProperty, type PropertyValue } from '~/utils/annotated-properties'
import { buildConceptTree, type TreeItem } from '~/data/enrichment/build-tree'

export type { TreeItem }

/**
 * Format property values as a simple string for table display
 */
function formatPropertyValues(values: PropertyValue[]): string {
  return values.map(v => {
    if (v.type === 'literal') {
      return v.value
    } else if (v.type === 'iri') {
      return v.label ?? v.value
    } else if (v.type === 'nested' && v.nestedProperties) {
      // Format nested properties as key: value pairs
      return v.nestedProperties
        .map(np => `${np.predicateLabel}: ${formatPropertyValues(np.values)}`)
        .join('; ')
    }
    return ''
  }).join(', ')
}

export function useScheme(uri: Ref<string>) {
  const { data: schemes } = useAsyncData('schemes', fetchSchemes, { server: false, lazy: true })
  const scheme = computed(() => schemes.value?.find(s => s.iri === uri.value))

  // Get slug for annotated properties lookup
  const { data: vocabMetadata } = useAsyncData('vocabMetadata', fetchVocabMetadata, { server: false, lazy: true })
  const currentVocabMeta = computed(() => vocabMetadata.value?.find(v => v.iri === uri.value))
  const slug = computed(() => currentVocabMeta.value?.slug)
  const validation = computed(() => currentVocabMeta.value?.validation)

  const { data: concepts, status } = useAsyncData(
    () => `concepts-${uri.value}`,
    () => uri.value ? fetchConcepts(uri.value) : Promise.resolve([]),
    { server: false, lazy: true, watch: [uri] }
  )

  const { data: labelsIndex } = useAsyncData('labels', fetchLabels, { server: false, lazy: true })

  // Fetch collections for this vocab (only when slug is available and collections exist)
  const hasCollections = computed(() => (currentVocabMeta.value?.collectionCount ?? 0) > 0)
  const { data: collections } = useAsyncData(
    () => `collections-${slug.value}`,
    () => slug.value && hasCollections.value ? fetchListCollections(slug.value) : Promise.resolve([]),
    { server: false, lazy: true, watch: [slug, hasCollections] }
  )

  // Get annotated properties from the anot-ld-json file
  const { properties: annotatedProperties, status: annotatedStatus } = useAnnotatedProperties(slug, 'conceptScheme')

  const conceptMap = computed(() => concepts.value ? buildConceptMap(concepts.value) : new Map())

  // Build tree items for UTree
  const treeItems = computed(() => {
    if (!concepts.value || !scheme.value) return []

    // Collect explicit top concept IRIs
    const topConceptIris = new Set<string>([
      ...(scheme.value.topConcepts ?? []),
      ...concepts.value
        .filter(c => c.topConceptOf?.includes(scheme.value!.iri))
        .map(c => c.iri),
    ])

    // Map Concept objects to the TreeConcept shape expected by buildConceptTree
    const treeConcepts = concepts.value.map(c => ({
      iri: c.iri,
      prefLabel: getLabel(c.prefLabel),
      broader: c.broader ?? [],
    }))

    return buildConceptTree(treeConcepts, { topConceptIris })
  })

  // Metadata table - use annotated properties if available, fallback to basic
  const metadataRows = computed(() => {
    // If we have annotated properties, use them
    if (annotatedProperties.value?.length) {
      return annotatedProperties.value.map(prop => ({
        property: prop.predicateLabel,
        propertyIri: prop.predicate,
        propertyDescription: prop.predicateDescription,
        value: formatPropertyValues(prop.values),
        values: prop.values, // Keep raw values for rich rendering
      }))
    }

    // Fallback to basic scheme metadata
    if (!scheme.value) return []
    const rows: { property: string; value: string }[] = []

    if (scheme.value.version) rows.push({ property: 'Version', value: scheme.value.version })
    if (scheme.value.created) rows.push({ property: 'Created', value: scheme.value.created })
    if (scheme.value.modified) rows.push({ property: 'Modified', value: scheme.value.modified })

    // Resolve creator/publisher labels
    if (scheme.value.creator?.length) {
      const labels = scheme.value.creatorLabels?.filter(Boolean) || []
      rows.push({
        property: 'Creator',
        value: labels.length ? labels.join(', ') : scheme.value.creator.map(c => resolveLabel(c, conceptMap.value, labelsIndex.value || {}, 'en')).join(', ')
      })
    }
    if (scheme.value.publisher?.length) {
      const labels = scheme.value.publisherLabels?.filter(Boolean) || []
      rows.push({
        property: 'Publisher',
        value: labels.length ? labels.join(', ') : scheme.value.publisher.map(p => resolveLabel(p, conceptMap.value, labelsIndex.value || {}, 'en')).join(', ')
      })
    }

    rows.push({ property: 'Concept Count', value: String(scheme.value.conceptCount) })

    return rows
  })

  // Re-export annotated properties for components that want rich rendering
  const richMetadata = computed(() => annotatedProperties.value ?? [])

  const breadcrumbs = computed(() => [
    { label: 'Vocabularies', to: '/vocabs' },
    { label: getLabel(scheme.value?.prefLabel) || 'Scheme' }
  ])

  return {
    scheme,
    schemes,
    concepts,
    collections,
    status,
    labelsIndex,
    conceptMap,
    treeItems,
    metadataRows,
    richMetadata,
    slug,
    validation,
    breadcrumbs
  }
}
