# The viewer spike's runner

Phase 4 (the owner's answer of 2026-10-02, "Trial now, decide later"; `docs/adr/0046-viewer-spike.md`). It measures That Open Engine on web-ifc on the synthetic fixture models and the `perf` model, for the owner's decision D-03. Nothing here is part of the app, and nothing imports `@sovitech/viewer-spike` (`.dependency-cruiser.cjs`, `viewer-spike-imported-by-nothing`): the runner reaches the package by path only, through esbuild (the bench page) and Docker (the converter).

| File | What it does |
|---|---|
| `run.ts` | The runner: converts each model in the sandbox, opens it on the bench page in Chromium, measures, erases, and writes `results/results.json` and `results/results.md` |
| `sandbox.ts` | One conversion in `sovitech-viewer-spike:dev` with the IFC reader's confinement (`--network none`, read-only, 4 GB, 2 CPUs, a wall clock), the files copied out through the Docker daemon |
| `server.ts` | The bench's static server on 127.0.0.1: a fixed map of paths, every request recorded |
| `processes.ts` | Chromium's processes' resident memory, sampled every 250 ms |
| `stats.ts` | Frame statistics of the keyboard orbit |
| `outputs.ts` | Where the bench's screenshots of a model go (the model's `derived/` folder in the store) and the erasure step, which also checks the results folder for images (phase 4 part B, A-11) |

## Running it

Heavy: run it only under the e2e lock (build log, phase 4, "Resources"), and stop nothing else's stack.

```sh
docker build -f services/viewer-spike/Dockerfile -t sovitech-viewer-spike:dev .
pnpm tsx tools/viewer-spike/run.ts --work <scratch folder> --gl default   # SwiftShader (software WebGL)
pnpm tsx tools/viewer-spike/run.ts --work <scratch folder> --gl gpu       # the machine's GPU through ANGLE (Metal on macOS)
```

Options: `--models arh,mep-rev-a,mep-rev-b,mep-ifc2x3,perf` (the `perf` model is generated and git-ignored: `pnpm fixtures:regenerate` with the perf profile), `--orbit-seconds 10`, `--storey-steps 8`, `--profile view|library-defaults`, `--view no` (conversion only), `--plans no`.

The derived files land where the live store keeps a document's derived files (`<work>/store/<projectId>/<contentHash>/derived/viewer.frag`; `apps/api/src/storage/file-store.ts`), and so do the bench's three screenshots of the rendered model (`derived/bench-first-view.png`, `bench-after-orbit.png`, `bench-view.png`): each is erased with the store's own erasure at the end of its model's run, also when the measuring fails, and the results record that no file keyed to the model's hash remains and that the results folder holds no image (the run stops otherwise). The results hold sizes, times, memory, counts and codes only, never model text or an image of a model (rule 13, "Erasure"). Runs before phase 4 part B (A-11) wrote the screenshots into the results folder, where the erasure check did not look; those were of the synthetic fixtures only.
