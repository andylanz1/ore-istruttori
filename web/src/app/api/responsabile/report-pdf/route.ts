import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

const MESI_NOMI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MG = 40;
const W = PAGE_W - MG * 2;

// Safe text: no width/align (avoids pdfkit auto-pagination entirely)
function txt(
  doc: PDFKit.PDFDocument,
  str: string,
  x: number,
  y: number,
  opts?: { width?: number; align?: "left" | "center" | "right" }
) {
  let finalX = x;
  if (opts?.width && opts?.align) {
    const tw = doc.widthOfString(str);
    if (opts.align === "center") finalX = x + (opts.width - tw) / 2;
    else if (opts.align === "right") finalX = x + opts.width - tw;
  }
  // Never pass width/align to pdfkit — they trigger internal pagination
  doc.text(str, finalX, y, { lineBreak: false });
  doc.y = 0;
}

// Safe rect fill — reset cursor after
function box(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fill(color);
  doc.y = 0;
}

function rbox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number, color: string) {
  doc.roundedRect(x, y, w, h, r).fill(color);
  doc.y = 0;
}

function line(doc: PDFKit.PDFDocument, x: number, y: number, w: number, color: string) {
  doc.rect(x, y, w, 0.5).fill(color);
  doc.y = 0;
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

  for (let idx = 0; idx < instructors.length; idx++) {
    const lessons = instructors[idx][1];
    const ist = lessons[0].user!;
    const fullName = `${ist.nome} ${ist.cognome}`;

    drawInstructorPages(doc, fullName, meseNome, anno, lessons, idx + 1, instructors.length);
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

const COL = [85, 50, 180, 55];
const COL4_W = W - COL[0] - COL[1] - COL[2] - COL[3];
const LABELS = ["DATA", "ORA", "ATTIVITA", "PART.", "COMPENSO"];
const ALIGNS: ("left" | "center" | "right")[] = ["left", "left", "left", "center", "right"];
const ROW_H = 22;
const PAD = 8;

function drawInstructorPages(
  doc: PDFKit.PDFDocument,
  fullName: string,
  meseNome: string,
  anno: number,
  lessons: Lesson[],
  pageNum: number,
  totalPages: number,
) {
  doc.addPage({ size: "A4", margin: MG });
  doc.y = 0;

  // === HEADER ===
  box(doc, 0, 0, PAGE_W, 70, "#000000");

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff");
  txt(doc, "O-ZONE", MG + 8, 14);
  doc.font("Helvetica").fontSize(7).fillColor("#cccccc");
  txt(doc, "BENESSERE E MOVIMENTO SSD ARL", MG + 8, 38);

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff");
  txt(doc, `${meseNome.toUpperCase()} ${anno}`, PAGE_W - MG - 140, 14, { width: 140, align: "right" });

  doc.font("Helvetica").fontSize(8).fillColor("#cccccc");
  txt(doc, "RIEPILOGO ORE ISTRUTTORE", PAGE_W - MG - 140, 32, { width: 140, align: "right" });

  line(doc, 0, 70, PAGE_W, "#000000");

  let y = 86;

  // === INSTRUCTOR NAME ===
  box(doc, MG, y, W, 36, "#f0f0f0");
  box(doc, MG, y, 4, 36, "#000000");
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000000");
  txt(doc, fullName.toUpperCase(), MG + 16, y + 10);
  y += 50;

  // === TABLE HEADER ===
  y = drawHeader(doc, y);

  // === ROWS ===
  for (let ri = 0; ri < lessons.length; ri++) {
    if (y + ROW_H > PAGE_H - 130) {
      drawFooter(doc, meseNome, anno, pageNum, totalPages);
      doc.addPage({ size: "A4", margin: MG });
      doc.y = 0;
      y = MG;
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
      txt(doc, `${fullName} — continua`, MG + 4, y + 3);
      y += 22;
      y = drawHeader(doc, y);
    }

    const l = lessons[ri];
    const bg = ri % 2 === 0 ? "#ffffff" : "#f5f5f5";
    box(doc, MG, y, W, ROW_H, bg);

    const dataObj = new Date(l.data);
    const giorno = GIORNI[dataObj.getUTCDay()];
    const dataStr = `${giorno} ${String(dataObj.getUTCDate()).padStart(2, "0")}/${String(dataObj.getUTCMonth() + 1).padStart(2, "0")}`;

    let cx = MG + PAD;

    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    txt(doc, dataStr, cx, y + 6, { width: COL[0] - PAD });
    cx += COL[0];

    txt(doc, l.oraInizio, cx, y + 6, { width: COL[1] - PAD });
    cx += COL[1];

    doc.font("Helvetica-Bold");
    txt(doc, l.attivita, cx, y + 6, { width: COL[2] - PAD });
    cx += COL[2];

    doc.font("Helvetica");
    txt(doc, l.partecipanti !== null ? String(l.partecipanti) : "-", cx, y + 6, { width: COL[3] - PAD, align: "center" });
    cx += COL[3];

    if (l.compenso !== null && l.compenso > 0) {
      doc.font("Helvetica-Bold");
      txt(doc, `${l.compenso.toFixed(0)} EUR`, cx, y + 6, { width: COL4_W - PAD * 2, align: "right" });
    } else {
      txt(doc, "-", cx, y + 6, { width: COL4_W - PAD * 2, align: "right" });
    }

    y += ROW_H;
  }

  // Bottom border
  line(doc, MG, y, W, "#000000");
  y += 16;

  // === SUMMARY ===
  const totalCompenso = lessons.reduce((s, l) => s + (l.compenso ?? 0), 0);
  const compensoOsteo = lessons.filter((l) => l.attivita === "OSTEO").reduce((s, l) => s + (l.compenso ?? 0), 0);
  const compensoOzone = totalCompenso - compensoOsteo;
  const totalLezioni = lessons.length;
  const totalOre = lessons.reduce((s, l) => s + (l.attivita === "PT 30 Min" ? 0.5 : 1), 0);
  const totalPart = lessons.reduce((s, l) => s + (l.partecipanti ?? 0), 0);

  const hasOsteo = compensoOsteo > 0;
  const summaryH = hasOsteo ? 100 : 80;

  if (y + summaryH > PAGE_H - 50) {
    drawFooter(doc, meseNome, anno, pageNum, totalPages);
    doc.addPage({ size: "A4", margin: MG });
    doc.y = 0;
    y = MG;
  }

  box(doc, MG, y, W, summaryH, "#f0f0f0");
  box(doc, MG, y, 4, summaryH, "#000000");

  doc.roundedRect(MG + 1, y + 1, W - 2, summaryH - 2, 0).lineWidth(0.5).strokeColor("#cccccc").stroke();
  doc.y = 0;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
  txt(doc, "RIEPILOGO", MG + 16, y + 12);

  doc.font("Helvetica").fontSize(9).fillColor("#333333");
  const sy = y + 30;
  txt(doc, `${totalLezioni} lezioni`, MG + 16, sy);
  txt(doc, `${totalOre} ore`, MG + 120, sy);
  txt(doc, `${totalPart} partecipanti`, MG + 200, sy);

  line(doc, MG + 16, sy + 16, W - 32, "#cccccc");

  const iy = sy + 26;
  if (hasOsteo) {
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
    txt(doc, `FATTURA O-ZONE:  ${compensoOzone.toFixed(0)} EUR`, MG + 16, iy);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#444444");
    txt(doc, `FATTURA DIGIELLE (OSTEO):  ${compensoOsteo.toFixed(0)} EUR`, MG + 16, iy + 20);
  } else {
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000");
    txt(doc, `IMPORTO FATTURA:  ${compensoOzone.toFixed(0)} EUR`, MG + 16, iy);
  }

  drawFooter(doc, meseNome, anno, pageNum, totalPages);
}

function drawHeader(doc: PDFKit.PDFDocument, y: number): number {
  box(doc, MG, y, W, 22, "#000000");

  doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff");
  let cx = MG + PAD;
  const widths = [...COL, COL4_W];
  for (let i = 0; i < LABELS.length; i++) {
    txt(doc, LABELS[i], cx, y + 7, { width: widths[i] - PAD, align: ALIGNS[i] });
    cx += widths[i];
  }
  return y + 22;
}

function drawFooter(doc: PDFKit.PDFDocument, meseNome: string, anno: number, pageNum: number, totalPages: number) {
  const fy = PAGE_H - 30;
  line(doc, MG, fy - 4, W, "#cccccc");
  doc.font("Helvetica").fontSize(7).fillColor("#999999");
  txt(doc, `Generato il ${new Date().toLocaleDateString("it-IT")} — Riepilogo ${meseNome} ${anno}`, MG, fy, { width: W / 2 });
  txt(doc, `Pagina ${pageNum} di ${totalPages}`, MG + W / 2, fy, { width: W / 2, align: "right" });
}
