// Seeded bad input (TEST): a registered list lets its lower-case keys through, never copy-like text,
// and a registration must name a list that exists.
export const STAGES = ['final', 'Final offer'] as const;
export const stageCount = (): number => STAGES.length;
