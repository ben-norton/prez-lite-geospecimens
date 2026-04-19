# NameTypes.xlsx → geological-material-name-type.ttl

Transformation summary for the Geological Material Name Type SKOS vocabulary.

**Source:** `NameTypes.xlsx`
**Output:** `geological-material-name-type.ttl`
**Sheets used:** `Concept Scheme`, `Concepts`, `Namespeces`, `Agents`
**Generated:** 2026-04-19

---

## What was produced

A single Turtle file containing:

- **1 `skos:ConceptScheme`** — `https://vocab.geospecimens.org/def/geological-material-name-type`
- **13 `skos:Concept`** instances — the full set from the Concepts sheet
- **3 top concepts** — Formal Name, Alternate Name, Cataloged Name
- **3 agent descriptions** — Ben Norton (Person, ORCID), Mineralogy Extension Task Group (Organization), Yale University (Organization, as Ben's affiliation)
- **134 RDF triples total**, validated by `rdflib` parse

## Sheet-to-RDF mapping

| Source sheet | Role in output |
|---|---|
| `Concept Scheme` | Key–value pairs mapped to properties on the `skos:ConceptScheme` node (title, definition, provenance, dates, version, keywords, citation, license, registry status, derivation mode, hasTopConcept) |
| `Concepts` | One `skos:Concept` block per row, with prefLabel, altLabel, definition, broader, provenance, usageNote, inScheme, reg:status, topConceptOf, rdf:type |
| `Namespeces` | Turned into `@prefix` declarations at the top of the file (with adjustments — see issue 1 below) |
| `Agents` | Rendered as separate blocks describing each agent (`schema:Person` / `schema:Organization`) and linked to the scheme via `prov:qualifiedAttribution` with `dcat:hadRole` |

## Data issues flagged

These are preserved in comments at the top of the `.ttl` file.

### 1. `gmnts` prefix value in `Namespeces`

The sheet maps `gmnts` → `https://vocab.geospecimens.org/def/geological-material-name-types` (plural, no trailing slash), but every concept IRI in the `Concepts` sheet is of the form `.../geological-material-name-type/<slug>` (singular + slash). Neither of the declared prefixes (`gmnt` or `gmnts`) cleanly expands to a concept IRI.

**Resolution in output:** Declared `gmnt:` as `https://vocab.geospecimens.org/def/geological-material-name-type/` (singular + slash) so the prefix matches the actual concept IRI pattern. The sheet should be corrected so the declared namespace matches the IRIs it's used with.

### 2. `regstatus:derivationMode` property in `Concept Scheme`

The property uses an undeclared prefix `regstatus:`, and semantically `derivationMode` is a property rather than a status value, so mapping `regstatus:` to the `reg-statuses/` namespace wouldn't be coherent.

**Resolution in output:** Emitted as `reg:derivationMode` (prefix already declared in the sheet as `http://purl.org/linked-data/registry#`), which matches the Prez / linked.data.gov.au convention for pairing with a `vocdermods:` value.

### 3. Dangling `skos:broader` reference

The concept `structural-group` declares `skos:broader` of `.../group-name`, but no concept with that IRI exists in the vocabulary. There is a concept `.../group`, which is almost certainly what was intended.

**Resolution in output:** Transcribed faithfully (not silently corrected). A `# NOTE:` comment is placed immediately before the concept declaration to draw attention to it. rdflib's parse is clean, but a SKOS consistency checker would flag this dangling reference.

## Modeling decisions

Choices I made where the sheet was ambiguous or where multiple valid encodings exist:

- **Agents linked via `prov:qualifiedAttribution`.** The `hadRole` column holds `isoroles:*` values that are semantically roles, not properties. Using qualified attribution (an intermediate `prov:Attribution` blank node with `prov:agent` + `dcat:hadRole`) preserves the role information cleanly. `dcterms:publisher` / `creator` / `contributor` still point directly at the Task Group URI for consumers that don't traverse PROV.
- **Task Group identifier.** The Agents sheet leaves `agentURI` empty for the Task Group, so its `affiliationURI` (`https://www.tdwg.org/community/esp/mineralogy/`) is used as its node identifier throughout. A stable URI for the Task Group itself would be an improvement.
- **Date typing.** `dcterms:created` and `dcterms:modified` are typed as `xsd:date` ("2026-04-17"), converting from the YYYYMMDD integer form in the sheet. `dcat:version` is kept as a plain string per DCAT practice.
- **Language tags.** Natural-language literals (prefLabel, altLabel, definition, keyword, citation, scopeNote, usageNote, provenance) are tagged `@en`. IRI-valued properties and literal strings that are identifiers or dates are untagged.
- **Keywords and hasTopConcept.** Comma-separated values in single cells were split into multiple RDF values.
- **Definition vs description.** The sheet has identical values for `skos:definition` and `dcterms:description`; both emitted as given. If these should diverge, update the sheet.

## Prefixes declared in output

Standard: `dcat`, `dcterms`, `owl`, `prov`, `rdf`, `rdfs`, `reg`, `schema`, `skos`, `status`, `vann`, `xsd`

Added (not in the `Namespeces` sheet but needed by the data): `isoroles`, `vocdermods`

Vocabulary-specific: `gmnt` (adjusted — see issue 1)

## Validation

Parsed with `rdflib` 7.x:

- Parse status: clean, no syntax errors
- Total triples: 134
- `skos:ConceptScheme` count: 1
- `skos:Concept` count: 13
- `skos:hasTopConcept` / `skos:topConceptOf` consistency: all 3 top concepts agree in both directions
- `skos:broader` resolution: 9 of 10 edges resolve to concepts in this vocabulary; 1 dangling (see issue 3)
