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
