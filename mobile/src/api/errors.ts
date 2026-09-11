/// An error the backend reported, carrying the status so callers can branch on
/// it. Without this every screen ends up matching on message text to tell a bad
/// input apart from a network failure.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Required for `instanceof` to survive TypeScript's ES5 class downlevelling.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /// The backend replies `{ "message": ..., "request_id": ... }`. Anything else
  /// is kept verbatim so nothing is lost when the shape is unexpected.
  static fromBody(status: number, body: string): ApiError {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.message === 'string') {
        return new ApiError(status, parsed.message);
      }
    } catch {
      // Not JSON; fall through to the raw body.
    }
    return new ApiError(status, body || `request failed with ${status}`);
  }
}

export function isNotFound(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404;
}
