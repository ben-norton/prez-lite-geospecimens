/**
 * Normalized vocabulary data types
 *
 * These types represent the unified shape for vocabulary data
 * regardless of its source (static JSON, GitHub TTL, or SPARQL).
 */

import type { RenderedProperty } from '~/utils/annotated-properties'

/**
 * A single property value in the normalized model.
 * Covers literals, IRIs, and blank-node containers.
 */
export interface NormalizedPropertyValue {
  type: 'literal' | 'iri' | 'blank-node'
  value: string
  language?: string
  datatype?: string
  label?: string
  nestedProperties?: NormalizedProperty[]
}

/**
 * A property with its predicate metadata and values.
 * Profile-ordered when profile config is available.
 */
export interface NormalizedProperty {
  predicate: string
  predicateLabel: string
  predicateDescription?: string
  order: number
  values: NormalizedPropertyValue[]
}

/**
 * Minimal concept representation for lists and trees.
 * Common denominator across all data sources.
 */
export interface NormalizedListConcept {
  iri: string
  prefLabel: string
  altLabels?: string[]
  definition?: string
  notation?: string
  broader: string[]
}

/**
 * Full concept with all properties, used on concept detail pages.
 */
export interface NormalizedConcept {
  iri: string
  prefLabel: string
  properties: NormalizedProperty[]
  /** Rich annotated properties (available from static JSON or enriched TTL) */
  richMetadata?: RenderedProperty[]
}

/**
 * Scheme metadata in normalized form.
 */
export interface NormalizedScheme {
  iri: string
  prefLabel: string
  definition?: string
  conceptCount: number
  topConcepts?: string[]
  modified?: string
  created?: string
  version?: string
  properties: NormalizedProperty[]
  /** Rich annotated properties */
  richMetadata?: RenderedProperty[]
}
