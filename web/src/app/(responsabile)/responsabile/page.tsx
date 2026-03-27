"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import HamburgerMenu from "@/components/layout/HamburgerMenu";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/ui/DashboardCharts"), { ssr: false });

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
  oreOsteo: number;
  compensoTotale: number;
  compensoOzone: number;
  compensoOsteo: number;
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

type IstruttoreOption = {
  id: string;
  nome: string;
  cognome: string;
};

type DashboardData = {
  mese: number;
  anno: number;
  istruttori: IstruttoreStats[];
  istruttoriAttivi: IstruttoreOption[];
  turniDisponibili: number;
  controlloLezioni: ControlloLezione[];
  totali: {
    lezioni: number;
    compenso: number;
    compensoOzone: number;
    compensoDigielle: number;
    partecipanti: number;
    riempimentoMedio: number;
  };
};

type ReportLezione = {
  id: string;
  data: string;
  giornoSettimana: string;
  oraInizio: string;
  attivita: string;
  istruttore: { id: string; nome: string; cognome: string } | null;
  partecipanti: number | null;
  compenso: number | null;
  stato: string;
};

type GroupBy = "istruttore" | "giorno" | "attivita" | "giornoSettimana";

type SortKey = "cognome" | "lezioniTotali" | "ore" | "compensoTotale" | "compensoPerOra" | "mediaPartecipanti" | "riempimentoMedio";

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const GIORNI_ORD: Record<string, number> = { lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6, domenica: 7 };
const GIORNI_NOMI = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];

function giornoSettimanaFromData(dataStr: string): string {
  const d = new Date(dataStr + "T00:00:00");
  return GIORNI_NOMI[d.getDay()];
}

