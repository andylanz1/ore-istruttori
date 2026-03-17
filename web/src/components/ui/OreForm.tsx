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

const ORE_OPTIONS = [
  { value: 0.5, label: "30 min" },
  { value: 1, label: "1 ora" },
  { value: 1.5, label: "1h 30" },
  { value: 2, label: "2 ore" },
  { value: 2.5, label: "2h 30" },
  { value: 3, label: "3 ore" },
];

interface OreFormProps {
  selectedDate: string;
  onSaved: () => void;
}

export default function OreForm({ selectedDate, onSaved }: OreFormProps) {
  const [ore, setOre] = useState(1);
  const [attivita, setAttivita] = useState(ATTIVITA_OPTIONS[0]);
  const [partecipanti, setPartecipanti] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/ore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: selectedDate,
          ore,
          attivita,
          partecipanti: parseInt(partecipanti),
          note: note || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Errore nel salvataggio");
      }

      setMessage({ text: "Lezione salvata!", type: "success" });
      setNote("");
      setPartecipanti("");
      onSaved();

      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : "Errore",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <h3 className="font-semibold text-sm text-brand-gray-dark">
        Nuova lezione —{" "}
        {new Date(selectedDate + "T00:00:00").toLocaleDateString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h3>

      {/* Attività */}
      <div>
        <label className="block text-xs text-brand-gray-dark mb-1">
          Attività
        </label>
        <select
          value={attivita}
          onChange={(e) => setAttivita(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-brand-gray-medium bg-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-black/20"
        >
          {ATTIVITA_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Durata */}
      <div>
        <label className="block text-xs text-brand-gray-dark mb-1">
          Durata
        </label>
        <div className="grid grid-cols-6 gap-1">
          {ORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOre(opt.value)}
              className={`py-2.5 rounded-xl text-xs font-medium transition ${
                ore === opt.value
                  ? "bg-brand-black text-white"
                  : "bg-brand-gray text-brand-gray-dark border border-brand-gray-medium"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Partecipanti */}
      <div>
        <label className="block text-xs text-brand-gray-dark mb-1">
          N° Partecipanti
        </label>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="99"
          value={partecipanti}
          onChange={(e) => setPartecipanti(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-brand-gray-medium bg-brand-gray text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-black/20"
          placeholder="0"
          required
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs text-brand-gray-dark mb-1">
          Note (opzionale)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-brand-gray-medium bg-brand-gray placeholder-brand-gray-dark focus:outline-none focus:ring-2 focus:ring-brand-black/20"
          placeholder="Es. sostituzione, lezione extra..."
        />
      </div>

      {/* Feedback */}
      {message && (
        <p
          className={`text-sm text-center ${
            message.type === "success"
              ? "text-brand-success"
              : "text-brand-error"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl bg-brand-black text-white font-medium hover:bg-brand-black/90 active:scale-[0.98] transition disabled:opacity-50"
      >
        {saving ? "Salvataggio..." : "Salva lezione"}
      </button>
    </form>
  );
}
