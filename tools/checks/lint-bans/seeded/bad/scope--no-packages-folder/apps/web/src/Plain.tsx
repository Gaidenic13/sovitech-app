// Seeded empty scope (phase 0 review, finding 17): apps/ holds this clean file, and
// packages/ is missing, so one ban root reads nothing. It must fail with lint-bans/scope.
export function Plain() {
  return <p>TEST</p>;
}
