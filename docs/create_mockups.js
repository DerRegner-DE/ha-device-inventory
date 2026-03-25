const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, PageBreak,
  ShadingType, VerticalAlign, TableLayoutType, convertInchesToTwip,
  Header, Footer, PageNumber, NumberFormat,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ── Shared content ──────────────────────────────────────────────────────────

const featureRows = [
  ["Feature", "Free", "Pro"],
  ["Maximale Ger\u00e4te", "50", "Unbegrenzt"],
  ["Sprachen", "Nur Englisch", "DE, EN, ES, FR, RU"],
  ["QR-/Barcode-Scanner", "\u2013", "\u2713"],
  ["Kamera-Aufnahme", "\u2013", "\u2713"],
  ["Excel-Export", "\u2013", "\u2713"],
];

const sysRows = [
  ["Komponente", "Anforderung"],
  ["Home Assistant", "Version 2024.1 oder h\u00f6her"],
  ["Browser", "Chrome, Firefox, Safari (aktuell)"],
  ["Add-on Supervisor", "Erforderlich"],
];

const introText =
  "Die Ger\u00e4teverwaltung ist eine leistungsstarke Progressive Web App (PWA) f\u00fcr Home Assistant, " +
  "die als Add-on \u00fcber die Sidebar zug\u00e4nglich ist. Sie erm\u00f6glicht die vollst\u00e4ndige Verwaltung " +
  "aller Ger\u00e4te im Haushalt \u2013 von Smart-Home-Komponenten \u00fcber Elektroger\u00e4te bis hin zu " +
  "Werkzeugen und M\u00f6beln. Dank Offline-Modus und nativer Kamera-Unterst\u00fctzung eignet sie sich " +
  "ideal f\u00fcr die Inventarisierung vor Ort.";

const bullets = [
  "Vollst\u00e4ndige CRUD-Operationen f\u00fcr Ger\u00e4te mit Galerie-Bildauswahl",
  "Offline-f\u00e4hig dank Service-Worker und lokaler Datenhaltung",
  "QR-Code-Scanner mit automatischer Feld-Bef\u00fcllung (Pro)",
  "Mehrsprachig: Deutsch, Englisch, Spanisch, Franz\u00f6sisch, Russisch",
  "Nahtlose Integration in die Home Assistant Sidebar via Ingress",
];

// ── Helper: bordered table cell ─────────────────────────────────────────────

function cell(text, opts = {}) {
  const {
    bold = false,
    color = "000000",
    bgColor = null,
    font = "Calibri",
    size = 20,
    alignment = AlignmentType.LEFT,
    borderColor = "AAAAAA",
    width = undefined,
  } = opts;

  const shading = bgColor
    ? { type: ShadingType.CLEAR, fill: bgColor }
    : undefined;

  const borders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
  };

  return new TableCell({
    shading,
    borders,
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        alignment,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({ text, bold, color, font, size }),
        ],
      }),
    ],
  });
}

// ── Variant A: Elegant Dark ─────────────────────────────────────────────────

