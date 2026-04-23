"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Login } from "@/components/admin/Login";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

const mainNavigationItems = [
  { href: "/admin/cotizaciones", label: "Cotizaciones" },
  { href: "/admin/finanzas", label: "Finanzas" },
];

const preferencesNavigationItem = {
  href: "/admin/preferencias",
  label: "Preferencias",
};

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [, setAuthTick] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isAuthenticated =
    typeof window !== "undefined" &&
    sessionStorage.getItem("adminLoggedIn") === "true";

  const handleLogin = () => {
    sessionStorage.setItem("adminLoggedIn", "true");
    setAuthTick((prev) => prev + 1);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    setAuthTick((prev) => prev + 1);
  };

  const pageTitleByPath: Record<string, string> = {
    "/admin/cotizaciones": "Cotizaciones",
    "/admin/finanzas": "Finanzas",
    "/admin/preferencias": "Preferencias",
  };

  if (typeof window === "undefined") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted">Cargando panel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
        <aside
          className={`relative bg-white border-r border-zinc-200/80 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out shrink-0 h-full ${
            isSidebarOpen ? "w-64" : "w-16"
          }`}
        >
          {/* Header */}
          <div className="flex items-center border-b border-zinc-200/80 h-16 px-3 gap-2">
            <div
              className={`flex-1 overflow-hidden transition-all duration-300 ${
                isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">Admin</p>
              <h1 className="text-base font-bold whitespace-nowrap">La Pineria Express</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-300 hover:bg-background transition-colors text-muted font-bold text-xs"
              aria-label={isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
              title={isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
            >
              {isSidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-1">
            {mainNavigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarOpen ? undefined : item.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <span className="shrink-0 w-5 text-center font-bold">
                    {item.label.charAt(0)}
                  </span>
                  <span
                    className={`transition-all duration-300 overflow-hidden ${
                      isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="p-2 border-t border-zinc-200/80">
            <Link
              href={preferencesNavigationItem.href}
              title={isSidebarOpen ? undefined : preferencesNavigationItem.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden ${
                pathname === preferencesNavigationItem.href
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <span className="shrink-0 w-5 text-center font-bold">
                {preferencesNavigationItem.label.charAt(0)}
              </span>
              <span
                className={`transition-all duration-300 overflow-hidden ${
                  isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
              >
                {preferencesNavigationItem.label}
              </span>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-zinc-200/80">
            <button
              onClick={handleLogout}
              title={isSidebarOpen ? undefined : "Cerrar sesion"}
              className="flex items-center gap-3 w-full rounded-lg bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-3 transition-colors text-sm whitespace-nowrap overflow-hidden"
            >
              <span className="shrink-0 w-5 text-center">✕</span>
              <span
                className={`transition-all duration-300 overflow-hidden ${
                  isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
              >
                Cerrar sesion
              </span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          <div className="shrink-0 z-20 bg-white border-b border-zinc-200/80 px-4 py-3">
            <h2 className="text-lg font-semibold">{pageTitleByPath[pathname] ?? "Panel"}</h2>
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
    </div>
  );
}
