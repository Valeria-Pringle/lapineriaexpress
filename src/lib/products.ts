export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price?: number;
  priceTiers?: PriceTier[];
}

export const PRODUCTS: Product[] = [
  {
    id: "pin-3cm",
    name: "Pin 3cm",
    description: "Pins personalizados de 3cm",
    priceTiers: [
      { minQuantity: 6, maxQuantity: 11, pricePerUnit: 12 },
      { minQuantity: 12, maxQuantity: 23, pricePerUnit: 10 },
      { minQuantity: 24, maxQuantity: 99, pricePerUnit: 9 },
      { minQuantity: 100, maxQuantity: 299, pricePerUnit: 8 },
      { minQuantity: 300, pricePerUnit: 7.5 },
    ],
  },
  {
    id: "pins-5.5cm",
    name: "Pin 5.5cm",
    description: "Pins personalizados de 5.5cm",
    priceTiers: [
      { minQuantity: 6, maxQuantity: 11, pricePerUnit: 20 },
      { minQuantity: 12, maxQuantity: 23, pricePerUnit: 15 },
      { minQuantity: 24, maxQuantity: 100, pricePerUnit: 10 },
      { minQuantity: 101, maxQuantity: 299, pricePerUnit: 9 },
      { minQuantity: 300, pricePerUnit: 8.5 },
    ],
  },
  {
    id: "pin-7.5cm",
    name: "Pin 7.5cm",
    description: "Pins personalizados de 7.5cm",
    priceTiers: [
      { minQuantity: 6, maxQuantity: 11, pricePerUnit: 23 },
      { minQuantity: 12, maxQuantity: 23, pricePerUnit: 18 },
      { minQuantity: 24, maxQuantity: 100, pricePerUnit: 13 },
      { minQuantity: 101, maxQuantity: 299, pricePerUnit: 12 },
      { minQuantity: 300, pricePerUnit: 11.5 },
    ],
  },
];

export function getPriceForQuantity(product: Product, quantity: number): number {
  if (!product.priceTiers) {
    return product.price || 0;
  }

  const tier = product.priceTiers.find(
    (tier) =>
      quantity >= tier.minQuantity &&
      (!tier.maxQuantity || quantity <= tier.maxQuantity)
  );

  return tier?.pricePerUnit || 0;
}