function buildVariantA() {
  const hdrBg = "1A1A1A";
  const hdrText = "C0C0C0";
  const headingColor = "2D2D2D";
  const bodyColor = "333333";
  const accentBorder = "A0A0A0";
  const lightBg = "F0F0F0";
  const font = "Calibri";

  function makeTable(rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: rows.map((r, ri) =>
        new TableRow({
          children: r.map((c) =>
            cell(c, {
              bold: ri === 0,
              color: ri === 0 ? hdrText : bodyColor,
              bgColor: ri === 0 ? hdrBg : ri % 2 === 0 ? lightBg : null,
              borderColor: accentBorder,
              font,
              size: ri === 0 ? 20 : 19,
            })
          ),
        })
      ),
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font, size: 20, color: bodyColor },
        },
      },
    },
    sections: [
      // Title page
      {
        properties: {},
        children: [
          new Paragraph({ spacing: { before: 4000 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "DER REGNER", font, size: 28, color: "999999", bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "\u2500".repeat(40), font, size: 18, color: accentBorder }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [
              new TextRun({ text: "GER\u00c4TEVERWALTUNG", font, size: 52, bold: true, color: hdrBg }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "Dokumentation", font, size: 28, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            children: [
              new TextRun({ text: "Version 1.3.8", font, size: 22, color: "888888" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: "\u00a9 2026 DerRegner-DE", font, size: 20, color: "888888" }),
            ],
          }),
        ],
      },
      // Content page
      {
        properties: {},
        children: [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "1. Einleitung", font, size: 32, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: introText, font, size: 20, color: bodyColor }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: "Features im \u00dcberblick", font, size: 26, bold: true, color: headingColor }),
            ],
          }),
          makeTable(featureRows),
          new Paragraph({ spacing: { before: 300, after: 100 } }),
          ...bullets.map(
            (b) =>
              new Paragraph({
                spacing: { before: 40, after: 40 },
                indent: { left: convertInchesToTwip(0.3) },
                children: [
                  new TextRun({ text: "\u25B8  ", font, size: 20, color: accentBorder }),
                  new TextRun({ text: b, font, size: 20, color: bodyColor }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "Systemanforderungen", font, size: 26, bold: true, color: headingColor }),
            ],
          }),
          makeTable(sysRows),
        ],
      },
    ],
  });
}

// ── Variant B: Silver Professional ──────────────────────────────────────────

function buildVariantB() {
  const hdrBg = "555555";
  const hdrText = "FFFFFF";
  const headingColor = "4A4A4A";
  const bodyColor = "222222";
  const accentBorder = "B0B0B0";
  const lightBg = "E8E8E8";
  const font = "Segoe UI";

  function makeTable(rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: rows.map((r, ri) =>
        new TableRow({
          children: r.map((c) =>
            cell(c, {
              bold: ri === 0,
              color: ri === 0 ? hdrText : bodyColor,
              bgColor: ri === 0 ? hdrBg : ri % 2 === 0 ? lightBg : null,
              borderColor: "888888",
              font,
              size: ri === 0 ? 21 : 19,
            })
          ),
        })
      ),
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font, size: 20, color: bodyColor },
        },
      },
    },
    sections: [
      // Title page
      {
        properties: {},
        children: [
          new Paragraph({ spacing: { before: 3600 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "DER REGNER", font, size: 24, color: "777777", bold: true, allCaps: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
            children: [
              new TextRun({ text: "Ger\u00e4teverwaltung", font, size: 48, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 2, color: accentBorder, space: 8 },
            },
            children: [
              new TextRun({ text: "Dokumentation & Benutzerhandbuch", font, size: 24, color: "666666" }),
            ],
          }),
          new Paragraph({ spacing: { before: 1200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Version 1.3.8  |  M\u00e4rz 2026", font, size: 20, color: "999999" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "\u00a9 2026 DerRegner-DE  \u2022  Alle Rechte vorbehalten", font, size: 18, color: "999999" }),
            ],
          }),
        ],
      },
      // Content page
      {
        properties: {},
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "1. Einleitung", font, size: 32, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 2, color: accentBorder, space: 6 },
            },
            spacing: { after: 250 },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: introText, font, size: 20, color: bodyColor }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 60 },
            children: [
              new TextRun({ text: "Features im \u00dcberblick", font, size: 26, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: accentBorder, space: 6 },
            },
            spacing: { after: 200 },
            children: [],
          }),
          makeTable(featureRows),
          new Paragraph({ spacing: { before: 300, after: 100 } }),
          ...bullets.map(
            (b) =>
              new Paragraph({
                spacing: { before: 50, after: 50 },
                indent: { left: convertInchesToTwip(0.35) },
                children: [
                  new TextRun({ text: "\u25CF  ", font, size: 18, color: hdrBg }),
                  new TextRun({ text: b, font, size: 20, color: bodyColor }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 400, after: 60 },
            children: [
              new TextRun({ text: "Systemanforderungen", font, size: 26, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: accentBorder, space: 6 },
            },
            spacing: { after: 200 },
            children: [],
          }),
          makeTable(sysRows),
        ],
      },
    ],
  });
}

