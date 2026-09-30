# packages/ifc-reader

The IFC reader: one stored IFC model per job, read with web-ifc inside its own sandbox, one
extraction output out (the contract in `packages/extraction-contract`; ADR 0022). The owner chose
web-ifc on 2026-09-26 ("web-ifc instead"; ADR 0018); decisions and measurements are in
`docs/adr/0031-ifc-reader-on-web-ifc.md`. The API's worker sends it every IFC job and the Python
extractor (`services/extractor`) PDF and XLSX jobs.

When the request asks for IFC values (only while `ifc-values` reads open), `output.json` is written in the contract's per-line form (`packages/extraction-contract/src/ifc-values-stream.ts`; ADR 0034): the output on its first line, then the section one statement, fact or proposal per line, through a stream, so a large model's section never has to fit one string. Every other output is one JSON text.

What it never does: parse a number out of text (STEP literals stay tokens), map model content to
an app field without a mounted, approved dataset, or write the database. While `ifc-values` is
closed a model is stored "Not analysed: IFC model stored, not analysed" (G12-5), with the
engineer's record, coverage and findings; nothing from it becomes a value. Its logs carry codes,
GlobalIds and STEP ids only (guardrails rule 13).

## Run it

```sh
pnpm exec vitest run --project unit packages/ifc-reader            # the tests
docker build -f services/ifc-reader/Dockerfile -t sovitech-ifc-reader:dev .   # the sandbox image
```

One job, outside the sandbox (development only), with the Python extractor's arguments and exit
statuses (0 written; 2 request refused; 3 job refused; 4 internal error):

```sh
pnpm exec tsx packages/ifc-reader/src/bin.ts --request request.json --document model.ifc --out <folder>
```

## Layout

| Path | What |
|---|---|
| `src/cli.ts`, `src/bin.ts` | The command line the image runs |
| `src/job.ts` | One job: the hash check, the IDS and dataset mounts, the data pass, the output, the contract check |
| `src/model.ts` | web-ifc: the model, each instance's class and attributes, inheritance; the agreement check with the text reader |
| `src/step-text.ts` | The in-house STEP text reader: verbatim excerpts and literal tokens only (the Python one's copy; `src/step-text-corpus.json` is read by both) |
| `src/reading.ts` | The data pass, in ifc-input 2.2's order |
| `src/register.ts` | The element register (IFC-11) |
| `src/values.ts`, `src/proposals.ts`, `src/datasets.ts` | The sealed values, only when the request asks for them |
| `src/instructions.ts` | Text that addresses the reader (rule 14) |
| `src/output.ts` | The contract's output (`src/cli.ts` writes it, in the per-line form when IFC values are asked for) |
| `src/logs.ts` | Codes-only logging |
| `services/ifc-reader/Dockerfile` | The sandbox image, beside the Python extractor's (build context: the repository root, limited by the root `.dockerignore`) |
