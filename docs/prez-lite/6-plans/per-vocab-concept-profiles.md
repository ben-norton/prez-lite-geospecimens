# Per-Vocabulary Concept Profiles

> **Status**: Parked
> **Priority**: Medium — unblocks Suncorp multi-domain use case

## Problem

The current architecture supports one global concept profile. All vocabularies share the same property ordering and field configuration. The edit form and property display can't adapt to the structure of individual vocabularies.

Prompted by: "The Edit form would know the vocab it is inside and would render the form elements based on the vocab structure."

## Current State

The profile pipeline:

1. `data/config/profiles.ttl` defines SHACL shapes with `sh:property` entries
2. `shacl-profile-parser.ts` parses into `ProfileConfig`
3. `process-vocab.js` > `buildProfileJson()` writes `profile.json` keyed by type (`concept`, `conceptScheme`)
4. Web app loads single `profile.json`, passes to `getPropertiesForSubject(store, iri, type, profileConfig)`

**Limitation**: `buildProfileJson()` iterates profiles by `targetClass` — if multiple concept profiles exist, last one wins. No scheme-scoping mechanism exists.

**What already works**:

- Profile-properties discovery shows all populated predicates (unknown properties appear at order 1000+)
- `schemeIri` is already available in `useEditMode` and `github-ttl.ts`
- `getPropertiesForSubject()` is parameterised — just needs different config per vocab

## Proposed Design

### Output format

Extend `profile.json` with a `schemeProfiles` map alongside the existing global profiles:

```json
{
  "concept": { "propertyOrder": [...] },
  "conceptScheme": { "propertyOrder": [...] },
  "schemeProfiles": {
    "<scheme-iri>": {
      "concept": { "propertyOrder": [...] }
    }
  }
}
```

### Lookup logic

`getPropertiesForSubject()` gains an optional `schemeIri` parameter:

1. Check `schemeProfiles[schemeIri]?.[type]` — use if present
2. Fall back to global `[type]` profile
3. Fall back to built-in defaults (existing behaviour)

### Files involved

| File | Change |
|------|--------|
| `data/config/profiles.ttl` (per site) | Add per-vocab concept profiles |
| `web/app/utils/shacl-profile-parser.ts` | Parse scheme-scoping predicate on profiles |
| `packages/data-processing/scripts/process-vocab.js` | Extend `buildProfileJson()` output |
| `web/app/data/enrichment/profile-properties.ts` | Add `schemeIri` param + `schemeProfiles` to `ProfileConfig` |
| `web/app/composables/useEditMode.ts` | Pass `schemeIri` to profile lookup |
| `web/app/data/adapters/github-ttl.ts` | Pass scheme IRI to profile lookup |

## Open Questions

### 1. How to express scope in profiles.ttl

**Option A: `prez:appliesToScheme` on the profile shape** (recommended)

```turtle
prez:SuncorpInsuranceConceptProfile a prof:Profile ;
    sh:targetClass skos:Concept ;
    prez:appliesToScheme <https://example.com/vocab/insurance-types> ;
    sh:property [ sh:path skos:prefLabel ; sh:order 1 ] ;
    sh:property [ sh:path skos:notation ; sh:order 2 ] .
```

- Simple, explicit, all in profiles.ttl
- Parser reads one extra predicate
- Downside: profiles.ttl grows with number of vocabs

**Option B: `prez:conceptProfile` on each ConceptScheme in vocab TTL**

```turtle
<https://example.com/vocab/insurance-types> a skos:ConceptScheme ;
    prez:conceptProfile prez:SuncorpInsuranceConceptProfile .
```

- More decoupled — vocab declares its own profile preference
- Requires touching source data
- Profile must still be defined somewhere (profiles.ttl or separate file)
- Parser needs to read vocab TTL at build time to discover the link

**Option C: Convention-based (profile identifier matches vocab slug)**

- Implicit — no explicit link declared
- Fragile — depends on naming alignment
- Not recommended

### 2. ConceptScheme-level overrides

Different vocabs might want different scheme metadata ordering too (e.g. one vocab shows `reg:status` prominently, another doesn't use it). The same `schemeProfiles` mechanism supports this — the per-scheme map already includes a `conceptScheme` key:

```json
"schemeProfiles": {
  "<scheme-iri>": {
    "concept": { "propertyOrder": [...] },
    "conceptScheme": { "propertyOrder": [...] }
  }
}
```

Decision: include in initial implementation or defer?

### 3. Field type mapping

Currently hardcoded by predicate IRI (`TEXTAREA_PREDICATES`, `DATE_PREDICATES`, etc.). Per-vocab profiles could declare field types via:

- `sh:datatype` on the property shape (e.g. `xsd:date` implies date picker)
- `prez:fieldType` hint (e.g. `prez:fieldType "textarea"`)

Not strictly required for per-vocab profiles but a natural extension. Could be a follow-up.

### 4. Cardinality per vocab

Currently merged globally from validator SHACL shapes. Per-vocab profiles could carry their own `sh:minCount`/`sh:maxCount`, enabling "required fields" that differ between vocabs.

The existing cardinality merge in `buildProfileJson()` works at the class level. Per-scheme cardinality would need to override at the scheme-profile level. Same fallback pattern: scheme-specific > global > built-in.

### 5. Multiple profiles per scheme

Should a single vocabulary be able to declare different profiles for different user roles (e.g. expert vs. simple view)? This is a significant scope increase and likely a separate feature. Park for now.

## Implementation Estimate

Small-to-medium change:

- ~20 lines in `shacl-profile-parser.ts` (new field + parsing)
- ~15 lines in `profile-properties.ts` (type extension + lookup)
- ~30 lines in `process-vocab.js` (scheme-scoped output)
- ~5 lines each in `useEditMode.ts` and `github-ttl.ts` (pass-through)
- ~60 lines of new tests

No breaking changes — `schemeProfiles` is additive; existing `profile.json` files work unchanged.
