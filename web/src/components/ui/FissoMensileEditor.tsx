"use client";

import { useState } from "react";

interface FissoMensileEditorProps {
  userId: string;
  compensoFissoMensile: number | null;
}

export default function FissoMensileEditor({ userId, compensoFissoMensile }: FissoMensileEditorProps) {
  const [fisso, setFisso] = useState<string>(
    compensoFissoMensile !== null ? String(compensoFissoMensile) : ""
  );
  const [attivo, setAttivo] = useState(compensoFissoMensile !== null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/utenti/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compensoFissoMensile: attivo && fisso ? parseFloat(fisso) : null,
        }),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio");

      setMessage({ text: "Salvato", type: "success" });
      setTimeout(() => setMessage(null), 1500);
    } catch {
      setMessage({ text: "Errore nel salvataggio", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (attivo) {
      // Disattiva fisso mensile
      setAttivo(false);
      setFisso("");
      setSaving(true);
      try {
        await fetch(`/api/admin/utenti/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ compensoFissoMensile: null }),
        });
        setMessage({ text: "Fisso mensile rimosso", type: "success" });
        setTimeout(() => {
          setMessage(null);
          window.location.reload();
        }, 1000);
      } catch {
        setMessage({ text: "Errore", type: "error" });
      } finally {
        setSaving(false);
      }
    } else {
      setAttivo(true);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-brand-gray-dark">
          Compenso fisso mensile
        </h3>
        <button
          onClick={handleToggle}
          className={`text-xs px-3 py-1 rounded-full transition ${
            attivo
              ? "bg-brand-black text-white"
              : "bg-brand-gray text-brand-gray-dark hover:bg-brand-gray-medium"
          }`}
        >
          {attivo ? "Attivo" : "Attiva"}
        </button>
      </div>

      {attivo && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-gray-dark">€</span>
          <input
            type="number"
            value={fisso}
            onChange={(e) => setFisso(e.target.value)}
            min="0"
            step="50"
            placeholder="Es. 800"
            className="flex-1 px-3 py-2 rounded-lg border border-brand-gray-medium bg-brand-gray text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-black/20"
          />
          <span className="text-xs text-brand-gray-dark">/mese</span>
          <button
            onClick={handleSave}
            disabled={saving || !fisso}
            className="px-3 py-2 rounded-lg bg-brand-black text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-black/90 transition"
          >
            Salva
          </button>
        </div>
      )}

      {attivo && (
        <p className="text-xs text-brand-gray-dark">
          Con il fisso mensile attivo, le tariffe per lezione non vengono usate.
        </p>
      )}

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
