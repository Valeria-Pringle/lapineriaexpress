"use client";

import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import {
  financeRepository,
  type FinanceRepository,
} from "@/lib/finance/storage";
import {
  financePreferencesRepository,
  type FinancePreferences,
  type FinancePreferencesRepository,
} from "@/lib/finance/preferences";
import {
  type FinanceMovement,
  type MovementInput,
  type MovementSummary,
} from "@/lib/finance/types";
import { ConfirmModal } from "./ConfirmModal";
import { ordersRepository } from "@/lib/orders/storage";

async function syncFinanceEditToOrder(financeMovementId: string, updated: MovementInput) {
  try {
    const allOrders = await ordersRepository.getAll();
    for (const order of allOrders) {
      const idx = order.payments.findIndex((p) => p.financeMovementId === financeMovementId);
      if (idx === -1) continue;
      const updatedPayments = order.payments.map((p, i) =>
        i === idx ? { ...p, amount: updated.amount, date: updated.date, account: updated.account } : p
      );
      await ordersRepository.update({ ...order, payments: updatedPayments });
      break;
    }
  } catch {
    // Best-effort
  }
}

async function removeFinanceMovementFromOrder(financeMovementId: string) {
  try {
    const allOrders = await ordersRepository.getAll();
    for (const order of allOrders) {
      const idx = order.payments.findIndex((p) => p.financeMovementId === financeMovementId);
      if (idx === -1) continue;
      const updatedPayments = order.payments.filter((_, i) => i !== idx);
      await ordersRepository.update({ ...order, payments: updatedPayments });
      break;
    }
  } catch {
    // Best-effort
  }
}

interface FinanceHistoryProps {
  repository?: FinanceRepository;
  preferencesRepository?: FinancePreferencesRepository;
}

const PAGE_SIZE = 10;

const defaultEditForm: MovementInput = {
  type: "ingreso",
  amount: 0,
  name: "",
  comments: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  account: "",
};

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

function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return Number.isFinite(date.getTime());
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

function hexToArgb(hex: string): string {
  // Converts #RRGGBB to FFRRGGBB
  const clean = hex.replace("#", "");
  return `FF${clean.toUpperCase()}`;
}

function lightenArgb(hex: string): string {
  // Returns a very light tint (10% opacity on white) for cell backgrounds
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lr = Math.round(r + (255 - r) * 0.85);
  const lg = Math.round(g + (255 - g) * 0.85);
  const lb = Math.round(b + (255 - b) * 0.85);
  return `FF${lr.toString(16).padStart(2, "0").toUpperCase()}${lg.toString(16).padStart(2, "0").toUpperCase()}${lb.toString(16).padStart(2, "0").toUpperCase()}`;
}

