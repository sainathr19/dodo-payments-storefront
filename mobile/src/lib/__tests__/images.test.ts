import { productImage } from '../images';
import type { Product } from '../../api/types';

const base: Product = {
  id: 'pdt_abc',
  name: 'A',
  description: null,
  image: null,
  priceCents: 100,
  currency: 'USD',
  isRecurring: false,
};

describe('productImage', () => {
  it('uses the real image when the API supplies one', () => {
    expect(productImage({ ...base, image: 'https://cdn.example.com/a.png' })).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('falls back to placeholder art keyed on the product id', () => {
    expect(productImage(base)).toContain('pdt_abc');
  });

  it('is stable, so a product does not change picture between renders', () => {
    expect(productImage(base)).toBe(productImage(base));
  });

  it('gives different products different art', () => {
    expect(productImage(base)).not.toBe(productImage({ ...base, id: 'pdt_xyz' }));
  });
});
