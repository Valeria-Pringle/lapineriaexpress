export interface OrderPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  account?: string;
  financeMovementId?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  clientName: string;
  description: string;
  items: OrderItem[];
  totalAmount: number;
  /** Business date the order was registered (YYYY-MM-DD) */
  createdAt: string;
  deliveryDate: string;
  payments: OrderPayment[];
  isHighlighted: boolean;
  isDelivered: boolean;
}
