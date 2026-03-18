import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TariffeEditor from "@/components/ui/TariffeEditor";

export default async function IstruttoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  if (role !== "admin") redirect("/ore");

  const { id } = await params;

  const istruttore = await prisma.user.findUnique({
    where: { id },
    include: { tariffe: { orderBy: { attivita: "asc" } } },
  });

  if (!istruttore) redirect("/admin");

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="sticky top-0 z-40 bg-white border-b border-brand-gray-medium">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <a href="/admin" className="text-sm text-brand-gray-dark">
            ← Indietro
          </a>
          <span className="text-sm font-semibold">Tariffe</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold">
            {istruttore.nome} {istruttore.cognome}
          </h2>
          <p className="text-sm text-brand-gray-dark">{istruttore.email}</p>
        </div>

        <TariffeEditor
          userId={istruttore.id}
          tariffe={istruttore.tariffe.map((t) => ({
            id: t.id,
            attivita: t.attivita,
            compenso: t.compenso,
            compensoAlto: t.compensoAlto,
          }))}
        />
      </main>
    </div>
  );
}
