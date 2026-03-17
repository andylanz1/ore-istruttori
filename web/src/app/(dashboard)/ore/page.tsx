"use client";

import { useState } from "react";
import OreForm from "@/components/ui/OreForm";
import OreList from "@/components/ui/OreList";

export default function OrePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Navigazione settimana
  const date = new Date(selectedDate + "T00:00:00");
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - ((date.getDay() + 6) % 7)); // lunedì

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  function prevWeek() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  function nextWeek() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const monthYear = date.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Month header + navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg hover:bg-white active:scale-95 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold capitalize">{monthYear}</h2>
        <button
          onClick={nextWeek}
          className="p-2 rounded-lg hover:bg-white active:scale-95 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Week day selector */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d, i) => {
          const dateStr = d.toISOString().split("T")[0];
          const isSelected = dateStr === selectedDate;
          const isToday =
            dateStr === new Date().toISOString().split("T")[0];

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center py-2 rounded-xl transition ${
                isSelected
                  ? "bg-brand-black text-white"
                  : isToday
                  ? "bg-white ring-1 ring-brand-black/20"
                  : "hover:bg-white"
              }`}
            >
              <span className="text-[10px] font-medium opacity-70">
                {dayNames[i]}
              </span>
              <span className="text-sm font-semibold mt-0.5">
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form inserimento */}
      <OreForm
        selectedDate={selectedDate}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      {/* Lista ore del giorno */}
      <OreList selectedDate={selectedDate} refreshKey={refreshKey} />
    </div>
  );
}
