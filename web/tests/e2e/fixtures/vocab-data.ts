/**
 * Test vocabulary TTL fixture.
 *
 * Minimal but complete SKOS vocabulary for edit workflow testing.
 * Includes scheme metadata, hierarchy (alpha > beta), and a sibling concept.
 */

export const TEST_SCHEME_IRI = 'https://example.org/def/test'

export const TEST_VOCAB_TTL = `\
@prefix : <https://example.org/def/test/> .
@prefix cs: <https://example.org/def/test> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <https://schema.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

cs:
    a skos:ConceptScheme ;
    skos:prefLabel "Test Vocabulary" ;
    skos:definition "A vocabulary for testing edits." ;
    skos:hasTopConcept
        :alpha ,
        :gamma ;
    schema:creator <https://example.org/org/test-org> ;
    schema:dateCreated "2026-01-01"^^xsd:date ;
.

<https://example.org/org/test-org>
    a schema:Organization ;
    schema:name "Test Organisation" ;
    schema:url "https://example.org"^^xsd:anyURI ;
.

:alpha
    a skos:Concept ;
    skos:prefLabel "Alpha" ;
    skos:definition "First concept." ;
    skos:altLabel "A" ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
    skos:narrower :beta ;
.

:beta
    a skos:Concept ;
    skos:prefLabel "Beta" ;
    skos:definition "Child of Alpha." ;
    skos:inScheme cs: ;
    skos:broader :alpha ;
.

:gamma
    a skos:Concept ;
    skos:prefLabel "Gamma" ;
    skos:definition "Second top concept." ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
.
`
