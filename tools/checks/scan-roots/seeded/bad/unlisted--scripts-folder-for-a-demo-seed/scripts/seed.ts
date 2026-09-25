// Seeded input for the scan-roots self-test (TEST). Wrong on purpose.
// A top-level scripts/ folder for the demo seed (phase 0 review round 2, adversarial
// finding 13): before the scan-roots check, no scan named it, so dependency-cruiser,
// the lint bans, the reserved-term check and the CI filter all passed it unread.
export const demoArea = (value?: number) => value ?? 0;
