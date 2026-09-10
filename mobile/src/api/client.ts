import type { CartItem, DemoCustomer, Membership, Order, Product, WebhookEvent } from './types';
import { toMembership, toOrder, toProduct } from './mappers';
import {
  fixtureCustomers,
  fixtureEvents,
  fixtureMembership,
  fixtureMembershipProduct,
  fixtureOrders,
  fixtureProducts,
} from './fixtures';

const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES !== 'false';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

// In live mode the demo customers must be the real ids from `backend/seed.json`,
// or every request 404s. Supplied as a comma-separated list.
const liveCustomerIds: string[] = String(process.env.EXPO_PUBLIC_CUSTOMER_IDS ?? '')
  .split(',')
  .map((part: string) => part.trim())
  .filter((part: string) => part.length > 0);

// A short delay so loading states are visible while developing on fixtures;
// without it every screen renders instantly and skeletons are never seen.
const settle = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 250));

// Fixture-mode cart lives in memory for the session.
const fixtureCarts: Record<string, CartItem[]> = {};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  usingFixtures: () => USE_FIXTURES,

  customers: (): DemoCustomer[] =>
    liveCustomerIds.length
      ? liveCustomerIds.map((id: string, i: number) => ({ ...fixtureCustomers[i], id }))
      : fixtureCustomers,

  async products(): Promise<Product[]> {
    if (USE_FIXTURES) return settle(fixtureProducts);
    const raw = await get<any[]>('/products');
    return raw.map(toProduct).filter((p) => !p.isRecurring);
  },

  async membershipProduct(): Promise<Product> {
    if (USE_FIXTURES) return settle(fixtureMembershipProduct);
    const raw = await get<any[]>('/products');
    const found = raw.map(toProduct).find((p) => p.isRecurring);
    if (!found) throw new Error('no recurring product in the catalog');
    return found;
  },

  async product(id: string): Promise<Product> {
    if (USE_FIXTURES) {
      const all = [...fixtureProducts, fixtureMembershipProduct];
      const found = all.find((p) => p.id === id);
      if (!found) throw new Error(`no such product: ${id}`);
      return settle(found);
    }
    return toProduct(await get<any>(`/products/${id}`));
  },

  async cart(customerId: string): Promise<CartItem[]> {
    if (USE_FIXTURES) return settle(fixtureCarts[customerId] ?? []);
    const raw = await get<any[]>(`/cart?customer_id=${encodeURIComponent(customerId)}`);
    return raw.map((r) => ({ productId: r.product_id, quantity: r.quantity }));
  },

  async addToCart(customerId: string, productId: string, quantity: number): Promise<CartItem[]> {
    if (USE_FIXTURES) {
      const current = fixtureCarts[customerId] ?? [];
      const rest = current.filter((i) => i.productId !== productId);
      fixtureCarts[customerId] = [...rest, { productId, quantity }].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );
      return settle(fixtureCarts[customerId]);
    }
    const raw = await send<any[]>('/cart', 'POST', {
      customer_id: customerId,
      product_id: productId,
      quantity,
    });
    return raw.map((r) => ({ productId: r.product_id, quantity: r.quantity }));
  },

  async removeFromCart(customerId: string, productId: string): Promise<CartItem[]> {
    if (USE_FIXTURES) {
      fixtureCarts[customerId] = (fixtureCarts[customerId] ?? []).filter(
        (i) => i.productId !== productId,
      );
      return settle(fixtureCarts[customerId]);
    }
    const raw = await send<any[]>(
      `/cart/${encodeURIComponent(productId)}?customer_id=${encodeURIComponent(customerId)}`,
      'DELETE',
    );
    return raw.map((r) => ({ productId: r.product_id, quantity: r.quantity }));
  },

  async orders(customerId: string): Promise<Order[]> {
    if (USE_FIXTURES) return settle(fixtureOrders);
    const raw = await get<any[]>(`/orders?customer_id=${encodeURIComponent(customerId)}`);
    return raw.map(toOrder);
  },

  async membership(customerId: string): Promise<Membership | null> {
    if (USE_FIXTURES) return settle(fixtureMembership);
    const raw = await get<any[]>(`/membership?customer_id=${encodeURIComponent(customerId)}`);
    return raw.length ? toMembership(raw[0]) : null;
  },

  async events(): Promise<WebhookEvent[]> {
    if (USE_FIXTURES) return settle(fixtureEvents);
    const raw = await get<any[]>('/events');
    return raw.map((r) => ({
      id: r.webhook_id,
      type: r.event_type,
      receivedAt: r.received_at,
    }));
  },

  async checkout(
    customerId: string,
    promoCode?: string,
    returnUrl?: string,
  ): Promise<{ checkout_url: string | null }> {
    if (USE_FIXTURES) return settle({ checkout_url: null });
    return send('/checkout', 'POST', {
      customer_id: customerId,
      promo_code: promoCode ?? null,
      return_url: returnUrl ?? null,
    });
  },

  async subscribe(
    customerId: string,
    returnUrl?: string,
  ): Promise<{ checkout_url: string | null }> {
    if (USE_FIXTURES) return settle({ checkout_url: null });
    return send('/membership/subscribe', 'POST', {
      customer_id: customerId,
      return_url: returnUrl ?? null,
    });
  },

  invoiceUrl: (paymentId: string) => `${BASE_URL}/orders/${paymentId}/invoice`,

  async refund(paymentId: string) {
    if (USE_FIXTURES) return settle({ ok: true });
    return send(`/orders/${encodeURIComponent(paymentId)}/refund`, 'POST');
  },

  async membershipAction(subscriptionId: string, action: 'pause' | 'resume' | 'cancel') {
    if (USE_FIXTURES) return settle({ ok: true });
    return send(`/membership/${encodeURIComponent(subscriptionId)}/${action}`, 'POST');
  },
};
