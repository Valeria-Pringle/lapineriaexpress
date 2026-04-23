"use client";

import { useState } from "react";
import {
  financePreferencesRepository,
  type FinancePreferences,
  type FinancePreferencesRepository,
} from "@/lib/finance/preferences";

interface FinancePreferencesPanelProps {
  repository?: FinancePreferencesRepository;
}

const categoryColorOptions = [
  "#EF4444",
  "#F59E0B",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#EC4899",
  "#6B7280",
];

export function FinancePreferencesPanel({
  repository = financePreferencesRepository,
}: FinancePreferencesPanelProps) {
  const [preferences, setPreferences] = useState<FinancePreferences>(() =>
    repository.get()
  );
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryColor, setCategoryColor] = useState("#4BD3D6");
  const [accountInput, setAccountInput] = useState("");
  const [error, setError] = useState("");

  const addCategory = () => {
    const value = categoryInput.trim();
    if (!value) {
      setError("Ingresa un nombre de categoria valido.");
      return;
    }

    setPreferences(repository.addCategory(value, categoryColor));
    setCategoryInput("");
    setCategoryColor("#4BD3D6");
    setError("");
  };

  const addAccount = () => {
    const value = accountInput.trim();
    if (!value) {
      setError("Ingresa un nombre de cuenta valido.");
      return;
    }

    setPreferences(repository.addAccount(value));
    setAccountInput("");
    setError("");
  };

  const removeCategory = (name: string) => {
    const shouldDelete = window.confirm(
      `Eliminar categoria \"${name}\"?`
    );
    if (!shouldDelete) return;

    setPreferences(repository.removeCategory(name));
  };

  const removeAccount = (name: string) => {
    const shouldDelete = window.confirm(`Eliminar cuenta \"${name}\"?`);
    if (!shouldDelete) return;

    setPreferences(repository.removeAccount(name));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Preferencias de Finanzas</h2>
          <p className="text-muted mt-2">
            Configura las categorias y tipos de cuenta para usar en tus movimientos.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <article className="bg-background border border-zinc-200/80 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Categorias</h3>

          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              placeholder="Ej. Salud"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div>
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {categoryColorOptions.map((color) => {
                  const isSelected = categoryColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryColor(color)}
                      title={color}
                      aria-label={`Color ${color}`}
                      className={`h-8 w-8 rounded-full border-2 transition ${
                        isSelected
                          ? "border-foreground ring-2 ring-offset-2 ring-primary"
                          : "border-zinc-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={addCategory}
              className="rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 w-full"
            >
              Agregar
            </button>
          </div>

          <ul className="space-y-2">
            {preferences.categories.map((category) => (
              <li
                key={category.name}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-zinc-300"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeCategory(category.name)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          </article>

          <article className="bg-background border border-zinc-200/80 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Tipos de Cuenta</h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={accountInput}
              onChange={(event) => setAccountInput(event.target.value)}
              placeholder="Ej. Ahorro"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={addAccount}
              className="rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2"
            >
              Agregar
            </button>
          </div>

          <ul className="space-y-2">
            {preferences.accounts.map((account) => (
              <li
                key={account}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
              >
                <span>{account}</span>
                <button
                  type="button"
                  onClick={() => removeAccount(account)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
