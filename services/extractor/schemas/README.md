# services/extractor/schemas

Schemas the fixture checks validate against. Nothing here is SOVITECH reference data, and nothing here is executed. The folder is not in the extractor image: the image's build context holds the locks and `src/` only (`docs/adr/0018-extractor-dependencies-and-sandbox-image.md`).

| File | What it is | Source | SHA-256 | State |
|---|---|---|---|---|
| `ids-1.0.xsd` | The buildingSMART IDS 1.0 XML Schema, unchanged (only renamed from `ids.xsd`). Used with lxml to validate the draft IDS v0.1 (prompt 3 section 12; ifc-input 5.5) | `https://raw.githubusercontent.com/buildingSMART/IDS/1effec6f419798ce09617416d258a35bdc58320a/Development/ids.xsd`: repository `github.com/buildingSMART/IDS`, tag `v1.0.0` (the IDS 1.0 release, published 2024-06-03), commit `1effec6f419798ce09617416d258a35bdc58320a`, path `Development/ids.xsd`, git blob `edab179d836d0c3e9b21d93c5e2b29f86ec56885`, 13,158 bytes | `8975dc18bd18f08a345a430a22bf317a54d94671b7db01400042fa43b6c0d1f3` | Fetched 2026-09-26, after the owner's answer "Fetch from buildingSMART's GitHub" (`docs/build-log.md`, "Owner answers during the run") |
| `xs-namespace-stand-in.xsd` | A SOVITECH-written stand-in for the one W3C schema that `ids-1.0.xsd` imports and needs (below). Not a W3C file and not part of the IDS standard | Written for this repository, 2026-09-26 | not a download | Used only by the validation test |

## `ids-1.0.xsd`

- **How it was fetched.** The GitHub API listed the repository's tags (`v1.0.0` points at commit `1effec6f…`) and the tree of that commit (`Development/ids.xsd`, blob `edab179d…`, 13,158 bytes). The raw file at that commit was downloaded with curl into a scratch folder, and its git blob id was recomputed and matched the tree listing before the file was copied here unchanged. It is a data file: nothing runs it.
- **Why this copy.** The schema location the IDS files name, `http://standards.buildingsmart.org/IDS/1.0/ids.xsd`, answers a non-browser request with a bot challenge (HTTP 403, `cf-mitigated: challenge`; ADR 0018). That copy could not be downloaded, so it was not compared with this one.
- **The repository's `development` branch.** Its `Schema/ids.xsd` (blob `047c34812b7589379af782dc829e4fe9d142a29d`, 13,180 bytes on 2026-09-26) differs from the release by a folder move (commit `2dbc6e75aede379e90ba174e1423ffe156f088ef`, 2024-08-19) and two documentation links inside `xs:documentation` (commit `217ef055f3e6c35826025b8aacc7f24beda8304d`, 2024-10-23): no structural change, read from the commits' diffs through the GitHub API. `docs/ifc-input.md` source S25 names that branch path; this build pins the tagged release, which is what an IDS declaring IDS 1.0 is written against.
- **Licence.** The repository's `LICENSE` at the same commit reads: "(c) buildingSMART International Ltd." and "This work is licensed under the Creative Commons Attribution-NoDerivatives 4.0 International License." (CC BY-ND 4.0, `http://creativecommons.org/licenses/by-nd/4.0/`). So the file is never edited here: a changed copy may not be shared. This section is its attribution. Counsel's licence review (PRD D-94) should list it with the other third-party material, although the app does not ship it.
- **Checking the copy.** `shasum -a 256 ids-1.0.xsd` gives the SHA-256 above; `git hash-object ids-1.0.xsd` gives the blob id. `services/extractor/tests/test_ids_schema.py` checks both, and the size.

## `xs-namespace-stand-in.xsd`

