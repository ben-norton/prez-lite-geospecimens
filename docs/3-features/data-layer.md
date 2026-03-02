# Unified Data Layer

> Status: ✅ Complete

## Overview

The unified data layer abstracts vocabulary data loading across three sources — static JSON exports, GitHub TTL files, and SPARQL endpoints — providing a normalized interface for UI components.

## Architecture

```
                    ┌─────────────┐
  Frontend ────────►│  Data Layer  │──── unified interface
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         JSON source   TTL source   SPARQL source
         (static)      (GitHub)     (endpoint)
              │            │            │
              ▼            ▼            ▼
         parse JSON    parse TTL    query results
                       + enrich
              │            │            │
              └────────────┼────────────┘
                           ▼
                    Normalized model
                    (same shape regardless of source)
                           │
                           ▼
                    Cache (IndexedDB)
                    keyed by source + sha/etag
```

## Normalized Types

Defined in `web/app/types/vocab-data.ts`:

- **NormalizedScheme** — scheme metadata with properties
- **NormalizedListConcept** — minimal concept for lists/trees (iri, prefLabel, broader[])
- **NormalizedConcept** — full concept with all properties
- **NormalizedProperty** — predicate + ordered values

## Shared Enrichment Utilities

Extracted to `web/app/data/enrichment/`:

| Module | Purpose |
|--------|---------|
| `build-tree.ts` | Hierarchical `TreeItem[]` from flat concepts with broader refs |
| `extract-concepts.ts` | Concept extraction from N3.Store |
| `profile-properties.ts` | Profile-ordered property extraction from N3.Store |

These utilities are used by both `useScheme` (read-only browsing) and `useEditMode` (structured editing), eliminating prior duplication.

## Adapter Interface

```typescript
interface VocabSourceAdapter {
  readonly key: string
  loadScheme(slug: string): Promise<NormalizedScheme>
  loadConceptList(slug: string): Promise<NormalizedListConcept[]>
  loadConcept(slug: string, conceptIri: string): Promise<NormalizedConcept | null>
  loadLabels(): Promise<LabelIndex>
  checkFreshness?(slug: string): Promise<boolean>
}
```

## Caching Strategy

IndexedDB cache stores **enriched** results (not raw data), so cache hits skip both download and processing.

### GitHub ETag Flow

```
First load:  GET /contents/vocab.ttl → 200 + sha + content → parse + enrich → cache
Next load:   GET /contents/vocab.ttl (If-None-Match: sha) → 304 → use cache
After edit:  GET /contents/vocab.ttl (If-None-Match: old-sha) → 200 → reparse → update cache
```

Cache key format: `{branch}/{path}/{sha}`

## Workspace System

Users select a workspace (branch) when logged in. Workspace state lives in `sessionStorage` and clears on tab close.

### Branch Types

- **Protected** (`main`, `stage`, `dev`) — can't delete, shown with badge
- **User branches** (`<username>/<name>`) — can create/delete

### Data Source Selection

| State | Source |
|-------|--------|
| Logged out | Static JSON exports |
| Logged in + workspace selected | GitHub TTL on workspace branch |
| SPARQL mode | SPARQL endpoint |

## Key Files

| Path | Purpose |
|------|---------|
| `web/app/types/vocab-data.ts` | Normalized type definitions |
| `web/app/data/types.ts` | `VocabSourceAdapter` interface |
| `web/app/data/enrichment/` | Shared utilities (tree, concepts, properties) |
| `web/app/data/adapters/static-json.ts` | Static JSON adapter |
| `web/app/data/adapters/github-ttl.ts` | GitHub TTL adapter with ETag freshness |
| `web/app/data/cache/idb-cache.ts` | IndexedDB cache with memory fallback |
| `web/app/composables/useVocabSource.ts` | Main data source composable |
| `web/app/composables/useWorkspace.ts` | Branch selection and GitHub branch API |
| `web/app/components/WorkspaceSelector.vue` | Workspace selection modal |

## Implementation Phases

1. ✅ Extract shared utilities (enrichment modules)
2. ✅ Workspace composable and UI
3. ✅ Source adapters and data layer
4. ✅ Full integration and cleanup
