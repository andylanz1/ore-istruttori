"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import HamburgerMenu from "@/components/layout/HamburgerMenu";

type IstruttoreStats = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  compensoFissoMensile: number | null;
  compensoStorico: number | null;
  lezioniTotali: number;
  lezioniConfermate: number;
  lezioniDaConfermare: number;
  ore: number;
  compensoTotale: number;
  compensoPerOra: number;
  totalePartecipanti: number;
  mediaPartecipanti: number;
  riempimentoMedio: number;
};

type ControlloLezione = {
  id: string;
  data: string;
  oraInizio: string;
  attivita: string;
  partecipanti: number | null;
  compenso: number | null;
  stato: string;
  sorgente: string;
  istruttore: string | null;
  isTurno: boolean;
};

type DashboardData = {
  mese: number;
  anno: number;
  istruttori: IstruttoreStats[];
  turniDisponibili: number;
  controlloLezioni: ControlloLezione[];
  totali: {
    lezioni: number;
    compenso: number;
    partecipanti: number;
    riempimentoMedio: number;
  };
};

type SortKey = "cognome" | "lezioniTotali" | "ore" | "compensoTotale" | "compensoPerOra" | "mediaPartecipanti" | "riempimentoMedio";

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export default function ResponsabilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("cognome");
  const [sortAsc, setSortAsc] = useState(true);
  const [tab, setTab] = useState<"panoramica" | "classifiche" | "controllo">("panoramica");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const now = new Date();
  const [mese, setMese] = useState(now.getMonth() + 1);
  const [anno] = useState(now.getFullYear());

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && role !== "responsabile" && role !== "admin") {
      router.push("/ore");
    }
  }, [status, role, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/responsabile/dashboard?mese=${mese}&anno=${anno}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [mese, anno]);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  const sendReport = async () => {
    setSendingReport(true);
    setReportSent(false);
    try {
      const res = await fetch("/api/responsabile/report-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mese, anno }),
      });
      if (res.ok) setReportSent(true);
    } finally {
      setSendingReport(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
      </div>
    );
  }

  if (!data) return null;

  // Sort
  const sorted = [...data.istruttori].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortKey === "cognome") return mul * a.cognome.localeCompare(b.cognome);
    return mul * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "cognome"); }
  };

  // Rankings
  const byOre = [...data.istruttori].filter(s => s.ore > 0).sort((a, b) => b.ore - a.ore);
  const byCompenso = [...data.istruttori].filter(s => s.compensoTotale > 0).sort((a, b) => b.compensoTotale - a.compensoTotale);
  const byPartecipanti = [...data.istruttori].filter(s => s.mediaPartecipanti > 0).sort((a, b) => b.mediaPartecipanti - a.mediaPartecipanti);
  const byCompensoOra = [...data.istruttori].filter(s => s.ore > 0 && s.compensoPerOra > 0).sort((a, b) => b.compensoPerOra - a.compensoPerOra);
  const byRiempimento = [...data.istruttori].filter(s => s.riempimentoMedio > 0).sort((a, b) => b.riempimentoMedio - a.riempimentoMedio);

  // Control data
  const turni = data.controlloLezioni.filter(l => l.isTurno && l.stato === "da_confermare");
  const daConfermare = data.controlloLezioni.filter(l => !l.isTurno && l.stato === "da_confermare");
  const confermate = data.controlloLezioni.filter(l => l.stato === "confermato");

  const meseNome = MESI[mese - 1];

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-gray-300 ml-0.5">&#x25B4;</span>;
    return <span className="ml-0.5">{sortAsc ? "\u25B4" : "\u25BE"}</span>;
  };

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="sticky top-0 z-40 bg-white border-b border-brand-gray-medium">
        <div className="flex items-center justify-between px-4 h-14 max-w-4xl mx-auto">
          <img
            src="https://images.squarespace-cdn.com/content/v1/59a8252ef14aa1d4753f773f/1505582501952-4GGS7SEZFFX11LO447W5/logo+ozone+sito.png"
            alt="O-Zone"
            className="h-8 object-contain"
          />
          <HamburgerMenu />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Header + Month selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard {meseNome} {anno}</h1>
          <select
            value={mese}
            onChange={(e) => setMese(parseInt(e.target.value))}
            className="text-sm border border-brand-gray-medium rounded-lg px-3 py-1.5 bg-white"
          >
            {MESI.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Lezioni totali" value={String(data.totali.lezioni)} />
          <KpiCard label="Compensi totali" value={`${data.totali.compenso}EUR`} />
          <KpiCard label="Riempimento medio" value={`${data.totali.riempimentoMedio}%`} />
          <KpiCard label="Turni scoperti" value={String(data.turniDisponibili)} accent={data.turniDisponibili > 0} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {(["panoramica", "classifiche", "controllo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                tab === t ? "bg-brand-dark text-white" : "text-brand-gray-dark hover:bg-brand-gray"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Panoramica */}
        {tab === "panoramica" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-brand-gray-medium text-brand-gray-dark">
                  <Th label="Istruttore" k="cognome" onSort={handleSort}><SortIcon k="cognome" /></Th>
                  <Th label="Lez" k="lezioniTotali" onSort={handleSort} center><SortIcon k="lezioniTotali" /></Th>
                  <Th label="Ore" k="ore" onSort={handleSort} center><SortIcon k="ore" /></Th>
                  <Th label="Compenso" k="compensoTotale" onSort={handleSort} right><SortIcon k="compensoTotale" /></Th>
                  <Th label="EUR/h" k="compensoPerOra" onSort={handleSort} right><SortIcon k="compensoPerOra" /></Th>
                  <Th label="Pers/lez" k="mediaPartecipanti" onSort={handleSort} center><SortIcon k="mediaPartecipanti" /></Th>
                  <Th label="Riemp%" k="riempimentoMedio" onSort={handleSort} center><SortIcon k="riempimentoMedio" /></Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((ist) => (
                  <tr key={ist.id} className="border-b border-brand-gray last:border-0 hover:bg-brand-gray/50">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{ist.nome} {ist.cognome}</span>
                      {ist.compensoStorico ? (
                        <span className="ml-1 text-[10px] text-blue-600 font-medium">STORICO</span>
                      ) : ist.compensoFissoMensile ? (
                        <span className="ml-1 text-[10px] text-amber-600 font-medium">FISSO</span>
                      ) : null}
                    </td>
                    <td className="text-center px-2 py-2.5">{ist.lezioniTotali}</td>
                    <td className="text-center px-2 py-2.5">{ist.ore}</td>
                    <td className="text-right px-3 py-2.5 font-medium">
                      {ist.compensoTotale > 0 ? `${ist.compensoTotale.toFixed(0)}EUR` : "-"}
                    </td>
                    <td className="text-right px-3 py-2.5 text-brand-gray-dark">
                      {ist.compensoPerOra > 0 ? `${ist.compensoPerOra.toFixed(1)}` : "-"}
                    </td>
                    <td className="text-center px-2 py-2.5">{ist.mediaPartecipanti > 0 ? ist.mediaPartecipanti.toFixed(1) : "-"}</td>
                    <td className="text-center px-2 py-2.5">
                      {ist.riempimentoMedio > 0 ? (
                        <span className={ist.riempimentoMedio >= 80 ? "text-green-600 font-medium" : ist.riempimentoMedio >= 50 ? "text-amber-600" : "text-red-500"}>
                          {ist.riempimentoMedio.toFixed(0)}%
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Classifiche */}
        {tab === "classifiche" && (
          <div className="space-y-3">
            <RankCard title="Piu ore" items={byOre.slice(0, 5)} format={(s) => `${s.ore}h`} />
            <RankCard title="Piu compenso" items={byCompenso.slice(0, 5)} format={(s) => `${s.compensoTotale.toFixed(0)}EUR`} />
            <RankCard title="Piu partecipanti (media)" items={byPartecipanti.slice(0, 5)} format={(s) => `${s.mediaPartecipanti.toFixed(1)}/lez`} />
            <RankCard title="Miglior compenso/ora" items={byCompensoOra.slice(0, 5)} format={(s) => `${s.compensoPerOra.toFixed(1)}EUR/h`} />
            <RankCard title="Miglior riempimento" items={byRiempimento.slice(0, 5)} format={(s) => `${s.riempimentoMedio.toFixed(0)}%`} />
          </div>
        )}

        {/* Tab: Controllo */}
        {tab === "controllo" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Turni scoperti" value={String(turni.length)} accent={turni.length > 0} />
              <KpiCard label="Da confermare" value={String(daConfermare.length)} accent={daConfermare.length > 0} />
              <KpiCard label="Confermate" value={String(confermate.length)} />
            </div>

            {/* Turni scoperti */}
            {turni.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium bg-amber-50 text-amber-800">
                  Turni scoperti ({turni.length})
                </h3>
                <div className="divide-y divide-brand-gray">
                  {turni.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                </div>
              </div>
            )}

            {/* Da confermare */}
            {daConfermare.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium bg-blue-50 text-blue-800">
                  Da confermare ({daConfermare.length})
                </h3>
                <div className="divide-y divide-brand-gray">
                  {daConfermare.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                </div>
              </div>
            )}

            {/* Confermate (collapsible) */}
            <details className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <summary className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium cursor-pointer hover:bg-brand-gray/50">
                Lezioni confermate ({confermate.length})
              </summary>
              <div className="divide-y divide-brand-gray max-h-96 overflow-y-auto">
                {confermate.map((l) => (
                  <LessonRow key={l.id} lesson={l} />
                ))}
              </div>
            </details>
          </div>
        )}

        {/* WhatsApp Report Button */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <button
            onClick={sendReport}
            disabled={sendingReport}
            className="w-full py-3 rounded-xl font-medium text-sm transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sendingReport
              ? "Invio in corso..."
              : reportSent
              ? "Report inviato via WhatsApp"
              : `Invia report ${meseNome} via WhatsApp`}
          </button>
          {reportSent && (
            <p className="text-center text-xs text-green-600 mt-2">
              Report inviato al tuo numero WhatsApp
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm text-center ${accent ? "bg-amber-50 border border-amber-200" : "bg-white"}`}>
      <p className={`text-2xl font-bold ${accent ? "text-amber-700" : ""}`}>{value}</p>
      <p className="text-[11px] text-brand-gray-dark mt-1">{label}</p>
    </div>
  );
}

function Th({ label, k, onSort, children, center, right }: {
  label: string; k: SortKey; onSort: (k: SortKey) => void; children: React.ReactNode; center?: boolean; right?: boolean;
}) {
  const align = right ? "text-right" : center ? "text-center" : "text-left";
  return (
    <th
      className={`${align} px-3 py-2.5 font-medium cursor-pointer select-none hover:text-brand-dark whitespace-nowrap`}
      onClick={() => onSort(k)}
    >
      {label}{children}
    </th>
  );
}

function RankCard({ title, items, format }: {
  title: string; items: IstruttoreStats[]; format: (s: IstruttoreStats) => string;
}) {
  if (items.length === 0) return null;
  const medals = ["", "", ""];
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium">{title}</h3>
      <div className="divide-y divide-brand-gray">
        {items.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg w-6 text-center">{medals[i] || `${i + 1}.`}</span>
              <span className="text-sm font-medium">{s.nome} {s.cognome}</span>
            </div>
            <span className="text-sm font-semibold text-brand-gray-dark">{format(s)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: ControlloLezione }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div>
        <span className="font-medium">{lesson.data}</span>
        <span className="text-brand-gray-dark ml-2">{lesson.oraInizio}</span>
        <span className="ml-2">{lesson.attivita}</span>
        {lesson.partecipanti !== null && (
          <span className="text-brand-gray-dark ml-1">({lesson.partecipanti} pers)</span>
        )}
      </div>
      <div className="text-right">
        {lesson.istruttore ? (
          <span className="text-xs font-medium">{lesson.istruttore}</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">SCOPERTO</span>
        )}
        {lesson.compenso !== null && lesson.compenso > 0 && (
          <span className="text-xs text-brand-gray-dark ml-2">{lesson.compenso.toFixed(0)}EUR</span>
        )}
      </div>
    </div>
  );
}