async function exportToExcel(
  movements: FinanceMovement[],
  categoryColorMap: Map<string, string>,
  monthLabel: string,
  summary: MovementSummary
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "La Pineria Express";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(monthLabel.slice(0, 31));

  // Title row
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `Histórico - ${monthLabel}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF1A1A1A" } };
  titleCell.alignment = { horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
  sheet.getRow(1).height = 28;

  // Empty row
  sheet.addRow([]);

  // Summary rows
  const summaryHeaderRow = sheet.addRow(["", "Ingresos", "Egresos", "Balance"]);
  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
  });
  const summaryRow = sheet.addRow([
    "",
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(summary.totalIncome),
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(summary.totalExpense),
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(summary.balance),
  ]);
  summaryRow.getCell(2).font = { bold: true, color: { argb: "FF059669" } };
  summaryRow.getCell(3).font = { bold: true, color: { argb: "FFE11D48" } };
  summaryRow.getCell(4).font = { bold: true };

  // Empty row
  sheet.addRow([]);

  // Table header
  const headerRow = sheet.addRow(["Fecha", "Tipo", "Nombre", "Comentarios", "Categoría", "Cuenta", "Monto"]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F3F46" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
    };
  });
  sheet.getRow(headerRow.number).height = 22;

  // Column widths
  sheet.columns = [
    { key: "date", width: 14 },
    { key: "type", width: 12 },
    { key: "name", width: 30 },
    { key: "comments", width: 35 },
    { key: "category", width: 20 },
    { key: "account", width: 20 },
    { key: "amount", width: 16 },
  ];

  // Data rows
  for (const movement of movements) {
    const row = sheet.addRow([
      movement.date,
      movement.type === "ingreso" ? "Ingreso" : "Egreso",
      movement.name,
      movement.comments || "",
      movement.category,
      movement.account,
      movement.type === "ingreso" ? movement.amount : -movement.amount,
    ]);

    // Type cell color
    const typeCell = row.getCell(2);
    if (movement.type === "ingreso") {
      typeCell.font = { color: { argb: "FF059669" }, bold: true };
      typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    } else {
      typeCell.font = { color: { argb: "FFE11D48" }, bold: true };
      typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE1E8" } };
    }

    // Category cell color
    const categoryHex = categoryColorMap.get(movement.category.toLowerCase());
    if (categoryHex) {
      const categoryCell = row.getCell(5);
      categoryCell.font = { color: { argb: hexToArgb(categoryHex) }, bold: true };
      categoryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightenArgb(categoryHex) } };
    }

    // Amount cell
    const amountCell = row.getCell(7);
    amountCell.numFmt = '"$"#,##0.00';
    amountCell.alignment = { horizontal: "right" };
    amountCell.font = {
      bold: true,
      color: { argb: movement.type === "ingreso" ? "FF059669" : "FFE11D48" },
    };

    // Zebra striping
    if (row.number % 2 === 0) {
      [1, 3, 4, 6].forEach((colIdx) => {
        row.getCell(colIdx).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9F9FA" } };
      });
    }

    row.height = 18;
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finanzas-${monthLabel.replace(/\s/g, "-").toLowerCase()}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FinanceHistory({
  repository = financeRepository,
  preferencesRepository = financePreferencesRepository,
}: FinanceHistoryProps) {
  const currentMonthKey = getCurrentMonthKey();
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [preferences, setPreferences] = useState<FinancePreferences>({
    categories: [],
    accounts: [],
  });
  const [historicalMonth, setHistoricalMonth] = useState(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MovementInput>(defaultEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const askConfirm = (message: string, action: () => void) => { setConfirmMessage(message); setPendingAction(() => action); };
  const dismissConfirm = () => { setPendingAction(null); setConfirmMessage(""); };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [nextMovements, nextPreferences] = await Promise.all([
          repository.getAll(),
          preferencesRepository.get(),
        ]);

        if (!isMounted) return;

        setMovements(nextMovements);
        setPreferences(nextPreferences);
        setError("");
      } catch (loadError) {
        if (!isMounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el historico de finanzas."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [repository, preferencesRepository]);

  const categoryColorMap = useMemo(() => {
    return new Map(
      preferences.categories.map((category) => [
        category.name.toLowerCase(),
        category.color,
      ])
    );
  }, [preferences.categories]);

  const categories = useMemo(() => {
    const preferenceNames = preferences.categories.map((category) => category.name);
    return Array.from(
      new Set([...preferenceNames, ...movements.map((movement) => movement.category)])
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [preferences.categories, movements]);

  const accounts = useMemo(() => {
    return Array.from(
      new Set([...preferences.accounts, ...movements.map((movement) => movement.account)])
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [preferences.accounts, movements]);

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set([currentMonthKey, ...movements.map((movement) => getMonthKeyFromDate(movement.date))])
    )
      .filter((month) => month)
      .sort((a, b) => b.localeCompare(a));
  }, [movements, currentMonthKey]);

  const historicalMovements = useMemo(() => {
    const byMonth = movements.filter(
      (movement) => getMonthKeyFromDate(movement.date) === historicalMonth
    );
    const query = searchQuery.trim().toLowerCase();
    if (!query) return byMonth;
    return byMonth.filter(
      (movement) =>
        movement.name.toLowerCase().includes(query) ||
        movement.category.toLowerCase().includes(query) ||
        movement.account.toLowerCase().includes(query) ||
        (movement.comments ?? "").toLowerCase().includes(query)
    );
  }, [movements, historicalMonth, searchQuery]);

  const historicalSummary = useMemo(
    () => buildSummary(movements.filter((m) => getMonthKeyFromDate(m.date) === historicalMonth)),
    [movements, historicalMonth]
  );

  const totalPages = Math.max(1, Math.ceil(historicalMovements.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedHistoricalMovements = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return historicalMovements.slice(start, start + PAGE_SIZE);
  }, [historicalMovements, safeCurrentPage]);

  const refreshMovements = async () => {
    const nextMovements = await repository.getAll();
    setMovements(nextMovements);
  };

  const validateMovement = (data: MovementInput): string | null => {
    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      return "El monto es obligatorio y debe ser mayor a 0.";
    }
    if (!data.name.trim()) {
      return "El nombre del movimiento es obligatorio.";
    }
    if (!isValidDate(data.date)) {
      return "La fecha no es valida.";
    }
    if (!data.category.trim()) {
      return "La categoria es obligatoria.";
    }
    if (!data.account.trim()) {
      return "La cuenta es obligatoria.";
    }
    return null;
  };

  const startEdit = (movement: FinanceMovement) => {
    setEditingMovementId(movement.id);
    setEditForm({
      type: movement.type,
      amount: movement.amount,
      name: movement.name,
      comments: movement.comments || "",
      date: movement.date,
      category: movement.category,
      account: movement.account,
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingMovementId(null);
    setEditForm(defaultEditForm);
  };

  const saveEdit = async () => {
    if (!editingMovementId) return;

    const validationError = validateMovement(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingEdit(true);
    try {
      await repository.update(editingMovementId, editForm);
      void syncFinanceEditToOrder(editingMovementId, editForm);
      await refreshMovements();
      cancelEdit();
      setError("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el movimiento."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteMovement = async (id: string) => {
    askConfirm("Eliminar este movimiento historico? Esta accion no se puede deshacer.", () => {
      void (async () => {
        try {
          await repository.remove(id);
          void removeFinanceMovementFromOrder(id);
          await refreshMovements();
          setCurrentPage(1);
          if (editingMovementId === id) cancelEdit();
          setError("");
        } catch (deleteError) {
          setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el movimiento.");
        }
      })();
    });
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">Cargando historico de finanzas...</p>
      </section>
    );
  }

  return (
    <div>
    <section className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Historico Mensual</h3>
          <p className="text-sm text-muted mt-1">
            Consulta los movimientos guardados por mes sin afectar el mes actual.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="w-full sm:w-56">
            <label className="block text-sm font-medium mb-1">Mes</label>
            <select
              value={historicalMonth}
              onChange={(event) => {
                setHistoricalMonth(event.target.value);
                setCurrentPage(1);
                setSearchQuery("");
                cancelEdit();
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
          <button
            type="button"
            disabled={exporting || historicalMovements.length === 0}
            onClick={async () => {
              setExporting(true);
              try {
                await exportToExcel(historicalMovements, categoryColorMap, formatMonthLabel(historicalMonth), historicalSummary);
              } finally {
                setExporting(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Exportando...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15V3M12 15l-4-4M12 15l4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" />
                </svg>
                Exportar Excel
              </>
            )}
          </button>
        </div>
      </div>

      {editingMovementId && (
        <div className="rounded-xl border border-zinc-200/80 bg-background p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-semibold">Editar movimiento historico</h4>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select
                value={editForm.type}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    type: event.target.value as "ingreso" | "egreso",
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Monto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.amount || ""}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    amount: Number.parseFloat(event.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fecha</label>
              <input
                type="date"
                value={editForm.date}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Categoria</label>
              <select
                value={editForm.category}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecciona categoria</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cuenta</label>
              <select
                value={editForm.account}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, account: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecciona cuenta</option>
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 xl:col-span-2">
              <label className="block text-xs font-medium mb-1">Comentarios</label>
              <input
                type="text"
                value={editForm.comments || ""}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, comments: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={savingEdit}
              className="rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 text-sm disabled:opacity-60"
            >
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

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
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por nombre, categoría, cuenta o comentarios..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

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
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {historicalMovements.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
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
                <td className="py-3 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(movement)}
                      aria-label="Editar movimiento historico"
                      title="Editar"
                      className="rounded-md border border-zinc-300 p-1.5 hover:bg-background"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="sr-only">Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMovement(movement.id)}
                      aria-label="Eliminar movimiento historico"
                      title="Eliminar"
                      className="rounded-md border border-red-300 text-red-700 p-1.5 hover:bg-red-50"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="sr-only">Eliminar</span>
                    </button>
                  </div>
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

      {pendingAction && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={() => { pendingAction!(); dismissConfirm(); }}
          onCancel={dismissConfirm}
        />
      )}
    </div>
  );
}
