/**
 * Ids: UUIDv7, generated in app code (prompt 3 5.2 "Database"), so an id is
 * known before the row is written and ids sort by creation time.
 */
import { v7 } from 'uuid';

export function newId(): string {
  return v7();
}
