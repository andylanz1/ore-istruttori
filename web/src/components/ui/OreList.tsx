"use client";

import { useEffect, useState } from "react";

interface Registrazione {
  id: string;
  userId: string | null;
  oraInizio: string;
  attivita: string;
  partecipanti: number | null;
  compenso: number | null;
  note: string | null;
  stato: string;
  sorgente: string;
}

interface OreListProps {
  selectedDate: string;
  refreshKey: number;
  onPendingCount?: (count: number) => void;
}

export default function OreList({ selectedDate, refreshKey, onPendingCount }: OreListProps) {
  const [items, setItems] = useState<Registrazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ore?data=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        const pending = (data as Registrazione[]).filter(
          (r) => r.stato === "da_confermare"
        ).length;
        onPendingCount?.(pending);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [selectedDate, refreshKey, onPendingCount]);

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa lezione?")) return;
    const res = await fetch(`/api/ore/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      const err = await res.json();
      alert(err.error || "Errore durante l'eliminazione");
    }
  }

  async function handleAction(id: string, azione: "conferma" | "rifiuta" | "reclama") {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/ore/${id}/conferma`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione }),
      });

      if (res.ok) {
        const result = await res.json();
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            if (azione === "rifiuta") {
              return { ...item, stato: "rifiutato" };
            }
            return { ...item, stato: result.stato };
          })
        );
      } else {
        const err = await res.json();
        alert(err.error || "Errore");
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-brand-gray-dark text-sm">
        Caricamento...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-brand-gray-dark text-sm">
        Nessuna lezione registrata per questo giorno
      </div>
    );
  }

  // Split items by type
  const daConfermare = items.filter(
    (r) => r.stato === "da_confermare" && r.userId !== null
  );
  const turni = items.filter(
    (r) => r.stato === "da_confermare" && r.userId === null
  );
  const confermate = items.filter(
    (r) => r.stato !== "da_confermare"
  );

  return (
    <div className="space-y-4">
      {/* DA CONFERMARE */}
      {daConfermare.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-amber-700">
              Da confermare ({daConfermare.length})
            </span>
          </div>
          {daConfermare.map((item) => (
            <div
              key={item.id}
              className="bg-amber-50 border border-amber-200 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-black">
                      {item.oraInizio}
                    </span>
                    <span className="font-medium text-sm">{item.attivita}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {item.partecipanti !== null && (
                      <span className="text-xs text-brand-gray-dark">
                        {item.partecipanti} partecipanti
                      </span>
                    )}
                    {item.compenso !== null && (
                      <span className="text-xs font-medium text-emerald-600">
                        {item.compenso.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAction(item.id, "conferma")}
                  disabled={actionLoading === item.id}
                  className="flex-1 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50"
                >
                  Conferma
                </button>
                <button
                  onClick={() => handleAction(item.id, "rifiuta")}
                  disabled={actionLoading === item.id}
                  className="flex-1 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 active:scale-95 transition disabled:opacity-50"
                >
                  Rifiuta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TURNI */}
      {turni.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm font-semibold text-blue-700">
              Turni disponibili ({turni.length})
            </span>
          </div>
          {turni.map((item) => (
            <div
              key={item.id}
              className="bg-blue-50 border border-blue-200 rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-black">
                  {item.oraInizio}
                </span>
                <span className="font-medium text-sm">{item.attivita}</span>
              </div>
              {item.partecipanti !== null && (
                <span className="text-xs text-brand-gray-dark mt-1 block">
                  {item.partecipanti} partecipanti
                </span>
              )}
              <button
                onClick={() => handleAction(item.id, "reclama")}
                disabled={actionLoading === item.id}
                className="mt-2 w-full py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 active:scale-95 transition disabled:opacity-50"
              >
                Reclama questa lezione
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CONFERMATE / MANUALI */}
      {confermate.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-brand-gray-dark">
              Lezioni del giorno
            </span>
            <span className="text-sm font-semibold">
              {confermate.length}{" "}
              {confermate.length === 1 ? "lezione" : "lezioni"}
            </span>
          </div>
          {confermate.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-brand-black">
                    {item.oraInizio}
                  </span>
                  <span className="font-medium text-sm">{item.attivita}</span>
                  {item.stato === "rifiutato" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">
                      Rifiutata
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {item.partecipanti !== null && (
                    <span className="text-xs text-brand-gray-dark">
                      {item.partecipanti} part.
                    </span>
                  )}
                  {item.compenso !== null && (
                    <span className="text-xs font-medium text-emerald-600">
                      {item.compenso.toFixed(2)}
                    </span>
                  )}
                  {item.note && (
                    <span className="text-xs text-brand-gray-dark italic">
                      {item.note}
                    </span>
                  )}
                </div>
              </div>

              {item.sorgente !== "dbgym" && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-brand-gray-dark hover:text-brand-error transition"
                  aria-label="Elimina"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
