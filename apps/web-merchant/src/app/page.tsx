"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (!isLoading && token) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-primary-900)" }}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full" style={{ background: "var(--color-accent-600)" }} />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full" style={{ background: "var(--color-accent-400)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-accent-400)" }}
          >
            LIBITEX
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-neutral-400)" }}>
            Connectez-vous a votre espace commercant
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "var(--color-error-light)",
                  color: "var(--color-error)",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-neutral-700)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amadou@boutique.sn"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "var(--color-neutral-200)",
                  "--tw-ring-color": "rgba(13,148,136,0.15)",
                } as any}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-neutral-700)" }}
              >
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "var(--color-neutral-200)",
                  "--tw-ring-color": "rgba(13,148,136,0.15)",
                } as any}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60"
              style={{ background: "var(--color-accent-600)" }}
            >
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--color-neutral-500)" }}
          >
            Pas encore de compte ?{" "}
            <a href="/register" className="font-medium" style={{ color: "var(--color-accent-600)" }}>
              Creer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
