---
title: GeoSpecimens Vocabularies
description: Controlled vocabularies for describing geological specimens and their properties
navigation: true
navTitle: Home
order: 1
---

# GEOSPECIMENS Vocabulary Browser

This site publishes the controlled vocabularies that underpin the GeoSpecimens Data Mobilisation Platform — a set of open standards for describing geological specimens, their constituent materials, naming conventions, and associated hazards. The vocabularies are designed to interoperate with the [Darwin Core Mineralogy Extension](https://github.com/tdwg/mineralogy) and are consumed by the [GeoAPIs](https://geoapis.io) platform to power machine-readable specimen discovery.

Use the [Vocabularies](/vocabs) browser to navigate concept hierarchies, [Search](/search) to find specific terms, or visit the [Share](/share) page to download vocabularies in Turtle, JSON-LD, RDF/XML, JSON, or CSV format.

## Published Vocabularies

| Vocabulary | Description |
|------------|-------------|
| [Geological Specimen Material Type](/scheme?uri=https://vocab.geospecimens.org/def/geological-specimen-material-type) | A hierarchical classification of geological specimen materials, covering natural and processed materials, terrestrial and extraterrestrial sources, and the needs of diverse collection institutions |
| [Geological Material Name Type](/scheme?uri=https://vocab.geospecimens.org/def/geological-material-name-type) | Terms for the types of names applied to geological materials, distinguishing formally sanctioned names (IMA-approved, classified, grouped) from historical, synonym, obsolete, and alternate designations |
| [Constituent Part Proportion](/scheme?uri=https://vocab.geospecimens.org/def/constituent-part-proportion) | Qualitative abundance terms for describing the relative proportion of a constituent material component within a parent compound specimen |
| [Hazard Types](/scheme?uri=https://vocab.geospecimens.org/def/hazard-type) | A concept scheme for the nature of hazards associated with specific materials, spanning biological and geological collections domains |

<h2>Related Resources</h2>

These vocabularies are part of a broader ecosystem of standards and tools for geological specimen data mobilisation.

| Resource | Description |
|----------|-------------|
| [GeoAPIs](https://geoapis.io) | API platform providing machine-readable access to geological specimen data using these vocabularies |
| [Darwin Core Mineralogy Extension](https://github.com/tdwg/mineralogy) | TDWG extension to Darwin Core that adds mineralogy-specific terms for specimen description, referencing this vocabulary set |
| [IGSN](https://www.igsn.org/) | International Geo Sample Number — the persistent identifier system for physical samples that these vocabularies annotate |
| [GeoSciML](http://www.opengeospatial.org/standards/geosciml) | OGC/IUGS standard for geoscience data exchange, with which these vocabularies align |

## Technical Standards

Every vocabulary is a [SKOS](https://www.w3.org/2004/02/skos/) concept scheme with [DCAT](https://www.w3.org/TR/vocab-dcat-3/) metadata and is validated against [SHACL](https://www.w3.org/TR/shacl/) profiles. The site has no runtime backend — all data is pre-generated and served as static files. Concepts are individually addressable as linked data, and vocabularies can be embedded in any web page via the `<prez-list>` web component.

Built with the [prez-lite](https://github.com/Kurrawong/prez-lite) open-source vocabulary publishing toolkit.
