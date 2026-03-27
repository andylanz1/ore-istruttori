"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

type IstruttoreStats = {
  id: string;
  nome: string;
  cognome: string;
  ore: number;
  oreOsteo: number;
  compensoTotale: number;
  compensoOzone: number;
  compensoOsteo: number;
  compensoPerOra: number;
  mediaPartecipanti: number;
  riempimentoMedio: number;
  lezioniTotali: number;
};

type TrendEntry = Record<string, string | number>;
type TrendIstruttore = { id: string; nome: string };

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

export default function DashboardCharts({ istruttori }: { istruttori: IstruttoreStats[] }) {
  const [trend, setTrend] = useState<TrendEntry[]>([]);
  const [trendIstruttori, setTrendIstruttori] = useState<TrendIstruttore[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [selectedIst, setSelectedIst] = useState<string>("__all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/responsabile/analytics");
        if (res.ok) {
          const data = await res.json();
          setTrend(data.trend);
          setTrendIstruttori(data.istruttori);
        }
      } finally {
        setTrendLoading(false);
      }
    })();
  }, []);

  const withData = istruttori.filter((i) => i.ore > 0);

  // Data for bar charts
  const barData = [...withData]
    .sort((a, b) => b.compensoOzone - a.compensoOzone)
    .map((i) => ({
      nome: `${i.nome[0]}. ${i.cognome}`,
      nomeCompleto: `${i.nome} ${i.cognome}`,
      compenso: Math.round(i.compensoOzone),
      compensoOra: i.compensoPerOra,
      ore: i.ore,
      mediaPartecipanti: i.mediaPartecipanti,
      riempimento: i.riempimentoMedio,
    }));

  // Scatter: compenso/ora (X) vs riempimento (Y), bubble size = ore
  const scatterData = withData
    .filter((i) => i.compensoPerOra > 0 && i.riempimentoMedio > 0)
    .map((i, idx) => ({
      nome: `${i.nome} ${i.cognome}`,
      x: i.compensoPerOra,
      y: i.riempimentoMedio,
      z: i.ore,
      color: COLORS[idx % COLORS.length],
    }));

  // Pie: distribuzione compensi
  const pieData = [...withData]
    .filter((i) => i.compensoOzone > 0)
    .sort((a, b) => b.compensoOzone - a.compensoOzone)
    .map((i) => ({
      name: `${i.nome[0]}. ${i.cognome}`,
      value: Math.round(i.compensoOzone),
    }));

  // Trend: line data for selected instructor or total
  const trendLineData = trend.map((entry) => {
    if (selectedIst === "__all") {
      return { mese: entry.mese, valore: entry.totale as number };
    }
    return { mese: entry.mese, valore: (entry[selectedIst] as number) ?? 0 };
  });

  // Multi-line: all instructors
  const showAllLines = selectedIst === "__tutti";

  const CustomTooltipBar = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-brand-gray-medium rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-medium">{String(d.nomeCompleto || d.nome || d.name)}</p>
        {d.compenso !== undefined && <p>Compenso: {String(d.compenso)}EUR</p>}
        {d.compensoOra !== undefined && <p>EUR/h: {Number(d.compensoOra).toFixed(1)}</p>}
        {d.ore !== undefined && <p>Ore: {String(d.ore)}</p>}
        {d.mediaPartecipanti !== undefined && Number(d.mediaPartecipanti) > 0 && <p>Media part.: {Number(d.mediaPartecipanti).toFixed(1)}</p>}
        {d.riempimento !== undefined && Number(d.riempimento) > 0 && <p>Riempimento: {Number(d.riempimento).toFixed(0)}%</p>}
      </div>
    );
  };

  const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-brand-gray-medium rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-medium">{String(d.nome)}</p>
        <p>EUR/h: {Number(d.x).toFixed(1)}</p>
        <p>Riempimento: {Number(d.y).toFixed(0)}%</p>
        <p>Ore: {String(d.z)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* LINE: Trend compensi */}
      <ChartCard title="Andamento compensi nel tempo">
        {trendLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-dark" />
          </div>
        ) : trend.length === 0 ? (
          <p className="text-center text-brand-gray-dark py-6 text-sm">Nessun dato storico disponibile</p>
        ) : (
          <>
            <div className="px-4 pt-2 pb-1">
              <select
                value={selectedIst}
                onChange={(e) => setSelectedIst(e.target.value)}
                className="text-sm border border-brand-gray-medium rounded-lg px-3 py-1.5 bg-white w-full"
              >
                <option value="__all">Totale complessivo</option>
                <option value="__tutti">Tutti gli istruttori (confronto)</option>
                {trendIstruttori
                  .filter((i) => i.nome !== "Admin O-Zone")
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((i) => (
                    <option key={i.id} value={i.id}>{i.nome}</option>
                  ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {showAllLines ? (
                <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}EUR`} />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    formatter={(value, name) => {
                      const ist = trendIstruttori.find((i) => i.id === String(name));
                      return [`${value}EUR`, ist?.nome ?? String(name)];
                    }}
                  />
                  {trendIstruttori
                    .filter((i) => i.nome !== "Admin O-Zone")
                    .map((ist, idx) => (
                      <Line
                        key={ist.id}
                        type="monotone"
                        dataKey={ist.id}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                        name={ist.id}
                      />
                    ))}
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    formatter={(value: string) => {
                      const ist = trendIstruttori.find((i) => i.id === value);
                      return ist?.nome ?? value;
                    }}
                  />
                </LineChart>
              ) : (
                <LineChart data={trendLineData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}EUR`} />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    formatter={(value) => [`${value}EUR`, selectedIst === "__all" ? "Totale" : trendIstruttori.find((i) => i.id === selectedIst)?.nome ?? ""]}
                  />
                  <Line
                    type="monotone"
                    dataKey="valore"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: "#2563eb" }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </ChartCard>

      {withData.length === 0 ? (
        <p className="text-center text-brand-gray-dark py-8">Nessun dato del mese corrente per i grafici di performance</p>
      ) : (
        <>
          {/* Bar: Compenso totale per istruttore */}
          <ChartCard title="Compenso O-zone per istruttore">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}EUR`} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="compenso" radius={[6, 6, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Bar: Compenso/ora per istruttore */}
          <ChartCard title="Costo orario per istruttore (EUR/h)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[...barData].filter((d) => d.compensoOra > 0).sort((a, b) => b.compensoOra - a.compensoOra)}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="compensoOra" radius={[6, 6, 0, 0]}>
                  {[...barData].filter((d) => d.compensoOra > 0).sort((a, b) => b.compensoOra - a.compensoOra).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Scatter: Costo vs Valore */}
          {scatterData.length > 1 && (
            <ChartCard title="Costo vs Valore (EUR/h vs Riempimento %)">
              <p className="text-[10px] text-brand-gray-dark mb-2 px-4">
                In basso a destra = piu valore (costa poco, riempie molto). Dimensione = ore totali.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" dataKey="x" name="EUR/h" tick={{ fontSize: 11 }} label={{ value: "EUR/h", position: "bottom", fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Riempimento" tick={{ fontSize: 11 }} label={{ value: "Riemp. %", angle: -90, position: "insideLeft", fontSize: 11 }} />
                  <ZAxis type="number" dataKey="z" range={[100, 600]} name="Ore" />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {scatterData.map((d, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                    {d.nome}
                  </span>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Pie: Distribuzione compensi */}
          <ChartCard title="Distribuzione compensi O-zone">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}EUR`, "Compenso"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Bar: Media partecipanti */}
          <ChartCard title="Media partecipanti per lezione">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[...barData].filter((d) => d.mediaPartecipanti > 0).sort((a, b) => b.mediaPartecipanti - a.mediaPartecipanti)}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar dataKey="mediaPartecipanti" radius={[6, 6, 0, 0]}>
                  {[...barData].filter((d) => d.mediaPartecipanti > 0).sort((a, b) => b.mediaPartecipanti - a.mediaPartecipanti).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <h3 className="px-4 py-3 font-medium text-sm border-b border-brand-gray-medium">{title}</h3>
      <div className="p-2">{children}</div>
    </div>
  );
}
