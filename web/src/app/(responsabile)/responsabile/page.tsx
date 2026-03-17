import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ResponsabilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  if (role !== "responsabile" && role !== "admin") redirect("/ore");

  // Tutti gli istruttori con le loro lezioni del mese
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const istruttori = await prisma.user.findMany({
    where: { ruolo: "istruttore", attivo: true },
    include: {
      registrazioniOre: {
        where: { data: { gte: startOfMonth } },
      },
    },
    orderBy: { cognome: "asc" },
  });

  const meseNome = now.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="sticky top-0 z-40 bg-white border-b border-brand-gray-medium">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <img
            src="https://images.squarespace-cdn.com/content/v1/59a8252ef14aa1d4753f773f/1505582501952-4GGS7SEZFFX11LO447W5/logo+ozone+sito.png"
            alt="O-Zone"
            className="h-8 object-contain"
          />
          <span className="text-sm text-brand-gray-dark">
            Dashboard Responsabile
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <h1 className="text-lg font-semibold capitalize">
          Riepilogo {meseNome}
        </h1>

        {/* Tabella istruttori */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray-medium text-brand-gray-dark">
                <th className="text-left px-4 py-3 font-medium">Istruttore</th>
                <th className="text-center px-3 py-3 font-medium">Lezioni</th>
                <th className="text-right px-4 py-3 font-medium">Compenso</th>
              </tr>
            </thead>
            <tbody>
              {istruttori.map((ist) => {
                const lezioni = ist.registrazioniOre.length;
                const compenso = ist.registrazioniOre.reduce(
                  (s, r) => s + (r.compenso ?? 0),
                  0
                );
                return (
                  <tr
                    key={ist.id}
                    className="border-b border-brand-gray last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {ist.nome} {ist.cognome}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3">{lezioni}</td>
                    <td className="text-right px-4 py-3 font-medium">
                      {compenso > 0
                        ? `€${compenso.toFixed(0)}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {istruttori.length === 0 && (
          <p className="text-center text-brand-gray-dark text-sm py-8">
            Nessun istruttore registrato
          </p>
        )}

        {/* Totali */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold">
              {istruttori.reduce(
                (s, i) => s + i.registrazioniOre.length,
                0
              )}
            </p>
            <p className="text-xs text-brand-gray-dark mt-1">
              Lezioni totali mese
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold">
              {istruttori.filter((i) => i.registrazioniOre.length > 0).length}/
              {istruttori.length}
            </p>
            <p className="text-xs text-brand-gray-dark mt-1">
              Istruttori attivi
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
