/** Seeded stand-in for the pending wrapper; the index check only reads its import path. */
export function pendingUntilImplemented(title: string, body: () => unknown): void {
  void title;
  void body;
}
