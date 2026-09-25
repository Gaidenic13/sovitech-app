/** Seeded stand-in for the pending wrapper; the index check only reads its import path. */
export function pendingCase(caseFileUrl: string): (title: string, body: () => unknown) => void {
  void caseFileUrl;
  return (title, body) => {
    void title;
    void body;
  };
}
