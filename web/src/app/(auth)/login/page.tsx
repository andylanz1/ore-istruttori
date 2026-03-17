"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o password non validi");
      setLoading(false);
    } else {
      router.push("/ore");
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
          <h1 className="text-xl font-semibold text-center mb-6">
            Accedi
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-brand-gray-dark mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-gray-medium bg-brand-gray text-brand-black placeholder-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-black/20 transition"
                placeholder="nome@email.com"
                required
                autoComplete="email"
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
              <p className="text-brand-error text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-black text-white font-medium hover:bg-brand-black/90 active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? "Accesso..." : "Accedi"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-brand-gray-dark mt-6">
          O-Zone Wellness Boutique
        </p>
      </div>
    </div>
  );
}
