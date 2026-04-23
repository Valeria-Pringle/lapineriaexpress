import { FinanceMovement, MovementInput } from "./types";

const STORAGE_KEY = "admin-finance-movements";

export interface FinanceRepository {
  getAll(): FinanceMovement[];
  create(input: MovementInput): FinanceMovement;
  update(id: string, input: MovementInput): FinanceMovement | null;
  remove(id: string): boolean;
}

function safeParse(value: string | null): FinanceMovement[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as FinanceMovement[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item?.id === "string");
  } catch {
    return [];
  }
}

function sortByRecentDate(movements: FinanceMovement[]): FinanceMovement[] {
  return [...movements].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export class LocalStorageFinanceRepository implements FinanceRepository {
  private read(): FinanceMovement[] {
    if (typeof window === "undefined") return [];
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  }

  private write(movements: FinanceMovement[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  }

  getAll(): FinanceMovement[] {
    return sortByRecentDate(this.read());
  }

  create(input: MovementInput): FinanceMovement {
    const now = new Date().toISOString();
    const movement: FinanceMovement = {
      id: crypto.randomUUID(),
      type: input.type,
      amount: input.amount,
      name: input.name.trim(),
      comments: input.comments?.trim() || "",
      date: input.date,
      category: input.category.trim(),
      account: input.account.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const next = sortByRecentDate([...this.read(), movement]);
    this.write(next);
    return movement;
  }

  update(id: string, input: MovementInput): FinanceMovement | null {
    const current = this.read();
    const index = current.findIndex((movement) => movement.id === id);
    if (index === -1) return null;

    const updated: FinanceMovement = {
      ...current[index],
      type: input.type,
      amount: input.amount,
      name: input.name.trim(),
      comments: input.comments?.trim() || "",
      date: input.date,
      category: input.category.trim(),
      account: input.account.trim(),
      updatedAt: new Date().toISOString(),
    };

    const next = [...current];
    next[index] = updated;
    this.write(sortByRecentDate(next));
    return updated;
  }

  remove(id: string): boolean {
    const current = this.read();
    const next = current.filter((movement) => movement.id !== id);
    if (next.length === current.length) return false;
    this.write(sortByRecentDate(next));
    return true;
  }
}

export const financeRepository: FinanceRepository =
  new LocalStorageFinanceRepository();
