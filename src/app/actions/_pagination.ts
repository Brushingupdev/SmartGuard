type PageResult<T> = {
  data: T[] | null;
  error: unknown;
};

type RangeQuery<T> = {
  range: (from: number, to: number) => PromiseLike<PageResult<T>>;
};

const PAGE_SIZE = 1_000;

/**
 * The Data API limits a single response to 1,000 rows. Aggregate screens need
 * every row in their selected period, so fetch it in explicit pages.
 */
export async function fetchPagedRows<T>(
  query: RangeQuery<T>,
  maxRows = 5_000,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const { data, error } = await query.range(
      from,
      Math.min(from + PAGE_SIZE - 1, maxRows - 1),
    );
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}
