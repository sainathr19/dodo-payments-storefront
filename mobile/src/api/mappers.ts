import type { Membership, Order, Product } from './types';

// The API declares name, description, image, price and currency as nullable
// even for a listed product, so each one gets a display-safe fallback here
// rather than a `?? ''` scattered through the screens.
export function toProduct(raw: any): Product {
  return {
    id: raw.product_id,
    name: raw.name ?? 'Untitled',
    description: raw.description ?? null,
    image: raw.image ?? null,
    priceCents: raw.price ?? 0,
    currency: raw.currency ?? 'USD',
    isRecurring: Boolean(raw.is_recurring),
  };
}

export function toOrder(raw: any): Order {
  return {
    id: raw.payment_id,
    totalCents: raw.total_amount,
    currency: raw.currency ?? 'USD',
    createdAt: raw.created_at,
    status: raw.status ?? 'pending',
    subscriptionId: raw.subscription_id ?? null,
  };
}

export function toMembership(raw: any): Membership {
  return {
    id: raw.subscription_id,
    status: raw.status,
    nextBillingDate: raw.next_billing_date,
    amountCents: raw.recurring_pre_tax_amount,
    currency: raw.currency ?? 'USD',
    cancelAtPeriodEnd: Boolean(raw.cancel_at_next_billing_date),
  };
}
