export interface CategoryPreference {
  name: string;
  color: string;
}

export interface FinancePreferences {
  categories: CategoryPreference[];
  accounts: string[];
}

const STORAGE_KEY = "admin-finance-preferences";

const defaultPreferences: FinancePreferences = {
  categories: [
    { name: "Comida", color: "#f59e0b" },
    { name: "Transporte", color: "#3b82f6" },
    { name: "Salario", color: "#10b981" },
  ],
  accounts: ["Efectivo", "Banco", "Tarjeta"],
};

export interface FinancePreferencesRepository {
  get(): FinancePreferences;
  addCategory(name: string, color: string): FinancePreferences;
  removeCategory(name: string): FinancePreferences;
  addAccount(name: string): FinancePreferences;
  removeAccount(name: string): FinancePreferences;
}

function normalizeColor(color: string): string {
  const value = color.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : "#4BD3D6";
}

function normalizeCategoryName(name: string): string {
  return name.trim();
}

function normalizeCategories(values: CategoryPreference[]): CategoryPreference[] {
  const map = new Map<string, CategoryPreference>();

  values.forEach((value) => {
    const name = normalizeCategoryName(value.name);
    if (!name) return;

    map.set(name.toLowerCase(), {
      name,
      color: normalizeColor(value.color),
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}

function normalize(values: string[]): string[] {
  const unique = Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

  return unique.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function safeParse(value: string | null): FinancePreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<FinancePreferences>;
    if (!parsed || typeof parsed !== "object") return null;

    const parsedCategories = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];

    const categories = normalizeCategories(
      parsedCategories
        .map((entry) => {
          if (typeof entry === "string") {
            return { name: entry, color: "#4BD3D6" };
          }

          if (
            typeof entry === "object" &&
            entry !== null &&
            "name" in entry &&
            typeof (entry as { name: unknown }).name === "string"
          ) {
            return {
              name: (entry as { name: string }).name,
              color:
                typeof (entry as { color?: unknown }).color === "string"
                  ? (entry as { color: string }).color
                  : "#4BD3D6",
            };
          }

          return null;
        })
        .filter((entry): entry is CategoryPreference => entry !== null)
    );

    return {
      categories,
      accounts: Array.isArray(parsed.accounts) ? normalize(parsed.accounts) : [],
    };
  } catch {
    return null;
  }
}

export class LocalStorageFinancePreferencesRepository
  implements FinancePreferencesRepository
{
  private read(): FinancePreferences {
    if (typeof window === "undefined") return defaultPreferences;

    const saved = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultPreferences;

    return {
      categories:
        saved.categories.length > 0
          ? saved.categories
          : defaultPreferences.categories,
      accounts:
        saved.accounts.length > 0 ? saved.accounts : defaultPreferences.accounts,
    };
  }

  private write(preferences: FinancePreferences): void {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        categories: normalizeCategories(preferences.categories),
        accounts: normalize(preferences.accounts),
      })
    );
  }

  get(): FinancePreferences {
    return this.read();
  }

  addCategory(name: string, color: string): FinancePreferences {
    const current = this.read();
    const next = {
      ...current,
      categories: normalizeCategories([
        ...current.categories,
        { name, color },
      ]),
    };
    this.write(next);
    return next;
  }

  removeCategory(name: string): FinancePreferences {
    const current = this.read();
    const nextCategories = current.categories.filter(
      (category) => category.name.toLowerCase() !== name.toLowerCase()
    );

    const next = {
      ...current,
      categories:
        nextCategories.length > 0 ? nextCategories : defaultPreferences.categories,
    };

    this.write(next);
    return next;
  }

  addAccount(name: string): FinancePreferences {
    const current = this.read();
    const next = {
      ...current,
      accounts: normalize([...current.accounts, name]),
    };
    this.write(next);
    return next;
  }

  removeAccount(name: string): FinancePreferences {
    const current = this.read();
    const nextAccounts = current.accounts.filter(
      (account) => account.toLowerCase() !== name.toLowerCase()
    );

    const next = {
      ...current,
      accounts: nextAccounts.length > 0 ? nextAccounts : defaultPreferences.accounts,
    };

    this.write(next);
    return next;
  }
}

export const financePreferencesRepository: FinancePreferencesRepository =
  new LocalStorageFinancePreferencesRepository();
