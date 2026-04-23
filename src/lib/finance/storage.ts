import { supabase } from "@/lib/supabase/client";
import { FinanceMovement, MovementInput } from "./types";

interface MovementRow {
  id: string;
  type: "ingreso" | "egreso";
  amount: number;
  name: string;
  comments: string;
  date: string;
  category: string;
  account: string;
  is_highlighted: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceRepository {
  getAll(): Promise<FinanceMovement[]>;
  create(input: MovementInput): Promise<FinanceMovement>;
  update(id: string, input: MovementInput): Promise<FinanceMovement | null>;
  setHighlighted(id: string, highlighted: boolean): Promise<FinanceMovement | null>;
  remove(id: string): Promise<boolean>;
}

function mapRowToMovement(row: MovementRow): FinanceMovement {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    name: row.name,
    comments: row.comments || "",
    date: row.date,
    category: row.category,
    account: row.account,
    isHighlighted: Boolean(row.is_highlighted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseFinanceRepository implements FinanceRepository {
  async getAll(): Promise<FinanceMovement[]> {
    const { data, error } = await supabase
      .from("movements")
      .select("id,type,amount,name,comments,date,category,account,is_highlighted,created_at,updated_at")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => mapRowToMovement(row as MovementRow));
  }

  async create(input: MovementInput): Promise<FinanceMovement> {
    const payload = {
      type: input.type,
      amount: input.amount,
      name: input.name.trim(),
      comments: input.comments?.trim() || "",
      date: input.date,
      category: input.category.trim(),
      account: input.account.trim(),
    };

    const { data, error } = await supabase
      .from("movements")
      .insert(payload)
      .select("id,type,amount,name,comments,date,category,account,is_highlighted,created_at,updated_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "No se pudo crear el movimiento.");
    }

    return mapRowToMovement(data as MovementRow);
  }

  async update(id: string, input: MovementInput): Promise<FinanceMovement | null> {
    const payload = {
      type: input.type,
      amount: input.amount,
      name: input.name.trim(),
      comments: input.comments?.trim() || "",
      date: input.date,
      category: input.category.trim(),
      account: input.account.trim(),
    };

    const { data, error } = await supabase
      .from("movements")
      .update(payload)
      .eq("id", id)
      .select("id,type,amount,name,comments,date,category,account,is_highlighted,created_at,updated_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return null;
    return mapRowToMovement(data as MovementRow);
  }

  async setHighlighted(id: string, highlighted: boolean): Promise<FinanceMovement | null> {
    const { data, error } = await supabase
      .from("movements")
      .update({ is_highlighted: highlighted })
      .eq("id", id)
      .select("id,type,amount,name,comments,date,category,account,is_highlighted,created_at,updated_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return null;
    return mapRowToMovement(data as MovementRow);
  }

  async remove(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from("movements")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return (count || 0) > 0;
  }
}

export const financeRepository: FinanceRepository = new SupabaseFinanceRepository();
