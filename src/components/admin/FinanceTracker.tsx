"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type MovementFilters,
  type MovementInput,
  type MovementSummary,
} from "@/lib/finance/types";

interface FinanceTrackerProps {
  repository?: FinanceRepository;
  preferencesRepository?: FinancePreferencesRepository;
}

const PAGE_SIZE = 10;

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

export function FinanceTracker({
  repository = financeRepository,
  preferencesRepository = financePreferencesRepository,
}: FinanceTrackerProps) {
  const currentMonthKey = getCurrentMonthKey();
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [preferences, setPreferences] = useState<FinancePreferences>({
    categories: [],
    accounts: [],
  });
  const [form, setForm] = useState<MovementInput>(defaultForm);
  const originalFormRef = useRef<MovementInput | null>(null);
  const [filters, setFilters] = useState<MovementFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
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
            : "No se pudieron cargar los datos de finanzas."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [repository, preferencesRepository]);

  const categories = useMemo(() => {
    const preferenceNames = preferences.categories.map((category) => category.name);
    return Array.from(
      new Set([...preferenceNames, ...movements.map((movement) => movement.category)])
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [preferences.categories, movements]);

  const categoryColorMap = useMemo(() => {
    return new Map(
      preferences.categories.map((category) => [
        category.name.toLowerCase(),
        category.color,
      ])
    );
  }, [preferences.categories]);

  const accounts = useMemo(() => {
    return Array.from(
      new Set([...preferences.accounts, ...movements.map((movement) => movement.account)])
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [preferences.accounts, movements]);

  const currentMonthMovements = useMemo(() => {
    return movements.filter(
      (movement) => getMonthKeyFromDate(movement.date) === currentMonthKey
    );
  }, [movements, currentMonthKey]);

  const filteredMovements = useMemo(() => {
    return currentMonthMovements.filter((movement) => {
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
    }).sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [currentMonthMovements, filters]);

  const summary = useMemo(
    () => buildSummary(currentMonthMovements),
    [currentMonthMovements]
  );

  const displayedMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const searched = query
      ? filteredMovements.filter(
          (movement) =>
            movement.name.toLowerCase().includes(query) ||
            movement.category.toLowerCase().includes(query) ||
            movement.account.toLowerCase().includes(query) ||
            (movement.comments ?? "").toLowerCase().includes(query)
        )
      : filteredMovements;
    const highlighted = searched.filter((movement) => movement.isHighlighted);
    const regular = searched.filter((movement) => !movement.isHighlighted);
    return [...highlighted, ...regular];
  }, [filteredMovements, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedMovements.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMovements = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return displayedMovements.slice(start, start + PAGE_SIZE);
  }, [displayedMovements, safeCurrentPage]);

  const hasChanges = useMemo(() => {
    if (!editingId) {
      // New movement: consider changed if any meaningful field is filled
      return (
        form.amount > 0 ||
        form.name.trim() !== "" ||
        form.category.trim() !== "" ||
        form.account.trim() !== ""
      );
    }
    const orig = originalFormRef.current;
    if (!orig) return false;
    return (
      form.type !== orig.type ||
      form.amount !== orig.amount ||
      form.name.trim() !== orig.name.trim() ||
      (form.comments ?? "").trim() !== (orig.comments ?? "").trim() ||
      form.date !== orig.date ||
      form.category.trim() !== orig.category.trim() ||
      form.account.trim() !== orig.account.trim()
    );
  }, [editingId, form]);

  const resetForm = () => {
    setForm(defaultForm);
    originalFormRef.current = null;
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

  const refreshMovements = async () => {
    const nextMovements = await repository.getAll();
    setMovements(nextMovements);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const validationError = validate(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await repository.update(editingId, form);
      } else {
        await repository.create(form);
      }

      await refreshMovements();
      setCurrentPage(1);
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el movimiento."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (movement: FinanceMovement) => {
    const snapshot: MovementInput = {
      type: movement.type,
      amount: movement.amount,
      name: movement.name,
      comments: movement.comments || "",
      date: movement.date,
      category: movement.category,
      account: movement.account,
    };
    originalFormRef.current = snapshot;
    setEditingId(movement.id);
    setForm(snapshot);
    setError("");
  };

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      "Esta seguro de eliminar este movimiento?"
    );
    if (!shouldDelete) return;

    try {
      await repository.remove(id);
      await refreshMovements();
      setCurrentPage(1);

      if (editingId === id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el movimiento."
      );
    }
  };

  const handleToggleHighlighted = async (movement: FinanceMovement) => {
    try {
      await repository.setHighlighted(movement.id, !movement.isHighlighted);
      await refreshMovements();
      setCurrentPage(1);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "No se pudo actualizar el destacado."
      );
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">Cargando datos de finanzas...</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">


      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl bg-white border border-zinc-200/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Ingresos (mes actual)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalIncome)}
          </p>
        </article>
        <article className="rounded-xl bg-white border border-zinc-200/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Egresos (mes actual)</p>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalExpense)}
          </p>
        </article>
        <article className="rounded-xl bg-white border border-zinc-200/80 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Balance (mes actual)</p>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {formatCurrency(summary.balance)}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex flex-col min-h-[680px]">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Editar movimiento" : "Nuevo movimiento"}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as "ingreso" | "egreso" }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
              <label className="block text-sm font-medium mb-1">Cuenta</label>
              <select
                value={form.account}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, account: event.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecciona cuenta</option>
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1 mt-auto">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="flex-1 rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar movimiento"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-background"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="xl:col-span-3 bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex flex-col min-h-[680px]">
          <h3 className="text-lg font-semibold">Movimientos</h3>
          <p className="text-sm text-muted mt-1 mb-4">
            Mes actual. Ordenados por fecha, del mas reciente al mas antiguo.
          </p>

          <div className="mb-4 rounded-xl border border-zinc-200/80 bg-background">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filtros</p>
                {(filters.type !== "todos" || filters.category || filters.account || filters.startDate || filters.endDate) && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Activos
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                {(filters.type !== "todos" || filters.category || filters.account || filters.startDate || filters.endDate) && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setFilters(defaultFilters); setCurrentPage(1); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setFilters(defaultFilters); setCurrentPage(1); } }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Limpiar
                  </span>
                )}
                <svg
                  className={`h-4 w-4 text-muted transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {filtersOpen && (
            <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted">Tipo de movimiento</label>
                <select
                  value={filters.type}
                  onChange={(event) => {
                    setFilters((prev) => ({
                      ...prev,
                      type: event.target.value as MovementFilters["type"],
                    }));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="ingreso">Solo ingresos</option>
                  <option value="egreso">Solo egresos</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted">Categoría</label>
                <select
                  value={filters.category}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, category: event.target.value }));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted">Cuenta</label>
                <select
                  value={filters.account}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, account: event.target.value }));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas las cuentas</option>
                  {accounts.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted">Fecha desde</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, startDate: event.target.value }));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted">Fecha hasta</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => {
                    setFilters((prev) => ({ ...prev, endDate: event.target.value }));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            </div>
            )}
          </div>

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

          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-zinc-200/80">
                  <th className="py-2 pr-2 w-10 text-center">*</th>
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
                {displayedMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted">
                      No hay movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {paginatedMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className={`border-b border-zinc-100 align-top ${
                      movement.isHighlighted ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="py-3 pr-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => void handleToggleHighlighted(movement)}
                        aria-label={
                          movement.isHighlighted
                            ? "Quitar destacado"
                            : "Marcar como destacado"
                        }
                        title={movement.isHighlighted ? "Quitar destacado" : "Destacar"}
                        className={`rounded-md p-1 border ${
                          movement.isHighlighted
                            ? "border-amber-300 text-amber-800 bg-amber-100"
                            : "border-zinc-300 hover:bg-background"
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill={movement.isHighlighted ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M12 3l2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.77 6.2 20.88l1.11-6.47-4.7-4.58 6.49-.95L12 3z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="sr-only">
                          {movement.isHighlighted ? "Quitar destacado" : "Destacar"}
                        </span>
                      </button>
                    </td>
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
                          onClick={() => handleEdit(movement)}
                          aria-label="Editar movimiento"
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
                            <path
                              d="M12 20h9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
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
                          onClick={() => handleDelete(movement.id)}
                          aria-label="Eliminar movimiento"
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
                            <path
                              d="M3 6h18"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 6V4h8v2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M19 6l-1 14H6L5 6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M10 11v6M14 11v6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
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

            <div className="mt-auto shrink-0 pt-4 border-t border-zinc-200/80 flex items-center justify-between gap-3 bg-white">
              <p className="text-xs text-muted">
                {displayedMovements.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${(safeCurrentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                      safeCurrentPage * PAGE_SIZE,
                      displayedMovements.length
                    )} de ${displayedMovements.length}`}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
