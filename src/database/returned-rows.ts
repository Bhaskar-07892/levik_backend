/**
 * Rows from a raw `manager.query()` with RETURNING. For UPDATE and DELETE, TypeORM's Postgres driver resolves
 * to `[rows, rowCount]` instead of the rows themselves (INSERT and SELECT resolve to the rows), so reading
 * `result[0].id` or mapping over the result silently yields undefined.
 */
export function returnedRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as T[];
  }
  return result as T[];
}
