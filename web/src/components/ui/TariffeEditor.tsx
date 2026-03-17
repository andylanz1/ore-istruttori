"use client";

import { useState } from "react";

const ATTIVITA_OPTIONS = [
  "Pilates",
  "In-Trinity",
  "WBS",
  "Piloga",
  "Functional",
  "Easy Reformer",
  "Easy WBS",
  "PT 1h",
  "PT 30 Min",
  "Check-up",
  "OSTEO",
];

interface Tariffa {
  id: string;
  attivita: string;
  compenso: number;
}

interface TariffeEditorProps {
  userId: string;
  tariffe: Tariffa[];
}

export default function TariffeEditor({ userId, tariffe: initialTariffe }: TariffeEditorProps) {
  const [tariffe, setTariffe] = useState<Tariffa[]>(initialTariffe);
  const [nuovaAttivita, setNuovaAttivita] = useState("");
  const [nuovoCompenso, setNuovoCompenso] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Attività non ancora configurate
  const attivitaDisponibili = ATTIVITA_OPTIONS.filter(
    (a) => !tariffe.some((t) => t.attivita === a)
  );

  async function handleAdd() {
    if (!nuovaAttivita || !nuovoCompenso) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/tariffe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          attivita: nuovaAttivita,
          compenso: parseFloat(nuovoCompenso),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Errore");
      }

      const tariffa = await res.json();
      setTariffe((prev) => [...prev, tariffa].sort((a, b) => a.attivita.localeCompare(b.attivita)));
      setNuovaAttivita("");
      setNuovoCompenso("");
      setMessage({ text: "Tariffa aggiunta", type: "success" });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Errore", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, compenso: number) {
    try {
      const res = await fetch(`/api/admin/tariffe/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compenso }),
      });

      if (!res.ok) throw new Error("Errore aggiornamento");

      setMessage({ text: "Salvato", type: "success" });
      setTimeout(() => setMessage(null), 1500);
    } catch {
      setMessage({ text: "Errore nel salvataggio", type: "error" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Rimuovere questa tariffa?")) return;

    await fetch(`/api/admin/tariffe/${id}`, { method: "DELETE" });
    setTariffe((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-brand-gray-dark">
        Tariffe per attività (€/lezione)
      </h3>

      {/* Tariffe esistenti */}
      {tariffe.map((t) => (
        <div key={t.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
          <span className="flex-1 text-sm font-medium">{t.attivita}</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-brand-gray-dark">€</span>
            <input
              type="number"
              defaultValue={t.compenso}
              min="0"
              step="0.5"
              className="w-20 px-2 py-1.5 rounded-lg border border-brand-gray-medium bg-brand-gray text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-black/20"
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (val !== t.compenso && val >= 0) {
                  handleUpdate(t.id, val);
                  setTariffe((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, compenso: val } : x))
                  );
                }
              }}
            />
          </div>
          <button
            onClick={() => handleDelete(t.id)}
            className="p-1.5 text-brand-gray-dark hover:text-brand-error transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Aggiungi nuova */}
      {attivitaDisponibili.length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
          <p className="text-xs text-brand-gray-dark">Aggiungi tariffa</p>
          <div className="flex gap-2">
            <select
              value={nuovaAttivita}
              onChange={(e) => setNuovaAttivita(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-brand-gray-medium bg-brand-gray text-sm focus:outline-none focus:ring-2 focus:ring-brand-black/20"
            >
              <option value="">Seleziona attività...</option>
              {attivitaDisponibili.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-sm text-brand-gray-dark">€</span>
              <input
                type="number"
                value={nuovoCompenso}
                onChange={(e) => setNuovoCompenso(e.target.value)}
                min="0"
                step="0.5"
                placeholder="0"
                className="w-20 px-2 py-2 rounded-lg border border-brand-gray-medium bg-brand-gray text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-black/20"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !nuovaAttivita || !nuovoCompenso}
              className="px-3 py-2 rounded-lg bg-brand-black text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-black/90 transition"
            >
              +
            </button>
          </div>
        </div>
      )}

      {attivitaDisponibili.length === 0 && tariffe.length > 0 && (
        <p className="text-xs text-brand-success text-center">
          Tutte le attività hanno una tariffa configurata
        </p>
      )}

      {/* Feedback */}
      {message && (
        <p className={`text-sm text-center ${
          message.type === "success" ? "text-brand-success" : "text-brand-error"
        }`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
