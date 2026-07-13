import { supabase } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderPayment } from "./types";

interface OrderRow {
  id: string;
  client_name: string;
  description: string;
  items: OrderItem[];
  total_amount: number;
  order_date: string;
  delivery_date: string;
  payments: OrderPayment[];
  is_highlighted: boolean | null;
  is_delivered: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRepository {
  getAll(): Promise<Order[]>;
  create(order: Order): Promise<Order>;
  update(order: Order): Promise<Order | null>;
  setHighlighted(id: string, highlighted: boolean): Promise<Order | null>;
  setDelivered(id: string, delivered: boolean): Promise<Order | null>;
  remove(id: string): Promise<boolean>;
}

function mapRowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    clientName: row.client_name,
    description: row.description || "",
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount),
    createdAt: row.order_date,
    deliveryDate: row.delivery_date,
    payments: Array.isArray(row.payments) ? row.payments : [],
    isHighlighted: Boolean(row.is_highlighted),
    isDelivered: Boolean(row.is_delivered),
  };
}

function mapOrderToPayload(order: Order): Omit<OrderRow, "created_at" | "updated_at"> {
  return {
    id: order.id,
    client_name: order.clientName,
    description: order.description,
    items: order.items,
    total_amount: order.totalAmount,
    order_date: order.createdAt,
    delivery_date: order.deliveryDate,
    payments: order.payments,
    is_highlighted: order.isHighlighted,
    is_delivered: order.isDelivered,
  };
}

const SELECT_COLS = "id,client_name,description,items,total_amount,order_date,delivery_date,payments,is_highlighted,is_delivered,created_at,updated_at";

export class SupabaseOrderRepository implements OrderRepository {
  async getAll(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT_COLS)
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((row) => mapRowToOrder(row as unknown as OrderRow));
  }

  async create(order: Order): Promise<Order> {
    const { data, error } = await supabase
      .from("orders")
      .insert(mapOrderToPayload(order))
      .select(SELECT_COLS)
      .single();

    if (error || !data) throw new Error(error?.message || "No se pudo crear el pedido.");
    return mapRowToOrder(data as unknown as OrderRow);
  }

  async update(order: Order): Promise<Order | null> {
    const { id, ...payload } = mapOrderToPayload(order);
    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapRowToOrder(data as unknown as OrderRow);
  }

  async setHighlighted(id: string, highlighted: boolean): Promise<Order | null> {
    const { data, error } = await supabase
      .from("orders")
      .update({ is_highlighted: highlighted })
      .eq("id", id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapRowToOrder(data as unknown as OrderRow);
  }

  async setDelivered(id: string, delivered: boolean): Promise<Order | null> {
    const { data, error } = await supabase
      .from("orders")
      .update({ is_delivered: delivered })
      .eq("id", id)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapRowToOrder(data as unknown as OrderRow);
  }

  async remove(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }
}

export const ordersRepository: OrderRepository = new SupabaseOrderRepository();
