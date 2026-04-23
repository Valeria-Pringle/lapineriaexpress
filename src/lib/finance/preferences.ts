import { supabase } from "@/lib/supabase/client";

export interface CategoryPreference {
  name: string;
  color: string;
}

export interface FinancePreferences {
  categories: CategoryPreference[];
  accounts: string[];
}

const defaultPreferences: FinancePreferences = {
  categories: [
    { name: "Comida", color: "#f59e0b" },
    { name: "Transporte", color: "#3b82f6" },
    { name: "Salario", color: "#10b981" },
  ],
  accounts: ["Efectivo", "Banco", "Tarjeta"],
};

export interface FinancePreferencesRepository {
  get(): Promise<FinancePreferences>;
  addCategory(name: string, color: string): Promise<FinancePreferences>;
  removeCategory(name: string): Promise<FinancePreferences>;
  addAccount(name: string): Promise<FinancePreferences>;
  removeAccount(name: string): Promise<FinancePreferences>;
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

interface CategoryRow {
  name: string;
  color: string;
}

interface AccountRow {
  name: string;
}

export class SupabaseFinancePreferencesRepository
  implements FinancePreferencesRepository
{
  async get(): Promise<FinancePreferences> {
    const [{ data: categoriesData, error: categoriesError }, { data: accountsData, error: accountsError }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("name,color"),
        supabase
          .from("accounts")
          .select("name"),
      ]);

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }
    if (accountsError) {
      throw new Error(accountsError.message);
    }

    const categories = normalizeCategories(
      ((categoriesData || []) as CategoryRow[]).map((row) => ({
        name: row.name,
        color: normalizeColor(row.color),
      }))
    );

    const accounts = normalize(((accountsData || []) as AccountRow[]).map((row) => row.name));

    return {
      categories: categories.length > 0 ? categories : defaultPreferences.categories,
      accounts: accounts.length > 0 ? accounts : defaultPreferences.accounts,
    };
  }

  async addCategory(name: string, color: string): Promise<FinancePreferences> {
    const nextName = normalizeCategoryName(name);
    const nextColor = normalizeColor(color);

    if (!nextName) {
      return this.get();
    }

    const { data: existing, error: existingError } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", nextName)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ color: nextColor })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from("categories")
        .insert({ name: nextName, color: nextColor });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    return this.get();
  }

  async removeCategory(name: string): Promise<FinancePreferences> {
    const nextName = normalizeCategoryName(name);
    const { error } = await supabase
      .from("categories")
      .delete()
      .ilike("name", nextName);

    if (error) {
      throw new Error(error.message);
    }

    const current = await this.get();
    if (current.categories.length > 0) {
      return current;
    }

    const { error: seedError } = await supabase
      .from("categories")
      .insert(defaultPreferences.categories);

    if (seedError) {
      throw new Error(seedError.message);
    }

    return this.get();
  }

  async addAccount(name: string): Promise<FinancePreferences> {
    const nextName = name.trim();
    if (!nextName) {
      return this.get();
    }

    const { data: existing, error: existingError } = await supabase
      .from("accounts")
      .select("name")
      .ilike("name", nextName)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.name) {
      return this.get();
    }

    const { error } = await supabase
      .from("accounts")
      .insert({ name: nextName });

    if (error) {
      throw new Error(error.message);
    }

    return this.get();
  }

  async removeAccount(name: string): Promise<FinancePreferences> {
    const nextName = name.trim();
    const { error } = await supabase
      .from("accounts")
      .delete()
      .ilike("name", nextName);

    if (error) {
      throw new Error(error.message);
    }

    const current = await this.get();
    if (current.accounts.length > 0) {
      return current;
    }

    const defaults = defaultPreferences.accounts.map((account) => ({ name: account }));
    const { error: seedError } = await supabase
      .from("accounts")
      .insert(defaults);

    if (seedError) {
      throw new Error(seedError.message);
    }

    return this.get();
  }
}

export const financePreferencesRepository: FinancePreferencesRepository =
  new SupabaseFinancePreferencesRepository();
