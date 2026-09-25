# SOVITECH App: functions

As of 2026-09-24. Draft for the owner's review.

A function is a named capability that one or more stories use. Its Status is computed from the stories it serves: the governing status is the most buildable one among them, followed by the gates of the parts only gated stories need. "Stories served" is generated from the stories' "Functions used" fields.

## Function map

| ID | Name | Domain | Stories served |
|---|---|---|---|
| F-INGEST-01 | Upload intake | INGEST | US-DOCS-01, US-DOCS-02, US-DOCS-12, US-IFC-01, US-ENGINEER-07 |
| F-INGEST-02 | Project-keyed storage and DocumentRecord creation | INGEST | US-DOCS-01, US-DOCS-04, US-DOCS-05, US-DOCS-11, US-DOCS-12, US-DOCS-17, US-IFC-01, US-IFC-02, US-IFC-09, US-MODEL-04, US-ENGINEER-07, US-ADMIN-04 |
| F-INGEST-03 | Parse-scope routing and "Not analysed" status | INGEST | US-DOCS-01, US-DOCS-03, US-DOCS-04, US-DOCS-05, US-DOCS-12, US-IFC-01, US-IFC-02, US-IFC-03, US-IFC-10, US-IFC-26, US-SCOPE-01, US-MODEL-05, US-ENGINEER-10 |
| F-INGEST-04 | Analysis queue and analysis status | INGEST | US-INTAKE-16, US-INTAKE-18, US-INTAKE-19, US-DOCS-03, US-DOCS-06, US-DOCS-12, US-DOCS-22, US-REVIEW-09, US-PROPOSAL-11, US-ADMIN-12 |
| F-INGEST-05 | Coverage recording | INGEST | US-DOCS-03, US-DOCS-04, US-DOCS-05, US-DOCS-06, US-IFC-01, US-IFC-06, US-IFC-10, US-REVIEW-09, US-REVIEW-10, US-SCOPE-01, US-MODEL-03, US-FIN-06, US-FIN-13 |
| F-INGEST-06 | Revision declaration (supersedes) | INGEST | US-DOCS-15, US-DOCS-20, US-IFC-01, US-IFC-09, US-IFC-12, US-REVIEW-13 |
| F-INGEST-07 | Document delete and erasure job | INGEST | US-DOCS-05, US-DOCS-14, US-DOCS-15, US-DOCS-21, US-IFC-01, US-IFC-08, US-SCOPE-12, US-MODEL-04, US-REPORTS-03, US-ADMIN-23, US-ADMIN-24 |
| F-INGEST-08 | Document register query and file download | INGEST | US-INTAKE-15, US-DOCS-03, US-DOCS-04, US-DOCS-11, US-DOCS-13, US-DOCS-14, US-DOCS-15, US-DOCS-16, US-DOCS-17, US-DOCS-18, US-DOCS-19, US-IFC-01, US-IFC-02, US-REVIEW-04, US-SCOPE-11, US-ZONES-03, US-ASSETS-06, US-ASSETS-07, US-ASSETS-11, US-MODEL-04, US-MODEL-05 |
| F-INGEST-09 | Demo fixture ingestion | INGEST | US-DOCS-23, US-IFC-26, US-REVIEW-03, US-ZONES-01, US-ASSETS-01, US-TOPO-08, US-MODEL-01, US-REPORTS-05, US-ADMIN-15 |
| F-INGEST-10 | Document preview images | INGEST | US-DOCS-14 |
| F-IFC-01 | Model header and schema check | IFC | US-IFC-03, US-IFC-09, US-IFC-10 |
| F-IFC-02 | Model text for rule 14 | IFC | US-IFC-04, US-IFC-19, US-IFC-22, US-IFC-25 |
| F-IFC-03 | Spatial, group and system structure read | IFC | US-IFC-11, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-17, US-IFC-18, US-ZONES-06, US-TOPO-02, US-MODEL-07 |
| F-IFC-04 | Property and quantity read with unit resolution | IFC | US-IFC-11, US-IFC-13, US-IFC-16, US-IFC-22, US-IFC-27 |
| F-IFC-05 | Element-to-asset read and class-based typing | IFC | US-IFC-11, US-IFC-19, US-IFC-21, US-IFC-23, US-ENGINEER-13 |
| F-IFC-06 | Identity across models (tag source, levels, spaces) | IFC | US-IFC-20, US-TOPO-02, US-MODEL-07, US-ENGINEER-10 |
| F-IFC-07 | Model revision comparison | IFC | US-IFC-12 |
| F-IFC-08 | Life-safety signal scan | IFC | US-IFC-24, US-ENGINEER-11 |
| F-IFC-09 | IDS model check and designer export guide | IFC | US-IFC-05, US-IFC-06, US-IFC-07 |
| F-IFC-10 | Conversion for viewing | IFC | US-IFC-08, US-SCOPE-12, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-10 |
| F-EXTRACT-01 | Native text extraction (PDF and XLSX) | EXTRACT | US-DOCS-06, US-DOCS-10 |
| F-EXTRACT-02 | AI extraction request builder | EXTRACT | US-DOCS-06, US-DOCS-07, US-DOCS-10, US-DOCS-11, US-IFC-22, US-ADMIN-04, US-ADMIN-17 |
| F-EXTRACT-03 | AI structured output and schema validation | EXTRACT | US-INTAKE-05, US-DOCS-07, US-DOCS-22, US-IFC-22, US-ADMIN-18 |
| F-EXTRACT-04 | Evidence verifier (the five checks) | EXTRACT | US-DOCS-07, US-DOCS-11, US-IFC-27, US-SCOPE-01, US-ZONES-01, US-ASSETS-01 |
| F-EXTRACT-05 | Source, confidence and inference limits | EXTRACT | US-INTAKE-07, US-DOCS-07, US-DOCS-08, US-IFC-19, US-SCOPE-01, US-ASSETS-02, US-ASSETS-06, US-ASSETS-08 |
| F-EXTRACT-06 | Quantity, qualifier and field reading | EXTRACT | US-DOCS-07, US-REVIEW-04, US-SCOPE-01, US-ZONES-01, US-ASSETS-08, US-TOPO-06, US-MODEL-01 |
| F-EXTRACT-07 | Document classification (kind, stage, revision) | EXTRACT | US-DOCS-03, US-DOCS-08, US-DOCS-09, US-DOCS-19, US-IFC-09 |
| F-EXTRACT-08 | Equipment appearance extraction | EXTRACT | US-ASSETS-01 |
| F-EXTRACT-09 | Energy bill extraction | EXTRACT | US-FIN-13 |
| F-EXTRACT-10 | Embedded-instruction and hidden-text findings | EXTRACT | US-INTAKE-13, US-DOCS-10, US-IFC-04, US-IFC-19, US-IFC-22, US-IFC-25, US-ENGINEER-01, US-ENGINEER-08 |
| F-VALUE-01 | Append-only candidate and event store | VALUE | US-INTAKE-02, US-INTAKE-21, US-DOCS-07, US-DOCS-22, US-IFC-27, US-SCOPE-02, US-SCOPE-06, US-ZONES-04, US-ZONES-07, US-ASSETS-01, US-ASSETS-04, US-PROPOSAL-03, US-ENGINEER-07, US-ENGINEER-09 |
| F-VALUE-02 | Derive function (field state, active candidate, provisional, stale) | VALUE | US-INTAKE-06, US-DOCS-06, US-DOCS-09, US-DOCS-21, US-REVIEW-01, US-REVIEW-06, US-REVIEW-09, US-SCOPE-01, US-MODEL-01, US-MODEL-03, US-ENGINEER-03, US-ENGINEER-04, US-ENGINEER-16 |
| F-VALUE-03 | Conflict test | VALUE | US-INTAKE-19, US-DOCS-22, US-IFC-13, US-IFC-15, US-REVIEW-05, US-REVIEW-11, US-ZONES-01, US-ASSETS-01, US-ASSETS-08, US-MODEL-01, US-ENGINEER-05 |
| F-VALUE-04 | Conflict routing and stage-precedence proposal | VALUE | US-DOCS-20, US-DOCS-22, US-REVIEW-07, US-REVIEW-11, US-REVIEW-13, US-ASSETS-01, US-ASSETS-05, US-ASSETS-07, US-ASSETS-08, US-MODEL-01, US-MODEL-02, US-ENGINEER-01, US-ENGINEER-05, US-ENGINEER-07, US-OPS-07 |
| F-VALUE-05 | Owner corrections as resolutions | VALUE | US-INTAKE-07, US-REVIEW-07, US-REVIEW-15, US-ZONES-04 |
| F-VALUE-06 | Owner answers, accepted suggestions, skips and not-applicable events | VALUE | US-INTAKE-02, US-INTAKE-03, US-INTAKE-06, US-INTAKE-07, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-11, US-INTAKE-12, US-INTAKE-13, US-INTAKE-14, US-INTAKE-17, US-REVIEW-05, US-REVIEW-07, US-REVIEW-10, US-REVIEW-15, US-SCOPE-02, US-SCOPE-06, US-ZONES-07, US-FIN-25, US-FIN-29, US-PROPOSAL-14 |
| F-VALUE-07 | Revision supersession and change notice | VALUE | US-DOCS-20, US-IFC-12, US-REVIEW-13 |
| F-VALUE-08 | Asset identity and asset events | VALUE | US-IFC-19, US-IFC-20, US-IFC-21, US-IFC-23, US-ASSETS-01, US-ASSETS-03, US-PROPOSAL-07, US-ENGINEER-01, US-ENGINEER-06, US-ENGINEER-10 |
| F-VALUE-09 | Plausibility check | VALUE | US-IFC-16, US-IFC-22, US-ZONES-08, US-ASSETS-08 |
| F-VALUE-10 | Resolved field object builder | VALUE | US-INTAKE-07, US-INTAKE-15, US-DOCS-03, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-16, US-IFC-17, US-IFC-19, US-IFC-22, US-IFC-23, US-REVIEW-01, US-REVIEW-02, US-REVIEW-04, US-REVIEW-08, US-REVIEW-09, US-REVIEW-14, US-REVIEW-15, US-SCOPE-01, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-01, US-ZONES-02, US-ASSETS-02, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-TOPO-07, US-MODEL-01, US-MODEL-03, US-MODEL-09, US-MODEL-11, US-FIN-01, US-FIN-04, US-FIN-09, US-REPORTS-03, US-ENGINEER-02 |
| F-VALUE-11 | Level and zone registers | VALUE | US-IFC-14, US-IFC-15, US-IFC-17, US-IFC-20, US-REVIEW-04, US-REVIEW-14, US-SCOPE-07, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-04, US-ZONES-05, US-ZONES-06, US-ZONES-07, US-ZONES-08, US-ASSETS-05, US-TOPO-02, US-TOPO-11, US-MODEL-01, US-MODEL-02, US-MODEL-07, US-MODEL-10, US-MODEL-11, US-FIN-06, US-FIN-30, US-OPS-03 |
| F-VALUE-12 | Decision fields (systems in scope, goals, automation areas) | VALUE | US-INTAKE-09, US-INTAKE-10, US-INTAKE-11, US-INTAKE-12, US-INTAKE-15, US-IFC-18, US-SCOPE-02, US-SCOPE-03, US-SCOPE-04, US-SCOPE-05, US-SCOPE-06, US-SCOPE-08, US-SCOPE-09, US-SCOPE-14, US-ZONES-03, US-TOPO-01, US-TOPO-05, US-TOPO-11, US-FIN-08, US-FIN-21 |
| F-VALUE-13 | Life-safety flag on assets | VALUE | US-IFC-19, US-IFC-24, US-SCOPE-03, US-ASSETS-09, US-ASSETS-10, US-ASSETS-14, US-TOPO-02, US-TOPO-04, US-TOPO-05, US-TOPO-09, US-PROPOSAL-07, US-PROPOSAL-13, US-ENGINEER-11, US-OPS-06, US-OPS-07, US-OPS-08, US-OPS-09 |
| F-VALUE-14 | Register and summary queries | VALUE | US-INTAKE-15, US-REVIEW-08, US-REVIEW-14, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-02, US-ZONES-03, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-11, US-TOPO-01, US-TOPO-03, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-MODEL-02, US-MODEL-03, US-MODEL-09, US-MODEL-11, US-FIN-06, US-FIN-12, US-FIN-26, US-REPORTS-09, US-OPS-04, US-OPS-05, US-OPS-07, US-OPS-13 |
| F-VALUE-15 | Telemetry intake (operations phase) | VALUE | US-OPS-01, US-OPS-02, US-OPS-03, US-OPS-04, US-OPS-05, US-OPS-06, US-OPS-07, US-OPS-08, US-OPS-09, US-OPS-10, US-OPS-11, US-OPS-12, US-OPS-13 |
| F-REGISTRY-01 | Field registry and load-time validation | REGISTRY | US-INTAKE-02, US-INTAKE-04, US-INTAKE-05, US-INTAKE-08, US-INTAKE-15, US-SCOPE-09, US-SCOPE-14, US-MODEL-01, US-FIN-04, US-FIN-12, US-FIN-14 |
| F-REGISTRY-02 | Unit registry and dimension check | REGISTRY | US-INTAKE-17, US-IFC-22, US-REVIEW-07, US-ASSETS-08, US-FIN-04 |
| F-REGISTRY-03 | Number and notation parser | REGISTRY | US-INTAKE-17, US-IFC-14, US-IFC-22, US-REVIEW-07, US-ASSETS-08, US-MODEL-01 |
| F-REGISTRY-04 | Glossary | REGISTRY | US-DOCS-08, US-IFC-14, US-IFC-19, US-SCOPE-01, US-ASSETS-02 |
| F-REGISTRY-05 | Reserved-term list and matcher | REGISTRY | US-INTAKE-10, US-INTAKE-16, US-IFC-05, US-FIN-10, US-FIN-30, US-PROPOSAL-12, US-REPORTS-01, US-REPORTS-08, US-REPORTS-09, US-REPORTS-14, US-ENGINEER-12, US-ENGINEER-14, US-ADMIN-10, US-ADMIN-11, US-ADMIN-14 |
| F-REGISTRY-06 | Reference datasets and approval-record gate | REGISTRY | US-INTAKE-03, US-IFC-11, US-SCOPE-08, US-SCOPE-10, US-SCOPE-14, US-ASSETS-02, US-ASSETS-06, US-ASSETS-09, US-ASSETS-10, US-TOPO-04, US-FIN-07, US-FIN-12, US-FIN-19, US-FIN-23, US-FIN-27, US-FIN-32, US-PROPOSAL-06, US-PROPOSAL-07, US-PROPOSAL-09, US-PROPOSAL-13, US-REPORTS-08, US-ENGINEER-12, US-ENGINEER-13, US-ADMIN-18, US-ADMIN-19 |
| F-REGISTRY-07 | Location reference lookup | REGISTRY | US-INTAKE-03, US-IFC-13 |
| F-REGISTRY-08 | Systems catalogue | REGISTRY | US-IFC-18, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-05, US-SCOPE-09, US-TOPO-01, US-TOPO-03, US-TOPO-05 |
| F-QUESTION-01 | Ask-or-show decision (question engine) | QUESTION | US-INTAKE-04, US-INTAKE-05, US-INTAKE-07, US-INTAKE-08, US-INTAKE-14, US-REVIEW-04, US-REVIEW-10, US-REVIEW-11, US-SCOPE-02, US-FIN-14, US-PROPOSAL-14 |
| F-QUESTION-02 | Confirmation test and budget | QUESTION | US-INTAKE-07, US-IFC-13, US-IFC-16, US-REVIEW-05, US-REVIEW-08, US-ENGINEER-01 |
| F-QUESTION-03 | Sensitivity test and affects validation | QUESTION | US-INTAKE-04, US-INTAKE-05, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-13, US-INTAKE-14, US-SCOPE-09, US-SCOPE-14, US-FIN-22, US-FIN-25, US-FIN-29 |
| F-QUESTION-04 | Skip for now | QUESTION | US-INTAKE-06, US-INTAKE-07, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-14, US-INTAKE-17, US-REVIEW-10, US-SCOPE-02, US-FIN-22, US-FIN-25, US-FIN-29 |
| F-QUESTION-05 | Required fields and project creation | QUESTION | US-INTAKE-02, US-INTAKE-03, US-ADMIN-05 |
| F-QUESTION-06 | Suggested preselections | QUESTION | US-INTAKE-11, US-INTAKE-12, US-IFC-13, US-IFC-18, US-SCOPE-02, US-SCOPE-03, US-SCOPE-06 |
| F-QUESTION-07 | Open items ("For you" and "SOVITECH will check") | QUESTION | US-INTAKE-16, US-INTAKE-18, US-DOCS-21, US-REVIEW-06, US-REVIEW-12, US-REVIEW-13, US-REVIEW-16, US-SCOPE-08, US-ZONES-07, US-ASSETS-03, US-ASSETS-04, US-ASSETS-09, US-TOPO-07, US-FIN-03, US-PROPOSAL-04, US-PROPOSAL-05, US-REPORTS-02, US-REPORTS-03, US-ENGINEER-01, US-ENGINEER-07 |
| F-QUESTION-08 | Step 8 inline asks | QUESTION | US-INTAKE-17, US-INTAKE-22, US-SCOPE-04, US-PROPOSAL-01, US-PROPOSAL-08 |
| F-QUESTION-09 | Late findings and quiet notices | QUESTION | US-INTAKE-01, US-INTAKE-19, US-DOCS-06, US-DOCS-12, US-DOCS-20, US-DOCS-22, US-REVIEW-16, US-SCOPE-01, US-MODEL-05, US-PROPOSAL-02, US-ADMIN-12 |
| F-QUESTION-10 | Intake progress, save and resume | QUESTION | US-INTAKE-01, US-INTAKE-15, US-INTAKE-20, US-INTAKE-21, US-INTAKE-22 |
| F-CALC-01 | Formula engine | CALC | US-REVIEW-01, US-FIN-17, US-PROPOSAL-07, US-PROPOSAL-09 |
| F-CALC-02 | Recalculation and staleness | CALC | US-INTAKE-22, US-DOCS-12, US-DOCS-20, US-DOCS-21, US-REVIEW-01, US-REVIEW-07, US-REVIEW-15, US-SCOPE-06, US-ZONES-04, US-MODEL-02, US-FIN-25, US-PROPOSAL-10, US-PROPOSAL-14, US-ENGINEER-03, US-ENGINEER-05, US-ENGINEER-06 |
| F-CALC-03 | Calculation snapshot and shares | CALC | US-SCOPE-08, US-ZONES-05, US-ASSETS-12, US-MODEL-12, US-FIN-03, US-FIN-05, US-FIN-14, US-FIN-16, US-FIN-17, US-FIN-18, US-FIN-21, US-FIN-27, US-FIN-28, US-FIN-30, US-FIN-32, US-PROPOSAL-03 |
| F-CALC-04 | Counts from the registers and schedules | CALC | US-IFC-15, US-IFC-19, US-IFC-21, US-REVIEW-04, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ASSETS-03, US-ASSETS-12, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-MODEL-03, US-MODEL-11, US-FIN-26, US-REPORTS-09, US-ENGINEER-06 |
| F-CALC-05 | Area totals by basis | CALC | US-IFC-16, US-REVIEW-04, US-ZONES-01, US-ZONES-05 |
| F-CALC-06 | Exact unit conversions | CALC | US-IFC-14, US-IFC-22, US-FIN-13 |
| F-CALC-07 | Energy annual totals | CALC | US-IFC-23, US-ASSETS-14, US-FIN-12, US-FIN-13, US-FIN-15 |
| F-CALC-08 | Points estimate by type | CALC | US-INTAKE-10, US-IFC-19, US-IFC-23, US-IFC-24, US-SCOPE-03, US-SCOPE-04, US-SCOPE-08, US-ZONES-03, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-TOPO-05, US-TOPO-06, US-TOPO-07, US-TOPO-09, US-FIN-08, US-PROPOSAL-06, US-PROPOSAL-07, US-PROPOSAL-09, US-PROPOSAL-13, US-REPORTS-09 |
| F-CALC-09 | Operating energy and cost estimate | CALC | US-SCOPE-04, US-FIN-08, US-FIN-12, US-FIN-14, US-FIN-16 |
| F-CALC-10 | Savings and emissions estimates | CALC | US-SCOPE-04, US-FIN-08, US-FIN-16, US-FIN-19, US-FIN-20, US-FIN-32, US-OPS-11 |
| F-CALC-11 | Financial indicators and lifecycle cost | CALC | US-SCOPE-04, US-FIN-01, US-FIN-04, US-FIN-08, US-FIN-17, US-FIN-18, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-27 |
| F-CALC-12 | Model geometry quantities | CALC | US-IFC-16, US-ZONES-06 |
| F-CALC-13 | Scenario evaluation | CALC | US-FIN-01, US-FIN-11, US-FIN-23, US-FIN-28, US-FIN-29 |
| F-PRICE-01 | Pricing stage derivation | PRICE | US-INTAKE-16, US-INTAKE-17, US-FIN-01, US-FIN-03, US-FIN-23, US-PROPOSAL-01, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-08, US-REPORTS-01, US-REPORTS-06, US-ENGINEER-07, US-ENGINEER-14, US-ENGINEER-15, US-ENGINEER-16, US-ADMIN-05 |
| F-PRICE-02 | CAPEX estimate (Indicative range and Preliminary investment estimate) | PRICE | US-SCOPE-04, US-TOPO-07, US-FIN-07, US-FIN-08, US-PROPOSAL-09, US-REPORTS-09 |
| F-PRICE-03 | CAPEX breakdowns | PRICE | US-SCOPE-04, US-MODEL-02, US-MODEL-03, US-MODEL-12, US-FIN-05, US-FIN-06, US-FIN-21, US-FIN-31, US-PROPOSAL-09 |
| F-PRICE-04 | Quotation record | PRICE | US-ENGINEER-15 |
| F-PRICE-05 | Quotation staleness ("Superseded") | PRICE | US-INTAKE-22, US-DOCS-12, US-DOCS-21, US-SCOPE-06, US-FIN-03, US-PROPOSAL-08, US-PROPOSAL-10, US-REPORTS-05, US-ENGINEER-16 |
| F-PRICE-06 | Currency and BNR rate | PRICE | US-FIN-03, US-FIN-13, US-PROPOSAL-08, US-ENGINEER-15 |
| F-PROPOSAL-01 | Generate the preliminary proposal and landing | PROPOSAL | US-INTAKE-16, US-PROPOSAL-01, US-PROPOSAL-02, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-11 |
| F-PROPOSAL-02 | Proposal snapshot, inputsHash and staleness | PROPOSAL | US-INTAKE-22, US-DOCS-12, US-SCOPE-06, US-PROPOSAL-01, US-PROPOSAL-03, US-PROPOSAL-04, US-PROPOSAL-10, US-PROPOSAL-11, US-PROPOSAL-14, US-REPORTS-02, US-ENGINEER-15, US-ENGINEER-16 |
| F-PROPOSAL-03 | AI proposal text with value tokens | PROPOSAL | US-PROPOSAL-12, US-REPORTS-06 |
| F-PROPOSAL-04 | AI output validator for prose | PROPOSAL | US-SCOPE-03, US-TOPO-04, US-PROPOSAL-12, US-ENGINEER-14, US-ADMIN-18 |
| F-PROPOSAL-05 | Generated life-safety and compliance sentences | PROPOSAL | US-SCOPE-03, US-FIN-23, US-PROPOSAL-13, US-PROPOSAL-15, US-REPORTS-04, US-REPORTS-07, US-REPORTS-08 |
| F-PROPOSAL-06 | SOVITECH proposed design content | PROPOSAL | US-SCOPE-10, US-TOPO-04, US-FIN-23, US-FIN-30, US-PROPOSAL-15, US-REPORTS-10, US-REPORTS-12 |
| F-PROPOSAL-07 | Output availability preview | PROPOSAL | US-INTAKE-16, US-INTAKE-18 |
| F-EXPORT-01 | Export frame | EXPORT | US-DOCS-23, US-REVIEW-03, US-SCOPE-04, US-ASSETS-11, US-TOPO-11, US-MODEL-12, US-REPORTS-01, US-REPORTS-02, US-REPORTS-04, US-REPORTS-05, US-REPORTS-06, US-REPORTS-09, US-REPORTS-10, US-REPORTS-11, US-REPORTS-12, US-REPORTS-13, US-ENGINEER-14, US-ENGINEER-16, US-ADMIN-14 |
| F-EXPORT-02 | Proposal PDF | EXPORT | US-REPORTS-02, US-REPORTS-05 |
| F-EXPORT-03 | Appendix of sources and open items | EXPORT | US-REPORTS-02, US-REPORTS-03 |
| F-EXPORT-04 | Scope and register exports | EXPORT | US-ASSETS-11, US-REPORTS-04, US-REPORTS-07 |
| F-EXPORT-05 | Report generator and templates | EXPORT | US-REPORTS-05, US-REPORTS-06, US-REPORTS-07, US-REPORTS-08, US-REPORTS-09, US-REPORTS-10, US-REPORTS-11, US-REPORTS-12, US-REPORTS-13, US-REPORTS-14 |
| F-RENDER-01 | Value component (including value tokens in prose) | RENDER | US-INTAKE-15, US-DOCS-03, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-IFC-19, US-IFC-22, US-REVIEW-01, US-REVIEW-02, US-REVIEW-04, US-REVIEW-08, US-REVIEW-11, US-REVIEW-14, US-REVIEW-15, US-SCOPE-01, US-SCOPE-05, US-SCOPE-07, US-SCOPE-08, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-TOPO-01, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-06, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-TOPO-11, US-MODEL-01, US-MODEL-02, US-MODEL-03, US-MODEL-11, US-MODEL-12, US-FIN-01, US-FIN-04, US-FIN-05, US-FIN-06, US-FIN-09, US-FIN-12, US-FIN-13, US-FIN-14, US-FIN-16, US-FIN-17, US-FIN-19, US-FIN-20, US-FIN-22, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-28, US-FIN-32, US-PROPOSAL-04, US-PROPOSAL-06, US-PROPOSAL-12, US-ENGINEER-02, US-ADMIN-05, US-OPS-07, US-OPS-11 |
| F-RENDER-02 | Price component | RENDER | US-REVIEW-02, US-SCOPE-04, US-MODEL-03, US-MODEL-12, US-FIN-01, US-FIN-03, US-FIN-07, US-FIN-09, US-FIN-21, US-FIN-23, US-FIN-24, US-FIN-26, US-FIN-28, US-FIN-30, US-FIN-31, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-08, US-ENGINEER-07, US-ENGINEER-14, US-ENGINEER-15, US-ENGINEER-16, US-ADMIN-05 |
| F-RENDER-03 | Badge and status-line component | RENDER | US-INTAKE-07, US-DOCS-03, US-DOCS-04, US-DOCS-06, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-DOCS-14, US-DOCS-20, US-DOCS-21, US-IFC-01, US-IFC-02, US-IFC-06, US-IFC-10, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-16, US-IFC-17, US-IFC-19, US-IFC-22, US-IFC-23, US-REVIEW-01, US-REVIEW-09, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-05, US-SCOPE-06, US-ZONES-02, US-ZONES-03, US-ZONES-07, US-ASSETS-02, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-11, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-MODEL-02, US-MODEL-11, US-FIN-09, US-PROPOSAL-04, US-PROPOSAL-10, US-ENGINEER-02, US-ENGINEER-03, US-ENGINEER-04, US-ENGINEER-05, US-ENGINEER-16, US-ADMIN-05, US-ADMIN-09, US-ADMIN-22 |
| F-RENDER-04 | Formatting module | RENDER | US-REVIEW-02, US-SCOPE-08, US-ASSETS-08, US-ASSETS-09, US-FIN-03, US-FIN-09, US-PROPOSAL-06, US-PROPOSAL-08, US-REPORTS-01 |
| F-RENDER-05 | Demo line | RENDER | US-INTAKE-01, US-DOCS-01, US-DOCS-03, US-DOCS-12, US-DOCS-13, US-DOCS-23, US-IFC-01, US-IFC-03, US-IFC-26, US-REVIEW-03, US-REVIEW-08, US-REVIEW-15, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-04, US-SCOPE-05, US-SCOPE-06, US-SCOPE-07, US-SCOPE-08, US-SCOPE-09, US-SCOPE-11, US-SCOPE-12, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-04, US-ZONES-05, US-ZONES-07, US-ZONES-08, US-ASSETS-01, US-ASSETS-02, US-ASSETS-03, US-ASSETS-04, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-ASSETS-11, US-ASSETS-12, US-ASSETS-14, US-TOPO-01, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-TOPO-10, US-TOPO-11, US-MODEL-02, US-MODEL-03, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-08, US-MODEL-10, US-MODEL-11, US-MODEL-12, US-MODEL-13, US-FIN-01, US-FIN-02, US-FIN-12, US-FIN-20, US-FIN-21, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-28, US-FIN-29, US-FIN-30, US-PROPOSAL-01, US-PROPOSAL-02, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-06, US-PROPOSAL-14, US-REPORTS-01, US-REPORTS-05, US-REPORTS-06, US-REPORTS-07, US-REPORTS-11, US-ENGINEER-02, US-ENGINEER-07, US-ADMIN-05, US-ADMIN-06, US-ADMIN-12, US-ADMIN-13 |
| F-RENDER-06 | Render-test contract | RENDER | US-DOCS-01, US-DOCS-13, US-DOCS-16, US-IFC-08, US-REVIEW-01, US-SCOPE-05, US-SCOPE-12, US-ZONES-02, US-ZONES-06, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-TOPO-02, US-TOPO-10, US-MODEL-04, US-MODEL-06, US-MODEL-07, US-MODEL-08, US-MODEL-10, US-FIN-09, US-FIN-26, US-FIN-31, US-PROPOSAL-02, US-REPORTS-05 |
| F-RENDER-07 | Chart component | RENDER | US-SCOPE-08, US-SCOPE-11, US-ZONES-05, US-ASSETS-12, US-FIN-05, US-FIN-09, US-FIN-15, US-FIN-18, US-FIN-27, US-FIN-28, US-ADMIN-09 |
| F-RENDER-08 | Brand theme tokens | RENDER | US-INTAKE-01, US-ADMIN-01, US-ADMIN-08, US-ADMIN-09, US-ADMIN-10, US-ADMIN-11, US-ADMIN-14 |
| F-RENDER-09 | App shell, navigation and menus | RENDER | US-INTAKE-01, US-INTAKE-18, US-INTAKE-19, US-INTAKE-20, US-INTAKE-22, US-DOCS-01, US-DOCS-13, US-REVIEW-16, US-SCOPE-05, US-SCOPE-06, US-SCOPE-11, US-ZONES-02, US-ZONES-03, US-ASSETS-05, US-TOPO-03, US-TOPO-09, US-TOPO-10, US-MODEL-11, US-FIN-01, US-FIN-02, US-FIN-10, US-FIN-11, US-FIN-12, US-FIN-21, US-FIN-22, US-FIN-24, US-FIN-26, US-FIN-30, US-PROPOSAL-05, US-PROPOSAL-14, US-REPORTS-05, US-ADMIN-01, US-ADMIN-06, US-ADMIN-07, US-ADMIN-08, US-ADMIN-12, US-ADMIN-13, US-ADMIN-14, US-ADMIN-15, US-OPS-01, US-OPS-02, US-OPS-10, US-OPS-12, US-OPS-13 |
| F-VIEWER-01 | Model view of a stored model (3D) | VIEWER | US-IFC-08, US-SCOPE-12, US-ASSETS-13, US-TOPO-02, US-TOPO-11, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-07, US-MODEL-08, US-MODEL-09, US-MODEL-12, US-MODEL-13 |
| F-VIEWER-02 | 2D plan component | VIEWER | US-IFC-08, US-SCOPE-12, US-ZONES-06, US-ASSETS-13, US-TOPO-09, US-MODEL-07, US-MODEL-08, US-MODEL-10 |
| F-VIEWER-03 | View modes and floor selection | VIEWER | US-SCOPE-07, US-SCOPE-11, US-SCOPE-12, US-ZONES-02, US-ASSETS-05, US-ASSETS-13, US-TOPO-10, US-TOPO-11, US-MODEL-02, US-MODEL-06, US-MODEL-07, US-MODEL-10, US-MODEL-12 |
| F-VIEWER-04 | Model overlays: provenance labels, pins and selection | VIEWER | US-SCOPE-13, US-ZONES-06, US-ASSETS-13, US-TOPO-02, US-TOPO-09, US-MODEL-08, US-MODEL-09, US-MODEL-13, US-FIN-31 |
| F-VIEWER-05 | System topology view | VIEWER | US-SCOPE-10, US-SCOPE-13, US-TOPO-01, US-TOPO-02, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-06, US-TOPO-09, US-TOPO-11, US-REPORTS-10 |
| F-REVIEW-01 | Engineer review queue ("SOVITECH will check") | REVIEW | US-INTAKE-05, US-DOCS-10, US-IFC-03, US-IFC-04, US-IFC-05, US-IFC-25, US-REVIEW-05, US-REVIEW-06, US-REVIEW-07, US-REVIEW-12, US-ZONES-04, US-ZONES-07, US-ZONES-08, US-ASSETS-01, US-ASSETS-04, US-PROPOSAL-09, US-ENGINEER-01, US-ENGINEER-02, US-ENGINEER-04, US-ENGINEER-06, US-ENGINEER-08 |
| F-REVIEW-02 | Engineer verification and rejection | REVIEW | US-ASSETS-02, US-ENGINEER-03, US-ENGINEER-09 |
| F-REVIEW-03 | Owner acknowledgement ("Looks right", "Something's wrong") | REVIEW | US-IFC-19, US-ASSETS-04, US-ASSETS-10, US-PROPOSAL-09, US-ENGINEER-01, US-ENGINEER-04, US-ENGINEER-11 |
| F-REVIEW-04 | Conflict resolution | REVIEW | US-REVIEW-11, US-ENGINEER-05 |
| F-REVIEW-05 | Site survey recording | REVIEW | US-ENGINEER-07, US-ENGINEER-09 |
| F-REVIEW-06 | Tag-source confirmation | REVIEW | US-IFC-20, US-ENGINEER-10 |
| F-REVIEW-07 | Life-safety flag clearing | REVIEW | US-IFC-24, US-ASSETS-10, US-ASSETS-14, US-ENGINEER-11 |
| F-REVIEW-08 | Dataset and mapping-table review | REVIEW | US-IFC-11, US-ENGINEER-12, US-ENGINEER-13, US-ADMIN-19 |
| F-AUTH-01 | Sign-in and session | AUTH | US-ADMIN-01, US-ADMIN-02, US-ADMIN-07 |
| F-AUTH-02 | Roles and permission checks | AUTH | US-DOCS-11, US-IFC-03, US-SCOPE-06, US-ZONES-04, US-ZONES-07, US-ASSETS-01, US-ASSETS-04, US-ENGINEER-02, US-ENGINEER-03, US-ENGINEER-05, US-ENGINEER-06, US-ENGINEER-07, US-ENGINEER-12, US-ENGINEER-15, US-ADMIN-01, US-ADMIN-03, US-ADMIN-16, US-ADMIN-19, US-ADMIN-23, US-OPS-14 |
| F-AUTH-03 | Project isolation and access check | AUTH | US-DOCS-11, US-DOCS-14, US-IFC-01, US-IFC-08, US-SCOPE-12, US-MODEL-04, US-MODEL-10, US-ENGINEER-02, US-ENGINEER-08, US-ADMIN-01, US-ADMIN-04, US-ADMIN-05, US-ADMIN-06 |
| F-AUTH-04 | Engineer-verification guard | AUTH | US-DOCS-23, US-REVIEW-03, US-ASSETS-04, US-ENGINEER-03, US-ADMIN-02, US-ADMIN-03, US-ADMIN-16 |
| F-AUTH-05 | Project list and switcher | AUTH | US-ADMIN-05, US-ADMIN-06, US-ADMIN-07, US-ADMIN-15 |
| F-AUTH-06 | User, role and processor administration | AUTH | US-DOCS-11, US-IFC-02, US-ADMIN-16, US-ADMIN-17, US-OPS-14 |
| F-AUDIT-01 | Guardrail event log | AUDIT | US-INTAKE-05, US-INTAKE-06, US-INTAKE-07, US-DOCS-07, US-DOCS-10, US-IFC-04, US-IFC-27, US-REVIEW-05, US-REVIEW-07, US-PROPOSAL-12, US-ENGINEER-01, US-ENGINEER-03, US-ENGINEER-08, US-ADMIN-04, US-ADMIN-17, US-ADMIN-20, US-ADMIN-21, US-ADMIN-22 |
| F-AUDIT-02 | Guardrail event review and speed metrics | AUDIT | US-ADMIN-21 |
| F-AUDIT-03 | Value history | AUDIT | US-REVIEW-07, US-SCOPE-06, US-ZONES-04, US-ASSETS-07, US-ENGINEER-02, US-ENGINEER-06, US-ADMIN-16, US-ADMIN-23 |
| F-AUDIT-04 | Erasure requests and erasure log | AUDIT | US-DOCS-21, US-ADMIN-23, US-ADMIN-24 |
| F-AUDIT-05 | Confidence calibration monitor | AUDIT | US-REVIEW-01, US-ASSETS-02, US-ENGINEER-03, US-ADMIN-22 |