- **Why it exists.** `ids-1.0.xsd` imports three W3C schemas by URL: `http://www.w3.org/2001/xml.xsd`, `http://www.w3.org/2001/XMLSchema.xsd` and `http://www.w3.org/2001/XMLSchema-instance`. The test runs lxml with the network off (`no_network=True`), and none of the three is an approved download. Without the second one, libxml2 refuses to compile `ids-1.0.xsd` at all: `xs:restriction` (used by `ids:idsValue`) and `xs:occurs` (used by `ids:applicabilityType`) do not resolve.
- **What it declares.** Those two components and nothing else, each a subset of its W3C definition in XML Schema 1.0 Part 1 (Structures), Appendix A. Anything the stand-in accepts, the W3C definition accepts too. Where it is narrower, it is stricter: `xs:restriction` needs a `base` and at least one facet, and takes no `xs:annotation`, no nested `xs:simpleType`, no `id` and no foreign attribute; the facets are the twelve of XML Schema 1.0 Part 2 section 4.3, each with its required `value`, with `fixed` only where W3C allows it (not on `enumeration` or `pattern`); `xs:occurs` is the W3C attribute group as written. The file's header comment says the same.
- **What it changes.** Everything the IDS standard defines (the info block and its order, specifications, applicability and requirements facets, cardinality values, `ifcVersion`, `partOf` relations, the upper-case `dataType`) is validated by `ids-1.0.xsd` itself. Only the content of each `xs:restriction` and the lexical form of `minOccurs` and `maxOccurs` are validated through the stand-in.
- **What it has not been compared with.** It was written from the W3C Recommendation's structure, not copied from the W3C file, which was not downloaded. If the owner approves downloading `XMLSchema.xsd` from w3.org, the test can resolve that URL to it instead; whether libxml2 compiles the W3C file has not been tried.
- **The other two imports stay unresolved.** `ids-1.0.xsd` references no component of the `xml` or `xsi` namespaces, so libxml2 skips them with a warning and nothing changes. The test checks that, and that those two warnings are the only compile messages.

## The validation

`services/extractor/tests/test_ids_schema.py` runs in `pnpm test:py` with no network:
1. `ids-1.0.xsd` is the release file byte for byte (SHA-256, git blob id, size), and this README records its source and hashes.
2. It compiles offline. Only `http://www.w3.org/2001/XMLSchema.xsd` resolves, to the stand-in, and the XSD uses exactly the two components the stand-in declares.
3. `fixtures/ids/sovitech-ifc-minimum-v0.1.ids` validates against it.
4. Ten broken copies of the IDS, built in memory, each fail for their own reason (a specification with no name, an `ifcVersion` or `partOf` relation outside IDS 1.0, `optional` cardinality on `partOf`, a lower-case `dataType`, the info block out of order, a non-numeric `maxOccurs`, a facet XML Schema 1.0 lacks, an enumeration with no value, a restriction with no base), so a pass is not vacuous.
5. The stand-in keeps its shape: two top-level components, no wildcard, import or annotation, the twelve facets.

**Result, 2026-09-26:** the draft IDS v0.1 validates against the IDS 1.0 XSD. It needed no change, so `fixtures/manifest.json` is unchanged. It stays labelled draft reference data (its info block, "DRAFT REFERENCE DATA").

## What did not run

- **The buildingSMART IDS-Audit-tool:** not run. It is a binary from GitHub, and prompt 3 section 12 allows no binary from GitHub. So the IDS is not checked beyond the XSD: IFC class names per `ifcVersion`, standard property set and property names with their data types (among them S10's `Pset_ChillerTypeCommon.ChillerCapacity`, whose IFC4 name ifc-input 5.5 asks to check), and the `base` of each restriction against the property's data type.
- **IfcTester:** not used (owner decision 2026-09-26, "web-ifc instead (Recommended)"; its wheel bundles GPL CGAL code, ADR 0018). So no checker has run this IDS on the IFC fixtures, the expected results under `fixtures/ids/expected/` are the generator's derivation with no checker's report to compare against, and the IDS model check waits (a recommendation, D-36).
