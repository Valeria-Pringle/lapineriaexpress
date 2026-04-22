"use client";

import { useMemo, useState } from "react";
import {
  financeRepository,
  type FinanceRepository,
} from "@/lib/finance/storage";
import {
  type FinanceMovement,
  type MovementFilters,
  type MovementInput,
  type MovementSummary,
} from "@/lib/finance/types";

interface FinanceTrackerProps {
  repository?: FinanceRepository;
}

const defaultForm: MovementInput = {
  type: "ingreso",
  amount: 0,
  name: "",
  comments: "",
  date: new Date().toISOString().slice(0, 10),
  category: "",
  account: "",
};

const defaultFilters: MovementFilters = {
  type: "todos",
  category: "",
  account: "",
  startDate: "",
  endDate: "",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return Number.isFinite(date.getTime());
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

export function FinanceTracker({ repository = financeRepository }: FinanceTrackerProps) {
  const [movements, setMovements] = useState<FinanceMovement[]>(() =>
    repository.getAll()
  );
  const [form, setForm] = useState<MovementInput>(defaultForm);
  const [filters, setFilters] = useState<MovementFilters>(defaultFilters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.category))).sort(),
    [movements]
  );
  const accounts = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.account))).sort(),
    [movements]
  );

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const byType =
        filters.type === "todos" ? true : movement.type === filters.type;
      const byCategory = filters.category
        ? movement.category.toLowerCase() === filters.category.toLowerCase()
        : true;
      const byAccount = filters.account
        ? movement.account.toLowerCase() === filters.account.toLowerCase()
        : true;

      const movementDate = new Date(movement.date).getTime();
      const startDate = filters.startDate
        ? new Date(filters.startDate).getTime()
        : Number.NEGATIVE_INFINITY;
      const endDate = filters.endDate
        ? new Date(filters.endDate).getTime()
        : Number.POSITIVE_INFINITY;

      const byDateRange = movementDate >= startDate && movementDate <= endDate;

      return byType && byCategory && byAccount && byDateRange;
    });
  }, [movements, filters]);

  const summary = useMemo(() => buildSummary(filteredMovements), [filteredMovements]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setError("");
  };

  const validate = (data: MovementInput): string | null => {
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

  const refreshMovements = () => {
    setMovements(repository.getAll());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (editingId) {
      repository.update(editingId, form);
    } else {
      repository.create(form);
    }

    refreshMovements();
    resetForm();
  };

  const handleEdit = (movement: FinanceMovement) => {
    setEditingId(movement.id);
    setForm({
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

  const handleDelete = (id: string) => {
    const shouldDelete = window.confirm(
      "Esta seguro de eliminar este movimiento?"
    );
    if (!shouldDelete) return;

    repository.remove(id);
    refreshMovements();

    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Ingresos</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalIncome)}
          </p>
        </article>
        <article className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Egresos</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalExpense)}
          </p>
        </article>
        <article className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Balance</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              summary.balance >= 0 ? "text-teal-700" : "text-red-700"
            }`}
          >
            {formatCurrency(summary.balance)}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Editar movimiento" : "Nuevo movimiento"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as "ingreso" | "egreso" }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: Number.parseFloat(event.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Descripcion corta"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Comentarios</label>
              <textarea
                value={form.comments || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, comments: event.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Comida, transporte, salario..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cuenta</label>
              <input
                type="text"
                value={form.account}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, account: event.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Efectivo, banco, tarjeta..."
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2"
              >
                {editingId ? "Guardar cambios" : "Guardar movimiento"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Movimientos</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Ordenados por fecha, del mas reciente al mas antiguo.
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 mb-4">
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  type: event.target.value as MovementFilters["type"],
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="todos">Todos los tipos</option>
              <option value="ingreso">Solo ingresos</option>
              <option value="egreso">Solo egresos</option>
            </select>

            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todas las categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={filters.account}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, account: event.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, startDate: event.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, endDate: event.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
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
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500">
                      No hay movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="border-b border-gray-100 align-top">
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
                      <p className="font-medium text-gray-900">{movement.name}</p>
                      {movement.comments && (
                        <p className="text-xs text-gray-500 mt-1 max-w-sm">
                          {movement.comments}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">{movement.category}</td>
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
                          onClick={() => handleEdit(movement)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(movement.id)}
                          className="rounded-md border border-red-300 text-red-700 px-2 py-1 text-xs hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
