// Seeded bad input (synthetic): a missing list read as an empty one, so its count reads 0.
export const assetCount = (assets?: readonly unknown[]) => (assets || []).length;
