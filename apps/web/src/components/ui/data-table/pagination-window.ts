export type PaginationWindowEntry = number | "ellipsis";

export function buildPaginationWindow(
  currentPage: number,
  totalPages: number,
): PaginationWindowEntry[] {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let d = 1; d <= 2; d++) {
    pages.add(Math.max(1, currentPage - d));
    pages.add(Math.min(totalPages, currentPage + d));
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: PaginationWindowEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && p - prev > 1) {
      out.push("ellipsis");
    }
    out.push(p);
  }
  return out;
}
