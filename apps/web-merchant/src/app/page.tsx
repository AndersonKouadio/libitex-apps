"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { connexionSchema, type ConnexionDTO } from "@/features/auth/schemas/auth.schema";
import { AlertCircle } from "lucide-react";

export default function PageConnexion() {
  const router = useRouter();
  const { connecter, enChargement, token } = useAuth();
  const [form, setForm] = useState<ConnexionDTO>({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState("");
  const [soumission, setSoumission] = useState(false);

  if (!enChargement && token) {
    router.push("/dashboard");
    return null;
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    const validation = connexionSchema.safeParse(form);
    if (!validation.success) {
      setErreur(validation.error.issues[0]?.message || "Formulaire invalide");
      return;
    }

    setSoumission(true);
    try {
      await connecter(validation.data);
      router.push("/dashboard");
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : "Connexion echouee");
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#1B1F3B]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-teal-600/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-teal-400/5" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-teal-400">LIBITEX</h1>
          <p className="mt-2.5 text-sm text-neutral-400">Espace commercant</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-7">
          <form onSubmit={soumettre} className="space-y-4">
            {erreur && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {erreur}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nom@boutique.sn"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all placeholder:text-neutral-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={form.motDePasse}
                onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                placeholder="Votre mot de passe"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-200 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all placeholder:text-neutral-400"
              />
            </div>

            <button
              type="submit"
              disabled={soumission}
              className="w-full py-3 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 transition-colors"
            >
              {soumission ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
