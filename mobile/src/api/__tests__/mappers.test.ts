import { toProduct, toOrder, toMembership } from '../mappers';

describe('toProduct', () => {
  it('keeps the fields a card needs', () => {
    const p = toProduct({
      product_id: 'pdt_a',
      name: 'Aurora Icon Pack',
      description: '480 line icons',
      image: 'https://example.com/a.png',
      price: 1900,
      currency: 'USD',
      is_recurring: false,
      tax_category: 'digital_products',
      business_id: 'biz_1',
    });
    expect(p).toEqual({
      id: 'pdt_a',
      name: 'Aurora Icon Pack',
      description: '480 line icons',
      image: 'https://example.com/a.png',
      priceCents: 1900,
      currency: 'USD',
      isRecurring: false,
    });
  });

  it('survives the nullable fields the API declares', () => {
    const p = toProduct({
      product_id: 'pdt_b',
      name: null,
      description: null,
      image: null,
      price: null,
      currency: null,
      is_recurring: false,
    });
    expect(p.name).toBe('Untitled');
    expect(p.priceCents).toBe(0);
    expect(p.currency).toBe('USD');
  });
});

describe('toOrder', () => {
  it('reads amount, currency and status', () => {
    const o = toOrder({
      payment_id: 'pay_1',
      total_amount: 4900,
      currency: 'USD',
      created_at: '2026-09-10T00:00:00Z',
      status: 'succeeded',
      invoice_url: null,
      subscription_id: null,
    });
    expect(o.id).toBe('pay_1');
    expect(o.totalCents).toBe(4900);
    expect(o.status).toBe('succeeded');
  });

  it('treats a null status as pending rather than crashing', () => {
    const o = toOrder({
      payment_id: 'pay_2',
      total_amount: 100,
      currency: 'USD',
      created_at: 't',
      status: null,
    });
    expect(o.status).toBe('pending');
  });
});

describe('toMembership', () => {
  it('reports an active membership with its renewal date', () => {
    const m = toMembership({
      subscription_id: 'sub_1',
      status: 'active',
      next_billing_date: '2026-10-10T00:00:00Z',
      recurring_pre_tax_amount: 900,
      currency: 'USD',
      cancel_at_next_billing_date: false,
      product_id: 'pdt_pro',
    });
    expect(m.id).toBe('sub_1');
    expect(m.status).toBe('active');
    expect(m.amountCents).toBe(900);
    expect(m.cancelAtPeriodEnd).toBe(false);
  });

  // A subscription set to cancel is still `active` until the period ends, so
  // the flag matters more than the status for what the UI should say.
  it('distinguishes cancelling from cancelled', () => {
    const m = toMembership({
      subscription_id: 'sub_2',
      status: 'active',
      next_billing_date: '2026-10-10T00:00:00Z',
      recurring_pre_tax_amount: 900,
      currency: 'USD',
      cancel_at_next_billing_date: true,
      product_id: 'pdt_pro',
    });
    expect(m.status).toBe('active');
    expect(m.cancelAtPeriodEnd).toBe(true);
  });
});
