import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

const MESI_NOMI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const C = {
  primary: "#1e3a5f",
  primaryLight: "#2a4a73",
  accent: "#2563eb",
  accentLight: "#dbeafe",
  green: "#059669",
  purple: "#7c3aed",
  bg: "#f8fafc",
  bgAlt: "#f0f4f8",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MG = 40;
const W = PAGE_W - MG * 2;

// Helper: text without auto-pagination
function t(
  doc: PDFKit.PDFDocument,
  str: string,
  x: number,
  y: number,
  opts?: { width?: number; align?: "left" | "center" | "right" }
) {
  doc.text(str, x, y, { ...opts, lineBreak: false });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "admin" && role !== "responsabile") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mese = parseInt(searchParams.get("mese") || String(new Date().getMonth() + 1));
  const anno = parseInt(searchParams.get("anno") || String(new Date().getFullYear()));
  const meseNome = MESI_NOMI[mese - 1] || "?";

  const startOfMonth = new Date(anno, mese - 1, 1);
  const endOfMonth = new Date(anno, mese, 1);

  const lezioni = await prisma.registrazioneOre.findMany({
    where: {
      data: { gte: startOfMonth, lt: endOfMonth },
      stato: { in: ["confermato", "da_confermare"] },
      userId: { not: null },
    },
    include: { user: { select: { id: true, nome: true, cognome: true } } },
    orderBy: [{ data: "asc" }, { oraInizio: "asc" }],
  });

  const byIst = new Map<string, typeof lezioni>();
  for (const l of lezioni) {
    if (!l.user) continue;
    if (!byIst.has(l.user.id)) byIst.set(l.user.id, []);
    byIst.get(l.user.id)!.push(l);
  }

  const instructors = Array.from(byIst.entries()).sort(
    (a, b) => a[1][0].user!.cognome.localeCompare(b[1][0].user!.cognome)
  );

  if (instructors.length === 0) {
    return NextResponse.json({ error: "Nessun dato per questo mese" }, { status: 404 });
  }

  const doc = new PDFDocument({ size: "A4", margin: MG, autoFirstPage: false });
  const chunks: Uint8Array[] = [];
  doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

  const totalPages = instructors.length;

  for (let idx = 0; idx < instructors.length; idx++) {
    doc.addPage({ size: "A4", margin: MG });

    const lessons = instructors[idx][1];
    const ist = lessons[0].user!;
    const fullName = `${ist.nome} ${ist.cognome}`;

    drawPage(doc, fullName, meseNome, anno, lessons, idx + 1, totalPages);
  }

  return new Promise<Response>((resolve) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new Response(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="riepilogo-ore-${meseNome.toLowerCase()}-${anno}.pdf"`,
            "Cache-Control": "no-store",
          },
        })
      );
    });
    doc.end();
  });
}

type Lesson = {
  data: Date;
  oraInizio: string;
  attivita: string;
  partecipanti: number | null;
  compenso: number | null;
  stato: string;
};

const COL_W = [85, 50, 180, 55, W - 85 - 50 - 180 - 55];
const COL_LABELS = ["DATA", "ORA", "ATTIVITA", "PART.", "COMPENSO"];
const COL_ALIGN: ("left" | "center" | "right")[] = ["left", "left", "left", "center", "right"];
const ROW_H = 26;
const PAD = 10;

function drawPage(
  doc: PDFKit.PDFDocument,
  fullName: string,
  meseNome: string,
  anno: number,
  lessons: Lesson[],
  pageNum: number,
  totalPages: number,
) {
  // === LEFT ACCENT ===
  doc.rect(0, 0, 6, PAGE_H).fill(C.accent);

  // === HEADER BAR ===
  doc.rect(6, 0, PAGE_W - 6, 85).fill(C.primary);
  doc.rect(6, 65, PAGE_W - 6, 20).fill(C.primaryLight);

  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.white);
  t(doc, "O-ZONE", MG + 10, 18);
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
  t(doc, "BENESSERE E MOVIMENTO SSD ARL", MG + 10, 44);

  // Month badge
  const badgeW = 150;
  doc.roundedRect(PAGE_W - MG - badgeW, 22, badgeW, 30, 15).fill(C.accent);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white);
  t(doc, `${meseNome.toUpperCase()} ${anno}`, PAGE_W - MG - badgeW, 30, { width: badgeW, align: "center" });

  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1");
  t(doc, "RIEPILOGO ORE ISTRUTTORE", MG + 10, 60);

  let y = 105;

  // === INSTRUCTOR NAME ===
  doc.roundedRect(MG, y, W, 44, 10).fill(C.accentLight);
  doc.rect(MG, y, 5, 44).fill(C.accent);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(C.primary);
  t(doc, fullName.toUpperCase(), MG + 18, y + 13);
  y += 62;

  // === TABLE HEADER ===
  drawTableHeader(doc, y);
  y += ROW_H;

  // === TABLE ROWS ===
  for (let ri = 0; ri < lessons.length; ri++) {
    if (y + ROW_H > PAGE_H - 140) {
      drawFooter(doc, meseNome, anno, pageNum, totalPages);
      doc.addPage({ size: "A4", margin: MG });
      doc.rect(0, 0, 6, PAGE_H).fill(C.accent);
      y = MG;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.primary);
      t(doc, `${fullName} — continua`, MG + 5, y + 3);
      y += 25;
      drawTableHeader(doc, y);
      y += ROW_H;
    }

    const l = lessons[ri];
    const bg = ri % 2 === 0 ? C.white : C.bgAlt;
    doc.rect(MG, y, W, ROW_H).fill(bg);

    const dataObj = new Date(l.data);
    const giorno = GIORNI[dataObj.getUTCDay()];
    const dataStr = `${giorno} ${String(dataObj.getUTCDate()).padStart(2, "0")}/${String(dataObj.getUTCMonth() + 1).padStart(2, "0")}`;

    let cx = MG + PAD;

    doc.font("Helvetica").fontSize(9).fillColor(C.text);
    t(doc, dataStr, cx, y + 8, { width: COL_W[0] - PAD });
    cx += COL_W[0];

    t(doc, l.oraInizio, cx, y + 8, { width: COL_W[1] - PAD });
    cx += COL_W[1];

    doc.font("Helvetica-Bold");
    t(doc, l.attivita, cx, y + 8, { width: COL_W[2] - PAD });
    cx += COL_W[2];

    doc.font("Helvetica");
    t(doc, l.partecipanti !== null ? String(l.partecipanti) : "-", cx, y + 8, { width: COL_W[3] - PAD, align: "center" });
    cx += COL_W[3];

    if (l.compenso !== null && l.compenso > 0) {
      doc.font("Helvetica-Bold").fillColor(C.text);
      t(doc, `${l.compenso.toFixed(0)} EUR`, cx, y + 8, { width: COL_W[4] - PAD * 2, align: "right" });
    } else {
      doc.fillColor(C.textMuted);
      t(doc, "-", cx, y + 8, { width: COL_W[4] - PAD * 2, align: "right" });
    }

    y += ROW_H;
  }

  // Bottom table border
  doc.rect(MG, y, W, 2).fill(C.accent);
  y += 18;

  // === SUMMARY ===
  const totalCompenso = lessons.reduce((s, l) => s + (l.compenso ?? 0), 0);
  const compensoOsteo = lessons.filter((l) => l.attivita === "OSTEO").reduce((s, l) => s + (l.compenso ?? 0), 0);
  const compensoOzone = totalCompenso - compensoOsteo;
  const totalLezioni = lessons.length;
  const totalOre = lessons.reduce((s, l) => s + (l.attivita === "PT 30 Min" ? 0.5 : 1), 0);
  const totalPart = lessons.reduce((s, l) => s + (l.partecipanti ?? 0), 0);

  const hasOsteo = compensoOsteo > 0;
  const summaryH = hasOsteo ? 110 : 90;

  // Check page break for summary
  if (y + summaryH > PAGE_H - 50) {
    drawFooter(doc, meseNome, anno, pageNum, totalPages);
    doc.addPage({ size: "A4", margin: MG });
    doc.rect(0, 0, 6, PAGE_H).fill(C.accent);
    y = MG;
  }

  doc.roundedRect(MG, y, W, summaryH, 10).fill(C.bg);
  doc.rect(MG, y, 5, summaryH).fill(C.green);
  doc.roundedRect(MG + 1, y + 1, W - 2, summaryH - 2, 10).lineWidth(1).strokeColor(C.border).stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.primary);
  t(doc, "RIEPILOGO", MG + 18, y + 14);

  doc.font("Helvetica").fontSize(10).fillColor(C.text);
  const statsY = y + 34;
  t(doc, `${totalLezioni} lezioni`, MG + 18, statsY);
  t(doc, `${totalOre} ore`, MG + 130, statsY);
  t(doc, `${totalPart} partecipanti`, MG + 220, statsY);

  doc.rect(MG + 18, statsY + 18, W - 36, 1).fill(C.border);

  const invoiceY = statsY + 28;
  if (hasOsteo) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.green);
    t(doc, `FATTURA O-ZONE:  ${compensoOzone.toFixed(0)} EUR`, MG + 18, invoiceY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.purple);
    t(doc, `FATTURA DIGIELLE (OSTEO):  ${compensoOsteo.toFixed(0)} EUR`, MG + 18, invoiceY + 22);
  } else {
    doc.font("Helvetica-Bold").fontSize(14).fillColor(C.green);
    t(doc, `IMPORTO FATTURA:  ${compensoOzone.toFixed(0)} EUR`, MG + 18, invoiceY);
  }

  drawFooter(doc, meseNome, anno, pageNum, totalPages);
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc.roundedRect(MG, y, W, 26, 6).fill(C.primary);
  doc.rect(MG, y + 13, W, 13).fill(C.primary);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
  let cx = MG + 10;
  for (let i = 0; i < COL_LABELS.length; i++) {
    t(doc, COL_LABELS[i], cx, y + 9, { width: COL_W[i] - 10, align: COL_ALIGN[i] });
    cx += COL_W[i];
  }
}

function drawFooter(doc: PDFKit.PDFDocument, meseNome: string, anno: number, pageNum: number, totalPages: number) {
  const footerY = PAGE_H - 35;
  doc.rect(MG, footerY - 5, W, 1).fill(C.border);
  doc.font("Helvetica").fontSize(7).fillColor(C.textMuted);
  t(doc, `Generato il ${new Date().toLocaleDateString("it-IT")} — Riepilogo ${meseNome} ${anno}`, MG, footerY, { width: W / 2 });
  t(doc, `Pagina ${pageNum} di ${totalPages}`, MG + W / 2, footerY, { width: W / 2, align: "right" });
}
