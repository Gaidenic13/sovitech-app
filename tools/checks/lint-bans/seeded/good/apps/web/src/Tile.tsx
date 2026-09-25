// Good seeded input for the lint-bans self-test: it must pass.
export const Tile = ({ label, formatted }: { label: string; formatted: string }) => (
  <div className="bg-surface text-text-primary outline-accent focus-visible:outline-2" style={{ color: 'var(--sov-text-primary)' }}>
    <span>{label}</span>
    <span data-value-id="project:demo.area">{formatted}</span>
  </div>
);
