export type MovementType = "ingreso" | "egreso";

export interface FinanceMovement {
  id: string;
  type: MovementType;
  amount: number;
  name: string;
  comments?: string;
  date: string;
  category: string;
  account: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovementFilters {
  type: MovementType | "todos";
  category: string;
  account: string;
  startDate: string;
  endDate: string;
}

export interface MovementInput {
  type: MovementType;
  amount: number;
  name: string;
  comments?: string;
  date: string;
  category: string;
  account: string;
}

export interface MovementSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
