"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Login } from "@/components/admin/Login";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

const navigationItems = [
  { href: "/admin/cotizaciones", label: "Cotizaciones" },
  { href: "/admin/finanzas", label: "Finanzas" },
];

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("adminLoggedIn") === "true";
    setIsAuthenticated(isLoggedIn);
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("adminLoggedIn", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Cargando panel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 text-gray-900">
        <aside
          className={`relative bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out shrink-0 h-full ${
            isSidebarOpen ? "w-64" : "w-16"
          }`}
        >
          {/* Header */}
          <div className="flex items-center border-b border-gray-200 h-16 px-3 gap-2">
            <div
              className={`flex-1 overflow-hidden transition-all duration-300 ${
                isSidebarOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap">Admin</p>
              <h1 className="text-base font-bold whitespace-nowrap">La Pineria Express</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors text-gray-600 font-bold text-xs"
              aria-label={isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
              title={isSidebarOpen ? "Ocultar menu" : "Mostrar menu"}
            >
              {isSidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-2 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarOpen ? undefined : item.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden ${
                    isActive
                      ? "bg-teal-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
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

          {/* Footer */}
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={handleLogout}
              title={isSidebarOpen ? undefined : "Cerrar sesion"}
              className="flex items-center gap-3 w-full rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 transition-colors text-sm whitespace-nowrap overflow-hidden"
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
          <div className="shrink-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
            <h2 className="text-lg font-semibold">
              {pathname === "/admin/finanzas" ? "Finanzas" : "Cotizaciones"}
            </h2>
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
    </div>
  );
}
