"use client";

import { useMemo, useState } from "react";
import {
  financeRepository,
  type FinanceRepository,
} from "@/lib/finance/storage";
import {
  financePreferencesRepository,
  type FinancePreferences,
  type FinancePreferencesRepository,
} from "@/lib/finance/preferences";
import { type FinanceMovement, type MovementSummary } from "@/lib/finance/types";

interface FinanceHistoryProps {
  repository?: FinanceRepository;
  preferencesRepository?: FinancePreferencesRepository;
}

const PAGE_SIZE = 10;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function buildSummary(movements: FinanceMovement[]): MovementSummary {
  const totalIncome = movements
    .filter((movement) => movement.type === "ingreso")
    .reduce((acc, movement) => acc + movement.amount, 0);

  const totalExpense = movements
    .filter((movement) => movement.type === "egreso")
    .reduce((acc, movement) => acc + movement.amount, 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

function getMonthKeyFromDate(dateString: string): string {
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;

  const date = new Date(`${year}-${month}-01T00:00:00`);
  if (!Number.isFinite(date.getTime())) return monthKey;

  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function FinanceHistory({
  repository = financeRepository,
  preferencesRepository = financePreferencesRepository,
}: FinanceHistoryProps) {
  const currentMonthKey = getCurrentMonthKey();
  const [movements] = useState<FinanceMovement[]>(() => repository.getAll());
  const [preferences] = useState<FinancePreferences>(() => preferencesRepository.get());
  const [historicalMonth, setHistoricalMonth] = useState(currentMonthKey);
  const [currentPage, setCurrentPage] = useState(1);

  const categoryColorMap = useMemo(() => {
    return new Map(
      preferences.categories.map((category) => [
        category.name.toLowerCase(),
        category.color,
      ])
    );
  }, [preferences.categories]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set([currentMonthKey, ...movements.map((movement) => getMonthKeyFromDate(movement.date))])
    )
      .filter((month) => month)
      .sort((a, b) => b.localeCompare(a));
  }, [movements, currentMonthKey]);

  const historicalMovements = useMemo(() => {
    return movements.filter(
      (movement) => getMonthKeyFromDate(movement.date) === historicalMonth
    );
  }, [movements, historicalMonth]);

  const historicalSummary = useMemo(
    () => buildSummary(historicalMovements),
    [historicalMovements]
  );

  const totalPages = Math.max(1, Math.ceil(historicalMovements.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedHistoricalMovements = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return historicalMovements.slice(start, start + PAGE_SIZE);
  }, [historicalMovements, safeCurrentPage]);

  return (
    <section className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Historico Mensual</h3>
          <p className="text-sm text-muted mt-1">
            Consulta los movimientos guardados por mes sin afectar el mes actual.
          </p>
        </div>
        <div className="w-full md:w-64">
          <label className="block text-sm font-medium mb-1">Mes</label>
          <select
            value={historicalMonth}
            onChange={(event) => {
              setHistoricalMonth(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-background border border-zinc-200/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Ingresos</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">
            {formatCurrency(historicalSummary.totalIncome)}
          </p>
        </article>
        <article className="rounded-xl bg-background border border-zinc-200/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Egresos</p>
          <p className="text-xl font-bold text-rose-600 mt-2">
            {formatCurrency(historicalSummary.totalExpense)}
          </p>
        </article>
        <article className="rounded-xl bg-background border border-zinc-200/80 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">Balance</p>
          <p className="text-xl font-bold text-foreground mt-2">
            {formatCurrency(historicalSummary.balance)}
          </p>
        </article>
      </div>

      <div className="flex flex-col min-h-[420px]">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-zinc-200/80">
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Nombre</th>
              <th className="py-2 pr-3">Categoria</th>
              <th className="py-2 pr-3">Cuenta</th>
              <th className="py-2 pr-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {historicalMovements.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted">
                  No hay movimientos en este mes.
                </td>
              </tr>
            )}

            {paginatedHistoricalMovements.map((movement) => (
              <tr key={`${movement.id}-history`} className="border-b border-zinc-100 align-top">
                <td className="py-3 pr-3 whitespace-nowrap">{movement.date}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      movement.type === "ingreso"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {movement.type}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <p className="font-medium text-foreground">{movement.name}</p>
                  {movement.comments && (
                    <p className="text-xs text-muted mt-1 max-w-sm">
                      {movement.comments}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className="inline-flex rounded-full px-2 py-1 text-xs font-semibold border"
                    style={{
                      color:
                        categoryColorMap.get(movement.category.toLowerCase()) ||
                        "#4B5563",
                      borderColor:
                        categoryColorMap.get(movement.category.toLowerCase()) ||
                        "#D1D5DB",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    {movement.category}
                  </span>
                </td>
                <td className="py-3 pr-3">{movement.account}</td>
                <td
                  className={`py-3 pr-3 text-right font-semibold whitespace-nowrap ${
                    movement.type === "ingreso" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {movement.type === "ingreso" ? "+" : "-"}
                  {formatCurrency(movement.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        <div className="mt-auto shrink-0 pt-4 border-t border-zinc-200/80 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {historicalMovements.length === 0
              ? "Sin resultados"
              : `Mostrando ${(safeCurrentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                  safeCurrentPage * PAGE_SIZE,
                  historicalMovements.length
                )} de ${historicalMovements.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-muted">
              Pagina {safeCurrentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
