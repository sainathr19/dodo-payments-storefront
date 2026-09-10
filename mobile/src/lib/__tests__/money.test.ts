import { cartCount, cartSubtotalCents, formatMoney } from '../money';
import type { CartItem, Product } from '../../api/types';

const products: Product[] = [
  { id: 'a', name: 'A', description: null, image: null, priceCents: 1900, currency: 'USD', isRecurring: false },
  { id: 'b', name: 'B', description: null, image: null, priceCents: 4900, currency: 'USD', isRecurring: false },
];

describe('formatMoney', () => {
  it('renders minor units as major with two decimals', () => {
    expect(formatMoney(1900, 'USD')).toBe('$19.00');
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
  });

  it('falls back to a currency code it does not know a symbol for', () => {
    expect(formatMoney(1000, 'INR')).toContain('10.00');
  });
});

describe('cartSubtotalCents', () => {
  it('multiplies each line by its quantity', () => {
    const items: CartItem[] = [
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 1 },
    ];
    expect(cartSubtotalCents(items, products)).toBe(1900 * 2 + 4900);
  });

  // A cart row can outlive its product if the catalog changes underneath it;
  // the total must not become NaN when that happens.
  it('ignores a line whose product is missing', () => {
    const items: CartItem[] = [
      { productId: 'a', quantity: 1 },
      { productId: 'gone', quantity: 3 },
    ];
    expect(cartSubtotalCents(items, products)).toBe(1900);
  });

  it('is zero for an empty cart', () => {
    expect(cartSubtotalCents([], products)).toBe(0);
  });
});

describe('cartCount', () => {
  it('sums quantities rather than counting rows', () => {
    expect(cartCount([{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 3 }])).toBe(5);
  });
});
