import type { CartItem, Product } from '../api/types';

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function cartSubtotalCents(items: CartItem[], products: Product[]): number {
  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    // A cart row can outlive its product; skip rather than produce NaN.
    return product ? sum + product.priceCents * item.quantity : sum;
  }, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}
