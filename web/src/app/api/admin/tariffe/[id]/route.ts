import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/tariffe/[id] — aggiorna compenso
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { id } = await params;
  const { compenso } = await request.json();

  const tariffa = await prisma.tariffaIstruttore.update({
    where: { id },
    data: { compenso },
  });

  return NextResponse.json(tariffa);
}

// DELETE /api/admin/tariffe/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { id } = await params;

  await prisma.tariffaIstruttore.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