// ── Variant C: Monochrome Bold ──────────────────────────────────────────────

function buildVariantC() {
  const hdrBg = "333333";
  const hdrText = "F0F0F0";
  const headingColor = "000000";
  const bodyColor = "000000";
  const altRowBg = "F5F5F5";
  const font = "Arial";

  function makeTable(rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      rows: rows.map((r, ri) =>
        new TableRow({
          children: r.map((c) =>
            cell(c, {
              bold: ri === 0,
              color: ri === 0 ? hdrText : bodyColor,
              bgColor: ri === 0 ? hdrBg : ri % 2 === 1 ? altRowBg : null,
              borderColor: "CCCCCC",
              font,
              size: ri === 0 ? 20 : 19,
            })
          ),
        })
      ),
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font, size: 20, color: bodyColor },
        },
      },
    },
    sections: [
      // Title page
      {
        properties: {},
        children: [
          new Paragraph({ spacing: { before: 4400 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "GER\u00c4TEVERWALTUNG", font, size: 60, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: "Dokumentation", font, size: 30, color: "555555" }),
            ],
          }),
          new Paragraph({ spacing: { before: 2000 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "DER REGNER", font, size: 20, bold: true, color: "444444" }),
              new TextRun({ text: "  \u2014  ", font, size: 20, color: "AAAAAA" }),
              new TextRun({ text: "Version 1.3.8", font, size: 20, color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "\u00a9 2026 DerRegner-DE", font, size: 18, color: "888888" }),
            ],
          }),
        ],
      },
      // Content page
      {
        properties: {},
        children: [
          new Paragraph({
            spacing: { after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: headingColor, space: 4 },
            },
            children: [
              new TextRun({ text: "1. Einleitung", font, size: 36, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 200, after: 300 },
            children: [
              new TextRun({ text: introText, font, size: 20, color: bodyColor }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555", space: 4 },
            },
            children: [
              new TextRun({ text: "Features im \u00dcberblick", font, size: 28, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({ spacing: { before: 100 } }),
          makeTable(featureRows),
          new Paragraph({ spacing: { before: 300, after: 100 } }),
          ...bullets.map(
            (b) =>
              new Paragraph({
                spacing: { before: 50, after: 50 },
                indent: { left: convertInchesToTwip(0.3) },
                children: [
                  new TextRun({ text: "\u2014  ", font, size: 20, bold: true, color: "555555" }),
                  new TextRun({ text: b, font, size: 20, color: bodyColor }),
                ],
              })
          ),
          new Paragraph({
            spacing: { before: 400, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555", space: 4 },
            },
            children: [
              new TextRun({ text: "Systemanforderungen", font, size: 28, bold: true, color: headingColor }),
            ],
          }),
          new Paragraph({ spacing: { before: 100 } }),
          makeTable(sysRows),
        ],
      },
    ],
  });
}

// ── Generate all 3 ──────────────────────────────────────────────────────────

async function main() {
  const outDir = path.join(__dirname);

  const variants = [
    { name: "Mockup_A_Elegant_Dark", build: buildVariantA },
    { name: "Mockup_B_Silver_Professional", build: buildVariantB },
    { name: "Mockup_C_Monochrome_Bold", build: buildVariantC },
  ];

  for (const v of variants) {
    const doc = v.build();
    const buf = await Packer.toBuffer(doc);
    const fp = path.join(outDir, `${v.name}.docx`);
    fs.writeFileSync(fp, buf);
    console.log(`Created: ${fp}`);
  }

  console.log("\nAll 3 mockups generated successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
