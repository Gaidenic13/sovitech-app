// Seeded bad input (TEST): a lower-case label chosen by a ternary and rendered.
export const Status = ({ issued }: { issued: boolean }) => <strong className="uppercase">{issued ? 'binding' : 'draft'}</strong>;
