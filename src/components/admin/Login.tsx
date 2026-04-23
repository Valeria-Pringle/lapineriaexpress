"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Use a security-definer RPC to look up the email without being blocked by RLS.
    const { data: email, error: lookupError } = await supabase
      .rpc("get_email_by_username", { p_username: username.trim().toLowerCase() });

    if (lookupError) {
      setLoading(false);
      setError("Usuario o contraseña incorrectos");
      setPassword("");
      return;
    }

    if (!email) {
      setLoading(false);
      setError("Usuario o contraseña incorrectos");
      setPassword("");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email as string,
      password,
    });

    setLoading(false);

    if (!signInError) {
      onLogin();
    } else {
      setError("Usuario o contraseña incorrectos");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.jpg"
              alt="La Pineria Express Logo"
              width={80}
              height={80}
              className="rounded-lg object-cover"
            />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">
            La Pineria Express
          </h1>
          <p className="text-center text-muted mb-8">Panel Administrativo</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
