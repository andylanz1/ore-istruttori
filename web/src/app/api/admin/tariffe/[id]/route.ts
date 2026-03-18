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
  const body = await request.json();

  const data: { compenso?: number; compensoAlto?: number | null } = {};
  if (body.compenso !== undefined) data.compenso = body.compenso;
  if (body.compensoAlto !== undefined) data.compensoAlto = body.compensoAlto;

  const tariffa = await prisma.tariffaIstruttore.update({
    where: { id },
    data,
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
