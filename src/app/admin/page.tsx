"use client";

import { useState, useEffect } from "react";
import { Login } from "@/components/admin/Login";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión almacenada en sessionStorage
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
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <AdminPanel onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}
