import type { InfiniteData } from "@tanstack/react-query";

export type PageWithItems<TItem> = {
  items: TItem[];
};

export function patchInfiniteItems<TPage extends PageWithItems<TItem>, TItem>(
  data: InfiniteData<TPage, string | undefined> | undefined,
  patch: (items: TItem[]) => TItem[]
): InfiniteData<TPage, string | undefined> | undefined {
  if (!data) {
    return data;
  }

  const pageSizes = data.pages.map((page) => page.items.length);
  const patchedItems = patch(data.pages.flatMap((page) => page.items));
  let offset = 0;

  const pages = data.pages.map((page, index) => {
    const size = pageSizes[index] ?? page.items.length;
    const items = patchedItems.slice(offset, offset + size);
    offset += size;

    return {
      ...page,
      items
    };
  });
  const remainingItems = patchedItems.slice(offset);
  const lastIndex = pages.length - 1;

  if (remainingItems.length > 0 && lastIndex >= 0) {
    const lastPage = pages[lastIndex];
    if (lastPage) {
      pages[lastIndex] = {
        ...lastPage,
        items: [...lastPage.items, ...remainingItems]
      };
    }
  }

  return {
    ...data,
    pages
  };
}

export function upsertById<TItem extends { id: string }>(
  items: TItem[],
  item: TItem,
  sort?: (items: TItem[]) => TItem[]
) {
  const nextItems = items.some((candidate) => candidate.id === item.id)
    ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...items, item];

  return sort ? sort(nextItems) : nextItems;
}
