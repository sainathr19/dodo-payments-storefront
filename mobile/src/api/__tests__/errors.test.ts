import { ApiError, isNotFound } from '../errors';

describe('ApiError', () => {
  it('carries the status and the message the backend sent', () => {
    const e = new ApiError(404, "Discount code 'NOPE' doesn't exist");
    expect(e.status).toBe(404);
    expect(e.message).toBe("Discount code 'NOPE' doesn't exist");
    expect(e).toBeInstanceOf(Error);
  });

  // The whole point: a screen can tell "you typed a bad code" apart from "the
  // network is down" without matching on message text.
  it('identifies a not-found without string matching', () => {
    expect(isNotFound(new ApiError(404, 'gone'))).toBe(true);
    expect(isNotFound(new ApiError(500, 'boom'))).toBe(false);
    expect(isNotFound(new Error('network request failed'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });

  it('parses the backend error envelope when there is one', () => {
    const e = ApiError.fromBody(404, '{"message":"Discount code \'X\' doesn\'t exist"}');
    expect(e.message).toBe("Discount code 'X' doesn't exist");
  });

  it('falls back to the raw body when it is not the expected envelope', () => {
    const e = ApiError.fromBody(502, 'upstream gone');
    expect(e.status).toBe(502);
    expect(e.message).toContain('upstream gone');
  });
})
