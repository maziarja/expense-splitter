import {
  DataAccessError,
  type DataAccessErrorCode,
} from "@/lib/data/data-access";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: DataAccessErrorCode; message: string };

// Converts an expected, already-typed DataAccessError into a return value so
// its code/message survive the Server Action client/server boundary — Next.js
// sanitizes thrown-error messages in production. Anything else (a real bug,
// a DB outage) still throws and hits the normal error boundary.
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof DataAccessError) {
      return { ok: false, code: err.code, message: err.message };
    }
    throw err;
  }
}

// Client-side mirror of runAction: converts an ActionResult back into a
// thrown DataAccessError, so a DataAccess implementation backed by Server
// Actions still matches the throwing contract guestDataAccess already has.
export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new DataAccessError(result.message, result.code);
  }
  return result.data;
}
