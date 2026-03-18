import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HamburgerMenu from "@/components/layout/HamburgerMenu";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  if (role !== "admin") redirect("/ore");

  const istruttori = await prisma.user.findMany({
    where: { ruolo: { in: ["istruttore", "responsabile"] } },
    include: {
      tariffe: true,
      _count: { select: { registrazioniOre: true } },
    },
    orderBy: { cognome: "asc" },
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
          <HamburgerMenu />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Istruttori & Tariffe</h1>
          <Link
            href="/admin/istruttori/nuovo"
            className="px-4 py-2 rounded-xl bg-brand-black text-white text-sm font-medium hover:bg-brand-black/90 transition"
          >
            + Nuovo
          </Link>
        </div>

        {istruttori.map((ist) => (
          <Link
            key={ist.id}
            href={`/admin/istruttori/${ist.id}`}
            className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {ist.nome} {ist.cognome}
                </h3>
                <p className="text-xs text-brand-gray-dark">{ist.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {ist._count.registrazioniOre} lezioni
                </p>
                <p className="text-xs text-brand-gray-dark">
                  {ist.compensoFissoMensile
                    ? `€${ist.compensoFissoMensile}/mese`
                    : `${ist.tariffe.length} tariffe`}
                </p>
              </div>
            </div>

            {ist.compensoFissoMensile ? (
              <p className="text-xs text-brand-gray-dark mt-2">
                Compenso fisso mensile: €{ist.compensoFissoMensile}
              </p>
            ) : ist.tariffe.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {ist.tariffe.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-brand-gray text-brand-gray-dark"
                  >
                    {t.attivita}: €{t.compenso}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-error mt-2">
                Nessuna tariffa impostata
              </p>
            )}
          </Link>
        ))}

        {istruttori.length === 0 && (
          <p className="text-center text-brand-gray-dark text-sm py-8">
            Nessun istruttore registrato
          </p>
        )}
      </main>
    </div>
  );
}