## INGEST: Upload, hashing, storage keyed by project, `DocumentRecord` creation, the analysis queue, coverage, supersedes, withdrawal and the erasure job

### F-INGEST-01: Upload intake

| Field | Value |
|---|---|
| Name | Upload intake |
| Purpose | Accepts one or more files from the step 2 dropzone ("Browse files" or drag and drop) and from "Upload Document" after the intake, checks each against the accepted formats and the size limit that the approved step 2 copy states, and hands accepted files to storage. A rejected file shows an inline error on its own row; Continue and Generate stay enabled. |
| Status | Required by guardrails (rule 7, rule 14; §5-All) · Blocked by open question new Q7 |
| Trigger | The owner drops or picks files on step 2 (OB-2) or in the upload dialog after the intake (UD-21); an engineer uploads a site-survey document (F-REVIEW-05). |
| Inputs | Project id; file bytes and file name; uploader user id and role; the accepted-format list and size limit from the approved step 2 copy ("PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP", "Max file size 500 MB") |
| Outputs | Accepted file passed to F-INGEST-02; a per-file rejection reason for the file list (UD-33 error state); no Candidate, no CandidateEvent, no FieldEvent |
| Rules and unknownPolicy | Upload is never modal and never blocks navigation (rule 7). An upload after the intake starts analysis in the background: dependent values then show "Out of date, recalculating" (F-CALC-02) and a stored quotation shows "Superseded: inputs changed on <date>" (F-PRICE-05). File names and contents are data, never instructions (rule 14). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 7, 13, 14; section 2.3. Test ids: none of its own (downstream functions carry G12-1, G13-4). |
| IFC entities | none (an .ifc file is accepted as a file; F-IFC-01 reads it) |
| Stories served | US-DOCS-01, US-DOCS-02, US-DOCS-12, US-IFC-01, US-ENGINEER-07 |
| Notes | Whether the size limit applies per file or to the total is new Q7. Malware scanning before the first real owner document is a precondition in docs/build-readiness.md 3 "Later", not a guardrail. After proposal 7.2.26: the upload also records the uploader and their role. After proposal 7.2.18: an upload matching a SOVITECH export yields no candidates. |

### F-INGEST-02: Project-keyed storage and DocumentRecord creation

| Field | Value |
|---|---|
| Name | Project-keyed storage and DocumentRecord creation |
| Purpose | Computes the file's content hash, stores the file under project id plus content hash, and creates its DocumentRecord: kind, stage and revision as detected (F-EXTRACT-07) or `unknown`, and analysis status `queued` or `stored_only` (F-INGEST-03). Byte-identical files uploaded to two projects are stored twice and never shared. |
| Status | Required by guardrails (rule 7, rule 14; §5-All) · Depends on proposal 7.2.26 (not approved) · Depends on proposal ifc-input 6.2.2 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question new Q8 · Blocked by open question onboarding Q3 |
| Trigger | An accepted file from F-INGEST-01; a fixture file from F-INGEST-09. |
| Inputs | Project id; file bytes; file name; uploader user id |
| Outputs | Stored file object keyed by project id and content hash; DocumentRecord (id, projectId, contentHash, kind, stage `unknown` until detected, revision as written or absent, analysis.status) |
| Rules and unknownPolicy | contentHash identifies the exact revision read (2.3). Every stored copy, extracted text, embedding and cache entry is keyed by project id, and retrieval filters by project before ranking (rule 13, "Isolation"). Upload order never sets `supersedes` (2.3). The detected file type routes processing (F-INGEST-03) but is not a stored DocumentRecord field under v1.5. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 13; section 2.3. Test ids: G13-4. |
| IFC entities | IFC files are stored like any document; their stage stays `unknown` |
| Stories served | US-DOCS-01, US-DOCS-04, US-DOCS-05, US-DOCS-11, US-DOCS-12, US-DOCS-17, US-IFC-01, US-IFC-02, US-IFC-09, US-MODEL-04, US-ENGINEER-07, US-ADMIN-04 |
| Notes | After ifc-input 6.2.2: a stored `format` field, model metadata (schema, authoring tool, IfcProject GlobalId, classes present) and stage rules for models. After proposal 7.2.26: `uploadedBy` with a role, and an `uploaded` event. Storage and database choices: docs/build-readiness.md 3 "Now" item 4 (proposed, build-readiness decision 3). |

### F-INGEST-03: Parse-scope routing and "Not analysed" status

| Field | Value |
|---|---|
| Name | Parse-scope routing and "Not analysed" status |
| Purpose | Decides for each stored file whether a parser runs. With build-readiness decision 4 as it stands, native-text PDF and XLSX are analysed; every other accepted format (DWG, IFC, RVT, DOCX, JPG, PNG, ZIP) is set `stored_only` and shows its 2.8 status line, for example "Not analysed: RVT model stored, not analysed" or "Not analysed: IFC model stored, not analysed". A ZIP archive is stored whole with "Not analysed: ZIP archive stored, not analysed". |
| Status | Required by guardrails (rule 7, rule 14; §5-All) · Depends on proposal ifc-input 6.2.3 (not approved) · Depends on proposal ifc-input 6.2.4 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question new Q8 · Blocked by open question dashboards 8.4 · Blocked by open question onboarding Q3 |
| Trigger | A DocumentRecord is created (F-INGEST-02). |
| Inputs | DocumentRecord; detected file type; the parse-scope setting for the release |
| Outputs | DocumentRecord.analysis.status (`queued` or `stored_only`); an analysis job for F-INGEST-04; a coverage entry recording that nothing was read (F-INGEST-05) |
| Rules and unknownPolicy | A stored-only file is never counted as searched in any "not found" statement, and nothing inside a ZIP counts as searched (rule 12). An IFC model keeps "Not analysed: IFC model stored, not analysed" for as long as no value from it can be stored, even when F-IFC-01, F-IFC-02 or F-IFC-09 run (docs/ifc-input.md 6.1). Stored-only files are still listed as documents and can be deleted, replaced and erased. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 12; sections 2.3, 2.8. Test ids: G12-1, G12-4. |
| IFC entities | IFC files of any schema: status line only under v1.5 |
| Stories served | US-DOCS-01, US-DOCS-03, US-DOCS-04, US-DOCS-05, US-DOCS-12, US-IFC-01, US-IFC-02, US-IFC-03, US-IFC-10, US-IFC-26, US-SCOPE-01, US-MODEL-05, US-ENGINEER-10 |
| Notes | build-readiness decision 4 and onboarding Q15 (parsing scope); OD-8 puts IFC inside the product's parsing scope without revising decision 4 (GAP-K). Whether ZIP archives are unpacked is new Q8; until answered this is a near miss to record (a ZIP counted as searched would break rule 12). After ifc-input 6.2.3: model coverage lines replace the stored-only line for analysed models. DOCX needs a locator extension, which is an approval (docs/build-readiness.md 3 "Later"). RVT stays stored only; an IFC export from the owner's designer is the recommended route (docs/ifc-input.md 2.2, recommended, not decided). |

### F-INGEST-04: Analysis queue and analysis status

| Field | Value |
|---|---|
| Name | Analysis queue and analysis status |
| Purpose | Runs the analysis jobs for each queued document (F-EXTRACT-01 to F-EXTRACT-10), moves DocumentRecord.analysis.status through `queued`, `analysing`, `analysed`, `partly_analysed` or `failed`, and writes `analysis_started` and `analysis_finished` field events so that fields waiting for a running analysis derive `pending` ("Reading documents…"). A failed file shows "Analysis failed". |
| Status | Required by guardrails (rules 7 and 10; §5-8) |
| Trigger | A queued document; a re-extraction request (a new extractor, prompt or model version, or a newly registered field). |
| Inputs | DocumentRecord; registry field keys to read; extractor, prompt and model versions |
| Outputs | DocumentRecord status updates; FieldEvent `analysis_started` and `analysis_finished`; candidates written through F-EXTRACT-04 and F-VALUE-01; the "Analysis failed" status line on failure |
| Rules and unknownPolicy | Every analysed document is read for every registry field, even fields that already have a value; the stopping rule decides only whether to ask the owner (Speed Rule). Re-extraction appends new candidates and never changes stored ones (2.4; onboarding Q14 is settled by 2.3 and rule 4). Results that arrive after the owner left a step go through F-QUESTION-09. Running analysis never blocks Generate (F-PROPOSAL-01). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 7, 12; sections 2.3, 2.4; section 4 (Speed Rule). Test ids: none of its own (G7-4 on F-QUESTION-09, G12-3 on F-INGEST-05). |
| IFC entities | none under v1.5 (IFC files are stored only) |
| Stories served | US-INTAKE-16, US-INTAKE-18, US-INTAKE-19, US-DOCS-03, US-DOCS-06, US-DOCS-12, US-DOCS-22, US-REVIEW-09, US-PROPOSAL-11, US-ADMIN-12 |
| Notes | docs/build-readiness.md 3 "Now" item 5: PDF with pypdfium2, XLSX with openpyxl, no OCR in slice 1 (proposed; build-readiness decision 3). |

### F-INGEST-05: Coverage recording

| Field | Value |
|---|---|
| Name | Coverage recording |
| Purpose | Records, by code and never by the AI, which pages, sheets or cells of each document were read and sent to the model. Sets the coverage string, and `partly_analysed` with the line "Partly analysed (<read> of <total> pages)" when part of a file could not be read. Coverage feeds every "Not found in the analysed documents (<coverage>)" line. |
| Status | Required by guardrails (rule 12, 2.3, 2.8; §5-2) · Depends on proposal ifc-input 6.2.14 (not approved) · Depends on proposal ifc-input 6.2.3 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question new Q8 · Blocked by open question onboarding Q1 |
| Trigger | An extraction job finishes; a page fails to parse; a document is truncated before analysis. |
| Inputs | DocumentRecord; the list of pages or sheets; per-page read results from F-EXTRACT-01; the pages sent to the model by F-EXTRACT-02 |
| Outputs | DocumentRecord.analysis.coverage (for example "pages <first>-<last> of <total>"); status `partly_analysed`; the per-document list of unread pages used by F-VALUE-10 |
| Rules and unknownPolicy | A truncated or partly read document never supports a "not found" claim over its unread pages. Fields sourced only from failed pages stay unknown (rule 12). Coverage is shown on step 2 rows and on Documents rows and the inspector. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 12; sections 2.3, 2.8. Test ids: G12-3, G12-4. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-03, US-DOCS-04, US-DOCS-05, US-DOCS-06, US-IFC-01, US-IFC-06, US-IFC-10, US-REVIEW-09, US-REVIEW-10, US-SCOPE-01, US-MODEL-03, US-FIN-06, US-FIN-13 |
| Notes | After ifc-input 6.2.3: model coverage (what could not be processed; what the model contains) and "not found" wording that names each model and its kind. After proposal 7.2.31: coverage stated on register headers. |

### F-INGEST-06: Revision declaration (supersedes)

| Field | Value |
|---|---|
| Name | Revision declaration (supersedes) |
| Purpose | Records that one document revises another, as a `declared_revision_of` DocumentEvent set by the owner or an engineer, or proposed by code from a matching sheet number and title block and then confirmed. "Replace" on the Documents page uploads a new revision with `supersedes` declared; it is not a delete. |
| Status | Required by guardrails (2.3, rule 13; 7.1.1-D4) · Depends on proposal ifc-input 6.2.2 (not approved) |
| Trigger | The owner or an engineer declares a revision; a code proposal from a title-block match awaits confirmation; "Replace" on Documents (DB-15). |
| Inputs | The new DocumentRecord; the DocumentRecord it revises; the declaring user and role; title-block evidence (sheet number, revision as written) |
| Outputs | DocumentEvent `declared_revision_of`; DocumentRecord.supersedes; the derived "superseded" status of the old record; a trigger for F-VALUE-07 |
| Rules and unknownPolicy | Revisions are declared, never guessed: upload order and issue date alone never set `supersedes` (2.3). A code proposal changes nothing until the owner or an engineer confirms it. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 4; section 2.3. Test ids: G4-13, G4-14. |
| IFC entities | none under v1.5 (a model can be declared a revision by a person; no model value exists to supersede) |
| Stories served | US-DOCS-15, US-DOCS-20, US-IFC-01, US-IFC-09, US-IFC-12, US-REVIEW-13 |
| Notes | After ifc-input 6.2.2: code may propose `supersedes` for models from a matching IfcProject GlobalId and element GlobalId overlap (F-IFC-07). |

### F-INGEST-07: Document delete and erasure job

| Field | Value |
|---|---|
| Name | Document delete and erasure job |
| Purpose | Deletes a document on the owner's request, or erases it on an erasure request, through one audited job: removes the file, its extracted text, its embeddings, every converted viewing file made from it and its preview images (F-INGEST-10); replaces the excerpt text in every evidence entry that cites it with "[erased]"; writes an `erased` DocumentEvent; and withdraws each candidate whose evidence came only from that document. Before the owner confirms a delete, it states the effect ("<n> values will return to Unknown"). |
| Status | Required by guardrails (rule 13, rule 12, 2.3; 7.1.1-D1, 7.1.1-D2) · Blocked by open question new Q8 · Blocked by open question onboarding Q3 · Blocked by open question new Q14 |
| Trigger | The owner deletes a document on step 2 or on Documents (DB-15); an erasure request (F-AUDIT-04). |
| Inputs | DocumentRecord id; requesting user and role; the candidates whose evidence cites the document |
| Outputs | DocumentEvent `erased`; CandidateEvent `withdrawn` (role system) for each affected candidate; evidence excerpts set to "[erased]"; removed storage objects; an erasure log entry (F-AUDIT-04); fields left with no eligible candidate derive unknown and are listed as "Source document removed" through F-QUESTION-07 (under "For you" for a field whose `confirmBy` is `owner` or `either`; for an engineer field, new Q13); dependent values recalculate (F-CALC-02) |
| Rules and unknownPolicy | This is the only path that alters stored evidence, and it cannot change a value. Withdrawn candidates keep their ids and values and are never shown as current. A candidate or asset with evidence from other active documents keeps that evidence. No other field's history changes (rule 13; 2.3). Converted viewing files and preview images are removed with their document: stricter than rule 13's wording, adding no question, gate or owner-facing wording. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 13; sections 2.3, 2.4. Test ids: G4-15, G13-3. |
| IFC entities | Stored IFC models and their converted viewing files (F-IFC-10) |
| Stories served | US-DOCS-05, US-DOCS-14, US-DOCS-15, US-DOCS-21, US-IFC-01, US-IFC-08, US-SCOPE-12, US-MODEL-04, US-REPORTS-03, US-ADMIN-23, US-ADMIN-24 |
| Notes | After ifc-input 6.2.16: removing derived files becomes a rule. How an owner asks for erasure other than by deleting a document is new Q14. The erasure job is a precondition for the first real upload (docs/build-readiness.md 3 "Later"). |

### F-INGEST-08: Document register query and file download

| Field | Value |
|---|---|
| Name | Document register query and file download |
| Purpose | Returns the project's documents for the step 2 file list and the Documents page (DB-15): file name; kind through a fixed category mapping; stage and revision as recorded ("none stated" when no revision is written); analysis status and coverage in 2.8 wording. The derived document status (superseded, withdrawn, erased) from DocumentEvents is used only by the supersede cascade and the erasure log, and is never rendered as a status on an owner screen. It also returns the documents that hold evidence for a given asset, zone or system (the Documents tabs and "OPEN DATASHEET"). Supports category chips, search, filter, sort and pagination, and serves the original file for "Download" only after the project access check. |
| Status | Required by guardrails (rules 2 and 4; §5-8) · Depends on proposal 7.2.30 (not approved) · Depends on proposal 7.2.26 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question new Q11 · Blocked by open question dashboards 8.11 · Blocked by open question dashboards 8.3 · Blocked by open question onboarding Q3 |
| Trigger | Step 2 or Documents renders; filter, search, sort or page change; "Download". |
| Inputs | Project id; user session; filter, search and sort parameters |
| Outputs | Document rows carrying resolved field objects for kind, stage and revision, and their status lines; a file stream for Download |
| Rules and unknownPolicy | No app-minted version numbers: the revision is the one written in the title block, or "none stated". An AI-classified kind shows Likely or Possible. No document status outside the 2.8 status lines is shown; how superseded, withdrawn and erased documents are displayed is proposal 7.2.26. Digits in names and pagination follow the render-test contract (F-RENDER-06). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 12, 13; sections 2.3, 2.8. Test ids: G12-1, G12-3. |
| IFC entities | IFC models are listed as documents |
| Stories served | US-INTAKE-15, US-DOCS-03, US-DOCS-04, US-DOCS-11, US-DOCS-13, US-DOCS-14, US-DOCS-15, US-DOCS-16, US-DOCS-17, US-DOCS-18, US-DOCS-19, US-IFC-01, US-IFC-02, US-REVIEW-04, US-SCOPE-11, US-ZONES-03, US-ASSETS-06, US-ASSETS-07, US-ASSETS-11, US-MODEL-04, US-MODEL-05 |
| Notes | The uploader column is proposal 7.2.26. Pagination digits are proposal 7.2.30. Document kebab and filter menus are UD-22 (their look: dashboards 8.10). The demo register lists only synthetic fixtures (F-INGEST-09). Consolidation: the document-status wording was corrected to guardrails 2.8 ("They are also the only ones used"), as the E-DOCS draft found (traceability.md section 10.3); the evidence-documents query was added from the E-SCOPE, E-ZONES and E-ASSETS draft. |

### F-INGEST-09: Demo fixture ingestion

| Field | Value |
|---|---|
| Name | Demo fixture ingestion |
| Purpose | Builds the demo project ("Demo Hotel Bucharest", flagged `demo`) by ingesting the synthetic fixture documents committed under `fixtures/` through the same pipeline as owner uploads, so every demo value cites a fixture document that exists in the repo. |
| Status | Required by guardrails (rule 10, rule 13; 7.1.1-D6, 7.1.1-E1, §5-All) · Depends on proposal 7.2.7 (not approved) · Blocked by open question dashboards 8.4 |
| Trigger | Demo project creation or reset, by an admin or at environment setup. |
| Inputs | The fixtures manifest (file, hash, generator, case ids); the demo project id |
| Outputs | DocumentRecords and candidates for the demo project; the project's `demo` flag |
| Rules and unknownPolicy | Fixtures are synthetic; no owner document or excerpt enters the repo (rule 13). Demo values never carry `engineer_verified` and never name a real person as verifier; the verification guard refuses them (F-AUTH-04, rule 10). The demo never uses the real hotel's name (OD-5, rule 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 10, 13; section 4 (Speed Rule metrics). Test ids: GS-1. |
| IFC entities | The synthetic IFC fixtures of docs/ifc-input.md 5.2 and 5.3, stored as "Not analysed" under v1.5 |
| Stories served | US-DOCS-23, US-IFC-26, US-REVIEW-03, US-ZONES-01, US-ASSETS-01, US-TOPO-08, US-MODEL-01, US-REPORTS-05, US-ADMIN-15 |
| Notes | The demo floor structure is dashboards 8.4 and build-readiness decision 7, so the demo profile of the IFC fixture waits. Not reusing the real hotel's published facts is recommended, not decided (OD-5). Fixture generators with fixed seeds: docs/build-readiness.md 2 "synthetic-fixtures" (proposed). |

### F-INGEST-10: Document preview images

| Field | Value |
|---|---|
| Name | Document preview images |
| Purpose | Makes a preview image of a stored document's page for the Documents inspector (DB-15), only for formats the app can display without analysing them (for example a native-text PDF, JPG or PNG). The preview is the document's own page: nothing added by the app is drawn into the image. |
| Status | Required by guardrails (rule 13, rule 12, 2.3; 7.1.1-D1, 7.1.1-D2) |
| Trigger | The Documents inspector opens on a document whose format can be previewed. |
| Inputs | Project id; DocumentRecord id and content hash; the stored file (F-INGEST-02); user session |
| Outputs | A preview image keyed by project id and content hash, served only after the project access check; no Candidate, no CandidateEvent, no FieldEvent, no value |
| Rules and unknownPolicy | Every preview is keyed by project id plus content hash and served only after the project access check (F-AUTH-03); byte-identical files in two projects never share a preview (rule 13, "Isolation"). The erasure job (F-INGEST-07) removes the preview with its document, as for converted models: stricter than rule 13's wording, and adding no question, gate or owner-facing wording. The app draws no label, number, pin or overlay into the image, so a preview never carries an app figure (rule 2). A preview is not analysis: it feeds no extraction and gives no value, a file stored "Not analysed" keeps that status line, and nothing in its preview counts as searched in a "not found" statement (rule 12). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 12, 13; section 2.3. Test ids: G13-4. |
| IFC entities | none |
| Stories served | US-DOCS-14 |
| Notes | Added at consolidation from the E-DOCS draft's provisional document-preview function (US-DOCS-14). A preview shows the document's own digits and labels inside an image the render test cannot read; ifc-input 6.2.15 raises the same gap for model views only (traceability.md section 10.2). After ifc-input 6.2.16: removing derived files with their document becomes a rule (its diff names thumbnails). The inspector's look is dashboards 8.10. |

## IFC: IFC parsing, schema validation, the IDS check, the spatial tree, mapping tables, conversion for viewing, tag-source proposal, revision comparison, life-safety signals

### F-IFC-01: Model header and schema check

