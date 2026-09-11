import { toTotals } from '../mappers';

describe('toTotals', () => {
  it('reads the breakup Dodo returns for a preview', () => {
    const t = toTotals({
      currency: 'USD',
      current_breakup: { subtotal: 8700, discount: 1740, tax: 522, total_amount: 7482 },
    });
    expect(t).toEqual({
      subtotalCents: 8700,
      discountCents: 1740,
      taxCents: 522,
      totalCents: 7482,
      currency: 'USD',
    });
  });

  // Tax is null until a billing country is known, which is the usual case for a
  // preview taken before checkout.
  it('treats a null tax as zero rather than NaN', () => {
    const t = toTotals({
      currency: 'USD',
      current_breakup: { subtotal: 1200, discount: 0, tax: null, total_amount: 1200 },
    });
    expect(t.taxCents).toBe(0);
    expect(t.totalCents).toBe(1200);
  });

  it('falls back to USD when the currency is absent', () => {
    const t = toTotals({ current_breakup: { subtotal: 100, discount: 0, total_amount: 100 } });
    expect(t.currency).toBe('USD');
  });

  it('survives a response with no breakup at all', () => {
    const t = toTotals({});
    expect(t.subtotalCents).toBe(0);
    expect(t.totalCents).toBe(0);
    expect(t.discountCents).toBe(0);
  });
});
