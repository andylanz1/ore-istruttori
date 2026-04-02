"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface DettaglioMese {
  mese: number;
  importo: number;
}

interface Riepilogo {
  meseLezioni: number;
  settimanaLezioni: number;
  totaleFatturatoMese: number;
  totaleFatturatoAnno: number;
  compensoFissoMensile: number | null;
  dettaglioMensile?: DettaglioMese[];
}

interface Lezione {
  id: string;
  data: string;
  oraInizio: string;
  attivita: string;
  partecipanti: number | null;
  compenso: number | null;
  stato: string;
  sorgente: string;
  note: string | null;
}

const NOMI_MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function formatEuro(n: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatData(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
}

export default function ProfiloPage() {
  const { data: session } = useSession();
  const [riepilogo, setRiepilogo] = useState<Riepilogo | null>(null);
  const [lezioni, setLezioni] = useState<Lezione[]>([]);
  const [loadingLezioni, setLoadingLezioni] = useState(false);

  // Mese selezionato per navigazione
  const now = new Date();
  const [meseCorrente, setMeseCorrente] = useState(now.getMonth() + 1); // 1-based
  const [annoCorrente, setAnnoCorrente] = useState(now.getFullYear());

  const isCurrentMonth = meseCorrente === now.getMonth() + 1 && annoCorrente === now.getFullYear();

  // Carica riepilogo (anno corrente della navigazione)
  useEffect(() => {
    fetch("/api/riepilogo")
      .then((r) => r.json())
      .then(setRiepilogo)
      .catch(() => null);
  }, []);

  // Carica lezioni del mese selezionato
  const fetchLezioni = useCallback(() => {
    setLoadingLezioni(true);
    fetch(`/api/ore/mese?anno=${annoCorrente}&mese=${meseCorrente}`)
      .then((r) => r.json())
      .then((data) => setLezioni(Array.isArray(data) ? data : []))
      .catch(() => setLezioni([]))
      .finally(() => setLoadingLezioni(false));
  }, [annoCorrente, meseCorrente]);

  useEffect(() => {
    fetchLezioni();
  }, [fetchLezioni]);

  function prevMese() {
    if (meseCorrente === 1) {
      setMeseCorrente(12);
      setAnnoCorrente((a) => a - 1);
    } else {
      setMeseCorrente((m) => m - 1);
    }
  }

  function nextMese() {
    // Non andare oltre il mese corrente
    if (isCurrentMonth) return;
    if (meseCorrente === 12) {
      setMeseCorrente(1);
      setAnnoCorrente((a) => a + 1);
    } else {
      setMeseCorrente((m) => m + 1);
    }
  }

  // Raggruppa lezioni per giorno
  const lezioniPerGiorno = lezioni.reduce<Record<string, Lezione[]>>((acc, l) => {
    const day = l.data.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(l);
    return acc;
  }, {});

  const giorniOrdinati = Object.keys(lezioniPerGiorno).sort();

  // Totale compenso del mese selezionato
  const totaleCompensoMese = lezioni.reduce((sum, l) => sum + (l.compenso ?? 0), 0);

  // Cerca il compenso storico per il mese selezionato
  const compensoStorico = riepilogo?.dettaglioMensile?.find(
    (dm) => dm.mese === meseCorrente
  );
  const importoMese = compensoStorico?.importo ?? (riepilogo?.compensoFissoMensile ?? totaleCompensoMese);

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

      {/* Navigazione mese */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMese}
          className="p-2 rounded-lg hover:bg-white active:scale-95 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold capitalize">
          {NOMI_MESI[meseCorrente - 1]} {annoCorrente}
        </h2>
        <button
          onClick={nextMese}
          disabled={isCurrentMonth}
          className={`p-2 rounded-lg transition ${
            isCurrentMonth
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-white active:scale-95"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Riepilogo mese */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold">{lezioni.length}</p>
          <p className="text-xs text-brand-gray-dark mt-1">Lezioni</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold">{formatEuro(importoMese)}</p>
          <p className="text-xs text-brand-gray-dark mt-1">Compenso</p>
        </div>
      </div>

      {/* Dettaglio lezioni del mese */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-brand-gray-dark mb-3">
          Dettaglio lezioni
        </h3>

        {loadingLezioni ? (
          <p className="text-center text-brand-gray-dark py-4 text-sm">Caricamento...</p>
        ) : lezioni.length === 0 ? (
          <p className="text-center text-brand-gray-dark py-4 text-sm">
            Nessuna lezione registrata
          </p>
        ) : (
          <div className="space-y-4">
            {giorniOrdinati.map((giorno) => (
              <div key={giorno}>
                <p className="text-xs font-semibold text-brand-gray-dark uppercase mb-1.5">
                  {formatData(giorno)}
                </p>
                <div className="space-y-1.5">
                  {lezioniPerGiorno[giorno].map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between py-1.5 border-b border-brand-gray last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold w-12">{l.oraInizio}</span>
                        <span className="text-sm">{l.attivita}</span>
                        {l.partecipanti !== null && (
                          <span className="text-xs text-brand-gray-dark">
                            ({l.partecipanti} p.)
                          </span>
                        )}
                      </div>
                      {l.compenso !== null && (
                        <span className="text-sm font-medium text-emerald-600">
                          {formatEuro(l.compenso)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riepilogo annuale (solo nel mese corrente) */}
      {isCurrentMonth && riepilogo && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-medium text-brand-gray-dark mb-3">
            Riepilogo {now.getFullYear()}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold">
                {formatEuro(riepilogo.totaleFatturatoMese)}
              </p>
              <p className="text-xs text-brand-gray-dark mt-1">Questo mese</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">
                {formatEuro(riepilogo.totaleFatturatoAnno)}
              </p>
              <p className="text-xs text-brand-gray-dark mt-1">
                Anno {now.getFullYear()}
              </p>
            </div>
          </div>
        </div>
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