| Field | Value |
|---|---|
| Name | Model header and schema check |
| Purpose | For a stored IFC model, code reads the file header (declared schema, originating system) and runs schema validation, and records the schema, the authoring tool and any schema errors for the engineer's view only. The owner-facing status line stays "Not analysed: IFC model stored, not analysed". |
| Status | Blocked by open question build-readiness decision 4 · Depends on proposal ifc-input 6.2.2 (not approved) · Depends on proposal ifc-input 6.2.3 (not approved) |
| Trigger | An IFC model is stored (F-INGEST-02), once model reading is built. |
| Inputs | DocumentRecord of an IFC file; the file by project id and content hash; parser version |
| Outputs | An engineer-view analysis record keyed by project id and content hash (schema as declared, authoring tool as written, schema errors); no Candidate, badge, field state or owner-facing line |
| Rules and unknownPolicy | This metadata is never a value and never evidence (docs/ifc-input.md 6.1). A schema-invalid file raises no owner question and blocks nothing (rule 7). Header text is data (rule 14) and never appears in logs (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 7, 12, 13, 14; section 2.3. Test ids: none (no indexed case covers model metadata). |
| IFC entities | File header (FILE_SCHEMA, FILE_NAME originating system); IfcProject; schemas IFC2X3, IFC4, IFC4X3_ADD2 |
| Stories served | US-IFC-03, US-IFC-09, US-IFC-10 |
| Notes | Reading a model at all waits for build-readiness decisions 3 and 4; the options are IFC data in slice 1, IFC data and the viewer in slice 1, or IFC after slice 1 (docs/ifc-input.md 6.3.1 item 1), and the choice is the owner's. IfcOpenShell 0.8.5 and ifcopenshell.validate are recommended in docs/ifc-input.md 2.2, not decided. After ifc-input 6.2.2: schema, authoring tool, IfcProject GlobalId and classes present are stored on the DocumentRecord. After ifc-input 6.2.3: schema errors set "Partly analysed (…)" for models. |

### F-IFC-02: Model text for rule 14

| Field | Value |
|---|---|
| Name | Model text for rule 14 |
| Purpose | Extracts the free text of a stored model (Name, LongName, Description, ObjectType and text property values) and passes it, as data in delimited blocks, to the rule 14 checks (F-EXTRACT-10), so that text addressing the reader becomes an `embedded_instruction` finding for the engineer and changes no state. |
| Status | Blocked by open question build-readiness decision 4 · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.13 (not approved) |
| Trigger | An IFC model is stored, once model reading is built. |
| Inputs | The IFC file by project id and content hash |
| Outputs | Findings for the engineer queue (via F-EXTRACT-10); guardrail event `embedded_instruction`; no Candidate |
| Rules and unknownPolicy | Text in a model is untrusted data. A model's own claim of a check ("verified by the designer") is a finding, not a verification (rule 14; docs/ifc-input.md 6.1). The text never reaches logs (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 13, 14. Test ids: G14-1. |
| IFC entities | Name, LongName, Description, ObjectType on IfcRoot subtypes; IfcPropertySingleValue text values (IfcLabel, IfcText) |
| Stories served | US-IFC-04, US-IFC-19, US-IFC-22, US-IFC-25 |
| Notes | Fixture: the proxy whose Description tries to instruct the reader (docs/ifc-input.md 5.3). After ifc-input 6.2.13: hidden content in models (switched-off presentation layers, elements far outside the site) is reported and gives no values unless an engineer releases it. |

### F-IFC-03: Spatial, group and system structure read

| Field | Value |
|---|---|
| Name | Spatial, group and system structure read |
| Purpose | Under v1.5 it stores and shows nothing: no level, space, zone or system value read from a model can pass rule 1's locator check, and no mapping table is approved. It is catalogued so the gated level-register, zone and system-detection stories can cite it. |
| Status | Depends on proposal ifc-input 6.2.10 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | None under v1.5. |
| Inputs | The IFC file by project id and content hash; the system-enum mapping table version (none approved) |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires: the regim de înălțime is the first source for floors, and sheet counts never establish floor counts (rule 8); the step 1 fields are never overwritten by IfcProject.Name or a georeference, and the project name is never evidence (rule 1); a detected system never puts itself in scope and life-safety systems are never preselected (rule 3; guardrails section 5, step 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 3, 8; sections 2.2, 2.5. Test ids: none under v1.5. |
| IFC entities | IfcProject; IfcSite; IfcBuilding with Pset_BuildingCommon (NumberOfStoreys, GrossPlannedArea, NetPlannedArea, OccupancyType, SprinklerProtection); IfcBuildingStorey (Name, Elevation); IfcSpace (Name, LongName, PredefinedType including GFA, Pset_SpaceCommon); IfcZone; IfcSpatialZone; IfcSystem; IfcDistributionSystem (PredefinedType); IfcRelAggregates; IfcRelContainedInSpatialStructure; IfcRelAssignsToGroup; IfcRelServicesBuildings; IfcRelReferencedInSpatialStructure; IfcMapConversion; IfcProjectedCRS; TrueNorth |
| Stories served | US-IFC-11, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-17, US-IFC-18, US-ZONES-06, US-TOPO-02, US-MODEL-07 |
| Notes | Gates: ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 (the minimum set) and build-readiness decision 4; also ifc-input 6.2.4 (levels and spaces across models), 6.2.6 (IFC area bases), 6.2.8 (storey counts never establish floor counts) and 6.2.9 (level type and zone category inferred by code). After those: storeys become level subjects (name and elevation read, level type inferred), an IfcSpace becomes a zone with qualifier `space`, NumberOfStoreys and planned areas are read with an unknown qualifier (G4-11 and G8-2 then apply), and system enums map to the step 4 systems through an approved table. Proposed cases IFC-3, IFC-4 and IFC-11 (docs/ifc-input.md 5.4) apply then. |

### F-IFC-04: Property and quantity read with unit resolution

| Field | Value |
|---|---|
| Name | Property and quantity read with unit resolution |
| Purpose | Under v1.5 it stores and shows nothing: no property or quantity value read from a model passes the locator check, and no property mapping table is approved. It is catalogued for the gated rating, area and metering stories. |
| Status | Depends on proposal ifc-input 6.2.10 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | None under v1.5. |
| Inputs | The IFC file by project id and content hash; the property mapping table version per schema (none approved); the unit registry (F-REGISTRY-02) |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires: a value's unit maps to a registry unit of the field's dimension or no candidate is made (2.7); a unitless real value never becomes a quantity candidate for a dimensioned field; text values go through the number parser, ambiguous readings keep both alternatives and approximate wording is kept (rule 8); exact conversions are appended by the engine as calculated, with the original kept (rule 8, 2.1); thermal output and electrical input are two fields (rule 8); "BMS ready" and similar phrases never become a protocol (rule 1). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 8; sections 2.1, 2.7. Test ids: G1-6, G8-3, G8-4, G8-5 (must hold for model values too). |
| IFC entities | IfcUnitAssignment; property Unit; measure types (IfcPowerMeasure, IfcAreaMeasure, IfcVolumetricFlowRateMeasure); IfcReal; IfcLabel; Qto_SpaceBaseQuantities (NetFloorArea, GrossFloorArea); Pset_ChillerTypeCommon (ChillerCapacity, NominalPowerConsumption); Pset_PumpTypeCommon; Pset_ManufacturerTypeInformation; user-defined property sets; IfcRelDefinesByProperties; IfcRelDefinesByType |
| Stories served | US-IFC-11, US-IFC-13, US-IFC-16, US-IFC-22, US-IFC-27 |
| Notes | Gates: ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 and build-readiness decision 4; ifc-input 6.2.11 for m³/s, J, absolute K and 0-1 ratios; ifc-input 6.2.6 for IFC area bases. Property-set names that docs/ifc-input.md 3.2 marks as not checked stay marked. Manufacturer and model as a vendor field is proposal 7.2.7. After approval the AI maps only user-defined property names a table cannot map, in delimited data blocks, and code verifies the result (docs/ifc-input.md 4.1). Proposed cases IFC-7, IFC-8 and IFC-9 (docs/ifc-input.md 5.4) apply then. |

### F-IFC-05: Element-to-asset read and class-based typing

| Field | Value |
|---|---|
| Name | Element-to-asset read and class-based typing |
| Purpose | Under v1.5 it stores and shows nothing: no asset, tag, type or location read from a model passes the locator check, and no class-to-taxonomy mapping is approved. It is catalogued for the gated asset-register stories. |
| Status | Depends on proposal ifc-input 6.2.10 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.5 (not approved) |
| Trigger | None under v1.5. |
| Inputs | The IFC file by project id and content hash; the taxonomy mapping table version (none approved); the glossary (F-REGISTRY-04) |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires: one normalised tag is one asset across all documents (2.5); a type taken from a class is an inference whose confidence code caps, and a tag prefix the glossary defines supports Likely (rule 3); untagged objects are listed as possible duplicates and never counted; one tag with two types is a type conflict for the engineer (2.5); points are never read from a model and stay Estimated from SOVITECH templates (rule 1); configuration comes only from text as written. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 3, 4; section 2.5. Test ids: G3-1, G3-8, G4-3, G4-16, G4-17, G9-4 (must hold for model values too). |
| IFC entities | IfcDistributionElement subtypes (IfcUnitaryEquipment, IfcAirTerminalBox, IfcFan, IfcPump, IfcChiller, IfcBoiler, IfcCoil, IfcValve, IfcDamper, IfcSensor, IfcActuator, IfcController, IfcUnitaryControlElement, IfcAlarm, IfcFlowMeter, IfcLightFixture, IfcElectricDistributionBoard or IfcDistributionBoard, IfcFireSuppressionTerminal); IfcBuildingElementProxy; IfcTransportElement; IFC2x3 IfcFlowMovingDevice with IfcPumpType; GlobalId, Tag, Name, ObjectType, PredefinedType; IfcRelContainedInSpatialStructure; IfcRelFlowControlElements; IfcRelNests and IfcRelConnectsPorts |
| Stories served | US-IFC-11, US-IFC-19, US-IFC-21, US-IFC-23, US-ENGINEER-13 |
| Notes | Gates: ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10 and build-readiness decision 4; ifc-input 6.2.9 (code-made inferences from classes and proxies), 6.2.4 (tag source), 6.2.5 (untagged counts within one model); build-readiness decision 6 (asset taxonomy). Until then an untagged model object's count reads "Not available yet" (docs/ifc-input.md 5.4 IFC-10, "Today" version). Fixture elements: CTA-01, CTA-02, CTA-03, CH-01, CH-02, P1.1, P1.2, P2, VCV-1.01 to VCV-1.08, Generic Model 1, ORPHAN-01 (docs/ifc-input.md 5.3). |

### F-IFC-06: Identity across models

| Field | Value |
|---|---|
| Name | Identity across models (tag source, levels, spaces) |
| Purpose | Under v1.5 not built: no rule says where a model's engineering tag is, and levels and zones have no identity rule across models, so the app makes no automatic match between an architectural and an MEP model of one building. |
| Status | Depends on proposal ifc-input 6.2.4 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | None under v1.5. |
| Inputs | Two or more stored models of one project |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires one asset per normalised tag and a type conflict (never a second asset) when one tag has two types (2.5, rule 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4; sections 2.2, 2.5. Test ids: none under v1.5. |
| IFC entities | Tag, Name and named properties per document; GlobalId; IfcBuildingStorey (Name, Elevation); IfcSpace (Name, Pset_SpaceCommon.Reference) |
| Stories served | US-IFC-20, US-TOPO-02, US-MODEL-07, US-ENGINEER-10 |
| Notes | Gates: ifc-input 6.2.4 (tag source proposed by code and confirmed by an engineer; storeys matched by elevation; spaces by level and normalised number; GlobalId inside one revision chain only), plus the minimum set and build-readiness decision 4. The engineer action is F-REVIEW-06. |

### F-IFC-07: Model revision comparison

| Field | Value |
|---|---|
| Name | Model revision comparison |
| Purpose | Under v1.5 code proposes no `supersedes` for models, because 2.3's proposal rule names a matching sheet number and title block, which a model lacks. A model is linked as a revision only by an owner's or engineer's declaration (F-INGEST-06). |
| Status | Depends on proposal ifc-input 6.2.2 (not approved) |
| Trigger | None under v1.5. |
| Inputs | Two stored models of one project |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires: a proposal changes nothing until confirmed; checked values are never superseded silently and a changed engineer_verified value raises a conflict for the engineer (2.3, rule 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 4; section 2.3. Test ids: G4-13, G4-14 (must hold for model values too). |
| IFC entities | IfcProject GlobalId; element GlobalIds |
| Stories served | US-IFC-12 |
| Notes | Gate: ifc-input 6.2.2 (propose when the IfcProject GlobalId matches and a registered share of element GlobalIds overlaps). Proposed case IFC-13 (docs/ifc-input.md 5.4) applies once model values exist. |

### F-IFC-08: Life-safety signal scan

| Field | Value |
|---|---|
| Name | Life-safety signal scan |
| Purpose | Under v1.5 not built: v1.5 does not say how the `lifeSafety` flag is set or cleared, and no asset is read from a model. |
| Status | Depends on proposal ifc-input 6.2.12 (not approved) · Depends on proposal 7.2.23 (not approved) |
| Trigger | None under v1.5. |
| Inputs | The IFC file by project id and content hash; the approved life-safety signal list (none approved) |
| Outputs | None under v1.5 |
| Rules and unknownPolicy | Whenever it exists, v1.5 still requires rule 11: the systems on rule 11's list are life-safety; the BMS only monitors, displays, logs and alarms on them; dual-use equipment is life-safety equipment; the fire-alarm input and fire-mode status per affected panel stay in the point list. Nothing a model shows about control is proposed as BMS control. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 11; section 2.5. Test ids: G11-3, G11-4 (must hold for model assets too). |
| IFC entities | IfcDamper (FIREDAMPER, SMOKEDAMPER, FIRESMOKEDAMPER); IfcFireSuppressionTerminal; IfcSensor (SMOKESENSOR, HEATSENSOR, FIRESENSOR, GASSENSOR); IfcUnitaryControlElement (ALARMPANEL, GASDETECTIONPANEL); IfcLightFixture SECURITYLIGHTING; IfcDistributionSystem FIREPROTECTION; IfcAlarm; IfcTransportElement; IfcDoor with Pset_DoorCommon (FireExit, HasDrive); gas shut-off IfcValve; glossary terms in Name, ObjectType, Description |
| Stories served | US-IFC-24, US-ENGINEER-11 |
| Notes | Gates: ifc-input 6.2.12 (any signal sets the flag; only an engineer event clears it), to be merged with proposal 7.2.23 if both are approved; plus the minimum set, build-readiness decision 4 and build-readiness decision 6 (asset taxonomy with life-safety flags). Proposed case IFC-6 (docs/ifc-input.md 5.4). |

### F-IFC-09: IDS model check and designer export guide

| Field | Value |
|---|---|
| Name | IDS model check and designer export guide |
| Purpose | Checks a stored model against the SOVITECH information requirements (IDS) and stores each result with the document and the IDS version for the engineer's view only. Results never create or change a candidate, badge, verification or field state, never become an owner question, confirmation or open item, and never block. |
| Status | Blocked by open question new Q15 · Depends on proposal ifc-input 6.2.14 (not approved) · Blocked by open question new Q16 |
| Trigger | An IFC model is stored, once model reading and the check are enabled. |
| Inputs | The IFC file by project id and content hash; the IDS file and its version |
| Outputs | Per-specification results stored for the engineer view; no owner-facing line, count or task |
| Rules and unknownPolicy | No owner screen shows a model-check line, count or task, because the 2.8 status lines are the only ones used. Results never create or change a candidate, badge, verification or field state, never become an owner question or open item, and never block (rules 1, 6, 7, 12). No copy about a model check, on any screen, contains a reserved term outside the places 2.8 allows; a checker's report is not document text (IDS reports say "compliant", "meets", "conforms"). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 6, 7, 12; section 2.8. Test ids: none indexed; (ifc-input 5.4 IFC-14, proposed, not indexed). |
| IFC entities | IDS 1.0 facets (entity, attribute, property, partOf) over IfcBuildingStorey, IfcSpace (Qto_SpaceBaseQuantities), the equipment classes (Tag), IfcBuildingElementProxy (ObjectType), IfcDamper (PredefinedType), IfcChiller (Pset_ChillerTypeCommon.ChillerCapacity) |
| Stories served | US-IFC-05, US-IFC-06, US-IFC-07 |
| Notes | Running the check is recommended in docs/ifc-input.md 5.5, not decided, and the IDS file is a SOVITECH draft that engineers have not reviewed: new Q15. The export guide (the IDS and a one-page guide that SOVITECH could send to the owner's designer), and any owner-facing link to it, is new Q16; docs/ifc-input.md 6.2.14 notes that an owner-facing link needs its own approval. After ifc-input 6.2.14: results as coverage lines in the form "Checked against the SOVITECH IFC requirements <version>: <n> of <m> checks passed", and the checker's own text kept out of the app. IfcTester is recommended in docs/ifc-input.md 2.2, not decided. |

### F-IFC-10: Conversion for viewing

| Field | Value |
|---|---|
| Name | Conversion for viewing |
| Purpose | Converts a stored model once on the server into viewing files (3D geometry keyed by GlobalId, and per-storey plan images with no text) for F-VIEWER-01 and F-VIEWER-02, under four conditions: the converted files are keyed by project id plus content hash and served only after the project access check; the erasure job removes them with their document; nothing is drawn as text in the scene, in textures or in plan images; and the view names the document it shows, with that document's stage and revision as recorded. |
| Status | Blocked by open question onboarding Q3 · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | An IFC model is stored, once the viewer is built. |
| Inputs | The IFC file by project id and content hash; project id |
| Outputs | Viewing files keyed by project id and content hash; a conversion record (converter and version), which is not a value |
| Rules and unknownPolicy | Display only: the view is a view of a document, never a source of values, and counts never come from it (rule 2). No conversion option that draws numbers or names into a plan image is used (rule 2 render test). Two projects that upload the same file never share a conversion (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 13; section 2.3. Test ids: G2-1, G13-4; (ifc-input 5.4 IFC-12, proposed, not indexed). |
| IFC entities | Element geometry (shape representations) keyed by GlobalId; IfcBuildingStorey for per-storey sections |
| Stories served | US-IFC-08, US-SCOPE-12, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-10 |
| Notes | Whether and when the viewer is built is onboarding Q3, dashboards 8.5 and build-readiness decisions 3 and 4. Tooling (That Open Fragments, IfcConvert GLB and SVG without printed areas) is recommended in docs/ifc-input.md 2.2, not decided; a spike settles it. docs/build-readiness.md 3 "Later" lists proposal 7.2.8 before the viewer libraries: build order, not a guardrail. After ifc-input 6.2.16: derived files under rule 13 become a rule. Licence review before release (docs/ifc-input.md 2.3). |

## EXTRACT: PDF and XLSX extraction, the AI extraction boundary (delimited data blocks, structured output), the five evidence checks, embedded-instruction and hidden-text findings

### F-EXTRACT-01: Native text extraction (PDF and XLSX)

| Field | Value |
|---|---|
| Name | Native text extraction (PDF and XLSX) |
| Purpose | Reads the native text layer of each PDF with page anchors, per-character boxes and hidden-text flags, and each XLSX cell with its cached value and number format, producing the extracted text that evidence is checked against and the page, sheet and cell locators that candidates cite. |
| Status | Required by guardrails (rule 12, rule 7, 2.3; §5-2, 7.1.1-D1) |
| Trigger | An analysis job for a PDF or XLSX file (F-INGEST-04). |
| Inputs | The stored file by project id and content hash |
| Outputs | Extracted text per page or sheet, keyed by project id and content hash; a locator index; hidden-text flags for F-EXTRACT-10; per-page read results for F-INGEST-05 |
| Rules and unknownPolicy | No OCR in slice 1, so a page with no text layer is unread and counted in coverage (rule 12). Extracted text is keyed by project id and never written to logs (rule 13). Hidden text is flagged and never used for values (rule 14). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 12, 13, 14. Test ids: G12-3, G14-2. |
| IFC entities | none |
| Stories served | US-DOCS-06, US-DOCS-10 |
| Notes | pypdfium2 and openpyxl: docs/build-readiness.md 3 "Now" item 5 (proposed; build-readiness decisions 3 and 4). PyMuPDF is avoided (AGPL). OCR is later (docs/build-readiness.md 3 "Later"). |

### F-EXTRACT-02: AI extraction request builder

| Field | Value |
|---|---|
| Name | AI extraction request builder |
| Purpose | Builds each extraction request from one project only: document text inside delimited data blocks, the registry field keys to report, the glossary and reference material from approved dataset versions, and the state fields (verifications, pricing stage) set by code. It records which pages were sent. Prompts ask what documents state and never lead; a retry after a validation failure never tells the model which value or evidence to add. |
| Status | Required by guardrails (rule 12, rule 7, 2.3; §5-2, 7.1.1-D1) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question build-readiness decision 2 |
| Trigger | An analysis job; a retry after a validation failure; a re-extraction. |
| Inputs | Project id; extracted text blocks; registry field keys; glossary and reference dataset versions; owner free-text answers (step 5 and step 6 notes) as data |
| Outputs | The request payload; the list of pages sent, for F-INGEST-05 |
| Rules and unknownPolicy | The AI context for one project never contains another project's documents or values (rule 13). Document and owner text are data, never instructions (rule 14). The project name is never offered as evidence, and nothing recalled from training is a source (rule 1). The model id is pinned and stored with every candidate. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 12, 13, 14. Test ids: G1-11, G12-4, G13-2. |
| IFC entities | none under v1.5 (after approval, compact records of user-defined IFC properties, docs/ifc-input.md 4.1) |
| Stories served | US-DOCS-06, US-DOCS-07, US-DOCS-10, US-DOCS-11, US-IFC-22, US-ADMIN-04, US-ADMIN-17 |
| Notes | The AI processor route is build-readiness decision 2; synthetic data only until it is decided. Use the claude-api skill before writing any Anthropic API code (CLAUDE.md). Citations cannot be combined with structured outputs (docs/build-readiness.md 6). |

### F-EXTRACT-03: AI structured output and schema validation

| Field | Value |
|---|---|
| Name | AI structured output and schema validation |
| Purpose | Calls the model with a structured-output schema and validates the result by code before anything is stored: sources limited to `document` and `ai_inference`; every field answerable as `not_found` with what was searched; missing field keys returned without question text; notes and suggestions for the SOVITECH team kept off owner screens. |
| Status | Required by guardrails (rules 5 and 6, section 4) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | A request from F-EXTRACT-02. |
| Inputs | The request payload; the output schema version; the model id |
| Outputs | Validated candidate proposals for F-EXTRACT-04; `not_found` answers with their search scope; missing field keys for F-QUESTION-01; engineer notes and team suggestions for F-REVIEW-01; guardrail event `ai_output_rejected` with its reason |
| Rules and unknownPolicy | Output carrying the source user, calculated, estimated or reference is rejected by the schema (rule 2). `not_found` is as valid as a value and never becomes "does not exist" (rule 12). The AI writes no question text (rule 6). A field that fails validation twice is stored as unknown, with a guardrail event (rule 12). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 6, 12, 14. Test ids: G1-1, G2-4, G6-3, G12-2. |
| IFC entities | none |
| Stories served | US-INTAKE-05, US-DOCS-07, US-DOCS-22, US-IFC-22, US-ADMIN-18 |
| Notes | Evals run 5 samples, 5 of 5 to pass, for any change to prompts/, the model id or the output schema (guardrails section 7; CLAUDE.md definition of done item 2). The model id is pinned from the live docs (docs/build-readiness.md 3 "Now" item 6). |

### F-EXTRACT-04: Evidence verifier

| Field | Value |
|---|---|
| Name | Evidence verifier (the five checks) |
| Purpose | Runs rule 1's five checks by code on every proposed candidate before it is stored: the document belongs to this project; the content hash matches; the locator exists; the excerpt occurs at that location after normalising whitespace and diacritics; and, for `document`, the value parses from the excerpt itself. Sets `Evidence.check` by code. |
| Status | Required by guardrails (rule 1, rule 2, rule 12) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | Each validated candidate proposal from F-EXTRACT-03. |
| Inputs | Candidate proposal; Evidence (documentId, contentHash, locator, excerpt); extracted text by project id and content hash; the number and notation parser (F-REGISTRY-03) |
| Outputs | A Candidate with verified Evidence written through F-VALUE-01, or a rejection; guardrail event `evidence_not_found`; Evidence.check (`text_match`, `ocr_match`, `region_rendered` or `unverifiable`) |
| Rules and unknownPolicy | Failures are rejected and logged, and the field stays unknown (rule 1). Unverifiable evidence caps confidence at low. Evidence citing another project's document is rejected and logged (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 13; section 2.4. Test ids: G1-4, G13-1. |
| IFC entities | none under v1.5 (a model has no locator form) |
| Stories served | US-DOCS-07, US-DOCS-11, US-IFC-27, US-SCOPE-01, US-ZONES-01, US-ASSETS-01 |
| Notes | After ifc-input 6.2.1: an IFC locator (GlobalId, STEP ids, property path) and STEP string decoding before the excerpt comparison; proposed case IFC-1 (docs/ifc-input.md 5.4). |

### F-EXTRACT-05: Source, confidence and inference limits

| Field | Value |
|---|---|
| Name | Source, confidence and inference limits |
| Purpose | Code decides whether a verified reading is `document` or `ai_inference`, caps each inference's confidence against its evidence, and rejects what the AI may not produce: derived quantities, catalogue identifiers that are not in the approved catalogue, and facts from model knowledge. |
| Status | Required by guardrails (rules 3 and 5, section 4; §5-5a) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.3 |
| Trigger | Each verified candidate from F-EXTRACT-04. |
| Inputs | Candidate with verified Evidence; the glossary (F-REGISTRY-04); the approved catalogue version (F-REGISTRY-06); the tier wording in force (F-AUDIT-05) |
| Outputs | Candidate with source and capped confidence; rejections with guardrail event `ai_output_rejected`; a flag for the engineer queue on unknown catalogue identifiers |
| Rules and unknownPolicy | High confidence (Likely) only when verified text names the type: a schedule row, or a tag prefix the legend or the glossary defines. Medium (Possible) for a symbol or tag pattern with no legend or schedule. Low when partly legible, cut off or consistent with more than one type. An `ai_inference` quantity other than a direct count is rejected whatever the field's estimation setting. A count of sheets labelled `document` is stored as `ai_inference`. SAUTER model numbers and product names not in the approved catalogue are rejected and flagged. Nothing recalled from training, and nothing from the project name, is evidence. Confidence never changes verification (rules 1, 2, 3). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 3; section 2.1. Test ids: G1-3, G1-10, G1-11, G2-2, G3-1, G3-2, G3-8. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-07, US-DOCS-07, US-DOCS-08, US-IFC-19, US-SCOPE-01, US-ASSETS-02, US-ASSETS-06, US-ASSETS-08 |
| Notes | After ifc-input 6.2.9: registered deterministic classifiers may also create `ai_inference` candidates, with their own source line. G3-2 has no IFC fixture element (docs/ifc-input.md 5.4). |

### F-EXTRACT-06: Quantity, qualifier and field reading

| Field | Value |
|---|---|
| Name | Quantity, qualifier and field reading |
| Purpose | Turns verified readings into candidates on the right registry field, with value, unit, qualifier and the original text: area bases (footprint, gross total, usable, heated usable, conditioned; basis `unknown` when not stated); what a count counts; power as thermal output, electrical input or apparent power; pressure type; head in m head from mCA; approximate wording; ambiguous readings with both alternatives at low confidence; floors by level type from the regim de înălțime; interfaces as written; and the energy certificate class kept apart from any BAC class. |
| Status | Required by guardrails (rule 1, rule 2, rule 12) |
| Trigger | Each candidate from F-EXTRACT-05. |
| Inputs | Candidate; FieldDefinition (unit, qualifierRequired); the unit registry (F-REGISTRY-02); the number and notation parser (F-REGISTRY-03); the glossary (F-REGISTRY-04) |
| Outputs | Candidates with `quantity` (value, UnitCode, qualifier, approximate), `alternatives` for ambiguous readings, and `original` |
| Rules and unknownPolicy | Different bases are different fields and are never converted or compared by the AI (rule 8). A protocol is a `document` value only when a document names it; "compatibil BMS", "pregătit pentru BMS" and "BMS ready" are stored as written with the interface unknown, and a volt-free contact is hardwired DI/DO (rule 1). A BAC class, the energy certificate class and a legal obligation are three separate fields (rule 11). Locale is detected per table or per value (rule 8). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 8, 11. Test ids: G1-6, G8-1, G8-2, G8-3, G8-5, G8-6, G8-9, G9-6, G11-5. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-07, US-REVIEW-04, US-SCOPE-01, US-ZONES-01, US-ASSETS-08, US-TOPO-06, US-MODEL-01 |
| Notes | Engineer-approved area-basis factors are approver setting 5. Glossary entries need SOVITECH engineer review (build-readiness decision 6). |

### F-EXTRACT-07: Document classification

| Field | Value |
|---|---|
| Name | Document classification (kind, stage, revision) |
| Purpose | Proposes each document's kind, stage, revision and issue date from its title block (cartuș) and content: the stage as written (SF, DALI, DTAC, PT, tender, DDE, shop drawing, as-built or carte tehnică, releveu), the revision as written ("Rev. <x>", "ediția <x>"), and stage `unknown` when nothing states it. Ambiguous abbreviations are recorded as an inference with the alternative named. |
| Status | Required by guardrails (rule 12, 2.3, 2.8; §5-2) · Depends on proposal 7.2.26 (not approved) · Depends on proposal ifc-input 6.2.2 (not approved) |
| Trigger | Analysis of a PDF or XLSX document (F-INGEST-04). |
| Inputs | Extracted text of the title block and first pages; the glossary (F-REGISTRY-04) |
| Outputs | Candidates on the document subject's kind, stage and revision fields; DocumentRecord.stage and revision as detected; the stage then named on source lines, and "From design drawings" for design-stage documents of existing buildings and BMS modernization (via F-VALUE-10) |
| Rules and unknownPolicy | A document titled "DALI - Documentație de avizare…" is a feasibility-stage document and yields no lighting-protocol candidate. Stage matters more than date; for existing buildings, installed-equipment facts from design-stage documents stay provisional until an as-built document, a nameplate photo or a site survey supports them (2.3). The revision is shown as written, never minted. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 8; section 2.3. Test ids: G2-6, G3-5. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-03, US-DOCS-08, US-DOCS-09, US-DOCS-19, US-IFC-09 |
| Notes | Who may change a document's kind and stage, and whether they carry badges, is proposal 7.2.26. After ifc-input 6.2.2: stage and revision rules for models. |

### F-EXTRACT-08: Equipment appearance extraction

| Field | Value |
|---|---|
| Name | Equipment appearance extraction |
| Purpose | Reports each tagged appearance of equipment (plan, schematic, equipment schedule, panel schedule, point list) as evidence for one asset keyed by its tag exactly as written, with the configuration as written ("1+1R", "pompă dublă", N+1) and ratings with their qualifiers. Untagged symbols are reported as appearances for the engineer, never merged or counted. |
| Status | Required by guardrails (2.5, rules 1, 4; 7.1-r17) |
| Trigger | Analysis of a drawing, schedule or point list. |
| Inputs | Extracted text and locators; the glossary (F-REGISTRY-04) |
| Outputs | Asset appearance candidates (tag, type inference, location, configuration, ratings) for F-VALUE-08; untagged appearance records for the engineer queue |
| Rules and unknownPolicy | Never count a tag twice; one tag is one asset with several pieces of evidence (2.5). Configuration is recorded exactly as written, because motors and drives drive points. The AI never totals equipment; the engine counts from the register (rule 1). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 3, 4; section 2.5. Test ids: G3-1, G4-3, G4-4, G4-17. |
| IFC entities | none under v1.5 |
| Stories served | US-ASSETS-01 |
| Notes | After ifc-input 6.2.4 and 6.2.5: tags and untagged objects read from models. |

### F-EXTRACT-09: Energy bill extraction

| Field | Value |
|---|---|
| Name | Energy bill extraction |
| Purpose | Reads each bill's carrier, metering point as printed (POD, CLC or meter id), period start and end, consumption with its unit, and reading type (read "index citit", supplier-estimated "index estimat", regularisation, or credit), and for gas the volume as printed plus the printed calorific value as its own value. It produces no annual totals and no conversions. |
| Status | Required by guardrails (rule 8; 7.1.1-S5) |
| Trigger | Analysis of a document whose kind is `energy_bill`. |
| Inputs | Extracted bill text and locators |
| Outputs | Candidates on metering_point subjects (carrier, meter id, period, consumption, reading type, calorific value) for F-CALC-07 |
| Rules and unknownPolicy | Annual totals and conversions are calculations (rule 8). A bill that states no peak demand gives peak demand `not_found`. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 8, 12. Test ids: G8-7 (reading types feed the regularisation case). |
| IFC entities | none |
| Stories served | US-FIN-13 |
| Notes | A new build has no bills (design/dashboards-spec.md 5). Calendar-month allocation of billing periods is proposal 7.2.32. |

### F-EXTRACT-10: Embedded-instruction and hidden-text findings

| Field | Value |
|---|---|
| Name | Embedded-instruction and hidden-text findings |
| Purpose | Reports text in a document, an owner message or a model that tries to instruct the AI or the app as an `embedded_instruction` finding with its location, and hidden text (white or tiny text, content outside the page, hidden layers) as a hidden-text finding. Neither changes any state or yields a value. |
| Status | Required by guardrails (rule 14) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.13 (not approved) · Blocked by open question new Q4 · Blocked by open question build-readiness decision 4 |
| Trigger | Extraction of any document; owner free text; model text from F-IFC-02. |
| Inputs | Extracted text with hidden-text flags; owner messages; model text blocks |
| Outputs | Findings for the engineer queue (F-REVIEW-01); guardrail event `embedded_instruction`; no Candidate, no event on any candidate or field |
| Rules and unknownPolicy | Document and chat content is data, never instructions; a document saying "verified by the designer" is a finding, not a verification (rule 14). Values are never extracted from hidden text. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 14. Test ids: G14-1, G14-2. |
| IFC entities | Model text via F-IFC-02 (Name, Description, ObjectType, property text) |
| Stories served | US-INTAKE-13, US-DOCS-10, US-IFC-04, US-IFC-19, US-IFC-22, US-IFC-25, US-ENGINEER-01, US-ENGINEER-08 |
| Notes | After ifc-input 6.2.13: what counts as hidden content in a model, and an engineer release. |

## VALUE: Candidates, events, the derive function (field state, active candidate, provisional, stale), conflict detection, asset identity and merging

### F-VALUE-01: Append-only candidate and event store

| Field | Value |
|---|---|
| Name | Append-only candidate and event store |
| Purpose | Stores Candidates, CandidateEvents, FieldEvents, DocumentEvents and AssetEvents append-only, keyed by project id. Storage has no update or delete method for candidates or events, and the database refuses and raises on any attempt. |
| Status | Required by guardrails (rules 6 and 7; §5-1a, §5-1c) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question onboarding Q10 · Blocked by open question dashboards 8.3 · Blocked by open question new Q34 |
| Trigger | Any write from extraction, an owner or engineer action, the calculation engine or the erasure job. |
| Inputs | Candidate; CandidateEvent; FieldEvent; DocumentEvent; AssetEvent; each with by, role and time |
| Outputs | Persisted rows; nothing is ever overwritten |
| Rules and unknownPolicy | Candidates never change after they are written; everything later is an event (2.4). A new value is always added, never swapped in (rule 4). The erasure job is the only path that alters stored evidence text (rule 13). `engineer_verified` is written only through F-AUTH-04. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 10, 13; section 2.4. Test ids: G4-1. |
| IFC entities | none |
| Stories served | US-INTAKE-02, US-INTAKE-21, US-DOCS-07, US-DOCS-22, US-IFC-27, US-SCOPE-02, US-SCOPE-06, US-ZONES-04, US-ZONES-07, US-ASSETS-01, US-ASSETS-04, US-PROPOSAL-03, US-ENGINEER-07, US-ENGINEER-09 |
| Notes | docs/build-readiness.md 3 "Now" item 4: Postgres with revoked update and delete, raising triggers, row-level security on project id and UUIDv7 ids (proposed; build-readiness decision 3). |

### F-VALUE-02: Derive function

| Field | Value |
|---|---|
| Name | Derive function (field state, active candidate, provisional, stale) |
| Purpose | One pure, unit-tested function computes from the candidates and events: the field state (conflict, known, pending, not_applicable, skipped, unknown, in that precedence); the active candidate (highest by verification, then source, then newest, among eligible candidates, and none while a conflict is open); each candidate's current verification and status; whether a value is provisional; and whether a calculated value is stale. |
| Status | Required by guardrails (rule 7; §5-57b) |
| Trigger | Every read of a field. |
| Inputs | Candidates and events for one subject and field; the dataset approval status of reference candidates (F-REGISTRY-06) |
| Outputs | Derived field state; active candidate id; per-candidate verification and status; provisional and stale flags. Never stored. |
| Rules and unknownPolicy | Eligible means not rejected, superseded or withdrawn. A value is provisional when any leaf of its input graph is unverified, owner_acknowledged only, estimated, an ai_inference not engineer-verified, or in conflict; calculated candidates are transparent; a reference candidate from an approved dataset version never makes a result provisional. A new eligible candidate on a skipped field makes it known and removes it from the open items. Absence from the documents never derives not_applicable (rule 12). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 4, 9, 12; section 2.4. Test ids: G1-1, G1-8, G9-2, G9-7. |
| IFC entities | none |
| Stories served | US-INTAKE-06, US-DOCS-06, US-DOCS-09, US-DOCS-21, US-REVIEW-01, US-REVIEW-06, US-REVIEW-09, US-SCOPE-01, US-MODEL-01, US-MODEL-03, US-ENGINEER-03, US-ENGINEER-04, US-ENGINEER-16 |
| Notes | The first harness tests are the field-state and evidence tests (CLAUDE.md; guardrails section 7). |

### F-VALUE-03: Conflict test

| Field | Value |
|---|---|
| Name | Conflict test |
| Purpose | Compares each new candidate with every eligible candidate for the same subject, field, unit and qualifier, and raises a `conflict_raised` field event when they disagree, or asks for a confirmation that names the matching reading when an unqualified value matches exactly one qualified candidate. |
| Status | Required by guardrails (rule 7) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | A new candidate is written. |
| Inputs | The new Candidate; eligible candidates for the same subject and field; FieldDefinition tolerance and kind |
| Outputs | FieldEvent `conflict_raised`; guardrail event `conflict_raised`; a confirmation request to F-QUESTION-02 for the single-match case |
| Rules and unknownPolicy | Numbers conflict when the lowest and highest eligible values differ by more than the larger of the absolute tolerance and the relative tolerance times the larger value, over the whole spread. Counts have zero tolerance unless the registry states a reason. Values with different known qualifiers are different facts and are not compared. A value with an unknown qualifier is compared with every qualified candidate of the same unit: exactly one match within tolerance gives a confirmation naming that reading, none gives a conflict. Enums conflict when keys differ; text and decision fields never conflict (a decision departing from a detected fact is shown as information). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 8. Test ids: G4-1, G4-2, G4-7, G4-9, G4-10, G4-11, G8-11. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-19, US-DOCS-22, US-IFC-13, US-IFC-15, US-REVIEW-05, US-REVIEW-11, US-ZONES-01, US-ASSETS-01, US-ASSETS-08, US-MODEL-01, US-ENGINEER-05 |
| Notes | Field tolerances are approver setting 5; widening one is a loosening (guardrails section 10). |

### F-VALUE-04: Conflict routing and stage-precedence proposal

| Field | Value |
|---|---|
| Name | Conflict routing and stage-precedence proposal |
| Purpose | Routes each open conflict to whoever can judge it, and proposes an active candidate by document stage for the person deciding. Until it is resolved, dependent outputs read "Provisional: two values for <field>" with a range where the formula allows, or "Not available yet: two values for <field>" with the action to resolve it. |
| Status | Required by guardrails (2.3, rule 4; 7.1.1-D4) · Out of scope: operations phase · Blocked by open question dashboards 8.3 |
| Trigger | A `conflict_raised` event. |
| Inputs | The conflicting candidates and their DocumentRecord stages; FieldDefinition confirmBy; candidate verifications |
| Outputs | A review-step item for the owner, or an engineer queue item (F-REVIEW-01); a proposed active candidate by stage; the owner line "Documents disagree on this. A SOVITECH engineer will check it." for engineer-routed conflicts |
| Rules and unknownPolicy | Conflicts on owner fields go to the owner; conflicts on engineer fields go to the engineer queue; a conflict in which any candidate is engineer_verified goes to the engineer whatever the field's confirmBy. The stage order is rule 4's document-stage order, which the approver confirms (approver setting 4). It never proposes by issue date alone, and a person decides. A conflict is put to someone only when values arrive without that person having seen both. Nothing is blocked (rules 4, 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 7. Test ids: G4-6, G4-8, G4-14, G4-18. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-20, US-DOCS-22, US-REVIEW-07, US-REVIEW-11, US-REVIEW-13, US-ASSETS-01, US-ASSETS-05, US-ASSETS-07, US-ASSETS-08, US-MODEL-01, US-MODEL-02, US-ENGINEER-01, US-ENGINEER-05, US-ENGINEER-07, US-OPS-07 |
| Notes | The stage order is approver setting 4 (the approver confirms it). Which screen is "the review step" is new Q17. |

### F-VALUE-05: Owner corrections as resolutions

| Field | Value |
|---|---|
| Name | Owner corrections as resolutions |
| Purpose | When the owner changes a value on a screen that showed them the other value and its source, records the shown candidate as rejected by the owner and makes the owner's value active, with no conflict and no second question. On engineer or for_quotation fields the rejected document value also goes to the engineer queue. An engineer_verified candidate is never rejected by the owner: the owner's value is added, the field goes into conflict, and the conflict goes to the engineer. |
| Status | Required by guardrails (rules 3 and 5, section 4; §5-5a) · Blocked by open question dashboards 8.3 |
| Trigger | The owner uses Edit on a value, or answers a confirmation with a different value. |
| Inputs | The shown Candidate and its verification; the owner's new value; FieldDefinition confirmBy and criticality |
| Outputs | CandidateEvent `rejected` (role owner); a new `user` Candidate with `user_confirmed` on owner or either fields; an engineer queue item where required; guardrail event `owner_corrected_inference` with the confidence tier when the rejected candidate was an inference |
| Rules and unknownPolicy | A correction is a resolution, not a conflict; the owner is not asked "Which is right?" about a choice they just made (rule 4). An engineer's verification is never overruled by the owner. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4. Test ids: G4-5, G4-19. |
| IFC entities | none |
| Stories served | US-INTAKE-07, US-REVIEW-07, US-REVIEW-15, US-ZONES-04 |
| Notes | none |

### F-VALUE-06: Owner answers, accepted suggestions, skips and not-applicable events

| Field | Value |
|---|---|
| Name | Owner answers, accepted suggestions, skips and not-applicable events |
| Purpose | Writes the owner's own entries and choices as `user` candidates (with `user_confirmed` on owner or either fields, and unverified on engineer fields); writes each visible, labelled Suggested preselection left in place on Continue as a `user` candidate with `user_confirmed` and `accepted_suggestion` events whose reason names what suggested it; writes `skipped` field events for "Skip for now" and for Continue on an unanswered question; and writes `marked_not_applicable` only from a named owner or engineer with a reason. |
| Status | Required by guardrails (rules 6 and 7; §5-1a, §5-1c) · Depends on proposal 7.2.20 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question onboarding Q4 · Blocked by open question new Q3 · Blocked by open question new Q4 · Blocked by open question onboarding Q11 · Blocked by open question onboarding Q1 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.12 |
| Trigger | Continue on a wizard step; an answer on any surface; "Skip for now"; an owner or engineer marking a field not applicable. |
| Inputs | Field key and subject; the answer or the visible suggestion and its reason; user and role |
| Outputs | Candidate (source `user`); CandidateEvent `user_confirmed` and `accepted_suggestion`; FieldEvent `skipped` or `marked_not_applicable`; guardrail event `skipped` |
| Rules and unknownPolicy | Nothing hidden, collapsed or on another step is accepted as a suggestion (rule 3). The accepted suggestion reads "Provided by you" and is not provisional. A skipped field stays unknown and is never filled with an assumption (rule 7). The AI may propose not_applicable but never sets it, and absence from documents never sets it (2.4, rule 12). Continue writes nothing for decisions already recorded and unchanged. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 3, 7, 12; sections 2.1, 2.4. Test ids: G1-8, G3-4. |
| IFC entities | none |
| Stories served | US-INTAKE-02, US-INTAKE-03, US-INTAKE-06, US-INTAKE-07, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-11, US-INTAKE-12, US-INTAKE-13, US-INTAKE-14, US-INTAKE-17, US-REVIEW-05, US-REVIEW-07, US-REVIEW-10, US-REVIEW-15, US-SCOPE-02, US-SCOPE-06, US-ZONES-07, US-FIN-25, US-FIN-29, US-PROPOSAL-14 |
| Notes | IntakeProject in design/onboarding-spec.md 4 is an inventory only, not the storage model. Free-text notes on steps 5 and 6 are stored as text candidates and are data (rule 14). "Other" text fields and follow-up inputs are onboarding Q11. |

### F-VALUE-07: Revision supersession and change notice

| Field | Value |
|---|---|
| Name | Revision supersession and change notice |
| Purpose | When a revision is declared (F-INGEST-06), supersedes the old document's candidates for the same subject and field, except user_confirmed or engineer_verified ones, where the new value puts the field in conflict routed by F-VALUE-04. Values only the old revision had stay visible as "From a superseded revision". Composes one notice listing the changed values ("<revision> changed <n> values"). |
| Status | Required by guardrails (2.3, rule 4; 7.1.1-D4) · Depends on proposal ifc-input 6.2.2 (not approved) |
| Trigger | A `declared_revision_of` DocumentEvent, and analysis of the new revision finishing. |
| Inputs | Candidates of the old and new documents; their verifications |
| Outputs | CandidateEvent `superseded` (role system); conflicts for checked values; one change notice for the review list |
| Rules and unknownPolicy | Checked values are never overridden silently (2.3). When the stage is unknown, the source line says so. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 7; section 2.3. Test ids: G4-13, G4-14. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-20, US-IFC-12, US-REVIEW-13 |
| Notes | Which step "the review step" means for this notice, and where it goes after Generate, is new Q17; proposal 7.2.27 proposes a home for open items after the intake. Proposed case IFC-13 (docs/ifc-input.md 5.4) once model values exist. |

### F-VALUE-08: Asset identity and asset events

| Field | Value |
|---|---|
| Name | Asset identity and asset events |
| Purpose | Keeps one Asset per normalised tag (including any system prefix as written), adding each appearance as evidence; puts the asset's type field in conflict when appearances of one tag suggest different types; lists untagged appearances as possible duplicates for the engineer, never merging or counting them; stores configuration (single, duty/standby, twin-head, N+1) with its number of motors or drives; and records engineer-only merge, split and remove events that counts respect. |
| Status | Required by guardrails (2.5, rules 1, 4; 7.1-r17) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.4 (not approved) · Depends on proposal ifc-input 6.2.5 (not approved) · Blocked by open question build-readiness decision 6 |
| Trigger | An asset appearance from F-EXTRACT-08; an engineer's merge, split or remove action. |
| Inputs | Appearance candidates (tag as written, type inference, location, configuration, ratings); AssetEvent from an engineer |
| Outputs | Asset records with FieldRefs (tag, type, location, serves, configuration, ratings, interface, lifeSafety); type conflicts routed to the engineer queue; possible-duplicate items; AssetEvent `merged_into`, `split_from`, `removed` |
| Rules and unknownPolicy | One tag, one asset; a type disagreement is a conflict, not a second asset; untagged appearances are never merged or counted automatically; only engineer accounts write asset events, with a reason (2.5). "1+1R" is two pumps; a twin-head pump is one asset with two motors. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4; section 2.5. Test ids: G4-3, G4-4, G4-16, G4-17. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-19, US-IFC-20, US-IFC-21, US-IFC-23, US-ASSETS-01, US-ASSETS-03, US-PROPOSAL-07, US-ENGINEER-01, US-ENGINEER-06, US-ENGINEER-10 |
| Notes | After ifc-input 6.2.4: tag source for models and GlobalId inside a revision chain; after ifc-input 6.2.5: untagged objects counted within one model. Asset attributes without a source (life-safety as an engineer field, meter links) are proposal 7.2.23. |

### F-VALUE-09: Plausibility check

| Field | Value |
|---|---|
| Name | Plausibility check |
| Purpose | Marks a value outside its field's plausible range, or one that fails a registered cross-check (for example cooling W/m² on the stated area basis, or AHU airflow against the area served), as Please check, and keeps it out of totals until it is confirmed. It never auto-corrects. |
| Status | Required by guardrails (rules 1, 4, 8; 7.1-r14) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.28 (not approved) |
| Trigger | A new quantity candidate. |
| Inputs | Candidate; FieldDefinition plausible range; registered cross-checks and their inputs |
| Outputs | A plausibility flag on the candidate's resolved state; an engineer queue item for engineer fields |
| Rules and unknownPolicy | Rule 8 plausibility; never auto-corrected; excluded from totals until confirmed. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 8; section 2.6. Test ids: G8-10. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-16, US-IFC-22, US-ZONES-08, US-ASSETS-08 |
| Notes | Plausible ranges and cross-check tolerances are approver setting 5 (SOVITECH engineering). After ifc-input 6.2.6: the quantity-set against geometry area cross-check. After proposal 7.2.28: a zone containment check. |

### F-VALUE-10: Resolved field object builder

| Field | Value |
|---|---|
| Name | Resolved field object builder |
| Purpose | Builds the only objects UI code receives: for each value, the display value or range; the one badge that applies (the first match in the 2.8 table order); the source line (the origin still shown when confirmed or verified, the stage named for design-stage documents, "AI inference, verified by SOVITECH" after verification); any status line ("Provisional: …", "Out of date, recalculating", "From a superseded revision", "Source document removed", "Incomplete: excludes …"); the missing case ("Unknown" or "Not provided yet"; "Not available yet" with the missing input and its action; "Not found in the analysed documents (<coverage>)"); and the value id the render test binds to. |
| Status | Required by guardrails (rules 3 and 5, section 4; §5-5a) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.11 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.15 |
| Trigger | Any screen or export that shows a value. |
| Inputs | Derived state from F-VALUE-02; Evidence and DocumentRecord (stage, coverage); FieldDefinition; the tier wording in force (F-AUDIT-05); the filter a list or view applies |
| Outputs | Resolved field objects (value or range, badge, source line, status lines, missing case, value id) |
| Rules and unknownPolicy | Unknown is never rendered as zero or blank. A "not found" line covers only analysed pages and never a stored-only file. One value id with one filter resolves to the identical object on every screen. UI code never imports domain internals (rule 2). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 3, 7, 12; sections 2.3, 2.8. Test ids: G1-1, G2-6, G2-7, G3-7, G12-2, G12-4. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-07, US-INTAKE-15, US-DOCS-03, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-16, US-IFC-17, US-IFC-19, US-IFC-22, US-IFC-23, US-REVIEW-01, US-REVIEW-02, US-REVIEW-04, US-REVIEW-08, US-REVIEW-09, US-REVIEW-14, US-REVIEW-15, US-SCOPE-01, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-01, US-ZONES-02, US-ASSETS-02, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-TOPO-07, US-MODEL-01, US-MODEL-03, US-MODEL-09, US-MODEL-11, US-FIN-01, US-FIN-04, US-FIN-09, US-REPORTS-03, US-ENGINEER-02 |
| Notes | After ifc-input 6.2.3: "not found" lines that name each model and its kind. After ifc-input 6.2.9: source lines for classifier inferences. |

### F-VALUE-11: Level and zone registers

| Field | Value |
|---|---|
| Name | Level and zone registers |
| Purpose | Holds level subjects (name as written, level type, function) and zone subjects (with what the zone counts: HVAC control, lighting or fire compartment, or unknown). Floors are counts by level type from the regim de înălțime first, never from sheet counts, and numbering follows the document. Level labels are generated from the register, one label per level everywhere; a level's function is a sourced field or Unknown. Zone edits append candidates. |
| Status | Required by guardrails (rules 5 and 8, 2.8; §5-3a, §5-3c, §5-3d, §5-3e) · Out of scope: operations phase · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.4 (not approved) · Depends on proposal 7.2.28 (not approved) · Depends on proposal 7.2.10 (not approved) · Blocked by open question dashboards 8.3 |
| Trigger | Floor structure or zone candidates written; a zone edit; any floor list, stack or selector that renders. |
| Inputs | Floor-structure candidates by level type; level and zone candidates; zone edits by the owner or an engineer |
| Outputs | Level and zone subjects with fields; generated level labels; resolved field objects for floor lists, stacks and selectors |
| Rules and unknownPolicy | Parts of the floor structure with no source are Unknown. The floor field shows Two values while its candidates disagree, and dependent outputs follow F-VALUE-04. Zones of different kinds are never summed together (rule 8). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 8; section 2.2. Test ids: G2-7, G8-9. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-14, US-IFC-15, US-IFC-17, US-IFC-20, US-REVIEW-04, US-REVIEW-14, US-SCOPE-07, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-04, US-ZONES-05, US-ZONES-06, US-ZONES-07, US-ZONES-08, US-ASSETS-05, US-TOPO-02, US-TOPO-11, US-MODEL-01, US-MODEL-02, US-MODEL-07, US-MODEL-10, US-MODEL-11, US-FIN-06, US-FIN-30, US-OPS-03 |
| Notes | The demo floor structure is dashboards 8.4, build-readiness decision 7 and onboarding Q7. Zone kinds, origin and containment are proposal 7.2.28. After ifc-input 6.2.4 and 6.2.8: levels and spaces from models. |

### F-VALUE-12: Decision fields (systems in scope, goals, automation areas)

| Field | Value |
|---|---|
| Name | Decision fields (systems in scope, goals, automation areas) |
| Purpose | Stores each multi-select owner choice as one decision field per option on the project subject: systems in scope (step 4, and the scope editor after Generate), goals (step 6) and automation areas (step 7). Every screen renders a system's scope from the same decision. |
| Status | Required by guardrails (rules 3 and 7; §5-57a, §5-57b) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question onboarding Q4 · Blocked by open question new Q3 · Blocked by open question dashboards 8.3 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.7 · Blocked by open question dashboards 8.13 |
| Trigger | Continue on steps 4, 6 and 7; a scope edit after Generate. |
| Inputs | The option's decision field; the owner's choice or the visible Suggested preselection and its reason |
| Outputs | Decision candidates (source `user`); dependent outputs marked for recalculation (F-CALC-02) |
| Rules and unknownPolicy | Decision fields never conflict; a decision that departs from a detected fact (a system detected but not included) is shown as information (rule 4). An edit appends a candidate and dependent outputs show "Out of date, recalculating". A system whose recorded decision is exclude contributes no cost, savings, operating-cost or lifecycle line and is listed among the exclusions, while the fire-alarm input and fire-mode status points stay in. Life-safety systems are never preselected (guardrails section 5, step 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4, 10, 11; section 2.6. Test ids: G3-4, G10-7. |
| IFC entities | none |
| Stories served | US-INTAKE-09, US-INTAKE-10, US-INTAKE-11, US-INTAKE-12, US-INTAKE-15, US-IFC-18, US-SCOPE-02, US-SCOPE-03, US-SCOPE-04, US-SCOPE-05, US-SCOPE-06, US-SCOPE-08, US-SCOPE-09, US-SCOPE-14, US-ZONES-03, US-TOPO-01, US-TOPO-05, US-TOPO-11, US-FIN-08, US-FIN-21 |
| Notes | The canonical systems list is dashboards 8.7 (F-REGISTRY-08). One editor per decision after Generate is design/dashboards-spec.md 2.5 (proposed, dashboards 8.3) and proposal 7.2.17. Systems against automation areas, and unchecking a system after step 7, is onboarding Q4. Per-system automation levels on CAPEX are dashboards 8.13, a new owner question that needs approval (7.1.1-C9). |

### F-VALUE-13: Life-safety flag on assets

| Field | Value |
|---|---|
| Name | Life-safety flag on assets |
| Purpose | Sets `Asset.lifeSafety` for assets whose type the approved asset taxonomy marks as belonging to rule 11's list (fire detection and alarm, smoke control and extraction, pressurisation, fire and smoke dampers, sprinklers and fire pumps, fire-fighter lifts, emergency and escape lighting, gas detection and shut-off, door release on escape routes), for assets that belong to a system on that list, and for dual-use equipment. A flagged asset offers only view, log and documents. |
| Status | Required by guardrails (rule 11; §5-4b, 7.1.1-L1, 7.1-r19) · Out of scope: operations phase · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.12 (not approved) · Depends on proposal 7.2.23 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.8 (not approved) · Blocked by open question build-readiness decision 6 |
| Trigger | An asset's type or system membership becomes known, or changes. |
| Inputs | Asset type FieldRef; the asset taxonomy with life-safety flags (F-REGISTRY-06); system membership |
| Outputs | Asset.lifeSafety; point templates restricted to status and alarm inputs for flagged assets (F-CALC-08) |
| Rules and unknownPolicy | The BMS may monitor, display, log and alarm on life-safety systems, and never commands, resets, inhibits, delays or overrides them; fire mode is hardwired and wins; dual-use equipment is life-safety equipment (rule 11). The owner's "Something's wrong" sends a note and changes no flag. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 11; section 2.5. Test ids: G11-3, G11-4. |
| IFC entities | none under v1.5 (F-IFC-08 once approved) |
| Stories served | US-IFC-19, US-IFC-24, US-SCOPE-03, US-ASSETS-09, US-ASSETS-10, US-ASSETS-14, US-TOPO-02, US-TOPO-04, US-TOPO-05, US-TOPO-09, US-PROPOSAL-07, US-PROPOSAL-13, US-ENGINEER-11, US-OPS-06, US-OPS-07, US-OPS-08, US-OPS-09 |
| Notes | Needs the asset taxonomy with life-safety flags (build-readiness decision 6). How the flag is set and cleared is proposal 7.2.23 and ifc-input 6.2.12, neither approved; until then no action clears a flag (F-REVIEW-07). |

### F-VALUE-14: Register and summary queries

| Field | Value |
|---|---|
| Name | Register and summary queries |
| Purpose | Serves lists and summaries as queries over the registers, with the filter in their label: equipment lists by system, floor, zone and search; zone lists; level lists and stacks; and the project card (area with its basis, rooms with their qualifier, building type with its badge, project type as "Provided by you", floors with Two values while in conflict). It returns resolved field objects, so a list total equals its register query. |
| Status | Required by guardrails (rules 2 and 4; §5-8) · Out of scope: operations phase · Depends on proposal 7.2.7 (not approved) · Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.11 · Blocked by open question dashboards 8.10 |
| Trigger | A list, card or summary renders; filter, search, sort or page change. |
| Inputs | Project id; the asset, level and zone registers; filter parameters |
| Outputs | Rows and summaries of resolved field objects with value ids |
| Rules and unknownPolicy | Assets, circuits and points are never mixed in one list or total (2.5). A project Status field is not shown (dashboards-spec 7.1 and 7.1.1). Rooms keep the qualifier the evidence states, and room controllers are never derived from rooms. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 8; section 2.5. Test ids: G2-7, G9-6. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-15, US-REVIEW-08, US-REVIEW-14, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-02, US-ZONES-03, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-11, US-TOPO-01, US-TOPO-03, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-MODEL-02, US-MODEL-03, US-MODEL-09, US-MODEL-11, US-FIN-06, US-FIN-12, US-FIN-26, US-REPORTS-09, US-OPS-04, US-OPS-05, US-OPS-07, US-OPS-13 |
| Notes | Project phase and status are proposal 7.2.11. Coverage on register headers is proposal 7.2.31. Pagination digits are proposal 7.2.30. Vendor fields are proposal 7.2.7. |

### F-VALUE-15: Telemetry intake (operations phase)

| Field | Value |
|---|---|
| Name | Telemetry intake (operations phase) |
| Purpose | Under v1.5 not built: the proposal-phase app reads no telemetry and shows no live value (BMS LIVE, "Last sync", live data tabs, live status, alarms, trends, the timeline). |
| Status | Out of scope: operations phase |
| Trigger | None in the proposal phase. |
| Inputs | none |
| Outputs | none |
| Rules and unknownPolicy | No live value is shown until a telemetry rule and a project phase are approved (dashboards-spec 7.1, row "All (L) values"; rules 1, 12). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 12. Test ids: none. |
| IFC entities | none |
| Stories served | US-OPS-01, US-OPS-02, US-OPS-03, US-OPS-04, US-OPS-05, US-OPS-06, US-OPS-07, US-OPS-08, US-OPS-09, US-OPS-10, US-OPS-11, US-OPS-12, US-OPS-13 |
| Notes | Proposals 7.2.1 (telemetry), 7.2.2 (status and alarm vocabulary), 7.2.3 (time scrubbing), 7.2.6 (occupancy and personal data), 7.2.11 (project phase), 7.2.33 (alarms); dashboards 8.1 (scope of part 2). |

## REGISTRY: The field registry, the unit registry and dimension check, the number parser, the glossary, the reserved-term list, dataset versions and approval records

### F-REGISTRY-01: Field registry

| Field | Value |
|---|---|
| Name | Field registry and load-time validation |
| Purpose | Declares every field once as a FieldDefinition (key, label, subject, kind, unit, qualifierRequired, estimation, tolerance, plausible, criticality, affects, impactRank, confirmBy, identity, minorForTotals) and validates a registry version before the app loads it: every `affects` entry names a concrete formula id or template slot that exists and reads the field; the required list is closed (project name, project type, city, country); the identity list holds only the project name; each multi-select choice is one decision field per option. |
| Status | Required by guardrails (rules 6 and 7; §5-1a, §5-1c) · Blocked by open question onboarding Q5 · Blocked by open question dashboards 8.7 · Blocked by open question dashboards 8.13 |
| Trigger | A registry version is loaded (and in CI). |
| Inputs | Registry source files; the formula registry (F-CALC-01); proposal template slots |
| Outputs | A validated registry version; validation failures that stop the load |
| Rules and unknownPolicy | Every rule reads its settings from the registry (2.6). Categories alone, such as "proposal", are not an `affects` entry (rule 6). Adding a required field or an identity field needs approval (rule 7, rule 6, section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 4, 5, 6, 7, 8; section 2.6. Test ids: G6-2. |
| IFC entities | none |
| Stories served | US-INTAKE-02, US-INTAKE-04, US-INTAKE-05, US-INTAKE-08, US-INTAKE-15, US-SCOPE-09, US-SCOPE-14, US-MODEL-01, US-FIN-04, US-FIN-12, US-FIN-14 |
| Notes | Settings named, not valued: the confirmation budget (approver setting 1), the correction threshold (approver setting 2), the first-estimate set (approver setting 3), the document-stage order (approver setting 4), tolerances, plausible ranges and area-basis factors (approver setting 5). The loosening snapshot comparison runs in CI and belongs to prompt 3's build plan. Slice 1 registers only slice-1 fields (docs/build-readiness.md 3 "Now" item 3). |

### F-REGISTRY-02: Unit registry and dimension check

| Field | Value |
|---|---|
| Name | Unit registry and dimension check |
| Purpose | Holds units as registry entries (ASCII code, display symbol, dimension) grouped as in rule 8, and rejects any candidate whose unit dimension differs from its field's dimension. Conversion happens only within a dimension, as a calculation. Values in units the registry lacks (durations, currency ratios such as €/kWh, €/kW, €/m² and €/m² per year, and CO₂) are rejected, so their outputs read "Not available yet", naming what is missing. |
| Status | Required by guardrails (rules 5 and 7; §5-8) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | Every candidate write; every formula output. |
| Inputs | Candidate quantity with UnitCode; FieldDefinition unit |
| Outputs | Accept or reject; guardrail event `ai_output_rejected` for AI output that fails |
| Rules and unknownPolicy | The dimension check is how "kW and kWh are never interchangeable" is enforced (2.7). DN is a size designation, not a length. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 8; section 2.7. Test ids: G8-4. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-17, US-IFC-22, US-REVIEW-07, US-ASSETS-08, US-FIN-04 |
| Notes | After proposal 7.2.22: units for durations, currency ratios and CO₂ (the prerequisite for most Metrics figures, dashboards-spec 7.1.1 "Missing units"). After ifc-input 6.2.11: m³/s, J, absolute K and 0-1 ratios. |

### F-REGISTRY-03: Number and notation parser

| Field | Value |
|---|---|
| Name | Number and notation parser |
| Purpose | Parses Romanian and English numbers per table or per value ("34.500" in Romanian as thirty-four thousand five hundred, "1,5" as one and a half, "mp" as m²), returns both readings for an ambiguous value such as "1.500", keeps approximate words ("cca.", "aprox.", "~", "circa", "peste", "about") as `approximate`, keeps the original text, and parses the regim de înălțime grammar into counts by level type. Extraction and the evidence check ("the value parses from the excerpt") both use it. |
| Status | Required by guardrails (rules 5 and 7; §5-8) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | Extraction of a quantity; evidence verification. |
| Inputs | Excerpt text; locale hints for the table or value |
| Outputs | Parsed quantity or quantities with `alternatives`; the approximate flag; `original`; floor-structure counts by level type |
| Rules and unknownPolicy | An ambiguous reading is never silently read one way (rule 8). Numbering follows the document: "Etaj 1" is the first floor above parter. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 8. Test ids: G8-2, G8-3, G8-9. |
| IFC entities | none under v1.5 (after approval, IfcLabel text values) |
| Stories served | US-INTAKE-17, US-IFC-14, US-IFC-22, US-REVIEW-07, US-ASSETS-08, US-MODEL-01 |
| Notes | docs/build-readiness.md 3 "Now" item 3. The floors notation on step 3 and the sheet-range reading are onboarding Q7. |

### F-REGISTRY-04: Glossary

| Field | Value |
|---|---|
| Name | Glossary |
| Purpose | Expands Romanian abbreviations and terms only from the glossary in reference data (for example CTA/UTA as AHU, VCV as fan coil, CT as boiler room, TA/TAC as automation panel, TG/TGD/TGBT as distribution boards, desfumare as smoke extraction, clapetă antifoc as fire damper), in both diacritic forms, and records ambiguous ones (PT, DALI) as inferences with the alternative named. A tag prefix the glossary defines supports Likely. |
| Status | Required by guardrails (2.3, rule 3, rule 8; §5-2, 7.1.1-D3) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question build-readiness decision 6 |
| Trigger | Extraction; confidence capping; document classification. |
| Inputs | Term or tag prefix; the approved glossary version |
| Outputs | Expansion with glossary version, or the alternatives for an ambiguous term |
| Rules and unknownPolicy | Abbreviations are expanded only from the glossary (rule 8). As reference data, the glossary shapes candidates only from a version with an approval record (2.1, F-REGISTRY-06). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 8; section 2.1. Test ids: G3-5, G3-8. |
| IFC entities | none under v1.5 |
| Stories served | US-DOCS-08, US-IFC-14, US-IFC-19, US-SCOPE-01, US-ASSETS-02 |
| Notes | Glossary entries need SOVITECH engineer review (build-readiness decision 6); the "ro-building-docs" skill marks entries draft until then (docs/build-readiness.md 2). Approval waits for build-readiness decision 1. After ifc-input 6.2.10: every dataset that steers extraction needs an approval record. |

### F-REGISTRY-05: Reserved-term list and matcher

| Field | Value |
|---|---|
| Name | Reserved-term list and matcher |
| Purpose | Holds the one reserved-term list of guardrails 2.8 (English and Romanian) and matches whole words ignoring case and diacritics. It allows the terms only in action labels, in badges, status lines and sentences the app builds from stored state, in verbatim quoted document text and in registry qualifier labels, and flags them everywhere else, logging `reserved_term_blocked`. The copy check, the AI output validator and generated templates all use it. |
| Status | Required by guardrails (rules 3 and 7; §5-57b, §5-7) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.25 (not approved) · Depends on proposal 7.2.9 (not approved) · Blocked by open question new Q15 · Blocked by open question build-readiness decision 2 · Blocked by open question dashboards 8.10 · Blocked by open question new Q32 · Blocked by open question app-alignment decision 3 · Blocked by open question app-alignment decision 2 |
| Trigger | AI output validation; template rendering below the matching pricing stage; the copy check. |
| Inputs | Text with its context (label, generated sentence, quotation, qualifier, free copy) |
| Outputs | Pass or flag; guardrail event `reserved_term_blocked` |
| Rules and unknownPolicy | "Formal quotation" appears only at stage 3; "Confirmed by you" and "Verified by SOVITECH" only from stored state (2.8, rule 10). Adding a term tightens the rules and removing one loosens them (section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 10, 11; section 2.8. Test ids: G10-1. |
| IFC entities | none |
| Stories served | US-INTAKE-10, US-INTAKE-16, US-IFC-05, US-FIN-10, US-FIN-30, US-PROPOSAL-12, US-REPORTS-01, US-REPORTS-08, US-REPORTS-09, US-REPORTS-14, US-ENGINEER-12, US-ENGINEER-14, US-ADMIN-10, US-ADMIN-11, US-ADMIN-14 |
| Notes | After proposal 7.2.29: more word forms. The CI copy check over fixed copy belongs to prompt 3's build plan; this matcher is the shared runtime code. |

### F-REGISTRY-06: Reference datasets and approval-record gate

| Field | Value |
|---|---|
| Name | Reference datasets and approval-record gate |
| Purpose | Registers each reference dataset version (climate data, tariffs, the BNR rate, the SAUTER catalogue, standards and their editions, the glossary, point templates, cost ranges, the function set, the asset taxonomy with life-safety flags, emission factors) with its approval status read from stored approval records. It creates `reference` candidates and resolves product tokens only from approved versions, and shows the approval status read-only on the admin datasets page. |
| Status | Required by guardrails (rules 5 and 8; §5-1b) · Depends on proposal ifc-input 6.2.10 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.13 · Blocked by open question dashboards 8.3 · Blocked by open question new Q29 · Blocked by open question new Q32 |
| Trigger | A formula or extraction asks for reference data; a product token is resolved; the admin datasets page renders. |
| Inputs | Dataset id, version and key; stored approval records |
| Outputs | `reference` Candidates (dataset, version, key); catalogue entries for product tokens; approval status for display |
| Rules and unknownPolicy | A dataset version with no approval record creates no reference candidate (rule 1, 2.1, section 10). The product list in company/products/ is not an approved dataset. Reference data holds facts about the world only; benchmarks feed only `estimated`. Standards are cited with their edition, and superseded standards are not cited as current (rule 11). No persona creates an approval record in the app. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 11, 13; section 2.1; section 10. Test ids: G1-3, G1-12. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-03, US-IFC-11, US-SCOPE-08, US-SCOPE-10, US-SCOPE-14, US-ASSETS-02, US-ASSETS-06, US-ASSETS-09, US-ASSETS-10, US-TOPO-04, US-FIN-07, US-FIN-12, US-FIN-19, US-FIN-23, US-FIN-27, US-FIN-32, US-PROPOSAL-06, US-PROPOSAL-07, US-PROPOSAL-09, US-PROPOSAL-13, US-REPORTS-08, US-ENGINEER-12, US-ENGINEER-13, US-ADMIN-18, US-ADMIN-19 |
| Notes | build-readiness decision 1 (no approval before the approver is named) and decision 6 (SOVITECH datasets, price confidentiality). How approval records reach the app is new Q32. Who supplies climate data, tariffs and emission factors is new Q28. The standard citation edition is build-readiness decision 9. After ifc-input 6.2.10: IFC mapping tables are approved datasets. Benchmarks built from past projects also need owner agreement (rule 13). |

### F-REGISTRY-07: Location reference lookup

| Field | Value |
|---|---|
| Name | Location reference lookup |
| Purpose | Resolves step 1's location to a country code (ISO 3166) and a city id, asked country first or through one place search, and stores both as the owner's required answers. Location reaches climate, prices and regulation only as reference data that code selects from approved datasets, never through the AI. |
| Status | Required by guardrails (rules 5 and 8; §5-1b) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | The owner types or picks a country and a city on step 1. |
| Inputs | Country and city text or selection; the location dataset version |
| Outputs | Country code and city id as `user` candidates on the project subject |
| Rules and unknownPolicy | Store the country code and a city id (guardrails section 5, step 1). The owner never has to re-enter a location the app already holds (rule 5). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 8; sections 2.1, 5. Test ids: none of its own (G7-6 covers the empty-field case on F-QUESTION-05). |
| IFC entities | none (IfcSite georeference never replaces step 1's city) |
| Stories served | US-INTAKE-03, US-IFC-13 |
| Notes | SIRUTA and ISO 3166 are in docs/build-readiness.md 4 with the SIRUTA licence to confirm: new Q2. |

### F-REGISTRY-08: Systems catalogue

| Field | Value |
|---|---|
| Name | Systems catalogue |
| Purpose | Holds the systems the owner can put in scope as registry options, each with its decision field, its canonical name and, for Fire Safety, the rule 11 life-safety marking that keeps it from being preselected and adds the monitoring-only scope text. The approved design shows eight on step 4: HVAC, Lighting, Energy, Access Control, Fire Safety, Water, Elevators and CCTV. |
| Status | Required by guardrails (rules 3, 12, 2.8; §5-4a) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.7 |
| Trigger | Step 4 and every system list, legend, layer toggle, cost line or points line renders. |
| Inputs | Registry version |
| Outputs | The system options with their decision field keys and names |
| Rules and unknownPolicy | A new option enters only as a registry field with concrete `affects` (rule 6). One name per system everywhere. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 6, 11; section 2.6. Test ids: none of its own. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-18, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-05, US-SCOPE-09, US-TOPO-01, US-TOPO-03, US-TOPO-05 |
| Notes | Which systems the catalogue covers, and what happens to Room Automation, Car Park, Kitchen Systems and Other, is dashboards 8.7. System icons and colours are app-alignment decision 7. |

## QUESTION: The question engine: sensitivity test, `affects`, the confirmation budget, the "For you" list, Skip for now, the inline asks on step 8

### F-QUESTION-01: Ask-or-show decision

| Field | Value |
|---|---|
| Name | Ask-or-show decision (question engine) |
| Purpose | For each registered field on a wizard step or review surface, decides by the Speed Rule order whether to ask, confirm or show. A field with no eligible candidate is asked with its registered wording and one-line reason, if rule 6 allows it; conditional questions only when their condition holds; technical questions go to the engineer queue. A known or conflicting field gets a confirmation only if F-QUESTION-02's test passes. An owner-field conflict that arrived without the owner seeing both values is put to the owner on the review step ("Documents say <a>. You entered <b>. Which is right?"). Every other value is shown with its badge, its source line and Edit, is not an open item and is never confirmed by Continue. |
| Status | Required by guardrails (rules 5 and 6, section 4) · Blocked by open question onboarding Q5 · Blocked by open question onboarding Q11 · Blocked by open question onboarding Q1 · Blocked by open question dashboards 8.12 |
| Trigger | A wizard step or review surface renders; a field's derived state changes. |
| Inputs | Derived field state (F-VALUE-02); FieldDefinition (criticality, confirmBy, affects, impactRank, condition); missing field keys from F-EXTRACT-03 |
| Outputs | Rendered question, confirmation or value per field; engineer queue items for technical questions; guardrail event `question_for_known_field` when a question would be asked for a known field (a defect) |
| Rules and unknownPolicy | Never ask for information already known, and never ask twice, except rule 7's single inline ask at step 8 and a conflict raised when a later document disagrees with an earlier answer (rule 5). The AI writes no questions; the app supplies the wording (rule 6). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 4, 5, 6, 7; section 4 (Speed Rule). Test ids: G4-1, G5-1, G5-2, GS-1. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-04, US-INTAKE-05, US-INTAKE-07, US-INTAKE-08, US-INTAKE-14, US-REVIEW-04, US-REVIEW-10, US-REVIEW-11, US-SCOPE-02, US-FIN-14, US-PROPOSAL-14 |
| Notes | A question on another surface than the wizard (for example 13's per-system automation level) is a new owner question that needs approval (dashboards 8.13, 7.1.1-C9). After proposal 7.2.17: one registered editor per decision field. |

### F-QUESTION-02: Confirmation test and budget

| Field | Value |
|---|---|
| Name | Confirmation test and budget |
| Purpose | Shows an owner confirmation only when all three hold: the owner is the right person (confirmBy owner or either); the value matters now (a first-estimate field, in conflict, or its `affects` includes system scope or CAPEX); and it is uncertain (an inference, an ambiguous reading, or an unknown area basis or count qualifier). The wording names what was found and where, for example "We found <area> in <document>, page <n>. Is that the total gross floor area, including basements?", or "Yes, it's a hotel" on step 5. Confirmations are ordered by impactRank; steps 3 to 7 together show at most the confirmation budget; the rest stay labelled and go to the engineer queue. |
| Status | Required by guardrails (rules 3 and 5, section 4; §5-5a) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | F-QUESTION-01 asks for a confirmation; F-VALUE-03 finds a single matching qualified reading. |
| Inputs | Candidate and derived state; FieldDefinition (confirmBy, criticality, affects, impactRank); the confirmation budget setting; confirmations already shown on steps 3 to 7 |
| Outputs | Confirmation prompts ("Is this right? Yes · Edit" rows on step 3 only for rows that pass); engineer queue items beyond the budget; guardrail event `confirmation_budget_exceeded`; the step 3 status pill counting only confirmation rows |
| Rules and unknownPolicy | A confirmation is a question too (rule 5). Going over the budget is logged as a defect. A skipped or declined confirmation is not prompted again during intake (rule 7). The unknown-qualifier confirmation names the matching reading (rule 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4, 5, 7, 8; section 5 (step 3). Test ids: G4-11, G5-2, G5-3, G8-2. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-07, US-IFC-13, US-IFC-16, US-REVIEW-05, US-REVIEW-08, US-ENGINEER-01 |
| Notes | The budget is approver setting 1. Onboarding Q2 (which step 3 items are flagged, and why) is answered by this test. After proposal 7.2.17: the budget applies on every surface. |

### F-QUESTION-03: Sensitivity test and affects validation

| Field | Value |
|---|---|
| Name | Sensitivity test and affects validation |
| Purpose | Proves that each owner question changes a named output: on the synthetic fixture project, changing the answer across its options must change at least one declared `affects` output. A question that changes nothing fails validation, and is removed or moved to the engineer queue. |
| Status | Required by guardrails (rules 5 and 6, section 4) · Depends on proposal 7.2.20 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question onboarding Q5 · Blocked by open question new Q4 · Blocked by open question onboarding Q11 · Blocked by open question dashboards 8.7 · Blocked by open question dashboards 8.13 · Blocked by open question dashboards 8.10 |
| Trigger | Registry validation, in CI and before a registry version is loaded. |
| Inputs | Registry version; the synthetic fixture project; the formula registry |
| Outputs | Pass or a validation failure naming the field |
| Rules and unknownPolicy | Every field names concrete outputs; categories alone are not enough (rule 6). Confirmations follow the same test (rule 5). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 6; section 2.6. Test ids: G6-1, G6-2. |
| IFC entities | none |
| Stories served | US-INTAKE-04, US-INTAKE-05, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-13, US-INTAKE-14, US-SCOPE-09, US-SCOPE-14, US-FIN-22, US-FIN-25, US-FIN-29 |
| Notes | Occupancy and schedule on step 5 are kept subject to this test (guardrails section 5, step 5). 13's per-system automation level has no registered `affects` and needs approval as a new question (dashboards-spec 7.1.1-C9). |

### F-QUESTION-04: Skip for now

| Field | Value |
|---|---|
| Name | Skip for now |
| Purpose | Shows "Skip for now" as a text link under each unanswered non-required question, and never on a question that already has an answer or a visible suggestion. Continue on an unanswered question counts as skipping and shows "You can provide this later." once, inline. A skipped question is not prompted again during intake unless a new document changes it or it is a first-estimate field at step 8. |
| Status | Required by guardrails (rule 7; §5-57b) · Depends on proposal 7.2.20 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question onboarding Q11 · Blocked by open question onboarding Q1 · Blocked by open question dashboards 8.10 |
| Trigger | A non-required question renders; the owner presses the link or Continue. |
| Inputs | FieldDefinition criticality; derived field state; visible suggestions on the step |
| Outputs | The link; FieldEvent `skipped` through F-VALUE-06; the inline line |
| Rules and unknownPolicy | Criticality gates outputs, not navigation; nothing fills the gap (rule 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 7; section 5 (steps 5 to 7). Test ids: G7-1, G7-3. |
| IFC entities | none |
| Stories served | US-INTAKE-06, US-INTAKE-07, US-INTAKE-08, US-INTAKE-09, US-INTAKE-10, US-INTAKE-14, US-INTAKE-17, US-REVIEW-10, US-SCOPE-02, US-FIN-22, US-FIN-25, US-FIN-29 |
| Notes | none |

### F-QUESTION-05: Required fields and project creation

| Field | Value |
|---|---|
| Name | Required fields and project creation |
| Purpose | Handles step 1's four required fields (project name, project type, city, country), asked without Skip: Continue stays enabled and shows an inline error on each empty required field, and the project is not created until all four are filled. On creation it writes the four answers as the owner's values. |
| Status | Required by guardrails (rules 6 and 7; §5-1a, §5-1c) |
| Trigger | Continue (labelled "Next" in the step 1 mockup) on step 1. |
| Inputs | The four answers; the location ids from F-REGISTRY-07 |
| Outputs | A new project subject with its four `user` candidates and `user_confirmed` events, or inline errors on the empty fields |
| Rules and unknownPolicy | These are the only blocking cases, and the list is closed; adding to it needs approval (rule 7). Project type stays a single choice for now (guardrails section 5, step 1). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 6, 7; section 5 (step 1). Test ids: G7-6. |
| IFC entities | none (IfcProject.Name never fills the project name) |
| Stories served | US-INTAKE-02, US-INTAKE-03, US-ADMIN-05 |
| Notes | Project type branching and splitting it into status and scope is onboarding Q5. The step 1 chrome differs from the other steps (design/onboarding-spec.md 6.2). |

### F-QUESTION-06: Suggested preselections

| Field | Value |
|---|---|
| Name | Suggested preselections |
| Purpose | Preselects owner choices with the badge Suggested and a one-line reason: systems a document names or suggests on step 4, except life-safety systems; automation areas on step 7 from the step 4 systems and the step 6 goals; occupancy and schedule on step 5 where no document states them; goals on step 6. Facts such as building type are never Suggested: they show Likely or Possible with their evidence, and the owner confirms them through F-QUESTION-02. |
| Status | Required by guardrails (rules 3, 7; §5-4c) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question onboarding Q4 · Blocked by open question new Q3 · Blocked by open question dashboards 8.3 |
| Trigger | Steps 4, 5, 6 and 7 render. |
| Inputs | System detections (candidates with badges From document, Likely or Possible, or Not found in documents); step 4 and step 6 decisions; the registered suggestion rules |
| Outputs | Visible preselections with their reason lines; on Continue, accepted suggestions written by F-VALUE-06 |
| Rules and unknownPolicy | A suggestion is a preselection, not a candidate; only what is visible, labelled and left in place is accepted on Continue (rule 3). "Recommended" and "Most popular" are not badges; a Suggested reason is project-specific (2.8). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 11; section 2.8; section 5 (steps 4, 5, 7). Test ids: G3-4. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-11, US-INTAKE-12, US-IFC-13, US-IFC-18, US-SCOPE-02, US-SCOPE-03, US-SCOPE-06 |
| Notes | Which system each automation area depends on is onboarding Q4; the spec's mapping is marked proposed. Prefill provenance on steps 5 to 7 is settled by rule 3 (onboarding Q8). What may suggest occupancy, schedule and goals is new Q3; until it is answered, those questions show no preselection (US-INTAKE-12). |

### F-QUESTION-07: Open items

| Field | Value |
|---|---|
| Name | Open items ("For you" and "SOVITECH will check") |
| Purpose | Computes open items from field states. "For you" holds only items the owner can resolve, ordered by their effect on the estimate; the review step shows the top three, then "and <n> more". "SOVITECH will check" holds engineer items as one line per group (for example "<n> equipment classifications", "Site survey needed"). Counts count only what the owner can act on ("<n> things for you to check"). A field whose `confirmBy` is `owner` or `either` and whose only source document was deleted appears under For you as "Source document removed"; where a field whose `confirmBy` is `engineer` appears in that state is new Q13. In the proposal document open items appear once, in "What we still need". |
| Status | Required by guardrails (rules 7 and 10; §5-8) · Depends on proposal 7.2.27 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.3 · Blocked by open question onboarding Q12 |
| Trigger | The review step, the proposal and the export render; a field state changes. |
| Inputs | Derived field states; routing results (F-VALUE-04); engineer queue groups (F-REVIEW-01) |
| Outputs | The For you list; the SOVITECH will check groups; the counts; the "What we still need" section content |
| Rules and unknownPolicy | A labelled value that rule 5 did not flag is not an open item (rule 7). Open items say who acts. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 7, 10; sections 2.3, 2.8. Test ids: G1-7, G4-15, G5-2, G7-5. |
| IFC entities | none under v1.5 |
| Stories served | US-INTAKE-16, US-INTAKE-18, US-DOCS-21, US-REVIEW-06, US-REVIEW-12, US-REVIEW-13, US-REVIEW-16, US-SCOPE-08, US-ZONES-07, US-ASSETS-03, US-ASSETS-04, US-ASSETS-09, US-TOPO-07, US-FIN-03, US-PROPOSAL-04, US-PROPOSAL-05, US-REPORTS-02, US-REPORTS-03, US-ENGINEER-01, US-ENGINEER-07 |
| Notes | A home for open items after the intake (the Overview, UD-01) is proposal 7.2.27. |

### F-QUESTION-08: Step 8 inline asks

| Field | Value |
|---|---|
| Name | Step 8 inline asks |
| Purpose | At step 8, asks once, inline, for each missing first-estimate field ("To show your investment estimate we need <field>. [ <input> ] · Generate without it"). If the field is still missing, the output falls back to a stage 1 "Indicative range" where the registry allows one and an approved dataset version exists, or else to "Not available yet" with the missing item and an Add action. |
| Status | Required by guardrails (rules 5 and 7; §5-8) · Blocked by open question onboarding Q12 |
| Trigger | Step 8 renders with a first-estimate field unknown or skipped. |
| Inputs | First-estimate field states; FieldDefinition estimation and indicative-range permission |
| Outputs | The inline asks; an answer through F-VALUE-06, or a second skip |
| Rules and unknownPolicy | This is rule 5's one exception to "never ask twice" (rules 5, 7). Generate is never blocked by it. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 7, 10; section 5 (step 8). Test ids: G7-2a, G7-2b. |
| IFC entities | none |
| Stories served | US-INTAKE-17, US-INTAKE-22, US-SCOPE-04, US-PROPOSAL-01, US-PROPOSAL-08 |
| Notes | The first-estimate set is approver setting 3. |

### F-QUESTION-09: Late findings and quiet notices

| Field | Value |
|---|---|
| Name | Late findings and quiet notices |
| Purpose | Handles results that arrive after the owner has left a step: never a dialog, never sends the owner back, never changes an answer the owner gave. It adds a dot to that step in the stepper, adds the item to the review list, and shows one quiet notice ("We found <n> more things in your documents. You'll see them on the review step."). |
| Status | Required by guardrails (rules 7 and 10; §5-All) · Depends on proposal 7.2.27 (not approved) · Blocked by open question onboarding Q3 |
| Trigger | Analysis finishes (F-INGEST-04) with new candidates, conflicts or revision changes for a step the owner has left. |
| Inputs | New candidates and conflicts; the owner's current step |
| Outputs | Stepper dot; review-list items; one notice |
| Rules and unknownPolicy | Late findings never interrupt (rule 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 7. Test ids: G7-4. |
| IFC entities | none |
| Stories served | US-INTAKE-01, US-INTAKE-19, US-DOCS-06, US-DOCS-12, US-DOCS-20, US-DOCS-22, US-REVIEW-16, US-SCOPE-01, US-MODEL-05, US-PROPOSAL-02, US-ADMIN-12 |
| Notes | Where notices go after Generate is proposal 7.2.27 and new Q17. |

### F-QUESTION-10: Intake progress, save and resume

| Field | Value |
|---|---|
| Name | Intake progress, save and resume |
| Purpose | Keeps the wizard's current step and completed steps per project for the stepper. While onboarding Q10 is open, a project reopened before Generate opens at step 1 with every stored answer shown (US-INTAKE-21). The stepper shows completed steps and late-finding dots. Edit links on step 8 open the step to change. Answers already given are never asked again. |
| Status | Required by guardrails (rules 7 and 10; §5-All) · Blocked by open question onboarding Q9 · Blocked by open question onboarding Q10 · Blocked by open question onboarding Q12 |
| Trigger | Step navigation (Back, Continue, Edit links); the owner returns to a project. |
| Inputs | Project id; step navigation events |
| Outputs | Current step and completed steps for the project, read by the stepper |
| Rules and unknownPolicy | Navigation is never blocked except by the four required fields (rule 7). Nothing already asked is asked again (rule 5). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 7. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-INTAKE-01, US-INTAKE-15, US-INTAKE-20, US-INTAKE-21, US-INTAKE-22 |
| Notes | Autosave, resume and the hamburger contents are onboarding Q10; a clickable stepper and returning to the review after Edit are onboarding Q9. IntakeProject (design/onboarding-spec.md 4) is an inventory only, not the storage model. If onboarding Q10 decides resume at the current step: the owner lands on the current step on resume. |

## CALC: The calculation engine: versioned formulas with `unknownPolicy`, ranges, snapshots, counts, areas, points by type

### F-CALC-01: Formula engine

| Field | Value |
|---|---|
| Name | Formula engine |
| Purpose | Runs versioned, deterministic formulas and appends their results as `calculated` or `estimated` candidates carrying their method (formula id and version, the exact input candidate ids, unknownPolicy, assumptions) and, for estimates, a range produced by the method. Estimation runs only for fields that allow it. All arithmetic lives here and in PRICE, in decimal and interval arithmetic. |
| Status | Required by guardrails (rules 2 and 9, 2.8; 7.1-r2, 7.1.1-E5, 7.1-r26) · Depends on proposal 7.2.22 (not approved) · Blocked by open question build-readiness decision 6 |
| Trigger | A formula is requested for an output; an input changes (F-CALC-02). |
| Inputs | Active candidates of the inputs; FieldDefinition estimation; reference candidates from approved datasets; the formula registry |
| Outputs | Candidate (source `calculated` or `estimated`) with `method` and, for estimates, `range`; "Incomplete: excludes <item names>" or "Not available yet" results where the policy says so |
| Rules and unknownPolicy | unknownPolicy: hosts all three policies and declares one per formula. refuse (the default, and what a formula with no declared policy runs as): any unknown input gives "Not available yet", naming it. exclude_and_count: a total leaves out unknown items silently only if every one is `minorForTotals`; otherwise it reads "Incomplete: excludes <item names>", and no headline, payback or ROI is computed from it. range_over_options: a range over conflicting values, ambiguous readings or the options of an unknown enum; where a formula cannot take a range over a conflict, the output reads "Not available yet: two values for <field>". Estimation forbidden blocks estimated candidates and calculated ones whose formula uses a benchmark. An estimate's range satisfies low < value < high and widens when inputs are inferred; it is never typed. Published formula versions never change. |
| Guardrail rules and test ids | Rules 1, 4, 9; section 2.4. Test ids: G1-2, G1-9, G4-12. |
| IFC entities | none |
| Stories served | US-REVIEW-01, US-FIN-17, US-PROPOSAL-07, US-PROPOSAL-09 |
| Notes | docs/build-readiness.md 3 "Now" item 8 (a hash manifest that fails when a published version changes; decimal.js and interval ranges), proposed under build-readiness decision 3. |

### F-CALC-02: Recalculation and staleness

| Field | Value |
|---|---|
| Name | Recalculation and staleness |
| Purpose | When any input's active candidate changes, appends a new result and supersedes the old one. A result whose inputs are no longer all active is stale and renders "Out of date, recalculating", never as current. Provisional status then follows automatically, with no manual step. |
| Status | Required by guardrails (rule 7, 2.3, 2.4, rule 10; 7.1.1-D5) · Depends on proposal 7.2.20 (not approved) · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.12 |
| Trigger | A change of active candidate on any input (a new document, an edit, a confirmation, a conflict, a scope decision, a withdrawal). |
| Inputs | The dependency graph of formulas and their input candidate ids |
| Outputs | New `calculated` or `estimated` candidates; CandidateEvent `superseded` (role system) on the old results; stale flags read by F-VALUE-02 |
| Rules and unknownPolicy | Each formula keeps its own unknownPolicy; this function adds none. A generated proposal keeps its own snapshot (F-PROPOSAL-02). |
| Guardrail rules and test ids | Rules 4, 9; section 2.4. Test ids: G9-2. |
| IFC entities | none |
| Stories served | US-INTAKE-22, US-DOCS-12, US-DOCS-20, US-DOCS-21, US-REVIEW-01, US-REVIEW-07, US-REVIEW-15, US-SCOPE-06, US-ZONES-04, US-MODEL-02, US-FIN-25, US-PROPOSAL-10, US-PROPOSAL-14, US-ENGINEER-03, US-ENGINEER-05, US-ENGINEER-06 |
| Notes | none |

### F-CALC-03: Calculation snapshot and shares

| Field | Value |
|---|---|
| Name | Calculation snapshot and shares |
| Purpose | Records a snapshot (candidate ids and formula versions) from which a breakdown, its total, its shares and its chart series are all read together, so two figures for one option never appear. Computes shares from the same snapshot as their amounts, naming the base; when the amounts are ranges, a share is a range or is left out. |
| Status | Required by guardrails (rule 10, 2.8; 7.1.1-P1) · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.4 (not approved) · Depends on proposal 7.2.10 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.3 · Blocked by open question new Q25 · Blocked by open question new Q29 |
| Trigger | A screen or export that shows a breakdown with its total, shares or a chart. |
| Inputs | The formula results for the breakdown and total |
| Outputs | Snapshot id; share candidates (`calculated`) with their base |
| Rules and unknownPolicy | unknownPolicy for shares: refuse. No share is computed from an unknown part or total, or from a total that reads "Incomplete"; the share then reads "Not available yet". A percentage names what it is a percentage of (rule 8). |
| Guardrail rules and test ids | Rules 8, 9; section 2.4. Test ids: G9-8, G9-9. |
| IFC entities | none |
| Stories served | US-SCOPE-08, US-ZONES-05, US-ASSETS-12, US-MODEL-12, US-FIN-03, US-FIN-05, US-FIN-14, US-FIN-16, US-FIN-17, US-FIN-18, US-FIN-21, US-FIN-27, US-FIN-28, US-FIN-30, US-FIN-32, US-PROPOSAL-03 |
| Notes | After proposal 7.2.14: the parts of a breakdown must sum to its total. "Value drivers" on the Financial Overview are shares of the estimated savings, or removed (dashboards-spec 7.1). |

### F-CALC-04: Counts from the registers and schedules

| Field | Value |
|---|---|
| Name | Counts from the registers and schedules |
| Purpose | Computes counts as `calculated` candidates: equipment counts from the asset register, broken down by asset type and excluding removed and merged assets; room counts from schedule rows with their qualifier (all spaces, guest rooms or keys); and a systems count only with its basis. While any input is provisional, a count carries a "Provisional:" line naming what it depends on; for equipment counts, "Provisional: depends on <n> equipment items not yet checked". |
| Status | Required by guardrails (rules 5 and 8, 2.8; §5-3a, §5-3c, §5-3d, §5-3e) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.5 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.11 · Blocked by open question dashboards 8.10 |
| Trigger | The asset register or a schedule changes; a count is displayed. |
| Inputs | Asset register (F-VALUE-08); schedule row candidates; the filter the count's label states |
| Outputs | Count candidates with method and filter; the Provisional line |
| Rules and unknownPolicy | unknownPolicy: exclude_and_count. Assets whose type is unknown or in conflict are shown apart from the per-type figures and still counted once in the total. Untagged appearances are not assets and are never counted, so a count that depends on them reads "Not available yet". "None found" is not zero: a count of 0 needs a document, the owner or an engineer saying so (rule 1). Assets, circuits and points are never mixed in one count (2.5). |
| Guardrail rules and test ids | Rules 1, 2, 8; section 2.5. Test ids: G4-3, G4-16, G4-17, G9-6. |
| IFC entities | none under v1.5; untagged model objects: (ifc-input 5.4 IFC-10, proposed, not indexed), "Today" version |
| Stories served | US-IFC-15, US-IFC-19, US-IFC-21, US-REVIEW-04, US-SCOPE-05, US-SCOPE-07, US-SCOPE-11, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ASSETS-03, US-ASSETS-12, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-MODEL-03, US-MODEL-11, US-FIN-26, US-REPORTS-09, US-ENGINEER-06 |
| Notes | After ifc-input 6.2.5: untagged objects counted within one model. Also counts systems by recorded scope decision, with the systems catalogue version as basis (06's SYSTEM COVERAGE summary, E-SCOPE). |

### F-CALC-05: Area totals by basis

| Field | Value |
|---|---|
| Name | Area totals by basis |
| Purpose | Sums areas only within one basis (footprint, gross total, usable, heated usable, conditioned), recording whether below-ground areas and parking are included; converts between bases only with an engineer-approved factor, giving Estimated; and applies an area benchmark only to an area on the benchmark's own basis, so a footprint area never feeds a benchmark. |
| Status | Required by guardrails (rules 5 and 8, 2.8; §5-3a, §5-3c, §5-3d, §5-3e) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 |
| Trigger | An area total, a per-area estimate or a benchmark application is requested. |
| Inputs | Area candidates with basis and inclusion flags; approved basis factors; benchmark datasets with their basis |
| Outputs | Area total candidates by basis; Estimated converted areas |
| Rules and unknownPolicy | unknownPolicy: exclude_and_count. An area that is unknown leaves the total "Incomplete: excludes <names>" unless it is registered `minorForTotals`; a missing level makes the total incomplete, never smaller. A count with an unknown qualifier cannot feed a per-unit estimate (rule 8). |
| Guardrail rules and test ids | Rules 1, 8, 9. Test ids: G8-1. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-16, US-REVIEW-04, US-ZONES-01, US-ZONES-05 |
| Notes | Area-basis factors are approver setting 5. After ifc-input 6.2.6 and 6.2.7: IFC bases and geometry areas; proposed cases IFC-2 and IFC-3 (docs/ifc-input.md 5.4). Demo area bases: build-readiness decision 7. |

### F-CALC-06: Exact unit conversions

| Field | Value |
|---|---|
| Name | Exact unit conversions |
| Purpose | Converts within one dimension, as `calculated` candidates that keep the original: W to kW, mm to m, legacy kcal/h, Gcal/h, TR and BTU/h to registry units; gas volume to energy only through the calorific value printed on the bill. Head written in mCA stays m head with no silent conversion. |
| Status | Required by guardrails (rule 8; 7.1.1-S5) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | A value in a non-preferred unit is used by a formula or shown in a preferred unit. |
| Inputs | Candidate with its UnitCode; the target unit of the same dimension; the printed calorific value for gas |
| Outputs | Converted `calculated` Candidate with method |
| Rules and unknownPolicy | unknownPolicy: refuse. No conversion runs from an unknown input or without the printed calorific value. Conversion happens only within a dimension (2.7). |
| Guardrail rules and test ids | Rule 8; sections 2.1, 2.7. Test ids: G8-6. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-14, US-IFC-22, US-FIN-13 |
| Notes | EUR to RON is F-PRICE-06. Proposed case IFC-7 (docs/ifc-input.md 5.4) once model values exist; SI units from models wait for ifc-input 6.2.11. |

### F-CALC-07: Energy annual totals

| Field | Value |
|---|---|
| Name | Energy annual totals |
| Purpose | Builds annual totals per metering point from non-overlapping billing periods, showing gaps and overlaps. Regularisation and credit invoices replace the periods they correct. A sub-meter is never added to its parent, and only utility meters are summed while the hierarchy is unknown. Supplier-estimated readings make a total provisional. Carriers are summed only as named final energy, and primary energy uses factors from reference data. |
| Status | Required by guardrails (rule 1, rule 12; 7.1.1-D13) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.23 (not approved) · Depends on proposal 7.2.32 (not approved) |
| Trigger | Bill candidates change; an energy total is requested. |
| Inputs | Bill candidates per metering point (period, consumption, reading type, carrier); meter hierarchy where documented; primary-energy factors from approved reference data |
| Outputs | Annual total candidates (`calculated`) per metering point and carrier |
| Rules and unknownPolicy | unknownPolicy: exclude_and_count. Missing periods are named ("Incomplete: excludes <periods>"), and no total is presented as a full year when a period is missing. Corrections replace, never add (rule 8). |
| Guardrail rules and test ids | Rules 1, 8. Test ids: G8-7, G8-8. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-23, US-ASSETS-14, US-FIN-12, US-FIN-13, US-FIN-15 |
| Notes | A meter's link to its parent meter is proposal 7.2.23. Allocating billing periods to calendar months is proposal 7.2.32. |

### F-CALC-08: Points estimate by type

| Field | Value |
|---|---|
| Name | Points estimate by type |
| Purpose | Estimates points per asset from SOVITECH point templates, per motor or drive and per configuration ("1+1R" is two pumps; a twin-head pump is one asset with two motors), counting each physical point once however many systems, automation areas or goals refer to it. Reports them broken down into hardware I/O by type (AI, AO, DI, DO, UI), integration by protocol and variant, and virtual, never as one priced total. Always Estimated, with its basis, method and range. Only in-scope systems contribute, and the fire-alarm input and the fire-mode status per affected panel are always included. |
| Status | Required by guardrails (rules 3 and 7; §5-57b, §5-7) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal ifc-input 6.2.12 (not approved) · Depends on proposal 7.2.8 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.10 |
| Trigger | The asset register, scope decisions or supply-split fields change. |
| Inputs | Assets with type, configuration and lifeSafety; scope decision fields; supply-split fields; point templates (approved dataset version); point lists, EDE files, PICS or register maps where uploaded |
| Outputs | `estimated` point candidates by type with range and method; open items for an unknown supply split |
| Rules and unknownPolicy | unknownPolicy per formula: range_over_options for room points while the room-control supplier (SOVITECH-supplied or GRMS-integrated) is unknown, and over the options of an unknown configuration; exclude_and_count for assets with no point template, named in "Incomplete: excludes …". Integration point counts need a register map, EDE file, PICS or point list, otherwise they are Estimated with the method named (rule 1). An asset whose interface is unknown, or is written only as "compatibil BMS", "pregătit pentru BMS" or "BMS ready", contributes no integration points; its interface stays under SOVITECH will check (rule 1; G1-6). Room controllers are never derived from a room count. Flagged life-safety assets get status and alarm inputs only (rule 11). Points from a per-room table are `estimated`, never `calculated`. |
| Guardrail rules and test ids | Rules 1, 8, 9, 10, 11; section 2.5. Test ids: G1-6, G4-4, G9-1, G9-3, G9-4, G10-6, G10-7, G11-3. |
| IFC entities | none under v1.5 (never read from a model, docs/ifc-input.md 4.3) |
| Stories served | US-INTAKE-10, US-IFC-19, US-IFC-23, US-IFC-24, US-SCOPE-03, US-SCOPE-04, US-SCOPE-08, US-ZONES-03, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-TOPO-05, US-TOPO-06, US-TOPO-07, US-TOPO-09, US-FIN-08, US-PROPOSAL-06, US-PROPOSAL-07, US-PROPOSAL-09, US-PROPOSAL-13, US-REPORTS-09 |
| Notes | Needs the point templates (build-readiness decision 6). Points by type are in the proposed slice 1 (build-readiness decision 3). Room Automation as its own system is dashboards 8.7. The stories read a point-template version with no approval record as running no estimate (the output reads "Not available yet", naming the dataset); the same near miss as F-PRICE-02 (traceability.md section 10.3). |

### F-CALC-09: Operating energy and cost estimate

| Field | Value |
|---|---|
| Name | Operating energy and cost estimate |
| Purpose | Estimates the building's operating energy from electrical inputs or metered energy only, the approved climate dataset, and the owner's schedule and occupancy, as Estimated with basis, method and range; an operating cost that needs a tariff reads "Not available yet", naming the missing unit (7.1.1-U). "Building operating cost" and "BMS operating cost" are two separate registry labels. Maintenance, staff and other costs are Unknown unless a document or the owner states them, and a total missing them reads "Incomplete: excludes …". |
| Status | Required by guardrails (rules 3, 10; 7.1.1-P5, 7.1.1-E1) · Depends on proposal 7.2.22 (not approved) |
| Trigger | Inputs change; an operating-cost figure is requested. |
| Inputs | Asset electrical-input ratings or annual energy totals (F-CALC-07); schedule and occupancy fields; climate reference candidates |
| Outputs | `estimated` operating energy candidates with range; "Not available yet" results for costs that need a tariff |
| Rules and unknownPolicy | unknownPolicy: range_over_options over the options of an unanswered schedule or occupancy question; refuse where no option basis exists ("Not available yet", naming the missing input). No intensity or percentage from an incomplete total. An excluded system contributes no operating-cost line. |
| Guardrail rules and test ids | Rules 1, 7, 8, 9, 10. Test ids: G7-1, G9-7. |
| IFC entities | none |
| Stories served | US-SCOPE-04, US-FIN-08, US-FIN-12, US-FIN-14, US-FIN-16 |
| Notes | In the proposed slice 1, operating cost reads "Not available yet" (build-readiness decision 3). Who supplies climate data and tariffs is new Q28. The financial method is dashboards 8.6. €/m² per year needs a unit (proposal 7.2.22). After proposal 7.2.22: operating cost from energy and an approved tariff. |

### F-CALC-10: Savings and emissions estimates

| Field | Value |
|---|---|
| Name | Savings and emissions estimates |
| Purpose | Estimates energy savings in kWh/a as Estimated ranges from an approved savings-factor dataset, with their assumptions (operating hours) and a named baseline (its year or years, weather normalisation, and occupancy in that period), always phrased "could save"; a percentage names its base; an excluded system contributes no savings line. Savings in euro read "Not available yet", naming the missing energy-price unit. CO₂ reads "Not available yet", naming the missing unit and emission-factor dataset. |
| Status | Required by guardrails (rules 3, 10; 7.1.1-P5, 7.1.1-E1) · Out of scope: operations phase · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.21 (not approved) · Blocked by open question new Q29 |
| Trigger | Inputs change; a savings or emissions figure is requested. |
| Inputs | Operating energy estimates; baseline fields; scope decisions; the savings-factor dataset version with its approval record (none approved); emission-factor dataset (none approved) |
| Outputs | `estimated` savings candidates with range and assumptions; "Not available yet" results naming what is missing |
| Rules and unknownPolicy | unknownPolicy: refuse. Without a basis for a range the output is "Not available yet", naming the missing input and its action (rule 1, "Ranges need a basis"). An atypical baseline year is never used silently (rule 10). Savings are never "will save". |
| Guardrail rules and test ids | Rules 1, 8, 9, 10. Test ids: G10-7. |
| IFC entities | none |
| Stories served | US-SCOPE-04, US-FIN-08, US-FIN-16, US-FIN-19, US-FIN-20, US-FIN-32, US-OPS-11 |
| Notes | A baseline for buildings with no operating history is proposal 7.2.19; savings measures without double counting 7.2.21; units 7.2.22; non-energy benefits 7.2.13; benchmarks shown to the owner 7.2.5. Emission factors: new Q28. Financial method: dashboards 8.6. Savings factors: new Q29 (US-FIN-32). After proposal 7.2.22: savings in euro stating the energy price. |

### F-CALC-11: Financial indicators and lifecycle cost

| Field | Value |
|---|---|
| Name | Financial indicators and lifecycle cost |
| Purpose | Under v1.5, payback, analysis horizons, service lives and cost ratios cannot be stored, because the registry has no duration or currency-ratio unit. Payback, NPV, IRR, lifecycle cost, average life and their cash-flow series therefore read "Not available yet", naming the missing unit. |
| Status | Required by guardrails (rules 3, 10; 7.1.1-P5, 7.1.1-E1) · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.20 (not approved) |
| Trigger | A financial indicator is requested on Metrics, the proposal or an export. |
| Inputs | CAPEX estimate; savings estimates; financial assumptions (none registered) |
| Outputs | "Not available yet" results naming what is missing |
| Rules and unknownPolicy | unknownPolicy: refuse. Whenever an indicator is built, v1.5 still requires: it is never computed from a CAPEX total that reads "Incomplete" (rule 1); it is Estimated with a range and never promised (rule 10); ROI appears only with a registered formula; a chart beside it is drawn from the engine series of the same snapshot and formula version (rule 9). Engine outputs such as annual savings are never typed by a person (rule 10). |
| Guardrail rules and test ids | Rules 1, 8, 9, 10. Test ids: G1-2, G9-9. |
| IFC entities | none |
| Stories served | US-SCOPE-04, US-FIN-01, US-FIN-04, US-FIN-08, US-FIN-17, US-FIN-18, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-27 |
| Notes | Proposal 7.2.22 (units), 7.2.12 (indicator definitions), 7.2.20 (who owns each financial assumption; engine outputs cannot be typed), 7.2.13 (non-energy benefits); dashboards 8.6 (financial method) and 8.14 (lifecycle cost boundary). In the proposed slice 1 they read "Not available yet" (build-readiness decision 3). |

### F-CALC-12: Model geometry quantities

| Field | Value |
|---|---|
| Name | Model geometry quantities |
| Purpose | Under v1.5 not built: a quantity computed from a model's shapes (an area, containment in a space, connectivity through ports) has no source in 2.1, so no such candidate is made. |
| Status | Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | None under v1.5. |
| Inputs | none under v1.5 |
| Outputs | none under v1.5 |
| Rules and unknownPolicy | unknownPolicy: refuse, whenever it is built: a shape that fails to process gives no result, never a zero (rule 1). |
| Guardrail rules and test ids | Rules 1, 9; section 2.1. Test ids: none. |
| IFC entities | IfcSpace shape representation; element placements; IfcRelNests and IfcRelConnectsPorts |
| Stories served | US-IFC-16, US-ZONES-06 |
| Notes | Gates: ifc-input 6.2.7 (geometric computations as `calculated`) and 6.2.6 (IFC bases and the quantity-set against geometry cross-check), plus ifc-input 6.2.1, 6.2.2, 6.2.3, 6.2.10 and build-readiness decision 4. Proposed case IFC-2 (docs/ifc-input.md 5.4). |

### F-CALC-13: Scenario evaluation

| Field | Value |
|---|---|
| Name | Scenario evaluation |
| Purpose | Under v1.5 only the base case is computed: the owner's recorded decisions. No named scenario, package, scenario comparison or adoption produces figures. |
| Status | Required by guardrails (rule 1, rule 12; 7.1-r27) · Depends on proposal 7.2.4 (not approved) |
| Trigger | Metrics pages render (base case only). |
| Inputs | The owner's recorded decisions and assumptions |
| Outputs | Base-case results through the other CALC and PRICE functions |
| Rules and unknownPolicy | unknownPolicy: n/a. The base case uses each formula's own policy. One snapshot gives one figure per option (G2-7, G9-8 through F-CALC-03). |
| Guardrail rules and test ids | Rules 3, 9; section 2.4. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-FIN-01, US-FIN-11, US-FIN-23, US-FIN-28, US-FIN-29 |
| Notes | Proposal 7.2.4 (scenarios), 7.2.17 (decisions edited outside the wizard); dashboards 8.9 (scenario bar), 8.12 (configurator), 8.13 (automation model); UD-10 scenario editor (dashboards 8.10). |

## PRICE: Pricing stages, CAPEX ranges, the quotation record, "Superseded", currency and the BNR rate

### F-PRICE-01: Pricing stage derivation

| Field | Value |
|---|---|
| Name | Pricing stage derivation |
| Purpose | Derives the stage of every investment figure from stored records: "Indicative range" when only benchmarks are available (before documents are analysed, or while first-estimate data is missing); "Preliminary investment estimate" on this project's data; "Formal quotation" only from a stored quotation record that is current. Components and templates read the stage from here and never accept it as a parameter. |
| Status | Required by guardrails (rules 7 and 10; §5-8) · Depends on proposal 7.2.4 (not approved) · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.10 · Blocked by open question new Q35 |
| Trigger | Any price is displayed or exported. |
| Inputs | CAPEX estimate candidates and their inputs; quotation records (F-PRICE-04) and their staleness (F-PRICE-05) |
| Outputs | The stage label for each figure; the stage as a structured field for the AI (`pricingStage`) |
| Rules and unknownPolicy | unknownPolicy: n/a (reads records, computes nothing). A document or AI sentence can never create a quotation (rules 10, 14). |
| Guardrail rules and test ids | Rules 10, 14; section 2.8. Test ids: G10-1, G10-2. |
| IFC entities | none |
| Stories served | US-INTAKE-16, US-INTAKE-17, US-FIN-01, US-FIN-03, US-FIN-23, US-PROPOSAL-01, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-08, US-REPORTS-01, US-REPORTS-06, US-ENGINEER-07, US-ENGINEER-14, US-ENGINEER-15, US-ENGINEER-16, US-ADMIN-05 |
| Notes | none |

### F-PRICE-02: CAPEX estimate

| Field | Value |
|---|---|
| Name | CAPEX estimate (Indicative range and Preliminary investment estimate) |
| Purpose | Computes CAPEX as a range from points by type and SOVITECH cost ranges (per point or per asset, each with its basis, price date, VAT basis, currency and price-list version): at stage 1 from benchmarks only, where the registry allows an Indicative range; at stage 2 from this project's data. It is always a range while any input is provisional, and it shows its basis, the provisional inputs, the open items and the exclusions. It names the supplier for field devices, communication cards and gateways on third-party equipment, room control where a separate GRMS exists, control panels, panel power supply and cable containment. An excluded system contributes no line and is listed among the exclusions. |
| Status | Required by guardrails (rules 3, 10; 7.1.1-P5, 7.1.1-E1) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.10 |
| Trigger | Points, scope, supply-split or cost inputs change; step 8, the proposal or Metrics render. |
| Inputs | Point candidates by type (F-CALC-08); cost-range dataset version; supply-split fields; scope decisions; first-estimate field states |
| Outputs | `estimated` CAPEX candidates with range, method, assumptions and exclusions; open items for unknown splits |
| Rules and unknownPolicy | unknownPolicy: range_over_options while a supply split is unknown, and over reuse against replacement of existing devices, wiring or controllers until a site survey (rule 1, "Reuse"); exclude_and_count for items with no cost basis, reading "Incomplete: excludes <names>" unless every excluded item is `minorForTotals`, and then no headline, payback or ROI. Without a registry-allowed Indicative range and with a first-estimate input missing, the output is "Not available yet" with the missing item and an Add action (rule 7). Third-party plant is not priced as BMS scope unless SOVITECH supplies it. Prices come only from the versioned price list or an approved dataset. |
| Guardrail rules and test ids | Rules 1, 7, 9, 10. Test ids: G1-2, G1-7, G7-2a, G7-2b, G10-1, G10-6, G10-7. |
| IFC entities | none |
| Stories served | US-SCOPE-04, US-TOPO-07, US-FIN-07, US-FIN-08, US-PROPOSAL-09, US-REPORTS-09 |
| Notes | Needs the cost ranges and a decision on price confidentiality (build-readiness decision 6). A CAPEX range is in the proposed slice 1 (build-readiness decision 3). €/m² needs a unit (proposal 7.2.22). The stories read a cost-range version with no approval record as running no estimate (the output reads "Not available yet", naming the dataset). v1.5 states the approval-record requirement explicitly only for `reference` candidates (G1-12) and past-project benchmarks (rule 13), so this reading is recorded as a near miss for the approver (traceability.md section 10.3). |

### F-PRICE-03: CAPEX breakdowns

| Field | Value |
|---|---|
| Name | CAPEX breakdowns |
| Purpose | Groups the CAPEX cost lines of one snapshot by system and by level (through asset locations), so each breakdown and its total come from the same snapshot. |
| Status | Required by guardrails (rules 3, 10; 7.1.1-P5, 7.1.1-E1) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question new Q25 · Blocked by open question build-readiness decision 6 |
| Trigger | A breakdown is displayed (for example the COST BREAKDOWN tabs, the CAPEX page, the Reports bill of quantities). |
| Inputs | CAPEX cost lines with their system and asset locations; the snapshot id (F-CALC-03) |
| Outputs | Grouped amounts as `estimated` candidates in the same snapshot |
| Rules and unknownPolicy | unknownPolicy: exclude_and_count. Lines with no known system or level are named as such, and a group is never made smaller silently. While the floor field is in conflict, level groups read "Provisional: two values for floors", with a range where the formula allows (rule 4). |
| Guardrail rules and test ids | Rules 1, 4, 9, 10. Test ids: G9-8. |
| IFC entities | none |
| Stories served | US-SCOPE-04, US-MODEL-02, US-MODEL-03, US-MODEL-12, US-FIN-05, US-FIN-06, US-FIN-21, US-FIN-31, US-PROPOSAL-09 |
| Notes | "By Phase" needs a phasing plan (proposals 7.2.10, 7.2.24). Allocation methods for split lines are proposal 7.2.14. "By Building Area" also needs level areas on one basis (F-CALC-05). |

### F-PRICE-04: Quotation record

| Field | Value |
|---|---|
| Name | Quotation record |
| Purpose | Stores a formal quotation as a record holding the quotation number, the reviewing engineer's and the commercial reviewer's user ids, the date and validity period, the currency and VAT basis, the inclusions and exclusions, and a hash of every input candidate. Only this record makes a figure a "Formal quotation". |
| Status | Blocked by open question new Q35 |
| Trigger | A SOVITECH engineer and a SOVITECH commercial reviewer create and co-sign a quotation. |
| Inputs | The current CAPEX candidates and their input candidate ids; engineer and commercial reviewer user ids; validity, currency, VAT basis, inclusions and exclusions |
| Outputs | A stored quotation record |
| Rules and unknownPolicy | unknownPolicy: n/a, because it stores a record and computes no figure; an unverified `for_quotation` input makes the quotation wait instead of entering a formula (rule 7). Stage 3 is derived from the record, never passed as a parameter (rule 10). The quotation's figures need their `for_quotation` inputs engineer-verified (rule 7). |
| Guardrail rules and test ids | Rules 7, 10. Test ids: G10-1, G10-3. |
| IFC entities | none |
| Stories served | US-ENGINEER-15 |
| Notes | Where the record is created and co-signed (in this app or imported from a commercial system) is new Q35. Where review work lives is dashboards 8.15. |

### F-PRICE-05: Quotation staleness

| Field | Value |
|---|---|
| Name | Quotation staleness ("Superseded") |
| Purpose | Compares a quotation's input hash with the current inputs. When any input changes after issue, the quotation shows "Superseded: inputs changed on <date>", and its figures return to stage 2 labels. |
| Status | Required by guardrails (rule 7, 2.3, 2.4, rule 10; 7.1.1-D5) · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.3 |
| Trigger | Any change of active candidate among a quotation's inputs. |
| Inputs | Quotation record; current active candidate ids |
| Outputs | Staleness state and date read by F-PRICE-01 |
| Rules and unknownPolicy | unknownPolicy: n/a, because it runs no formula and computes no figure: it compares the quotation record's input hash with a hash of the current active candidates, and the stage 2 figures it falls back to keep their own formulas' policies (F-PRICE-02). An upload after the intake that changes an input supersedes the quotation (dashboards-spec 7.1.1-D5). |
| Guardrail rules and test ids | Rule 10; section 2.8. Test ids: G10-2. |
| IFC entities | none |
| Stories served | US-INTAKE-22, US-DOCS-12, US-DOCS-21, US-SCOPE-06, US-FIN-03, US-PROPOSAL-08, US-PROPOSAL-10, US-REPORTS-05, US-ENGINEER-16 |
| Notes | none |

### F-PRICE-06: Currency and BNR rate

| Field | Value |
|---|---|
| Name | Currency and BNR rate |
| Purpose | Converts amounts between EUR and RON only with the BNR reference rate for a stated date taken from reference data, showing the rate and its date: prices shown in RON, and bill amounts in RON shown in EUR. No rate comes from the AI. |
| Status | Required by guardrails (rule 10, 2.8; 7.1.1-P1) · Blocked by open question new Q35 |
| Trigger | A price or a bill amount is displayed in a currency other than the one it is stored in. |
| Inputs | Price or bill-amount candidates in EUR or RON; the BNR rate reference candidate for a stated date |
| Outputs | `calculated` candidates in the display currency naming the rate and date |
| Rules and unknownPolicy | unknownPolicy: refuse. Without an approved rate for the stated date there is no converted figure. Prices state their VAT basis and price date (rule 8). |
| Guardrail rules and test ids | Rules 8, 10; section 2.1. Test ids: G10-4. |
| IFC entities | none |
| Stories served | US-FIN-03, US-FIN-13, US-PROPOSAL-08, US-ENGINEER-15 |
| Notes | Slice-1 display currency is build-readiness decision 10. The BNR feed is in docs/build-readiness.md 4. Rule 8 names EUR to RON conversion; bill amounts in RON shown in EUR use the same BNR reference rate for a stated date (US-FIN-13 AC6). |

## PROPOSAL: The proposal snapshot, `inputsHash`, regeneration triggers, open items, AI proposal text with value tokens

### F-PROPOSAL-01: Generate the preliminary proposal and landing

| Field | Value |
|---|---|
| Name | Generate the preliminary proposal and landing |
| Purpose | On "Generate Proposal" (step 8), produces the preliminary proposal from the current project data: the investment figure at its stage (a "Preliminary investment estimate" range, or the "Indicative range" fallback where the registry allows one and an approved dataset version exists, or "Not available yet"), points by type, the "For you" and "SOVITECH will check" lists, which outputs are ranges and which are not available yet, and "What we still need". Generate is never disabled for missing data. While analysis runs it says "Still reading <n> files. Your estimate will update when they finish." Afterwards the owner lands on a page showing the stage, the headline range and the open items. When analysis that was still running at Generate finishes, it stores a new version with its own snapshot and inputs hash, and the earlier version keeps its snapshot (rule 7, 2.4). |
| Status | Required by guardrails (rules 7 and 10; §5-8) · Blocked by open question onboarding Q12 |
| Trigger | The owner presses "Generate Proposal" on step 8; analysis that was still running when the owner pressed it finishes (F-INGEST-04; rule 7). |
| Inputs | Project subject and all active candidates; CAPEX and points results; open items (F-QUESTION-07); analysis status of the documents |
| Outputs | A stored proposal with its snapshot (F-PROPOSAL-02); the generating state; the landing content as resolved field objects |
| Rules and unknownPolicy | The output is a preliminary proposal, never a quotation, and no reserved pricing term appears without a stored quotation record (rule 10). Nothing blocks Generate, including running analysis (rule 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 7, 10; section 5 (step 8). Test ids: G10-1. |
| IFC entities | none |
| Stories served | US-INTAKE-16, US-PROPOSAL-01, US-PROPOSAL-02, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-11 |
| Notes | The loading state and landing are onboarding Q12 and dashboards 8.10 (UD-07, UD-01); the Overview as the landing is design/dashboards-spec.md 2.5 (proposed, dashboards 8.3). A home for open items after the intake is proposal 7.2.27. The proposed slice 1 contains points by type and a CAPEX range only (build-readiness decision 3). |

### F-PROPOSAL-02: Proposal snapshot, inputsHash and staleness

| Field | Value |
|---|---|
| Name | Proposal snapshot, inputsHash and staleness |
| Purpose | Stores each generated proposal with the snapshot of candidate ids and formula versions it used and an inputsHash, so the stored proposal shows one figure per option and can be re-read and exported exactly as generated; detects when inputs have changed since generation. |
| Status | Required by guardrails (rule 7, 2.3, 2.4, rule 10; 7.1.1-D5) · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.12 · Blocked by open question new Q35 |
| Trigger | Generation; any later change of active candidate among its inputs. |
| Inputs | The snapshot from F-CALC-03; the input candidate ids |
| Outputs | The proposal snapshot record; an inputs-changed flag |
| Rules and unknownPolicy | A generated proposal keeps its snapshot (2.4); breakdowns and totals come from one snapshot (rule 9). Current values elsewhere keep recalculating (F-CALC-02). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 9; section 2.4. Test ids: G9-8. |
| IFC entities | none |
| Stories served | US-INTAKE-22, US-DOCS-12, US-SCOPE-06, US-PROPOSAL-01, US-PROPOSAL-03, US-PROPOSAL-04, US-PROPOSAL-10, US-PROPOSAL-11, US-PROPOSAL-14, US-REPORTS-02, US-ENGINEER-15, US-ENGINEER-16 |
| Notes | Which edits trigger regeneration, and whether it is automatic, is onboarding Q12. An "Out of date: inputs changed on <date>" status line for generated outputs is proposal 7.2.25 (not a 2.8 status line). Snapshot ids printed on exports are proposal 7.2.18. |

### F-PROPOSAL-03: AI proposal text with value tokens

| Field | Value |
|---|---|
| Name | AI proposal text with value tokens |
| Purpose | Asks the AI to draft proposal prose that refers to values, calculations and products only through tokens (`{{value:<field>}}`, `{{calc:<formula>}}`, `{{product:<catalogueId>}}`), using the project data as it is and saying in words what a figure depends on and what is still missing. Verification state and the pricing stage reach the AI only as structured fields set by code. |
| Status | Blocked by open question build-readiness decision 2 · Blocked by open question dashboards 8.10 |
| Trigger | Generation of the proposal or a report section that has prose. |
| Inputs | Project id; token catalogue for the project's values and formulas; structured `verifications` and `pricingStage`; approved reference material |
| Outputs | Draft prose passed to F-PROPOSAL-04, then rendered by F-RENDER-01 |
| Rules and unknownPolicy | The AI never does arithmetic in text and never writes a number it was not given (rule 9). "Not found in the analysed documents" is never turned into "does not exist" (rule 12). Context is built per project (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 9, 12, 13, 14. Test ids: G12-2. |
| IFC entities | none |
| Stories served | US-PROPOSAL-12, US-REPORTS-06 |
| Notes | Prompt, model id and schema changes need the guardrail evals (CLAUDE.md definition of done item 2). The AI processor route is build-readiness decision 2. |

### F-PROPOSAL-04: AI output validator for prose

| Field | Value |
|---|---|
| Name | AI output validator for prose |
| Purpose | Rejects AI prose that contains a digit sequence outside a token (years, document and sheet names and allowlisted standard identifiers are exempt), a range the engine did not return, a product name or product line outside a product token, a reserved term, a life-safety control verb beyond monitor, display, log and alarm, or a compliance claim without a verification in context; "aims to support … class <x>" passes. |
| Status | Required by guardrails (rule 11; §5-4b, 7.1.1-L1, 7.1-r19) · Depends on proposal 7.2.10 (not approved) · Blocked by open question build-readiness decision 2 |
| Trigger | Every AI prose output, before it is stored or shown. |
| Inputs | Draft prose; the token list; the reserved-term matcher (F-REGISTRY-05); verification records in context |
| Outputs | Accepted prose, or a rejection with guardrail events `ai_output_rejected` and `reserved_term_blocked` |
| Rules and unknownPolicy | Numbers in prose are references, not text (rule 2). Arithmetic lives in code (rule 9). The BMS never commands, resets, inhibits, delays or overrides life-safety systems, and the app never attests compliance (rule 11). A retry never leads the model (rule 12). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 9, 10, 11, 12; section 2.8. Test ids: G2-3, G2-5, G9-5, G11-2, G11-6. |
| IFC entities | none |
| Stories served | US-SCOPE-03, US-TOPO-04, US-PROPOSAL-12, US-ENGINEER-14, US-ADMIN-18 |
| Notes | docs/build-readiness.md 3 "Now" item 6. After proposal 7.2.29: more reserved word forms. |

### F-PROPOSAL-05: Generated life-safety and compliance sentences

| Field | Value |
|---|---|
| Name | Generated life-safety and compliance sentences |
| Purpose | Builds from stored state the sentences the AI may never write: the Fire Safety scope text "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system"; the hardwired fire-mode priority for dual-use equipment; the BAC wording "aims to support BAC class <x> (<standard and edition from reference data>)" before verification, and "designed to provide the functions of BAC class <x>, verified by SOVITECH" only from a verification record. It never says a building is compliant or meets the law. |
| Status | Required by guardrails (rule 11; §5-4b, 7.1.1-L1, 7.1-r19) · Depends on proposal 7.2.4 (not approved) · Depends on proposal 7.2.10 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.10 |
| Trigger | Fire Safety is in scope or detected; a dual-use asset is in scope; a BAC class is mentioned on a screen, the proposal or a report. |
| Inputs | Scope decisions; life-safety assets; verification records; standards reference data with edition |
| Outputs | Generated sentences for the proposal, System Scope, topology views and reports |
| Rules and unknownPolicy | Only the four verbs; fire mode is hardwired and wins; a BAC class, the energy certificate class and a legal obligation are never mixed; whether an obligation applies stays Unknown until its facts are engineer-verified (rule 11). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 9, 11; section 2.8. Test ids: G11-1, G11-4, G11-6. |
| IFC entities | none |
| Stories served | US-SCOPE-03, US-FIN-23, US-PROPOSAL-13, US-PROPOSAL-15, US-REPORTS-04, US-REPORTS-07, US-REPORTS-08 |
| Notes | The standard citation edition is build-readiness decision 9. Automation levels as a versioned function set (rule 9) need build-readiness decision 6. |

### F-PROPOSAL-06: SOVITECH proposed design content

| Field | Value |
|---|---|
| Name | SOVITECH proposed design content |
| Purpose | Under v1.5 not built: SOVITECH's proposed controllers, network, integrations, deliverables, packages and phasing plan have no guardrail source class, so none of it is shown, and nothing proposed is ever shown as a building fact. |
| Status | Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.4 (not approved) |
| Trigger | None under v1.5. |
| Inputs | none under v1.5 |
| Outputs | none under v1.5 |
| Rules and unknownPolicy | Whenever it is built, v1.5 still requires: SAUTER products only as catalogue tokens (rule 1, rule 2); protocols only where a document names them (rule 1); life-safety assets get only monitoring (rule 11); packages and levels never include control of life-safety assets. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 11; section 2.1. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-SCOPE-10, US-TOPO-04, US-FIN-23, US-FIN-30, US-PROPOSAL-15, US-REPORTS-10, US-REPORTS-12 |
| Notes | Proposals 7.2.10 (proposed design labelled "Proposed design · SOVITECH will check"), 7.2.24 (implementation programme), 7.2.4 (packages as scenarios); dashboards 8.8 (SAUTER product line), 8.12 (configurator), 8.13 (automation model); build-readiness decision 6 (catalogue and function set). |

### F-PROPOSAL-07: Output availability preview

| Field | Value |
|---|---|
| Name | Output availability preview |
| Purpose | Before Generate, on step 8, states for each proposal output what it will show: a range with the stage label its investment figure will carry ("Preliminary investment estimate", or "Indicative range" where a first-estimate input is missing, the registry allows one and an approved dataset version exists), an Estimated range, or "Not available yet" naming the missing input and its action. It computes no figure, shows no price and stores nothing. |
| Status | Required by guardrails (rules 7 and 10; §5-8) |
| Trigger | Step 8 renders; a field state changes while step 8 is open (for example an inline ask is answered or skipped). |
| Inputs | Derived field states (F-VALUE-02); FieldDefinition criticality, estimation and indicative-range permission (F-REGISTRY-01); each formula's declared unknownPolicy and version (F-CALC-01); the stage each investment figure would carry (F-PRICE-01) |
| Outputs | For each output, its expected form as a status line (a range with its stage label, an Estimated range, or "Not available yet" with the missing input and its action); no Candidate, no CandidateEvent, no FieldEvent, no figure |
| Rules and unknownPolicy | Guardrails section 5, step 8: the proposal card says which outputs will be ranges or not available. It reads formula policies and never runs arithmetic, which lives only in CALC and PRICE (rule 9). The stage label comes only from F-PRICE-01, never from a parameter (rule 10). "Not available yet" always names what is missing and offers its action, and nothing here blocks Generate (rule 7). unknownPolicy: n/a (reads the declared policies of CALC and PRICE formulas; computes nothing) |
| Guardrail rules and test ids | Rules 7, 9, 10; section 2.8; section 5 (step 8). Test ids: none of its own (the fallbacks it announces are those G7-2a and G7-2b test on F-QUESTION-08 and F-PRICE-02; no section 7 case tests the list itself). |
| IFC entities | none |
| Stories served | US-INTAKE-16, US-INTAKE-18 |
| Notes | Added at consolidation from the E-INTAKE draft's provisional output-availability-preview function (US-INTAKE-16 and US-INTAKE-18). F-PROPOSAL-01 states the same after Generate, from the stored snapshot; this function states it beforehand and stores nothing. Which action a line offers when the missing input is not the owner's to add is new Q26. The first-estimate set is approver setting 3. Durations, currency ratios and CO₂ read "Not available yet" until proposal 7.2.22. |

## EXPORT: PDF and file exports, the appendix, the demo line in exports

### F-EXPORT-01: Export frame

| Field | Value |
|---|---|
| Name | Export frame |
| Purpose | The frame every export uses, PDF or file: the demo line "Demo data, not an assessment of the real building" on every page of a demo project's export; badges on the same line as their figures; ranges inline; unknowns as "Unknown", never 0; stage labels read from stored records; reserved terms checked in templates below the matching stage. |
| Status | Required by guardrails (rule 10, rule 13; 7.1.1-D6, 7.1.1-E1, §5-All) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.9 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question new Q25 · Blocked by open question dashboards 8.10 |
| Trigger | Any export or download of values. |
| Inputs | Resolved field objects and price objects; the project's demo flag; the stage from F-PRICE-01 |
| Outputs | A rendered export document or file |
| Rules and unknownPolicy | Unknown propagates into exports; no numeric stand-in (rule 1). Printed and exported proposals show badges, ranges and sources inline (2.8, "Prominence"). "CONFIDENTIAL" never replaces the demo line (dashboards-spec 7.1.1). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 10; section 2.8. Test ids: G10-5, GS-1. |
| IFC entities | none |
| Stories served | US-DOCS-23, US-REVIEW-03, US-SCOPE-04, US-ASSETS-11, US-TOPO-11, US-MODEL-12, US-REPORTS-01, US-REPORTS-02, US-REPORTS-04, US-REPORTS-05, US-REPORTS-06, US-REPORTS-09, US-REPORTS-10, US-REPORTS-11, US-REPORTS-12, US-REPORTS-13, US-ENGINEER-14, US-ENGINEER-16, US-ADMIN-14 |
| Notes | After proposal 7.2.25: every export with values carries the appendix, its template version and its snapshot id, and has a lifecycle. After proposal 7.2.18: a marker so an export uploaded back yields no candidates. Imagery on covers is proposal 7.2.9. |

### F-EXPORT-02: Proposal PDF

| Field | Value |
|---|---|
| Name | Proposal PDF |
| Purpose | Exports the stored preliminary proposal from its snapshot as a PDF: the stage label, inline badges, ranges and sources, "What we still need", the appendix and the demo line. |
| Status | Required by guardrails (2.8, rule 10; 7.1.1-P10) |
| Trigger | "Download Proposal" or "Download" on the proposal row. |
| Inputs | The proposal snapshot (F-PROPOSAL-02); resolved field objects at that snapshot |
| Outputs | A PDF file |
| Rules and unknownPolicy | The export shows the proposal as generated, never newer values mixed in (2.4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 7, 10; sections 2.4, 2.8. Test ids: G10-5. |
| IFC entities | none |
| Stories served | US-REPORTS-02, US-REPORTS-05 |
| Notes | A print route rendered to PDF is in docs/build-readiness.md 3 "Later". The CAPEX page's "Download Proposal" (dashboards-spec 7.1.1-P10). |

### F-EXPORT-03: Appendix of sources and open items

| Field | Value |
|---|---|
| Name | Appendix of sources and open items |
| Purpose | Lists every value in an exported proposal with its source, verification and method, followed by the open items. |
| Status | Required by guardrails (2.8, rule 10; 7.1.1-P10) |
| Trigger | A proposal export. |
| Inputs | The proposal snapshot's candidates with evidence, verification and method; open items (F-QUESTION-07) |
| Outputs | The appendix section |
| Rules and unknownPolicy | Excerpts erased under rule 13 show "[erased]". unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 9, 10, 13; section 2.8. Test ids: G10-5. |
| IFC entities | none |
| Stories served | US-REPORTS-02, US-REPORTS-03 |
| Notes | Extending the appendix to every export is proposal 7.2.25. |

### F-EXPORT-04: Scope and register exports

| Field | Value |
|---|---|
| Name | Scope and register exports |
| Purpose | Exports the system scope ("Export Scope") and register lists (the equipment list's "Export") with each value's badge on the same line as its figure, unknowns as "Unknown" and never 0, and, for a demo project, the demo line on every page. The appendix is required only for exported proposals. |
| Status | Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.10 |
| Trigger | "Export Scope"; "Export" on a register list. |
| Inputs | Scope decisions; register query results (F-VALUE-14) |
| Outputs | An export file |
| Rules and unknownPolicy | Rule 1's no-stand-in rule covers exports; 2.8 prominence applies. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 10; section 2.8. Test ids: none of its own (G10-5 applies to proposals only). |
| IFC entities | none |
| Stories served | US-ASSETS-11, US-REPORTS-04, US-REPORTS-07 |
| Notes | After proposal 7.2.25: the appendix and basis on every export. |

### F-EXPORT-05: Report generator and templates

| Field | Value |
|---|---|
| Name | Report generator and templates |
| Purpose | Generates reports from templates on request, and lists every generated output, including the generated preliminary proposal, in the Reports register. "Generate Report" is never disabled for missing data: missing sections print "Not available yet", naming what is missing and the action to add it. "Generated By" names who started the generation and never implies review. No report attests compliance. |
| Status | Required by guardrails (rule 10; 7.1.1-D8) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.25 (not approved) · Blocked by open question dashboards 8.10 |
| Trigger | "+ Generate Report"; a template tile; "View" or "Download" on a report row. |
| Inputs | Template id and version; the project snapshot; the requesting user |
| Outputs | A generated report through F-EXPORT-01 |
| Rules and unknownPolicy | Every figure goes through the value and price components; bill-of-quantities quantities are register queries, and priced lines carry their stage and supplier; protocols appear only where a document names them (rules 1, 2, 10, 11). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 7, 10, 11; section 2.8. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-REPORTS-05, US-REPORTS-06, US-REPORTS-07, US-REPORTS-08, US-REPORTS-09, US-REPORTS-10, US-REPORTS-11, US-REPORTS-12, US-REPORTS-13, US-REPORTS-14 |
| Notes | What the generator, the templates library and the report viewer do is undefined: dashboards 8.10 (UD-12, UD-19, UD-20). Report lifecycle and status are proposal 7.2.25; contents such as an API specification and topology depend on proposal 7.2.10. The compliance report wording follows F-PROPOSAL-05. Placing the proposal as row 1 is dashboards-spec 2.5 (proposed, dashboards 8.3). |

## RENDER: The Value, Price and Badge components, the formatting module, status lines, the demo line, theme tokens, the render test's contract

### F-RENDER-01: Value component

| Field | Value |
|---|---|
| Name | Value component (including value tokens in prose) |
| Purpose | The one component that renders an engineering value from a resolved field object: the value or range, its badge on the same line at 12px or larger with WCAG AA contrast, the source line, any status line, and the missing case. It fills `{{value:…}}`, `{{calc:…}}` and `{{product:…}}` tokens in prose the same way. Hover may add detail but never holds the only copy of a label, range, source or open-items count. |
| Status | Required by guardrails (rules 2 and 4; §5-8) · Out of scope: operations phase · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.7 (not approved) · Depends on proposal 7.2.8 (not approved) · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.21 (not approved) · Depends on proposal 7.2.20 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.10 · Blocked by open question new Q25 · Blocked by open question new Q29 · Blocked by open question build-readiness decision 2 · Blocked by open question dashboards 8.15 |
| Trigger | Any screen, prose or export that shows a value. |
| Inputs | Resolved field object (F-VALUE-10) |
| Outputs | Rendered value element bound to its value id |
| Rules and unknownPolicy | One value id with one filter renders identically everywhere. Only the formatted bound value is ever shown: no count-up animation or intermediate digits. "Not available yet" always names the missing input and offers its action; a missing value is never an empty card, a dash or a zero (rules 1, 2, 7; 2.8). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 4, 7, 9; section 2.8. Test ids: G2-7, G2-8, G4-12. |
| IFC entities | none |
| Stories served | US-INTAKE-15, US-DOCS-03, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-IFC-19, US-IFC-22, US-REVIEW-01, US-REVIEW-02, US-REVIEW-04, US-REVIEW-08, US-REVIEW-11, US-REVIEW-14, US-REVIEW-15, US-SCOPE-01, US-SCOPE-05, US-SCOPE-07, US-SCOPE-08, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-TOPO-01, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-06, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-TOPO-11, US-MODEL-01, US-MODEL-02, US-MODEL-03, US-MODEL-11, US-MODEL-12, US-FIN-01, US-FIN-04, US-FIN-05, US-FIN-06, US-FIN-09, US-FIN-12, US-FIN-13, US-FIN-14, US-FIN-16, US-FIN-17, US-FIN-19, US-FIN-20, US-FIN-22, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-28, US-FIN-32, US-PROPOSAL-04, US-PROPOSAL-06, US-PROPOSAL-12, US-ENGINEER-02, US-ADMIN-05, US-OPS-07, US-OPS-11 |
| Notes | Source lines at 12px and 4.5:1 are proposed in design/dashboards-spec.md 3.3, not a 2.8 requirement; part 1 sets them at 11px (dashboards-spec 7.1, "dim secondary text"). |

### F-RENDER-02: Price component

| Field | Value |
|---|---|
| Name | Price component |
| Purpose | Renders every investment figure with its stage label read from stored records (never passed as a parameter), a range rounded outward, the VAT basis, the price date, the price-list version and the supply split per line, and, for RON, the BNR rate and its date. |
| Status | Required by guardrails (rules 8 and 9; 7.1-r24) · Depends on proposal 7.2.4 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question new Q25 · Blocked by open question onboarding Q12 · Blocked by open question new Q35 |
| Trigger | Any screen or export that shows a price. |
| Inputs | Price candidates; the stage from F-PRICE-01; the rate from F-PRICE-06 |
| Outputs | Rendered price element bound to its value id |
| Rules and unknownPolicy | No quote, quotation, offer, ofertă or deviz below stage 3 (2.8, rule 10). A superseded quotation shows "Superseded: inputs changed on <date>" and stage 2 labels. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 8, 9, 10; section 2.8. Test ids: G10-1, G10-2, G10-4. |
| IFC entities | none |
| Stories served | US-REVIEW-02, US-SCOPE-04, US-MODEL-03, US-MODEL-12, US-FIN-01, US-FIN-03, US-FIN-07, US-FIN-09, US-FIN-21, US-FIN-23, US-FIN-24, US-FIN-26, US-FIN-28, US-FIN-30, US-FIN-31, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-08, US-ENGINEER-07, US-ENGINEER-14, US-ENGINEER-15, US-ENGINEER-16, US-ADMIN-05 |
| Notes | none |

### F-RENDER-03: Badge and status-line component

| Field | Value |
|---|---|
| Name | Badge and status-line component |
| Purpose | Renders only the badges of guardrails 2.8, one per value, chosen by the first match in the 2.8 table order, and only the 2.8 status lines and stage labels, with the source line below the value. It applies the confidence-tier wording in force. |
| Status | Required by guardrails (rules 3 and 5, section 4; §5-5a) · Depends on proposal ifc-input 6.2.14 (not approved) · Depends on proposal ifc-input 6.2.3 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question dashboards 8.3 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.15 · Blocked by open question app-alignment decision 7 · Blocked by open question approver setting 2 |
| Trigger | With every value, register row and document row. |
| Inputs | Badge key and source line from the resolved field object; the tier wording override (F-AUDIT-05) |
| Outputs | Badge and status-line elements |
| Rules and unknownPolicy | A new badge is added to 2.8 before any design or code uses it. "From design drawings" names the stage. "Verified by SOVITECH" keeps the origin ("AI inference, verified by SOVITECH"). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 3; section 2.8. Test ids: G2-6, G3-6, G3-7. |
| IFC entities | none |
| Stories served | US-INTAKE-07, US-DOCS-03, US-DOCS-04, US-DOCS-06, US-DOCS-07, US-DOCS-08, US-DOCS-09, US-DOCS-13, US-DOCS-14, US-DOCS-20, US-DOCS-21, US-IFC-01, US-IFC-02, US-IFC-06, US-IFC-10, US-IFC-13, US-IFC-14, US-IFC-15, US-IFC-16, US-IFC-17, US-IFC-19, US-IFC-22, US-IFC-23, US-REVIEW-01, US-REVIEW-09, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-05, US-SCOPE-06, US-ZONES-02, US-ZONES-03, US-ZONES-07, US-ASSETS-02, US-ASSETS-03, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-11, US-TOPO-01, US-TOPO-03, US-TOPO-06, US-MODEL-02, US-MODEL-11, US-FIN-09, US-PROPOSAL-04, US-PROPOSAL-10, US-ENGINEER-02, US-ENGINEER-03, US-ENGINEER-04, US-ENGINEER-05, US-ENGINEER-16, US-ADMIN-05, US-ADMIN-09, US-ADMIN-22 |
| Notes | Badge colours are app-alignment decision 7. |

### F-RENDER-04: Formatting module

| Field | Value |
|---|---|
| Name | Formatting module |
| Purpose | Owns rounding and number display. Stored values are never rounded. Document values display as written. Calculated values show no more significant figures than their least precise input. Estimated values and stage 1 and 2 prices show two significant figures when the range is wide ((high − low)/(high + low) of 5% or more) and three otherwise. Ranges round outward. "about" appears only on Estimated values and on originals written as approximate. |
| Status | Required by guardrails (rules 8 and 9; 7.1-r24) · Blocked by open question build-readiness decision 6 |
| Trigger | Every displayed number. |
| Inputs | Value or range with its source, precision and original text |
| Outputs | Display strings |
| Rules and unknownPolicy | Rounding never narrows a range (rule 9). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 8, 9. Test ids: G9-1. |
| IFC entities | none |
| Stories served | US-REVIEW-02, US-SCOPE-08, US-ASSETS-08, US-ASSETS-09, US-FIN-03, US-FIN-09, US-PROPOSAL-06, US-PROPOSAL-08, US-REPORTS-01 |
| Notes | Display locale and app languages are app-alignment decision 6. |

### F-RENDER-05: Demo line

| Field | Value |
|---|---|
| Name | Demo line |
| Purpose | Shows "Demo data, not an assessment of the real building" persistently on every screen of a project flagged `demo`, set from the flag. |
| Status | Required by guardrails (rules 7 and 10; §5-All) · Depends on proposal 7.2.28 (not approved) · Depends on proposal 7.2.23 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.7 (not approved) · Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.21 (not approved) · Depends on proposal 7.2.20 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question dashboards 8.4 · Blocked by open question dashboards 8.3 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.7 · Blocked by open question dashboards 8.11 · Blocked by open question onboarding Q3 · Blocked by open question new Q25 · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.12 · Blocked by open question dashboards 8.10 · Blocked by open question dashboards 8.15 |
| Trigger | Any screen of a demo project renders. |
| Inputs | The project's `demo` flag |
| Outputs | The demo line element |
| Rules and unknownPolicy | Demo projects are labelled everywhere (rule 10; guardrails section 5, row "All"). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 10; section 5. Test ids: GS-1. |
| IFC entities | none |
| Stories served | US-INTAKE-01, US-DOCS-01, US-DOCS-03, US-DOCS-12, US-DOCS-13, US-DOCS-23, US-IFC-01, US-IFC-03, US-IFC-26, US-REVIEW-03, US-REVIEW-08, US-REVIEW-15, US-SCOPE-01, US-SCOPE-02, US-SCOPE-03, US-SCOPE-04, US-SCOPE-05, US-SCOPE-06, US-SCOPE-07, US-SCOPE-08, US-SCOPE-09, US-SCOPE-11, US-SCOPE-12, US-ZONES-01, US-ZONES-02, US-ZONES-03, US-ZONES-04, US-ZONES-05, US-ZONES-07, US-ZONES-08, US-ASSETS-01, US-ASSETS-02, US-ASSETS-03, US-ASSETS-04, US-ASSETS-05, US-ASSETS-06, US-ASSETS-07, US-ASSETS-08, US-ASSETS-09, US-ASSETS-10, US-ASSETS-11, US-ASSETS-12, US-ASSETS-14, US-TOPO-01, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-07, US-TOPO-08, US-TOPO-09, US-TOPO-10, US-TOPO-11, US-MODEL-02, US-MODEL-03, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-08, US-MODEL-10, US-MODEL-11, US-MODEL-12, US-MODEL-13, US-FIN-01, US-FIN-02, US-FIN-12, US-FIN-20, US-FIN-21, US-FIN-24, US-FIN-25, US-FIN-26, US-FIN-28, US-FIN-29, US-FIN-30, US-PROPOSAL-01, US-PROPOSAL-02, US-PROPOSAL-04, US-PROPOSAL-05, US-PROPOSAL-06, US-PROPOSAL-14, US-REPORTS-01, US-REPORTS-05, US-REPORTS-06, US-REPORTS-07, US-REPORTS-11, US-ENGINEER-02, US-ENGINEER-07, US-ADMIN-05, US-ADMIN-06, US-ADMIN-12, US-ADMIN-13 |
| Notes | Placing it in a status footer on every workspace page is design/dashboards-spec.md 2.5 (proposed, dashboards 8.3). Exports carry it through F-EXPORT-01. |

### F-RENDER-06: Render-test contract

| Field | Value |
|---|---|
| Name | Render-test contract |
| Purpose | Defines how every component exposes bound values so that the render test passes: every digit sequence on a screen sits inside an element bound to a value id, or is on the allowlist (dates and times, step numbers, character counters, and reviewed fixed interface copy such as "24 / 7", "3D / 2D" and "Max file size 500 MB"). |
| Status | Required by guardrails (rule 7, rule 14; §5-All) · Depends on proposal 7.2.30 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.8 (not approved) · Blocked by open question onboarding Q3 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.10 |
| Trigger | Every screen; the render test in CI checks it. |
| Inputs | Rendered DOM with value-id bindings; the reviewed fixed-copy list |
| Outputs | Bound elements; the allowlist |
| Rules and unknownPolicy | A digit outside a bound element or the allowlist fails; intermediate digits from animation fail (rule 2). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 2. Test ids: G2-1, G2-8; (ifc-input 5.4 IFC-12, proposed, not indexed). |
| IFC entities | none |
| Stories served | US-DOCS-01, US-DOCS-13, US-DOCS-16, US-IFC-08, US-REVIEW-01, US-SCOPE-05, US-SCOPE-12, US-ZONES-02, US-ZONES-06, US-ZONES-09, US-ASSETS-03, US-ASSETS-05, US-TOPO-02, US-TOPO-10, US-MODEL-04, US-MODEL-06, US-MODEL-07, US-MODEL-08, US-MODEL-10, US-FIN-09, US-FIN-26, US-FIN-31, US-PROPOSAL-02, US-REPORTS-05 |
| Notes | The test runner is part of prompt 3's build plan. Pagination, row ranges, file sizes and axis ticks are proposal 7.2.30. After ifc-input 6.2.15: text in 3D scenes or plan images also fails. |

### F-RENDER-07: Chart component

| Field | Value |
|---|---|
| Name | Chart component |
| Purpose | Draws charts only from engine series of one snapshot, with labels equal to plotted points, bands for ranges and generated axes. An unknown shows as a labelled gap, never a zero. |
| Status | Required by guardrails (rule 9, rule 8; 7.1.1-P4) · Depends on proposal 7.2.32 (not approved) · Depends on proposal 7.2.22 (not approved) · Depends on proposal 7.2.4 (not approved) · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.11 · Blocked by open question dashboards 8.3 · Blocked by open question app-alignment decision 7 |
| Trigger | Any chart on Metrics, the proposal or an export. |
| Inputs | An engine series and its snapshot id (F-CALC-03) |
| Outputs | Rendered chart |
| Rules and unknownPolicy | No numeric stand-in for an unknown (rule 1). The chart and the figures beside it share a snapshot and formula version (rule 9). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 9. Test ids: G1-5, G9-9. |
| IFC entities | none |
| Stories served | US-SCOPE-08, US-SCOPE-11, US-ZONES-05, US-ASSETS-12, US-FIN-05, US-FIN-09, US-FIN-15, US-FIN-18, US-FIN-27, US-FIN-28, US-ADMIN-09 |
| Notes | Chart colours are app-alignment decision 7. |

### F-RENDER-08: Brand theme tokens

| Field | Value |
|---|---|
| Name | Brand theme tokens |
| Purpose | Applies the SOVITECH brand in its dark variant: the real SVG logo (logo-white.svg, h-8 in the header), the brand palette, mint #C8E6C9 as the single accent on dark, Inter, 1px and 2px radii and no shadows. Badges keep WCAG AA contrast on every surface. |
| Status | Owner decision 2026-09-24 (OD-1) · Depends on proposal 7.2.9 (not approved) · Blocked by open question app-alignment decision 7 · Blocked by open question app-alignment decision 3 · Blocked by open question app-alignment decision 2 |
| Trigger | Every screen and export. |
| Inputs | Theme token set |
| Outputs | Styled components |
| Rules and unknownPolicy | Badge prominence (2.8). unknownPolicy: n/a |
| Guardrail rules and test ids | Section 2.8 (prominence). Test ids: none. |
| IFC entities | none |
| Stories served | US-INTAKE-01, US-ADMIN-01, US-ADMIN-08, US-ADMIN-09, US-ADMIN-10, US-ADMIN-11, US-ADMIN-14 |
| Notes | OD-1, OD-2, OD-3, OD-4. Extension tokens (status, system, text-level, disabled, focus, badge and chart colours) need the owner's OK: app-alignment decision 7. The title role and a separate status colour are dashboards 8.2. Product name, brand line and app icon are app-alignment decisions 2, 3 and 5. Proposed values are in company/brand/app-alignment.md "App theme". |

### F-RENDER-09: App shell, navigation and menus

| Field | Value |
|---|---|
| Name | App shell, navigation and menus |
| Purpose | The wizard chrome (header with logo, project name and date, stepper, Back and Continue) and the workspace shell after Generate (header, project navigation, footer with the data status and, on a project flagged demo, the demo line), the hamburger and avatar menus, and the project switcher. In the proposal phase it builds no live element: no "BMS LIVE" chip, no "BMS Live · Last sync" footer, no OPERATIONS group, no timeline. |
| Status | Owner decision 2026-09-24 (OD-1) · Out of scope: operations phase · Depends on proposal 7.2.27 (not approved) · Depends on proposal 7.2.8 (not approved) · Depends on proposal 7.2.4 (not approved) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.9 (not approved) · Blocked by open question onboarding Q9 · Blocked by open question onboarding Q12 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.11 · Blocked by open question dashboards 8.10 · Blocked by open question dashboards 8.12 · Blocked by open question onboarding Q10 |
| Trigger | Every screen. |
| Inputs | User session and role; project id; current step or page |
| Outputs | Shell elements; navigation |
| Rules and unknownPolicy | No live value is shown in the proposal phase (dashboards-spec 7.1 "All (L) values", 7.1.1-E2; rules 1, 12). The header date is rendered live. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 7, 10, 12. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-INTAKE-01, US-INTAKE-18, US-INTAKE-19, US-INTAKE-20, US-INTAKE-22, US-DOCS-01, US-DOCS-13, US-REVIEW-16, US-SCOPE-05, US-SCOPE-06, US-SCOPE-11, US-ZONES-02, US-ZONES-03, US-ASSETS-05, US-TOPO-03, US-TOPO-09, US-TOPO-10, US-MODEL-11, US-FIN-01, US-FIN-02, US-FIN-10, US-FIN-11, US-FIN-12, US-FIN-21, US-FIN-22, US-FIN-24, US-FIN-26, US-FIN-30, US-PROPOSAL-05, US-PROPOSAL-14, US-REPORTS-05, US-ADMIN-01, US-ADMIN-06, US-ADMIN-07, US-ADMIN-08, US-ADMIN-12, US-ADMIN-13, US-ADMIN-14, US-ADMIN-15, US-OPS-01, US-OPS-02, US-OPS-10, US-OPS-12, US-OPS-13 |
| Notes | Navigation structure and tab order: dashboards 8.3 (design/dashboards-spec.md 2.5, proposed). The walkthrough over the ordinary pages: dashboards 8.12. Hamburger contents and autosave: onboarding Q10. Step 1 chrome: design/onboarding-spec.md 6.2. Timeline and scenario bar: dashboards 8.9. Operations content: proposals 7.2.1 and 7.2.11, dashboards 8.1. Read-only dashboards and view verbs: proposal 7.2.16. What the footer's data status may say is new Q41; until it is answered, the footer carries only 2.8 status lines and rule 7's "Still reading <n> files…" notice (E-ADMIN draft). The shell also carries the drawn back links ("← Back to …") and "Save and Continue →" (E-SCOPE, E-ZONES and E-ASSETS draft). |

## VIEWER: The 3D and 2D model views, the shared 2D plan component, geometry provenance, selection joined by GlobalId

### F-VIEWER-01: Model view of a stored model

| Field | Value |
|---|---|
| Name | Model view of a stored model (3D) |
| Purpose | Shows the 3D view of a stored IFC model from its converted viewing files, as a view of a document. The view names the document it shows, with that document's stage and revision as recorded. Nothing is drawn as text in the scene or in textures, and every label, count or area shown with the view is a bound value, which under v1.5 means none read from the model. With no model uploaded, the view area shows "Not available yet", naming the missing model, with the upload action. |
| Status | Blocked by open question onboarding Q3 · Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question new Q25 |
| Trigger | Step 3's viewer, or a workspace page with a 3D view mode, renders. |
| Inputs | Viewing files from F-IFC-10, served after the project access check (F-AUTH-03); the DocumentRecord shown |
| Outputs | The rendered view with its document line; or the "Not available yet" state with the upload action |
| Rules and unknownPolicy | The view is never a source of values, and counts never come from it (rule 2). Converted files are keyed by project id plus content hash (rule 13). "Not available yet" never appears alone (rule 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 7, 13; section 2.3. Test ids: G2-1, G13-4. |
| IFC entities | Converted element geometry keyed by GlobalId |
| Stories served | US-IFC-08, US-SCOPE-12, US-ASSETS-13, US-TOPO-02, US-TOPO-11, US-MODEL-04, US-MODEL-05, US-MODEL-06, US-MODEL-07, US-MODEL-08, US-MODEL-09, US-MODEL-12, US-MODEL-13 |
| Notes | Whether and when a viewer is built is onboarding Q3, dashboards 8.5 and build-readiness decisions 3 and 4; the proposed slice 1 has no 3D on step 3 (docs/build-readiness.md 3 "Now" item 10). What to show with no IFC is docs/ifc-input.md 6.3.2 item 1 (an illustrative model would be proposal 7.2.8). Object selection is not offered until IFC values are stored (F-VIEWER-04). Viewer tooling is recommended in docs/ifc-input.md 2.2, not decided. |

### F-VIEWER-02: 2D plan component

| Field | Value |
|---|---|
| Name | 2D plan component |
| Purpose | The shared plan component for the Topology 2D view and the Floor Plan modes of Equipment and Zones (UD-04). Under v1.5 it is not built as a plan per level: choosing a register level cannot select a storey of a stored model until values read from the model are stored, so no 2D or Floor Plan mode is offered and nothing from the model is shown. Whenever it is built, the plan image carries no text or numbers, the component names the document it shows, and anything shown over the plan is a bound value. |
| Status | Blocked by open question onboarding Q3 · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.8 (not approved) |
| Trigger | A 2D mode is selected. |
| Inputs | The level register (F-VALUE-11); per-storey plan images from F-IFC-10 (not used under v1.5) |
| Outputs | Under v1.5: none; no 2D or Floor Plan mode and no plan area is offered on any page (US-MODEL-10 AC1, US-TOPO-09 AC1, US-TOPO-10 AC4, US-SCOPE-12 AC2). Whenever built: the rendered plan with its document line |
| Rules and unknownPolicy | No area or name is printed into a plan image (rule 2). A level with no plan shows "Not available yet" with its reason (rule 7). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 7, 13. Test ids: G2-1; (ifc-input 5.4 IFC-12, proposed, not indexed). |
| IFC entities | IfcBuildingStorey sections from the converted model |
| Stories served | US-IFC-08, US-SCOPE-12, US-ZONES-06, US-ASSETS-13, US-TOPO-09, US-MODEL-07, US-MODEL-08, US-MODEL-10 |
| Notes | One shared plan component for 10, 17 and 20 is design/dashboards-spec.md 2.5 (proposed, dashboards 8.3). Pins, zone polygons with areas, scale bars and north arrows wait for F-VIEWER-04's gates and proposal 7.2.28. After ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10, with level identity (ifc-input 6.2.4, 6.2.8): a plan per register level from the model's storey sections. Consolidation: the per-level plan was moved out of v1.5 behaviour, as the E-TOPO and E-MODEL draft found (traceability.md section 10.3). |

### F-VIEWER-03: View modes and floor selection

| Field | Value |
|---|---|
| Name | View modes and floor selection |
| Purpose | Switches between the view modes the approved screens show (3D, 2D, Exploded or Section, and Logical on Topology) where each mode is built, and selects a floor by the level register's labels for register lists, filters and values. Under v1.5 a floor selection never isolates, names or picks a storey of a model, and no per-level plan is served. A floor with no level-register entry is never invented. |
| Status | Required by guardrails (rule 8, 4; 7.1-r8) · Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.11 · Blocked by open question onboarding Q3 · Blocked by open question new Q25 |
| Trigger | The owner or engineer uses the segmented control or floor selector. |
| Inputs | Level register (F-VALUE-11); available viewing files |
| Outputs | The selected mode and level for the views and lists on the page |
| Rules and unknownPolicy | Level labels are generated from the register, one label per level everywhere (dashboards-spec 7.1.1-E4; rule 8). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 8; section 2.2. Test ids: G2-7. |
| IFC entities | none under v1.5 |
| Stories served | US-SCOPE-07, US-SCOPE-11, US-SCOPE-12, US-ZONES-02, US-ASSETS-05, US-ASSETS-13, US-TOPO-10, US-TOPO-11, US-MODEL-02, US-MODEL-06, US-MODEL-07, US-MODEL-10, US-MODEL-12 |
| Notes | One floor selection shared across System Scope and Topology is design/dashboards-spec.md 2.5 rule 6 (proposed). The demo's floors are dashboards 8.4. After ifc-input 6.2.1, 6.2.2, 6.2.3 and 6.2.10, with level identity (ifc-input 6.2.4, 6.2.8): a floor selection may also select the matching storey of the model. Consolidation: limited to register lists and filters under v1.5, as the E-TOPO and E-MODEL draft found (traceability.md section 10.3). |

### F-VIEWER-04: Model overlays: provenance labels, pins and selection

| Field | Value |
|---|---|
| Name | Model overlays: provenance labels, pins and selection |
| Purpose | Under v1.5 not built: no pins from location evidence, no scale bar, north arrow or orientation words, no "From a superseded revision" or "Illustrative model, not to scale" label on a view, and no object selection joined to the register by GlobalId. |
| Status | Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) |
| Trigger | None under v1.5. |
| Inputs | none under v1.5 |
| Outputs | none under v1.5 |
| Rules and unknownPolicy | Whenever it is built, v1.5 still requires: no orientation or measurement stated that no document gives (rule 1); every label or count shown is a bound value (rule 2). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2. Test ids: none of its own. |
| IFC entities | GlobalId; TrueNorth; IfcMapConversion; element placements |
| Stories served | US-SCOPE-13, US-ZONES-06, US-ASSETS-13, US-TOPO-02, US-TOPO-09, US-MODEL-08, US-MODEL-09, US-MODEL-13, US-FIN-31 |
| Notes | Gates: ifc-input 6.2.15 and proposal 7.2.8 (provenance, pins, scale bar, north arrow, illustrative label, superseded label); selection needs stored IFC values (ifc-input 6.2.1, 6.2.2, 6.2.3, 6.2.10 and build-readiness decision 4). docs/build-readiness.md 3 "Later" lists proposal 7.2.8 before the viewer libraries, which is build order, not a guardrail. |

### F-VIEWER-05: System topology view

| Field | Value |
|---|---|
| Name | System topology view |
| Purpose | Draws the building's documented systems and assets as a logical diagram (the Logical view); under v1.5 it draws nothing on a model and builds no system layers: protocols only where a document names them; the fire system drawn as a separate system with a one-way monitoring link, labelled "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system", with its fire-alarm input and fire-mode status points; no proposed controller or network shown as a building fact; no command, reset, inhibit, delay or override on any life-safety asset. |
| Status | Required by guardrails (rule 2, 2.5; 7.1-r2) · Depends on proposal 7.2.10 (not approved) · Depends on proposal 7.2.8 (not approved) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question dashboards 8.3 |
| Trigger | A Topology page renders; a system or a level is chosen in its filters. |
| Inputs | Asset register and system scope decisions; interface fields; life-safety flags; point estimates by type |
| Outputs | The rendered diagram with bound labels and counts |
| Rules and unknownPolicy | Protocols are never assumed (rule 1). Fire mode is hardwired and wins, and only the four verbs apply (rule 11). Counts are register queries with the filter in their label (2.5). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 2, 11; section 2.5. Test ids: G11-3. |
| IFC entities | none under v1.5 |
| Stories served | US-SCOPE-10, US-SCOPE-13, US-TOPO-01, US-TOPO-02, US-TOPO-03, US-TOPO-04, US-TOPO-05, US-TOPO-06, US-TOPO-09, US-TOPO-11, US-REPORTS-10 |
| Notes | Labelling SOVITECH's proposed design is proposal 7.2.10; its content needs the SAUTER catalogue and function set (build-readiness decision 6, dashboards 8.8). Whether fire is a third-party integration is dashboards 8.8. View verbs instead of "Isolate System" are proposal 7.2.16. After ifc-input 6.2.1, 6.2.2, 6.2.3, 6.2.10, 6.2.4, 6.2.8 and 6.2.9, proposal 7.2.8 and ifc-input 6.2.15: system overlays and system layers on the model's storeys and plans (US-TOPO-02, US-TOPO-09, US-SCOPE-13). |

## REVIEW: The engineer queue, verification, owner acknowledgement, conflict resolution, tag-source confirmation, life-safety flag clearing

### F-REVIEW-01: Engineer review queue

| Field | Value |
|---|---|
| Name | Engineer review queue ("SOVITECH will check") |
| Purpose | Collects everything routed to SOVITECH: unverified values on engineer fields; engineer-routed conflicts and type conflicts; rejected document values from owner corrections on engineer or for_quotation fields; "Something's wrong" notes; confirmations beyond the budget; "Site survey needed" items; possible duplicates; embedded-instruction and hidden-text findings; AI notes and suggestions for the SOVITECH team; and, once built, model-check results. Each item opens with its evidence. |
| Status | Required by guardrails (rules 5 and 6, section 4) · Depends on proposal ifc-input 6.2.13 (not approved) · Depends on proposal 7.2.28 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question new Q15 · Blocked by open question dashboards 8.3 · Blocked by open question build-readiness decision 6 · Blocked by open question dashboards 8.15 |
| Trigger | Any routing to the engineer; an engineer opens the queue. |
| Inputs | Derived field states and routing (F-VALUE-04); findings (F-EXTRACT-10); notes (F-REVIEW-03); budget overflow (F-QUESTION-02) |
| Outputs | Queue items grouped for the owner's one-line-per-group view (F-QUESTION-07) and itemised for the engineer; an "item opened" record per engineer, used by F-AUTH-04 |
| Rules and unknownPolicy | Technical questions go to the engineer, never the owner (rules 3, 4, 6; section 4). The owner sees groups, not items. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4, 5, 6, 14; section 4. Test ids: G4-8, G5-3, G14-1. |
| IFC entities | none under v1.5 (model-check results from F-IFC-09 once enabled) |
| Stories served | US-INTAKE-05, US-DOCS-10, US-IFC-03, US-IFC-04, US-IFC-05, US-IFC-25, US-REVIEW-05, US-REVIEW-06, US-REVIEW-07, US-REVIEW-12, US-ZONES-04, US-ZONES-07, US-ZONES-08, US-ASSETS-01, US-ASSETS-04, US-PROPOSAL-09, US-ENGINEER-01, US-ENGINEER-02, US-ENGINEER-04, US-ENGINEER-06, US-ENGINEER-08 |
| Notes | Whether the queue lives in this app is dashboards 8.15 (UD-15). |

### F-REVIEW-02: Engineer verification and rejection

| Field | Value |
|---|---|
| Name | Engineer verification and rejection |
| Purpose | Lets an authenticated SOVITECH engineer who has opened an item verify it, or reject a candidate on it with a reason. Verification goes through the guarded function (F-AUTH-04): the badge becomes "Verified by SOVITECH", and the source line keeps the origin ("AI inference, verified by SOVITECH on <date>"). A rejection writes CandidateEvent `rejected` with role sovitech_engineer and the reason; the derive function (F-VALUE-02) then shows the next eligible candidate or Unknown, and dependent values read "Out of date, recalculating" until the engine recalculates them (F-CALC-02). |
| Status | Required by guardrails (rules 3, 4, 10, 2.8; 7.1.1-C10) · Blocked by open question build-readiness decision 6 · Blocked by open question new Q34 |
| Trigger | An engineer verifies an opened item, or rejects a candidate on it. |
| Inputs | Candidate id; engineer session; the item-opened record; the reason, for a rejection |
| Outputs | CandidateEvent `engineer_verified`; CandidateEvent `rejected` (role sovitech_engineer, with the reason); guardrail event `engineer_corrected_accepted_item` when the engineer rejects or corrects an item the owner had confirmed, accepted or acknowledged |
| Rules and unknownPolicy | No bulk verification of items the engineer has not opened; demo values are never verified (rule 10). Confidence never changes verification (rule 3). A rejection never deletes the candidate: events are append-only (rule 4). Rejection inside a conflict is F-REVIEW-04's resolution. unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4, 10; sections 2.4, 2.8, 8. Test ids: G3-7, G10-3. |
| IFC entities | none under v1.5 |
| Stories served | US-ASSETS-02, US-ENGINEER-03, US-ENGINEER-09 |
| Notes | Widened at consolidation to hold the E-ENGINEER draft's provisional engineer-rejection function (US-ENGINEER-03 and US-ENGINEER-09), as that draft recommended; the skeleton version already listed the correction event. What one item is for the opened-item guard is new Q33. What source an engineer's desk correction carries is new Q34. |

### F-REVIEW-03: Owner acknowledgement

| Field | Value |
|---|---|
| Name | Owner acknowledgement ("Looks right", "Something's wrong") |
| Purpose | Offers "Looks right" and "Something's wrong" on engineer-field items, never "Confirm all". "Looks right" records `owner_acknowledged`, which never clears Provisional and never raises the badge. "Something's wrong" sends a note to the engineer queue. A bulk selection records only `owner_acknowledged`. |
| Status | Required by guardrails (rule 3; §5-3b, 7.1.1-C10) · Depends on proposal ifc-input 6.2.1 (not approved) · Depends on proposal 7.2.23 (not approved) · Blocked by open question build-readiness decision 6 |
| Trigger | The owner acts on an equipment or other engineer-field item (step 3, Equipment). |
| Inputs | Candidate or asset ids; owner session |
| Outputs | CandidateEvent `owner_acknowledged` (bulkId for a bulk action); a note in the engineer queue |
| Rules and unknownPolicy | An owner's click on a technical item is only an acknowledgement (rule 3; guardrails section 5, step 3). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 10; section 5 (step 3). Test ids: G3-3. |
| IFC entities | none |
| Stories served | US-IFC-19, US-ASSETS-04, US-ASSETS-10, US-PROPOSAL-09, US-ENGINEER-01, US-ENGINEER-04, US-ENGINEER-11 |
| Notes | none |

### F-REVIEW-04: Conflict resolution

| Field | Value |
|---|---|
| Name | Conflict resolution |
| Purpose | Closes a conflict only by the right person: the owner for owner fields; an engineer for engineer fields and for any conflict that includes an engineer_verified candidate. It records `conflict_resolved` with the chosen candidate, who, when and why, and `rejected` events on the others. |
| Status | Required by guardrails (rule 4) |
| Trigger | The owner answers "Which is right?" on the review step; an engineer resolves an item in the queue. |
| Inputs | The conflicting candidates; the stage-precedence proposal (F-VALUE-04); resolver session and reason |
| Outputs | FieldEvent `conflict_resolved` with chosenCandidateId; CandidateEvent `rejected`; recalculation (F-CALC-02) |
| Rules and unknownPolicy | Only the right person's resolution closes a conflict (rule 4). An engineer's verification is never overruled by the owner. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 4. Test ids: G4-6, G4-14, G4-16, G4-18, G4-19. |
| IFC entities | none under v1.5 |
| Stories served | US-REVIEW-11, US-ENGINEER-05 |
| Notes | none |

### F-REVIEW-05: Site survey recording

| Field | Value |
|---|---|
| Name | Site survey recording |
| Purpose | Records an engineer's site survey as a document of stage `site_survey` with the engineer as author, and survey entries as `user` values by the engineer. They settle "Site survey needed" items such as installed equipment and the reuse of existing field devices, wiring and controllers. |
| Status | Required by guardrails (rules 1, 2, 10, 2.1, 2.3, 2.8, section 4) · Blocked by open question new Q34 |
| Trigger | An engineer uploads a survey or enters survey values. |
| Inputs | Survey document or entries; engineer session |
| Outputs | DocumentRecord with stage `site_survey`; `user` Candidates by the engineer |
| Rules and unknownPolicy | For technical and for_quotation facts in an existing building that no document settles, the source is a SOVITECH engineer (Speed Rule, item 9). Reuse is never assumed before a survey (rule 1). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 1, 4; sections 2.1, 2.3, 4. Test ids: G1-7. |
| IFC entities | none |
| Stories served | US-ENGINEER-07, US-ENGINEER-09 |
| Notes | Recording the uploader and author on the DocumentRecord is proposal 7.2.26. |

### F-REVIEW-06: Tag-source confirmation

| Field | Value |
|---|---|
| Name | Tag-source confirmation |
| Purpose | Under v1.5 not built: v1.5 has no per-document tag source and no engineer action to confirm one. |
| Status | Depends on proposal ifc-input 6.2.4 (not approved) |
| Trigger | None under v1.5. |
| Inputs | none under v1.5 |
| Outputs | none under v1.5 |
| Rules and unknownPolicy | Whenever it is built, one tag is still one asset across all documents (2.5). unknownPolicy: n/a |
| Guardrail rules and test ids | Section 2.5. Test ids: none. |
| IFC entities | Tag, Name and named properties per model |
| Stories served | US-IFC-20, US-ENGINEER-10 |
| Notes | Gate: ifc-input 6.2.4 (a per-document tag source proposed by code and confirmed or rejected by an engineer as a document event), plus the minimum set ifc-input 6.2.1, 6.2.2, 6.2.3, 6.2.10 and build-readiness decision 4. |

### F-REVIEW-07: Life-safety flag clearing

| Field | Value |
|---|---|
| Name | Life-safety flag clearing |
| Purpose | Under v1.5 not built: no action clears a life-safety flag, so a flagged asset stays flagged. |
| Status | Blocked by open question build-readiness decision 6 · Depends on proposal ifc-input 6.2.12 (not approved) · Depends on proposal 7.2.23 (not approved) |
| Trigger | None under v1.5. |
| Inputs | none under v1.5 |
| Outputs | none under v1.5 |
| Rules and unknownPolicy | Rule 11 applies to every flagged asset: monitor, display, log and alarm only. unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 11; section 2.5. Test ids: none of its own. |
| IFC entities | none under v1.5 |
| Stories served | US-IFC-24, US-ASSETS-10, US-ASSETS-14, US-ENGINEER-11 |
| Notes | Gates: ifc-input 6.2.12 (only an engineer event with a reason clears the flag) and proposal 7.2.23 (lifeSafety as an engineer field; Unknown treated as true for qualifying types). |

### F-REVIEW-08: Dataset and mapping-table review

| Field | Value |
|---|---|
| Name | Dataset and mapping-table review |
| Purpose | Lets a SOVITECH engineer record a review of a reference dataset version (glossary, point templates, cost ranges, function set, asset taxonomy) for the approver. A review is never an approval and changes no approval status. |
| Status | Blocked by open question new Q32 · Depends on proposal ifc-input 6.2.10 (not approved) |
| Trigger | An engineer reviews a dataset version on the admin datasets page. |
| Inputs | Dataset id and version; engineer session; review note |
| Outputs | A review record shown beside the dataset's approval status |
| Rules and unknownPolicy | Approval belongs to the approver, in the conversation and through guardrails section 10, never to a button; a dataset without an approval record still creates no reference candidate (rule 1, section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 1; section 10. Test ids: G1-12. |
| IFC entities | none under v1.5 (IFC mapping tables after ifc-input 6.2.10) |
| Stories served | US-IFC-11, US-ENGINEER-12, US-ENGINEER-13, US-ADMIN-19 |
| Notes | build-readiness decisions 1 and 6. How approval records and review records reach the app is new Q32. After ifc-input 6.2.10: the IFC mapping tables are reviewed the same way. |

## AUTH: Roles and permissions, project isolation, the engineer-only verification guard

### F-AUTH-01: Sign-in and session

| Field | Value |
|---|---|
| Name | Sign-in and session |
| Purpose | Signs a user in and keeps a session carrying their role. The proposed slice 1 uses a development login and a roles table. |
| Status | Required by guardrails (rules 10, 13) · Blocked by open question new Q38 · Blocked by open question onboarding Q10 |
| Trigger | App entry; the avatar menu's account and sign-out items. |
| Inputs | Credentials through the chosen sign-in method |
| Outputs | An authenticated session with user id and role |
| Rules and unknownPolicy | Engineer verification needs an authenticated engineer (rule 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 10. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-ADMIN-01, US-ADMIN-02, US-ADMIN-07 |
| Notes | docs/build-readiness.md 3 "Now" item 10 (proposed; build-readiness decisions 3 and 8). The sign-in method beyond the development login is new Q38. |

### F-AUTH-02: Roles and permission checks

| Field | Value |
|---|---|
| Name | Roles and permission checks |
| Purpose | Checks every action against the user's role: owner, SOVITECH engineer, SOVITECH commercial reviewer, SOVITECH admin (the facility manager only in a later operations phase). Only engineers write asset events, verifications and resolutions of engineer-routed conflicts; only a commercial reviewer co-signs a quotation record with an engineer; admins manage accounts, roles and projects but never approve a dataset or a loosening. |
| Status | Required by guardrails (rule 13) · Out of scope: operations phase · Blocked by open question build-readiness decision 4 · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.15 · Blocked by open question new Q32 · Blocked by open question new Q35 · Blocked by open question new Q38 |
| Trigger | Every write action and every page with role-specific content. |
| Inputs | Session role; the action and its target |
| Outputs | Allow or refuse |
| Rules and unknownPolicy | Role checks on the verification endpoint (rule 10); only engineer accounts write asset events (2.5); approval is the approver's, never an app role (section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 4, 10; section 2.5; section 10. Test ids: G10-3. |
| IFC entities | none |
| Stories served | US-DOCS-11, US-IFC-03, US-SCOPE-06, US-ZONES-04, US-ZONES-07, US-ASSETS-01, US-ASSETS-04, US-ENGINEER-02, US-ENGINEER-03, US-ENGINEER-05, US-ENGINEER-06, US-ENGINEER-07, US-ENGINEER-12, US-ENGINEER-15, US-ADMIN-01, US-ADMIN-03, US-ADMIN-16, US-ADMIN-19, US-ADMIN-23, US-OPS-14 |
| Notes | Who uses the dashboards, and which roles exist beyond these, is dashboards 8.15. The facility manager and operations roles wait for dashboards 8.1 and proposal 7.2.11. |

### F-AUTH-03: Project isolation and access check

| Field | Value |
|---|---|
| Name | Project isolation and access check |
| Purpose | Enforces the project boundary: row-level security on project id; every document, excerpt, embedding, cache entry and converted viewing file keyed by project id; retrieval filtered by project before ranking; files and converted viewing files served only after the project access check. |
| Status | Required by guardrails (rule 13) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question onboarding Q3 · Blocked by open question dashboards 8.15 |
| Trigger | Every read and write of project data; every file request. |
| Inputs | Session; project id of the requested object |
| Outputs | Allow or refuse; a logged rejection for evidence that cites another project's document |
| Rules and unknownPolicy | Owner documents stay with their project, and the AI context never mixes projects (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 13. Test ids: G13-1, G13-2, G13-4. |
| IFC entities | Stored models and their converted viewing files |
| Stories served | US-DOCS-11, US-DOCS-14, US-IFC-01, US-IFC-08, US-SCOPE-12, US-MODEL-04, US-MODEL-10, US-ENGINEER-02, US-ENGINEER-08, US-ADMIN-01, US-ADMIN-04, US-ADMIN-05, US-ADMIN-06 |
| Notes | After ifc-input 6.2.16: derived files never shared between projects and never sent to an unlisted service, as a rule. |

### F-AUTH-04: Engineer-verification guard

| Field | Value |
|---|---|
| Name | Engineer-verification guard |
| Purpose | The single guarded database function that writes `engineer_verified`. The caller must be an authenticated user with the `sovitech_engineer` role who has opened the item; no script, migration, seed, AI output or service account can write it, and demo values are never verified. |
| Status | Required by guardrails (rule 10, rule 13; 7.1.1-D6, 7.1.1-E1, §5-All) · Blocked by open question new Q38 |
| Trigger | A verification request from F-REVIEW-02. |
| Inputs | Session; candidate id; the item-opened record; the project's demo flag |
| Outputs | CandidateEvent `engineer_verified`, or a refusal |
| Rules and unknownPolicy | Only the engineer review endpoint writes `engineer_verified` (rule 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 3, 10. Test ids: G10-3. |
| IFC entities | none |
| Stories served | US-DOCS-23, US-REVIEW-03, US-ASSETS-04, US-ENGINEER-03, US-ADMIN-02, US-ADMIN-03, US-ADMIN-16 |
| Notes | docs/build-readiness.md 3 "Now" item 4 (one guarded function as the only writer). |

### F-AUTH-05: Project list and switcher

| Field | Value |
|---|---|
| Name | Project list and switcher |
| Purpose | Lists the projects a user may open, with "New project" leading to step 1, and lists the demo project with its demo label; switching project changes the whole context. |
| Status | Required by guardrails (rules 2, 7, 10, 13) · Blocked by open question onboarding Q10 |
| Trigger | After sign-in; the project dropdown in the sidebar or header. |
| Inputs | Session; projects the user may access |
| Outputs | Project list rows; the selected project context |
| Rules and unknownPolicy | A user sees only projects they may access (rule 13). The demo project is labelled as demo (rule 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 10, 13. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-ADMIN-05, US-ADMIN-06, US-ADMIN-07, US-ADMIN-15 |
| Notes | UD-32 and UD-37; their look is dashboards 8.10. |

### F-AUTH-06: User, role and processor administration

| Field | Value |
|---|---|
| Name | User, role and processor administration |
| Purpose | Lets a SOVITECH admin manage accounts and roles, and shows the processors that documents may be sent to. Documents are never sent to a service that is not on that list. |
| Status | Required by guardrails (rule 13) · Out of scope: operations phase · Blocked by open question new Q38 · Blocked by open question build-readiness decision 2 |
| Trigger | The admin opens the users, roles or processors page. |
| Inputs | Admin session; account and role changes; the approved processor list |
| Outputs | Account and role records; the processor list, read-only |
| Rules and unknownPolicy | Documents are not sent anywhere beyond the processing services the app needs, and the approved processors are listed in the guardrails once chosen (rule 13). Approving a dataset or a loosening is not an admin action (section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 13; section 10. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-DOCS-11, US-IFC-02, US-ADMIN-16, US-ADMIN-17, US-OPS-14 |
| Notes | The AI processor route is build-readiness decision 2. The buildingSMART Validation Service and Autodesk APS would be processors (docs/ifc-input.md 6.3.1 item 4). |

## AUDIT: Guardrail events (guardrails section 8), history, the erasure log

### F-AUDIT-01: Guardrail event log

| Field | Value |
|---|---|
| Name | Guardrail event log |
| Purpose | Logs every enforcement as a guardrail event: `ai_output_rejected` with its reason, `evidence_not_found`, `question_for_known_field`, `owner_corrected_inference` with its confidence tier, `engineer_corrected_accepted_item`, `conflict_raised`, `reserved_term_blocked`, `embedded_instruction`, `confirmation_budget_exceeded` and `skipped`. Events, logs and error reports never contain document text. |
| Status | Required by guardrails (rules 5 and 6, section 4) · Depends on proposal ifc-input 6.2.1 (not approved) · Blocked by open question build-readiness decision 4 · Blocked by open question build-readiness decision 2 · Blocked by open question approver setting 2 |
| Trigger | Any function that enforces a guardrail. |
| Inputs | Event type, project id, subject and field keys, reason |
| Outputs | Guardrail event records |
| Rules and unknownPolicy | Guardrails section 8. Logs and error reports never contain document text (rule 13). A question asked for something the app already knew is logged as a defect (section 4). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 5, 13; sections 4, 8. Test ids: GS-1. |
| IFC entities | none |
| Stories served | US-INTAKE-05, US-INTAKE-06, US-INTAKE-07, US-DOCS-07, US-DOCS-10, US-IFC-04, US-IFC-27, US-REVIEW-05, US-REVIEW-07, US-PROPOSAL-12, US-ENGINEER-01, US-ENGINEER-03, US-ENGINEER-08, US-ADMIN-04, US-ADMIN-17, US-ADMIN-20, US-ADMIN-21, US-ADMIN-22 |
| Notes | Log scrubbing is a precondition for the first real upload (docs/build-readiness.md 3 "Later"). |

### F-AUDIT-02: Guardrail event review and speed metrics

| Field | Value |
|---|---|
| Name | Guardrail event review and speed metrics |
| Purpose | Shows guardrail event counts for review at each release, and pairs each speed metric with its truth metric: questions per project with the owner correction rate on inferences; confirmations per project with how often engineers later correct accepted items; time from upload to first estimate with the share of estimated and provisional values in that estimate. |
| Status | Required by guardrails (rule 13, sections 4, 8, 10) |
| Trigger | An admin or engineer opens the guardrail events page. |
| Inputs | Guardrail events; candidate events |
| Outputs | Counts and paired metrics, read-only |
| Rules and unknownPolicy | Metrics prompt a review, never an edit: a metric moving the wrong way never by itself widens a tolerance, allows estimation or raises a budget (section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Sections 4, 8, 10. Test ids: none of its own. |
| IFC entities | none |
| Stories served | US-ADMIN-21 |
| Notes | UD-41. Who reviews the counts is not named beyond "at each release" (guardrails section 8). |

### F-AUDIT-03: Value history

| Field | Value |
|---|---|
| Name | Value history |
| Purpose | Shows, for any field, every candidate and event in order, with who, role, when and why, including rejected, superseded, withdrawn and erased entries; erased excerpts read "[erased]". |
| Status | Required by guardrails (rules 4 and 5; §5-3a) · Blocked by open question dashboards 8.3 · Blocked by open question dashboards 8.15 · Blocked by open question new Q38 |
| Trigger | "View all extracted data", a value's detail, or an engineer queue item opens its history. |
| Inputs | Candidates and events for one subject and field |
| Outputs | A history list of resolved entries |
| Rules and unknownPolicy | Keeping every record makes each decision traceable (rule 4). The erasure job changes no other field's history (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rules 2, 4, 13; section 2.4. Test ids: G13-3. |
| IFC entities | none |
| Stories served | US-REVIEW-07, US-SCOPE-06, US-ZONES-04, US-ASSETS-07, US-ENGINEER-02, US-ENGINEER-06, US-ADMIN-16, US-ADMIN-23 |
| Notes | none |

### F-AUDIT-04: Erasure requests and erasure log

| Field | Value |
|---|---|
| Name | Erasure requests and erasure log |
| Purpose | Receives erasure requests, runs the erasure job (F-INGEST-07) for each document concerned, and keeps an audit record of each job (who asked, when, which document, what was removed) without any document text. |
| Status | Required by guardrails (rule 13, 2.3; 7.1.1-D4) · Blocked by open question new Q14 |
| Trigger | An owner's delete or erasure request; the admin opens erasure requests. |
| Inputs | Request with project and document ids; requesting user |
| Outputs | Erasure job runs; audit records |
| Rules and unknownPolicy | One audited erasure job; it cannot change a value (rule 13). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 13. Test ids: G13-3. |
| IFC entities | Stored models and their converted viewing files |
| Stories served | US-DOCS-21, US-ADMIN-23, US-ADMIN-24 |
| Notes | How an owner asks for erasure beyond deleting a document is new Q14. |

### F-AUDIT-05: Confidence calibration monitor

| Field | Value |
|---|---|
| Name | Confidence calibration monitor |
| Purpose | Records how often owners and engineers correct each confidence tier and item type. When corrections for a tier exceed the threshold the approver sets, that tier's wording drops one step until the cause is fixed. Confidence never changes verification. |
| Status | Required by guardrails (rules 2 and 9, 2.8; 7.1-r2, 7.1.1-E5, 7.1-r26) · Blocked by open question build-readiness decision 6 · Blocked by open question approver setting 2 |
| Trigger | Owner corrections of inferences (`owner_corrected_inference`) and engineer corrections (`engineer_corrected_accepted_item`). |
| Inputs | Guardrail events with tier and item type |
| Outputs | The tier wording in force, read by F-EXTRACT-05, F-VALUE-10 and F-RENDER-03 |
| Rules and unknownPolicy | Rule 3, "Confidence is set by the evidence and capped by code". Lowering the calibration threshold is a loosening (section 10). unknownPolicy: n/a |
| Guardrail rules and test ids | Rule 3; section 10. Test ids: G3-6. |
| IFC entities | none |
| Stories served | US-REVIEW-01, US-ASSETS-02, US-ENGINEER-03, US-ADMIN-22 |
| Notes | The correction threshold is approver setting 2. After ifc-input 6.2.9: corrections are also counted per classifier version. |
