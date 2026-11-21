import type { ApiClient } from '../../api/ApiClient';
import type { Product } from '../../api/types';

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface SeededCart {
  id: string;
  lines: CartLine[];
  /** Total number of units, as shown in the header badge. */
  quantity: number;
  /** Expected cart total (no discounts on the seeded products). */
  total: number;
}

/** Creates a cart through the API and fills it with the given lines. */
export async function createCart(api: ApiClient, lines: CartLine[]): Promise<SeededCart> {
  const { id } = await api.createCart();
  for (const { product, quantity } of lines) {
    await api.addToCart(id, product.id, quantity);
  }
  const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = round2(lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0));
  return { id, lines, quantity, total };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
