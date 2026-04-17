# Custom Metadata Attributes on Concepts

> How to add custom properties to SKOS concepts in TTL source files and control their display.

## Status: ✅ Supported

The data processing pipeline is **fully property-agnostic** — any RDF property added to a concept in TTL is automatically extracted, preserved in exports, and rendered in the UI.

## Adding Custom Properties

Add any RDF property directly to concepts in your TTL vocabulary files (`data/vocabs/*.ttl`):

```turtle
@prefix ex: <http://example.com/> .

:redConcept a skos:Concept ;
    skos:prefLabel "Red"@en ;
    skos:definition "The colour red"@en ;
    skos:inScheme :ColourScheme ;
    # Custom properties:
    ex:wavelength "700nm" ;
    ex:rgbValue "#FF0000" ;
    ex:chemicalFormula "Fe2O3" .
```

No other configuration is required for the properties to flow through the pipeline.

## Where Custom Properties Appear

| Output | Supported | Notes |
|--------|-----------|-------|
| Annotated JSON-LD | Yes | All properties preserved alongside `prez:` annotations |
| Turtle export | Yes | All properties preserved |
| JSON-LD export | Yes | All properties preserved |
| RDF/XML export | Yes | All properties preserved |
| UI (expert view) | Yes | Sorted alphabetically after profile-ordered properties |
| UI (simple view) | No | Must opt-in via SHACL profile (see below) |
| Simple JSON (ndjson) | No | Fixed SKOS fields only |
| CSV export | No | Predefined columns only |

## Controlling Display Order

By default, custom properties appear **after** profile-ordered properties, sorted alphabetically by label. To control ordering, add `sh:property` entries to the relevant profile in `data/config/profiles.ttl`:

```turtle
prez:YourConceptProfile a prof:Profile, sh:NodeShape, prez:ObjectProfile ;
    sh:targetClass skos:Concept ;
    sh:property [
        sh:path ex:wavelength ;
        sh:order 10 ;          # position relative to other properties
    ] ;
    sh:property [
        sh:path ex:rgbValue ;
        sh:order 11 ;
    ] .
```

## Showing in Simple View

Properties only appear in expert view by default. To include a custom property in simple view, add `prez:simpleView true`:

```turtle
sh:property [
    sh:path ex:wavelength ;
    sh:order 10 ;
    prez:simpleView true ;
] .
```

## Adding Human-Readable Labels

Without background labels, the UI displays the IRI local name (e.g., "wavelength"). To provide a human-readable label and description, create or update a file in `data/background/`:

```turtle
# data/background/custom-labels.ttl
@prefix prez: <https://prez.dev/> .
@prefix ex: <http://example.com/> .

ex:wavelength
    prez:label "Wavelength" ;
    prez:description "The electromagnetic wavelength of this colour" .

ex:rgbValue
    prez:label "RGB Value" ;
    prez:description "The hexadecimal RGB colour code" .

ex:chemicalFormula
    prez:label "Chemical Formula" ;
    prez:description "The chemical formula of the pigment" .
```

These labels are resolved during processing and used in:

- The UI property table (as the row label)
- Tooltips (from `prez:description`)
- The generated `labels.json` system file

## Pipeline Flow

```
TTL source file (all properties)
    ↓
N3.js parse → RDF quads (nothing filtered)
    ↓
SHACL profile → determines ordering, label sources
    ↓
Annotated RDF store → adds prez:label, prez:description, prez:identifier
    ↓
Export formats (Turtle, JSON-LD, RDF/XML all preserve everything)
    ↓
profile.json → UI ordering and simple/expert flags
    ↓
UI renders dynamically from annotated JSON-LD + profile.json
```

## Quick Reference

| Goal | Action |
|------|--------|
| Property in exports and expert view | Add to TTL — no config needed |
| Property in simple view | Add `sh:property` with `prez:simpleView true` to profile |
| Custom display order | Add `sh:property` with `sh:order N` to profile |
| Nice label in UI | Add `prez:label` in `data/background/*.ttl` |
| Tooltip description | Add `prez:description` in `data/background/*.ttl` |
