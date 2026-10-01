# 0041. Performance budgets (proposed)

- **Status:** Proposed
- **Date:** 2026-09-30

## Context

- **Prompt 3 section 11, "Performance budgets":** "These are initial targets proposed by this prompt, because no source sets them (PRD section 11). Record them in an ADR with status 'Proposed', citing the PRD's D id for the unset targets. Measure them on the `perf` fixture in phases 2 and 4. Report misses; a miss is reported, not a failing check." PRD section 11, "Proposed (PRD), not requirements": "Performance targets. No source sets a target … Target not set (D-22)"; prompt 3 5.2, "Performance budgets". WCAG 2.2 AA and the 1440×900 viewport are D-35's.
- Phase 2 measured the extraction budget (build log, phase 2 "Measurements"; ADR 0034) without writing this ADR; phase 3 writes it because it adds the first measured web budget.

## Decision

The initial targets, as prompt 3 section 11 proposes them, each reported (never a failing check):

1. **Uploads:** files up to 500 MB each, resumable; the wizard stays usable during upload and analysis.
2. **Extraction:** on a `perf` IFC4 file of about 100 MB, the data pass within 5 minutes and the viewer conversion within 15 minutes, each under 4 GB of memory on the development machine. Phase 2: 12.3 s and 1.19 GB (23 s and 1.80 GB in the sandbox), within budget (ADR 0034).
3. **Viewer:** first view of that model within 5 seconds; orbiting at 30 fps or better on integrated graphics with the tab under 1.5 GB; storeys on demand; code-split (phase 4).
4. **Web:** the wizard's initial JavaScript under 300 KB gzipped, measured on `vite build` output at the end of phase 3 and recorded in the build log.
5. **Registers:** the equipment register responsive at 5,000 rows, virtualised (phase 4).

## Consequences

A miss is written in the build log with its measurement and cause; nothing blocks on it. The owner may set real targets when PRD section 11's are decided.

## How to reverse

Replace a target when the owner sets one; the measurements stay in the build log.
