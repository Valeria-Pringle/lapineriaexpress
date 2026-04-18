"use client";

import { useState } from "react";
import Image from "next/image";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ADMIN_USERNAME = "loritabonita";
  const ADMIN_PASSWORD = "loritabonita";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("Usuario o contraseña incorrectos");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-gray-50">
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
          <p className="text-center text-gray-600 mb-8">Panel Administrativo</p>

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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="admin"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Iniciar sesión
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
