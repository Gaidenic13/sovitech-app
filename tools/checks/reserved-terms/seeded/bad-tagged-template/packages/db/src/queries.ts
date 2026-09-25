// Seeded bad input (TEST): SQL in a tagged template writes copy into the database.
declare const sql: (s: TemplateStringsArray, ...v: unknown[]) => string;
export const insert = sql`INSERT INTO badge_label (text) VALUES ('Firm price')`;
