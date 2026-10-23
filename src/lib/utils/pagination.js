// Admin table pagination (15 items per page, 30 for zones).
export const PAGE_SIZE = 15;
export const ZONE_PAGE_SIZE = 30;

// Page numbers to render, e.g. [1, '...', 4, 5, 6, '...', 12].
export function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
