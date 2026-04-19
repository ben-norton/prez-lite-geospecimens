# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This CLAUDE.md covers the `sources/xlsx/` directory only. See the project-root `CLAUDE.md` for the broader prez-lite architecture, documentation layout, and PR conventions.

## Purpose of this directory

`sources/xlsx/` holds authoring workbooks — one `.xlsx` per SKOS vocabulary — that are the **source of truth** for a subset of the TTL files in `data/vocabs/`. Each workbook contains these sheets:

- `Concept Scheme` — key/value metadata for the `skos:ConceptScheme`
- `Concepts` — header-driven rows, one per `skos:Concept`
- `Agents` — creators/publishers (resolved via `hadRole`)
- `Namespaces` (sometimes misspelled `Namespeces`) — prefix bindings

The sibling `sources/VocabularyAnnotations.xlsx` is the authoritative mapping from XLSX column labels to RDF qualified names; `sources/xlsx-to-ttl-process.md` is the canonical narrative of the pipeline and should be kept in sync whenever the generator or workbooks change.

## Conversion command

```bash
python scripts/xlsx-to-ttl.py   # reads every *.xlsx here, writes data/vocabs/*.ttl
```

Runs from the project root. Dependencies: `openpyxl` (required), `rdflib` (optional, for post-hoc validation). There is no per-file flag — the script always processes every workbook in this directory.

## Output mapping

Each workbook produces one TTL named after the scheme slug — **not** the workbook filename:

| Workbook | Output |
|---|---|
| `ConstituentPartProportions.xlsx` | `data/vocabs/constituent-part-proportion.ttl` |
| `GeologicalSpecimenMaterialTypes.xlsx` | `data/vocabs/geological-specimen-type.ttl` |
| `HazardTypes.xlsx` | `data/vocabs/hazard-type.ttl` |
| `NameTypes.xlsx` | `data/vocabs/geological-material-name-type.ttl` |

The slug is derived from the scheme IRI, so renaming a workbook does not change its output path; editing `vocabularyIRI` does.

## Source quirks the generator tolerates (do not "fix" in the workbooks)

- Sheet name `Namespeces` (typo) is matched case-insensitively alongside `Namespaces`.
- Concept IRIs occasionally use a sibling scheme's singular/plural path; the generator re-bases every concept under the active `vocabularyIRI`.
- `created` / `modified` / `version` may be stored as `YYYYMMDD` floats (e.g. `20260417.0`) — parsed into ISO dates.
- `hasTopConcept` cells on the scheme sheet are ignored; authoritative top concepts come from each concept's `isTopConceptOf` column.
- Lock files like `~$NameTypes.xlsx` appear when Excel has the workbook open — ignore them, do not commit them.

## Editing workflow

1. Edit the workbook in Excel. Close it before running the generator (Excel's lock prevents openpyxl reads).
2. Run `python scripts/xlsx-to-ttl.py` from the project root.
3. Review the diff in `data/vocabs/<slug>.ttl`.
4. If the change affects pipeline behavior (new column, new prefix, new property mapping), update both `scripts/xlsx-to-ttl.py` and `sources/xlsx-to-ttl-process.md`.

## Validation

Quick sanity check after regeneration:

```python
import rdflib
from pathlib import Path
SKOS = rdflib.Namespace("http://www.w3.org/2004/02/skos/core#")
for ttl in Path("data/vocabs").glob("*.ttl"):
    g = rdflib.Graph().parse(ttl, format="turtle")
    schemes = list(g.subjects(rdflib.RDF.type, SKOS.ConceptScheme))
    concepts = list(g.subjects(rdflib.RDF.type, SKOS.Concept))
    assert len(schemes) == 1 and concepts, ttl
```
