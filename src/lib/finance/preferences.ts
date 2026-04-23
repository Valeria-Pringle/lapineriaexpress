export interface FinancePreferences {
  categories: string[];
  accounts: string[];
}

const STORAGE_KEY = "admin-finance-preferences";

const defaultPreferences: FinancePreferences = {
  categories: ["Comida", "Transporte", "Salario"],
  accounts: ["Efectivo", "Banco", "Tarjeta"],
};

export interface FinancePreferencesRepository {
  get(): FinancePreferences;
  addCategory(name: string): FinancePreferences;
  removeCategory(name: string): FinancePreferences;
  addAccount(name: string): FinancePreferences;
  removeAccount(name: string): FinancePreferences;
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

    return {
      categories: Array.isArray(parsed.categories) ? normalize(parsed.categories) : [],
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
        categories: normalize(preferences.categories),
        accounts: normalize(preferences.accounts),
      })
    );
  }

  get(): FinancePreferences {
    return this.read();
  }

  addCategory(name: string): FinancePreferences {
    const current = this.read();
    const next = {
      ...current,
      categories: normalize([...current.categories, name]),
    };
    this.write(next);
    return next;
  }

  removeCategory(name: string): FinancePreferences {
    const current = this.read();
    const nextCategories = current.categories.filter(
      (category) => category.toLowerCase() !== name.toLowerCase()
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
