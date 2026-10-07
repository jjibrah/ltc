// Preserve the existing full-directory order when moving an item on a bounded page.
export function mergePageOrder(all, currentPage, nextPage) {
  const ids = new Set(currentPage.map(item => item.id));
  const next = [...nextPage];
  if (next.length !== ids.size || next.some(item => !ids.has(item.id))) throw new Error('Invalid reordered page');
  return all.map(item => ids.has(item.id) ? next.shift() : item);
}