export default function ResponsabilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("cognome");
  const [sortAsc, setSortAsc] = useState(true);
  const [tab, setTab] = useState<"panoramica" | "classifiche" | "controllo" | "report" | "grafici">("panoramica");
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Report tab state
  const [reportData, setReportData] = useState<ReportLezione[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("istruttore");
  const [filtroIstruttore, setFiltroIstruttore] = useState("");
  const [filtroAttivita, setFiltroAttivita] = useState("");
  const [filtroGiorno, setFiltroGiorno] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Controllo tab filters
  const [filtroCtrlIstruttore, setFiltroCtrlIstruttore] = useState("");
  const [filtroCtrlAttivita, setFiltroCtrlAttivita] = useState("");
  const [filtroCtrlGiorno, setFiltroCtrlGiorno] = useState("");

  // Assegnazione turni
  const [assegnando, setAssegnando] = useState<string | null>(null); // lezioneId in corso
  const [erroreAssegnazione, setErroreAssegnazione] = useState<string | null>(null);

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

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/responsabile/report?mese=${mese}&anno=${anno}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json.lezioni);
        setOpenGroups(new Set());
      }
    } finally {
      setReportLoading(false);
    }
  }, [mese, anno]);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  useEffect(() => {
    if (status === "authenticated" && tab === "report" && reportData.length === 0) {
      fetchReport();
    }
  }, [status, tab, fetchReport, reportData.length]);

  const sendWhatsappReport = async () => {
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

  const assegnaTurno = async (lezioneId: string, userId: string) => {
    setAssegnando(lezioneId);
    setErroreAssegnazione(null);
    try {
      const res = await fetch("/api/responsabile/assegna-turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lezioneId, userId }),
      });
      if (res.ok) {
        await fetchData(); // refresh dashboard
      } else {
        const err = await res.json();
        setErroreAssegnazione(err.error || "Errore nell'assegnazione");
      }
    } catch {
      setErroreAssegnazione("Errore di rete");
    } finally {
      setAssegnando(null);
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
  const byCompenso = [...data.istruttori].filter(s => s.compensoOzone > 0).sort((a, b) => b.compensoOzone - a.compensoOzone);
  const byPartecipanti = [...data.istruttori].filter(s => s.mediaPartecipanti > 0).sort((a, b) => b.mediaPartecipanti - a.mediaPartecipanti);
  const byCompensoOra = [...data.istruttori].filter(s => s.ore > 0 && s.compensoPerOra > 0).sort((a, b) => b.compensoPerOra - a.compensoPerOra);
  const byRiempimento = [...data.istruttori].filter(s => s.riempimentoMedio > 0).sort((a, b) => b.riempimentoMedio - a.riempimentoMedio);

  // Control data
  const turni = data.controlloLezioni.filter(l => l.isTurno && l.stato === "da_confermare");
  const daConfermareAll = data.controlloLezioni.filter(l => !l.isTurno && l.stato === "da_confermare");
  const daConfermare = daConfermareAll.filter((l) => {
    if (filtroCtrlIstruttore && l.istruttore !== filtroCtrlIstruttore) return false;
    if (filtroCtrlAttivita && l.attivita !== filtroCtrlAttivita) return false;
    if (filtroCtrlGiorno && giornoSettimanaFromData(l.data) !== filtroCtrlGiorno) return false;
    return true;
  });
  const confermate = data.controlloLezioni.filter(l => l.stato === "confermato");

  // Unique values for controllo filters (from unfiltered daConfermare)
  const ctrlIstruttoriUnici = Array.from(new Set(daConfermareAll.map(l => l.istruttore).filter(Boolean) as string[])).sort();
  const ctrlAttivitaUniche = Array.from(new Set(daConfermareAll.map(l => l.attivita))).sort();
  const ctrlGiorniPresenti = Array.from(new Set(daConfermareAll.map(l => giornoSettimanaFromData(l.data))))
    .sort((a, b) => (GIORNI_ORD[a] ?? 99) - (GIORNI_ORD[b] ?? 99));

  const meseNome = MESI[mese - 1];

  // Report: filter + group
  const filteredReport = reportData.filter((l) => {
    if (filtroIstruttore && (l.istruttore ? l.istruttore.id : "__turno") !== filtroIstruttore) return false;
    if (filtroAttivita && l.attivita !== filtroAttivita) return false;
    if (filtroGiorno && l.giornoSettimana !== filtroGiorno) return false;
    return true;
  });

  const reportGroups = groupReportData(filteredReport, groupBy);
  const reportTotals = calcTotals(filteredReport);

  // Unique values for filters
  const istruttoriUnici = Array.from(
    new Map(
      reportData
        .filter((l) => l.istruttore)
        .map((l) => [l.istruttore!.id, l.istruttore!])
    ).values()
  ).sort((a, b) => a.cognome.localeCompare(b.cognome));

  const attivitaUniche = Array.from(new Set(reportData.map((l) => l.attivita))).sort();
  const giorniPresenti = Array.from(new Set(reportData.map((l) => l.giornoSettimana)))
    .sort((a, b) => (GIORNI_ORD[a] ?? 99) - (GIORNI_ORD[b] ?? 99));

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (openGroups.size === reportGroups.length) {
      setOpenGroups(new Set());
    } else {
      setOpenGroups(new Set(reportGroups.map((g) => g.key)));
    }
  };

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
            onChange={(e) => { setMese(parseInt(e.target.value)); setReportData([]); }}
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
          <KpiCard label="Compensi O-zone" value={`${data.totali.compensoOzone}EUR`} />
          {data.totali.compensoDigielle > 0 && (
            <KpiCard label="Compensi Digielle" value={`${data.totali.compensoDigielle}EUR`} subtitle="OSTEO" />
          )}
          <KpiCard label="Riempimento medio" value={`${data.totali.riempimentoMedio}%`} />
          <KpiCard label="Turni da coprire" value={String(data.turniDisponibili)} accent={data.turniDisponibili > 0} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {(["panoramica", "classifiche", "controllo", "report", ...(role === "admin" ? ["grafici" as const] : [])] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg capitalize transition-colors ${
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
                      {ist.compensoOzone > 0 ? `${ist.compensoOzone.toFixed(0)}EUR` : "-"}
                      {ist.compensoOsteo > 0 && (
                        <span className="block text-[10px] text-purple-600 font-normal">+{ist.compensoOsteo.toFixed(0)} Digielle</span>
                      )}
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
            <RankCard title="Piu compenso (O-zone)" items={byCompenso.slice(0, 5)} format={(s) => `${s.compensoOzone.toFixed(0)}EUR`} />
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
              <KpiCard label="Turni da coprire" value={String(turni.length)} accent={turni.length > 0} />
              <KpiCard label="Da confermare" value={String(daConfermareAll.length)} accent={daConfermareAll.length > 0} />
              <KpiCard label="Confermate" value={String(confermate.length)} />
            </div>

            {/* Turni da coprire */}
            {turni.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium bg-amber-50 text-amber-800">
                  Turni da coprire ({turni.length})
                </h3>
                {erroreAssegnazione && (
                  <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-b border-red-200">
                    {erroreAssegnazione}
                  </div>
                )}
                <div className="divide-y divide-brand-gray">
                  {turni.map((l) => (
                    <div key={l.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{l.data}</span>
                          <span className="text-brand-gray-dark ml-2">{l.oraInizio}</span>
                          <span className="ml-2">{l.attivita}</span>
                          {l.partecipanti !== null && (
                            <span className="text-brand-gray-dark ml-1">({l.partecipanti} pers)</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <select
                          disabled={assegnando === l.id}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) assegnaTurno(l.id, e.target.value);
                          }}
                          className="w-full text-sm border border-amber-300 rounded-lg px-3 py-1.5 bg-amber-50 text-amber-800 disabled:opacity-50"
                        >
                          <option value="">Assegna istruttore...</option>
                          {data.istruttoriAttivi.map((ist) => (
                            <option key={ist.id} value={ist.id}>
                              {ist.nome} {ist.cognome}
                            </option>
                          ))}
                        </select>
                        {assegnando === l.id && (
                          <p className="text-xs text-amber-600 mt-1">Assegnazione in corso...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Da confermare */}
            {daConfermareAll.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium bg-blue-50 text-blue-800">
                  Da confermare ({daConfermare.length}{daConfermare.length !== daConfermareAll.length ? ` di ${daConfermareAll.length}` : ""})
                </h3>
                {/* Filters */}
                <div className="px-4 py-3 border-b border-brand-gray-medium bg-blue-50/30">
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={filtroCtrlIstruttore}
                      onChange={(e) => setFiltroCtrlIstruttore(e.target.value)}
                      className="text-xs border border-brand-gray-medium rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="">Tutti</option>
                      {ctrlIstruttoriUnici.map((nome) => (
                        <option key={nome} value={nome}>{nome}</option>
                      ))}
                    </select>
                    <select
                      value={filtroCtrlAttivita}
                      onChange={(e) => setFiltroCtrlAttivita(e.target.value)}
                      className="text-xs border border-brand-gray-medium rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="">Tutte</option>
                      {ctrlAttivitaUniche.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <select
                      value={filtroCtrlGiorno}
                      onChange={(e) => setFiltroCtrlGiorno(e.target.value)}
                      className="text-xs border border-brand-gray-medium rounded-lg px-2 py-1.5 bg-white capitalize"
                    >
                      <option value="">Tutti</option>
                      {ctrlGiorniPresenti.map((g) => (
                        <option key={g} value={g} className="capitalize">{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-brand-gray">
                  {daConfermare.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                  {daConfermare.length === 0 && (
                    <p className="px-4 py-3 text-sm text-brand-gray-dark text-center">Nessun risultato per i filtri selezionati</p>
                  )}
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

        {/* Tab: Report */}
        {tab === "report" && (
          <div className="space-y-4">
            {reportLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-brand-gray-dark mb-1">Istruttore</label>
                      <select
                        value={filtroIstruttore}
                        onChange={(e) => setFiltroIstruttore(e.target.value)}
                        className="w-full text-sm border border-brand-gray-medium rounded-lg px-3 py-1.5 bg-white"
                      >
                        <option value="">Tutti</option>
                        <option value="__turno">Turni da coprire</option>
                        {istruttoriUnici.map((ist) => (
                          <option key={ist.id} value={ist.id}>
                            {ist.nome} {ist.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-gray-dark mb-1">Attivita</label>
                      <select
                        value={filtroAttivita}
                        onChange={(e) => setFiltroAttivita(e.target.value)}
                        className="w-full text-sm border border-brand-gray-medium rounded-lg px-3 py-1.5 bg-white"
                      >
                        <option value="">Tutte</option>
                        {attivitaUniche.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-brand-gray-dark mb-1">Giorno</label>
                      <select
                        value={filtroGiorno}
                        onChange={(e) => setFiltroGiorno(e.target.value)}
                        className="w-full text-sm border border-brand-gray-medium rounded-lg px-3 py-1.5 bg-white"
                      >
                        <option value="">Tutti</option>
                        {giorniPresenti.map((g) => (
                          <option key={g} value={g} className="capitalize">{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Group by toggle */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-brand-gray-dark">Raggruppa per:</span>
                    {([
                      ["istruttore", "Istruttore"],
                      ["giorno", "Giorno"],
                      ["attivita", "Servizio"],
                      ["giornoSettimana", "Giorno sett."],
                    ] as [GroupBy, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setGroupBy(value); setOpenGroups(new Set()); }}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          groupBy === value
                            ? "bg-brand-dark text-white"
                            : "bg-brand-gray text-brand-gray-dark hover:bg-brand-gray-medium"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grouped results */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-brand-gray-dark">
                      {filteredReport.length} lezioni in {reportGroups.length} gruppi
                    </span>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-brand-dark hover:underline"
                    >
                      {openGroups.size === reportGroups.length ? "Chiudi tutti" : "Apri tutti"}
                    </button>
                  </div>

                  {reportGroups.map((group) => (
                    <div key={group.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-brand-gray/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-brand-gray-dark">{openGroups.has(group.key) ? "\u25BE" : "\u25B8"}</span>
                          <span>{group.label}</span>
                        </div>
                        <div className="flex gap-4 text-xs text-brand-gray-dark">
                          <span>{group.numLezioni} lez</span>
                          <span>{group.ore}h</span>
                          {group.compenso > 0 && <span>{group.compenso.toFixed(0)}EUR</span>}
                        </div>
                      </button>

                      {openGroups.has(group.key) && (
                        <div className="divide-y divide-brand-gray border-t border-brand-gray-medium">
                          {group.lezioni.map((l) => (
                            <div key={l.id} className="flex items-center justify-between px-4 py-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <StatoBadge stato={l.stato} />
                                <span className="text-brand-gray-dark whitespace-nowrap">{l.data} {l.oraInizio}</span>
                                <span className="truncate">{l.attivita}</span>
                                {l.partecipanti !== null && (
                                  <span className="text-brand-gray-dark whitespace-nowrap">({l.partecipanti} pers)</span>
                                )}
                              </div>
                              <div className="text-right whitespace-nowrap ml-2">
                                {groupBy !== "istruttore" && (
                                  <span className="text-xs font-medium mr-2">
                                    {l.istruttore ? `${l.istruttore.nome} ${l.istruttore.cognome[0]}.` : "DA COPRIRE"}
                                  </span>
                                )}
                                {l.compenso !== null && l.compenso > 0 && (
                                  <span className="text-xs text-brand-gray-dark">{l.compenso.toFixed(0)}EUR</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Totale */}
                  {filteredReport.length > 0 && (
                    <div className="bg-brand-dark text-white rounded-2xl shadow-sm px-4 py-3 flex justify-between text-sm font-medium">
                      <span>TOTALE</span>
                      <div className="flex gap-4">
                        <span>{reportTotals.numLezioni} lez</span>
                        <span>{reportTotals.ore}h</span>
                        {reportTotals.compenso > 0 && <span>{reportTotals.compenso.toFixed(0)}EUR</span>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Grafici (solo admin) */}
        {tab === "grafici" && role === "admin" && (
          <DashboardCharts istruttori={data.istruttori} />
        )}

        {/* WhatsApp Report Button */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <button
            onClick={sendWhatsappReport}
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

// --- Helpers ---

function groupReportData(lezioni: ReportLezione[], groupBy: GroupBy) {
  const groups = new Map<string, { label: string; lezioni: ReportLezione[]; sortOrder: number }>();

  for (const l of lezioni) {
    let key: string;
    let label: string;
    let sortOrder: number;

    switch (groupBy) {
      case "istruttore":
        key = l.istruttore?.id ?? "__turno";
        label = l.istruttore ? `${l.istruttore.nome} ${l.istruttore.cognome}` : "Turni da coprire";
        sortOrder = l.istruttore ? l.istruttore.cognome.charCodeAt(0) : 9999;
        break;
      case "giorno":
        key = l.data;
        label = `${l.giornoSettimana} ${l.data.slice(8)}/${l.data.slice(5, 7)}`;
        sortOrder = new Date(l.data).getTime();
        break;
      case "attivita":
        key = l.attivita;
        label = l.attivita;
        sortOrder = l.attivita.charCodeAt(0);
        break;
      case "giornoSettimana":
        key = l.giornoSettimana;
        label = l.giornoSettimana.charAt(0).toUpperCase() + l.giornoSettimana.slice(1);
        sortOrder = GIORNI_ORD[l.giornoSettimana] ?? 99;
        break;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, lezioni: [], sortOrder });
    }
    groups.get(key)!.lezioni.push(l);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([key, g]) => ({
      key,
      label: g.label,
      lezioni: g.lezioni,
      ...calcTotals(g.lezioni),
    }));
}

function calcTotals(lezioni: ReportLezione[]) {
  const ore = lezioni.reduce((s, l) => s + (l.attivita === "PT 30 Min" ? 0.5 : 1), 0);
  const compenso = lezioni.reduce((s, l) => s + (l.compenso ?? 0), 0);
  return { numLezioni: lezioni.length, ore, compenso };
}

// --- Sub-components ---

function StatoBadge({ stato }: { stato: string }) {
  const cls =
    stato === "confermato"
      ? "bg-green-100 text-green-700"
      : stato === "da_confermare"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-500";
  const label =
    stato === "confermato" ? "OK" : stato === "da_confermare" ? "?" : stato;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, accent, subtitle }: { label: string; value: string; accent?: boolean; subtitle?: string }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm text-center ${accent ? "bg-amber-50 border border-amber-200" : "bg-white"}`}>
      <p className={`text-2xl font-bold ${accent ? "text-amber-700" : ""}`}>{value}</p>
      <p className="text-[11px] text-brand-gray-dark mt-1">{label}</p>
      {subtitle && <p className="text-[10px] text-purple-600 mt-0.5">{subtitle}</p>}
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
          <span className="text-xs text-amber-600 font-medium">DA COPRIRE</span>
        )}
        {lesson.compenso !== null && lesson.compenso > 0 && (
          <span className="text-xs text-brand-gray-dark ml-2">{lesson.compenso.toFixed(0)}EUR</span>
        )}
      </div>
    </div>
  );
}
