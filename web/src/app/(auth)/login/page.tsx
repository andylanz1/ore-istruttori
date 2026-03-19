"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Fase = "login" | "richiedi-password";

export default function LoginPage() {
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fase, setFase] = useState<Fase>("login");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      telefono,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Numero o password non validi");
      setLoading(false);
    } else {
      router.push("/ore");
    }
  }

  async function handleRichiestaPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/richiedi-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore nella richiesta");
      } else {
        setSuccess("Password inviata via WhatsApp al tuo numero!");
        setTimeout(() => {
          setFase("login");
          setSuccess("");
        }, 3000);
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-gray px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://images.squarespace-cdn.com/content/v1/59a8252ef14aa1d4753f773f/1505582501952-4GGS7SEZFFX11LO447W5/logo+ozone+sito.png"
            alt="O-Zone"
            className="h-16 object-contain"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {fase === "login" ? (
            <>
              <h1 className="text-xl font-semibold text-center mb-6">
                Accedi
              </h1>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="telefono"
                    className="block text-sm font-medium text-brand-gray-dark mb-1"
                  >
                    Numero di telefono
                  </label>
                  <input
                    id="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-gray-medium bg-brand-gray text-brand-black placeholder-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-black/20 transition"
                    placeholder="3279451839"
                    required
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-brand-gray-dark mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-gray-medium bg-brand-gray text-brand-black placeholder-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-black/20 transition"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <p className="text-brand-error text-sm text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-black text-white font-medium hover:bg-brand-black/90 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {loading ? "Accesso..." : "Accedi"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setFase("richiedi-password");
                  }}
                  className="text-sm text-brand-gray-dark hover:text-brand-black underline transition"
                >
                  Non hai la password? Richiedila via WhatsApp
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-center mb-2">
                Richiedi password
              </h1>
              <p className="text-sm text-brand-gray-dark text-center mb-6">
                Riceverai la password via WhatsApp
              </p>

              <form onSubmit={handleRichiestaPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="telefono-richiesta"
                    className="block text-sm font-medium text-brand-gray-dark mb-1"
                  >
                    Numero di telefono
                  </label>
                  <input
                    id="telefono-richiesta"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-gray-medium bg-brand-gray text-brand-black placeholder-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-black/20 transition"
                    placeholder="3279451839"
                    required
                    autoComplete="tel"
                  />
                </div>

                {error && (
                  <p className="text-brand-error text-sm text-center">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="text-green-600 text-sm text-center">
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-black text-white font-medium hover:bg-brand-black/90 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {loading ? "Invio in corso..." : "Invia password via WhatsApp"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setFase("login");
                  }}
                  className="text-sm text-brand-gray-dark hover:text-brand-black underline transition"
                >
                  Torna al login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-brand-gray-dark mt-6">
          O-Zone Wellness Boutique
        </p>
      </div>
    </div>
  );
}
