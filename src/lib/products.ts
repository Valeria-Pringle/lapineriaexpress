export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "buttons-25mm",
    name: "Botones 25mm",
    description: "Botones personalizados de 25mm",
    price: 1.50,
  },
  {
    id: "buttons-38mm",
    name: "Botones 38mm",
    description: "Botones personalizados de 38mm",
    price: 2.50,
  },
  {
    id: "buttons-56mm",
    name: "Botones 56mm",
    description: "Botones personalizados de 56mm",
    price: 4.00,
  },
];
