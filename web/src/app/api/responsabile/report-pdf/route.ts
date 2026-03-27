import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

const MESI_NOMI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

// Brand colors
const C = {
  primary: "#1e3a5f",
  primaryLight: "#2a4a73",
  accent: "#2563eb",
  accentLight: "#dbeafe",
  green: "#059669",
  greenLight: "#d1fae5",
  purple: "#7c3aed",
  bg: "#f8fafc",
  bgAlt: "#f0f4f8",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
};

// A4
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; // margin
const W = PAGE_W - M * 2;

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

  // Group by instructor, sort alphabetically
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

  // --- PDF Generation ---
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true });
  const chunks: Uint8Array[] = [];
  doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

  const totalPages = instructors.length;

  for (let idx = 0; idx < instructors.length; idx++) {
    if (idx > 0) doc.addPage();

    const lessons = instructors[idx][1];
    const ist = lessons[0].user!;
    const fullName = `${ist.nome} ${ist.cognome}`;
    const pageNum = idx + 1;

    drawPage(doc, {
      fullName,
      meseNome,
      anno,
      lessons,
      pageNum,
      totalPages,
    });
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

function drawPage(
  doc: PDFKit.PDFDocument,
  opts: {
    fullName: string;
    meseNome: string;
    anno: number;
    lessons: Lesson[];
    pageNum: number;
    totalPages: number;
  }
) {
  const { fullName, meseNome, anno, lessons, pageNum, totalPages } = opts;

  // === DECORATIVE LEFT ACCENT ===
  doc.rect(0, 0, 6, PAGE_H).fill(C.accent);

  // === HEADER BAR ===
  doc.rect(6, 0, PAGE_W - 6, 85).fill(C.primary);
  // Subtle gradient overlay
  doc.rect(6, 65, PAGE_W - 6, 20).fill(C.primaryLight);

  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.white);
  doc.text("O-ZONE", M + 10, 18);
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
  doc.text("BENESSERE E MOVIMENTO SSD ARL", M + 10, 44);

  // Month badge (right side)
  const badgeText = `${meseNome.toUpperCase()} ${anno}`;
  const badgeW = 150;
  doc.roundedRect(PAGE_W - M - badgeW, 22, badgeW, 30, 15).fill(C.accent);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(C.white);
  doc.text(badgeText, PAGE_W - M - badgeW, 30, { width: badgeW, align: "center" });

  // Subtitle
  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1");
  doc.text("RIEPILOGO ORE ISTRUTTORE", M + 10, 60);

  let y = 105;

  // === INSTRUCTOR NAME ===
  doc.roundedRect(M, y, W, 44, 10).fill(C.accentLight);
  doc.rect(M, y, 5, 44).fill(C.accent);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(C.primary);
  doc.text(fullName.toUpperCase(), M + 18, y + 13);
  y += 62;

  // === TABLE ===
  const cols = [
    { label: "DATA", w: 85, align: "left" as const },
    { label: "ORA", w: 50, align: "left" as const },
    { label: "ATTIVITA", w: 180, align: "left" as const },
    { label: "PART.", w: 55, align: "center" as const },
    { label: "COMPENSO", w: W - 85 - 50 - 180 - 55, align: "right" as const },
  ];

  const ROW_H = 26;
  const PAD = 10;

  // Table header
  drawTableHeader(doc, y, cols);
  y += ROW_H;

  // Table rows
  for (let ri = 0; ri < lessons.length; ri++) {
    // Page break
    if (y + ROW_H > PAGE_H - 140) {
      // Footer on current page
      drawFooter(doc, meseNome, anno, pageNum, totalPages);
      doc.addPage();
      // Redraw accents on new page
      doc.rect(0, 0, 6, PAGE_H).fill(C.accent);
      y = M;
      // Continue header
      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.primary);
      doc.text(`${fullName} — continua`, M + 5, y + 3);
      y += 25;
      drawTableHeader(doc, y, cols);
      y += ROW_H;
    }

    const l = lessons[ri];
    const bg = ri % 2 === 0 ? C.white : C.bgAlt;

    // Row background
    doc.roundedRect(M, y, W, ROW_H, ri === lessons.length - 1 ? 4 : 0).fill(bg);
    // Actually, just use rect for rows
    doc.rect(M, y, W, ROW_H).fill(bg);

    const dataObj = new Date(l.data);
    const giorno = GIORNI[dataObj.getUTCDay()];
    const dataStr = `${giorno} ${String(dataObj.getUTCDate()).padStart(2, "0")}/${String(dataObj.getUTCMonth() + 1).padStart(2, "0")}`;

    doc.font("Helvetica").fontSize(9).fillColor(C.text);

    let cx = M + PAD;
    // Data
    doc.text(dataStr, cx, y + 8, { width: cols[0].w - PAD });
    cx += cols[0].w;
    // Ora
    doc.text(l.oraInizio, cx, y + 8, { width: cols[1].w - PAD });
    cx += cols[1].w;
    // Attivita
    doc.font("Helvetica-Bold").text(l.attivita, cx, y + 8, { width: cols[2].w - PAD });
    cx += cols[2].w;
    // Partecipanti
    doc.font("Helvetica");
    const partStr = l.partecipanti !== null ? String(l.partecipanti) : "-";
    doc.text(partStr, cx, y + 8, { width: cols[3].w - PAD, align: "center" });
    cx += cols[3].w;
    // Compenso
    if (l.compenso !== null && l.compenso > 0) {
      doc.font("Helvetica-Bold").fillColor(C.text);
      doc.text(`${l.compenso.toFixed(0)} EUR`, cx, y + 8, { width: cols[4].w - PAD * 2, align: "right" });
    } else {
      doc.font("Helvetica").fillColor(C.textMuted);
      doc.text("-", cx, y + 8, { width: cols[4].w - PAD * 2, align: "right" });
    }

    y += ROW_H;
  }

  // Bottom table border
  doc.rect(M, y, W, 2).fill(C.accent);
  y += 18;

  // === SUMMARY BOX ===
  const totalCompenso = lessons.reduce((s, l) => s + (l.compenso ?? 0), 0);
  const lezioniOsteo = lessons.filter((l) => l.attivita === "OSTEO");
  const compensoOsteo = lezioniOsteo.reduce((s, l) => s + (l.compenso ?? 0), 0);
  const compensoOzone = totalCompenso - compensoOsteo;
  const totalLezioni = lessons.length;
  const totalOre = lessons.reduce((s, l) => s + (l.attivita === "PT 30 Min" ? 0.5 : 1), 0);
  const totalPart = lessons.reduce((s, l) => s + (l.partecipanti ?? 0), 0);

  const hasOsteo = compensoOsteo > 0;
  const summaryH = hasOsteo ? 110 : 90;

  doc.roundedRect(M, y, W, summaryH, 10).fill(C.bg);
  doc.rect(M, y, 5, summaryH).fill(C.green);
  // Inner border
  doc.roundedRect(M + 1, y + 1, W - 2, summaryH - 2, 10).lineWidth(1).strokeColor(C.border).stroke();

  // Title
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.primary);
  doc.text("RIEPILOGO", M + 18, y + 14);

  // Stats row
  doc.font("Helvetica").fontSize(10).fillColor(C.text);
  const statsY = y + 34;
  doc.text(`${totalLezioni} lezioni`, M + 18, statsY);
  doc.text(`${totalOre} ore`, M + 130, statsY);
  doc.text(`${totalPart} partecipanti`, M + 220, statsY);

  // Divider
  doc.rect(M + 18, statsY + 18, W - 36, 1).fill(C.border);

  // Invoice amount
  const invoiceY = statsY + 28;
  if (hasOsteo) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.green);
    doc.text(`FATTURA O-ZONE:  ${compensoOzone.toFixed(0)} EUR`, M + 18, invoiceY);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.purple);
    doc.text(`FATTURA DIGIELLE (OSTEO):  ${compensoOsteo.toFixed(0)} EUR`, M + 18, invoiceY + 22);
  } else {
    doc.font("Helvetica-Bold").fontSize(14).fillColor(C.green);
    doc.text(`IMPORTO FATTURA:  ${compensoOzone.toFixed(0)} EUR`, M + 18, invoiceY);
  }

  // === FOOTER ===
  drawFooter(doc, meseNome, anno, pageNum, totalPages);
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number, cols: { label: string; w: number; align: string }[]) {
  // Header background with rounded top
  doc.roundedRect(M, y, W, 26, 6).fill(C.primary);
  // Cover bottom rounded corners
  doc.rect(M, y + 13, W, 13).fill(C.primary);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
  let cx = M + 10;
  for (const col of cols) {
    doc.text(col.label, cx, y + 9, {
      width: col.w - 10,
      align: col.align as "left" | "center" | "right",
    });
    cx += col.w;
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  meseNome: string,
  anno: number,
  pageNum: number,
  totalPages: number
) {
  const footerY = PAGE_H - 35;
  doc.rect(M, footerY - 5, W, 1).fill(C.border);
  doc.font("Helvetica").fontSize(7).fillColor(C.textMuted);
  doc.text(
    `Generato il ${new Date().toLocaleDateString("it-IT")} — Riepilogo ${meseNome} ${anno}`,
    M,
    footerY,
    { width: W / 2 }
  );
  doc.text(`Pagina ${pageNum} di ${totalPages}`, M + W / 2, footerY, {
    width: W / 2,
    align: "right",
  });
}
