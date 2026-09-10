import type { Product } from '../api/types';

/// Seeded products carry no image: Dodo's `image` field is null unless one is
/// uploaded. Rather than render an empty grey box, fall back to deterministic
/// placeholder art keyed on the product id, so the same product always shows
/// the same picture across launches and devices.
export function productImage(product: Product): string {
  if (product.image) return product.image;
  const seed = encodeURIComponent(product.id);
  return `https://picsum.photos/seed/${seed}/800/600`;
}
