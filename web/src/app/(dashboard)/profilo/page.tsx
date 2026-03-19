"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface Riepilogo {
  meseLezioni: number;
  settimanaLezioni: number;
  totaleFatturatoMese: number;
  totaleFatturatoAnno: number;
}

export default function ProfiloPage() {
  const { data: session } = useSession();
  const [riepilogo, setRiepilogo] = useState<Riepilogo | null>(null);

  useEffect(() => {
    fetch("/api/riepilogo")
      .then((r) => r.json())
      .then(setRiepilogo)
      .catch(() => null);
  }, []);

  const formatEuro = (n: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-4">
      {/* User info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-brand-gray flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-brand-gray-dark">
            {session?.user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
        <h2 className="text-lg font-semibold">{session?.user?.name}</h2>
        <p className="text-sm text-brand-gray-dark">{session?.user?.email || "Istruttore"}</p>
      </div>

      {/* Stats lezioni */}
      {riepilogo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold">
                {riepilogo.settimanaLezioni}
              </p>
              <p className="text-xs text-brand-gray-dark mt-1">
                Lezioni questa settimana
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold">
                {riepilogo.meseLezioni}
              </p>
              <p className="text-xs text-brand-gray-dark mt-1">
                Lezioni questo mese
              </p>
            </div>
          </div>

          {/* Fatturato */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-brand-gray-dark mb-3">
              Il tuo fatturato verso O-Zone
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold">
                  {formatEuro(riepilogo.totaleFatturatoMese)}
                </p>
                <p className="text-xs text-brand-gray-dark mt-1">
                  Questo mese
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">
                  {formatEuro(riepilogo.totaleFatturatoAnno)}
                </p>
                <p className="text-xs text-brand-gray-dark mt-1">
                  Anno {new Date().getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full py-3 rounded-xl border border-brand-gray-medium text-brand-gray-dark font-medium hover:bg-white active:scale-[0.98] transition"
      >
        Esci
      </button>
    </div>
  );
}
