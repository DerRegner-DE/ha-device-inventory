const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, TableLayoutType,
  ShadingType, VerticalAlign, PageBreak, Tab, TabStopPosition, TabStopType,
  SectionType, convertInchesToTwip, convertMillimetersToTwip,
} = require("docx");

const logoBuffer = fs.readFileSync("C:/Users/Master/ClaudeHA/geraeteverwaltung/docs/logo.png");

// ── Color constants ──
const COL_BLACK     = "1A1A1A";
const COL_DARK_GRAY = "2D2D2D";
const COL_SILVER    = "C0C0C0";
const COL_GRAY      = "A0A0A0";
const COL_LIGHT_GRAY= "F0F0F0";
const COL_BODY      = "333333";
const COL_WHITE     = "FFFFFF";

// ── Reusable helpers ──
const FONT = "Arial";
const ptToHalfPt = (pt) => pt * 2;

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COL_GRAY } },
    children: [new TextRun({ text, font: FONT, size: ptToHalfPt(18), bold: true, color: COL_DARK_GRAY })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, font: FONT, size: ptToHalfPt(14), bold: true, color: COL_DARK_GRAY })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: FONT, size: ptToHalfPt(12), bold: true, color: COL_DARK_GRAY })],
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...(opts.paragraphOpts || {}),
    children: [new TextRun({ text, font: FONT, size: ptToHalfPt(10), color: COL_BODY, ...(opts.runOpts || {}) })],
  });
}

function bodyRuns(runs, pOpts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...pOpts,
    children: runs.map(r => {
      if (typeof r === "string") return new TextRun({ text: r, font: FONT, size: ptToHalfPt(10), color: COL_BODY });
      return new TextRun({ font: FONT, size: ptToHalfPt(10), color: COL_BODY, ...r });
    }),
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: ptToHalfPt(10), color: COL_BODY })],
  });
}

function numberedItem(num, text) {
  return bodyRuns([{ text: `${num}. `, bold: true }, text]);
}

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const SCREENSHOT_MAP = {
  "Add-on Store in Home Assistant": "de_addon_info.png",
  "Dashboard mit Geräteübersicht": "de_dashboard.png",
  "Geräteliste mit Filter": "de_geraete.png",
  "Formular zum Hinzufügen": "de_formular_ausgefuellt.png",
  "Einstellungen mit Lizenz und Sprache": "de_einstellungen.png",
  "Kamera-Dialog mit Optionen": "de_kamera.png",
  "QR-Scanner in Aktion": null,  // no screenshot available
};

function screenshotPlaceholder(desc) {
  const file = SCREENSHOT_MAP[desc];
  if (file) {
    const imgPath = path.join(SCREENSHOT_DIR, file);
    if (fs.existsSync(imgPath)) {
      const imgData = fs.readFileSync(imgPath);
      // Get PNG dimensions for correct aspect ratio
      const w = imgData.readUInt32BE(16);
      const h = imgData.readUInt32BE(20);
      const maxWidth = 450;
      const scale = maxWidth / w;
      const dispW = Math.round(w * scale);
      const dispH = Math.round(h * scale);
      return new Paragraph({
        spacing: { before: 150, after: 150 },
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: imgData, transformation: { width: dispW, height: dispH }, type: "png" })],
      });
    }
  }
  // Fallback: placeholder text
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    alignment: AlignmentType.CENTER,
    shading: { type: ShadingType.CLEAR, fill: COL_LIGHT_GRAY },
    children: [new TextRun({ text: `[Screenshot: ${desc}]`, font: FONT, size: ptToHalfPt(10), color: COL_GRAY, italics: true })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

// ── Table helpers ──
function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: COL_BLACK },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text, font: FONT, size: ptToHalfPt(10), bold: true, color: COL_SILVER })],
    })],
  });
}

function dataCell(text, widthPct, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, font: FONT, size: ptToHalfPt(10), color: COL_BODY, ...(opts.runOpts || {}) }));
  } else {
    // array of run objects
    text.forEach(r => runs.push(new TextRun({ font: FONT, size: ptToHalfPt(10), color: COL_BODY, ...r })));
  }
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    shading: opts.shading || undefined,
    children: [new Paragraph({
      spacing: { after: 0 },
      alignment: opts.alignment || AlignmentType.LEFT,
      children: runs,
    })],
  });
}

function centeredCell(text, widthPct, opts = {}) {
  return dataCell(text, widthPct, { ...opts, alignment: AlignmentType.CENTER });
}

function makeTable(headers, rows, colWidths) {
  const hRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => headerCell(h, colWidths[i])),
  });
  const dRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) => {
        const isStr = typeof cell === "string" || Array.isArray(cell);
        if (isStr) return dataCell(cell, colWidths[ci], {
          shading: ri % 2 === 1 ? { type: ShadingType.CLEAR, fill: "F8F8F8" } : undefined,
        });
        return cell; // already a TableCell
      }),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY },
      left: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY },
      right: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    },
    rows: [hRow, ...dRows],
  });
}

// ── Content header/footer for content sections ──
function contentHeader() {
  return new Header({
    children: [new Paragraph({
      spacing: { after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY } },
      children: [
        new TextRun({ text: "Ger\u00e4teverwaltung \u2013 Produktdokumentation", font: FONT, size: ptToHalfPt(8), color: COL_GRAY }),
        new TextRun({ text: "\t", font: FONT, size: ptToHalfPt(8) }),
        new TextRun({ text: "\t", font: FONT, size: ptToHalfPt(8) }),
        new ImageRun({ data: logoBuffer, transformation: { width: 38, height: 30 }, type: "png" }),
      ],
      tabStops: [
        { type: TabStopType.CENTER, position: convertInchesToTwip(3.25) },
        { type: TabStopType.RIGHT, position: convertInchesToTwip(6.5) },
      ],
    })],
  });
}

function contentFooter() {
  return new Footer({
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: COL_GRAY } },
      children: [
        new TextRun({ text: "\u00A9 2026 DerRegner-DE  \u2013  Seite ", font: FONT, size: ptToHalfPt(8), color: COL_GRAY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: ptToHalfPt(8), color: COL_GRAY }),
      ],
    })],
  });
}

// ────────────────────────────────────────────────────────
// SECTION 1: Title page
// ────────────────────────────────────────────────────────
const titleSection = {
  properties: {
    page: {
      margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
    },
  },
  children: [
    emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new ImageRun({ data: logoBuffer, transformation: { width: 200, height: 160 }, type: "png" })],
    }),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "GER\u00c4TEVERWALTUNG", font: FONT, size: ptToHalfPt(28), bold: true, color: COL_DARK_GRAY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COL_SILVER } },
      children: [],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: "Smart Home Device Inventory Management", font: FONT, size: ptToHalfPt(14), color: COL_GRAY, italics: true })],
    }),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Version 1.0", font: FONT, size: ptToHalfPt(12), color: COL_BODY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "Produktdokumentation", font: FONT, size: ptToHalfPt(12), color: COL_BODY })],
    }),
    emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "\u00A9 2026 DerRegner-DE", font: FONT, size: ptToHalfPt(10), color: COL_GRAY })],
    }),
  ],
};

// ────────────────────────────────────────────────────────
// SECTION 2: TOC + Content
// ────────────────────────────────────────────────────────
const contentChildren = [];

// ── TABLE OF CONTENTS ──
contentChildren.push(heading1("Inhaltsverzeichnis"));
const tocEntries = [
  ["1", "Einleitung"],
  ["2", "Features"],
  ["3", "Systemanforderungen"],
  ["4", "Installation"],
  ["5", "Aktualisierungen"],
  ["6", "Deinstallation"],
  ["7", "Erste Schritte"],
  ["8", "Geräte erfassen"],
  ["9", "Unterstützte Gerätetypen"],
  ["10", "Kamera & QR-Scanner"],
  ["11", "Lizenz & Pro-Upgrade"],
  ["12", "Einstellungen"],
  ["13", "Technische Hinweise"],
  ["14", "Rechtliche Hinweise"],
  ["15", "Support & Kontakt"],
];
tocEntries.forEach(([num, title]) => {
  contentChildren.push(bodyRuns([
    { text: `${num}.  `, bold: true },
    { text: title },
  ], { spacing: { after: 80 } }));
});

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 1. EINLEITUNG ──
contentChildren.push(heading1("1. Einleitung"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung ist ein leistungsf\u00e4higes Inventarsystem f\u00fcr Smart-Home-Ger\u00e4te, " +
  "das als Home Assistant Add-on direkt in Ihre bestehende Smart-Home-Zentrale integriert wird. " +
  "Mit der Ger\u00e4teverwaltung behalten Sie den \u00dcberblick \u00fcber alle vernetzten Ger\u00e4te in Ihrem Zuhause \u2013 " +
  "von Routern und Repeatern \u00fcber Sensoren und Aktoren bis hin zu Kameras und Sprachassistenten."
));
contentChildren.push(emptyLine());
contentChildren.push(heading2("F\u00fcr wen ist die Ger\u00e4teverwaltung?"));
contentChildren.push(bodyText(
  "Die Anwendung richtet sich an Smart-Home-Enthusiasten, Systemadministratoren und alle, " +
  "die eine strukturierte \u00dcbersicht \u00fcber ihre Ger\u00e4telandschaft ben\u00f6tigen. " +
  "Ob privates Heimnetzwerk mit wenigen Ger\u00e4ten oder komplexes Multi-Geb\u00e4ude-Setup \u2013 " +
  "die Ger\u00e4teverwaltung skaliert mit Ihren Anforderungen."
));
contentChildren.push(emptyLine());
contentChildren.push(heading2("Hauptmerkmale"));
contentChildren.push(bullet("Vollst\u00e4ndige Erfassung aller Smart-Home-Ger\u00e4te mit 22 vordefinierten Ger\u00e4tetypen"));
contentChildren.push(bullet("Netzwerk- und Standortinformationen (IP, MAC, Integration, Bereich)"));
contentChildren.push(bullet("Offline-f\u00e4hig dank Progressive Web App (PWA) und lokaler IndexedDB-Speicherung"));
contentChildren.push(bullet("Responsive Benutzeroberfl\u00e4che f\u00fcr Desktop und Mobilger\u00e4te"));
contentChildren.push(bullet("Nahtlose Integration in Home Assistant \u00fcber Sidebar und Ingress"));
contentChildren.push(bullet("Kamera-Aufnahme und QR-/Barcode-Scanner f\u00fcr schnelle Erfassung (Pro)"));
contentChildren.push(bullet("Export und Import via Excel f\u00fcr Datensicherung und Migration (Pro)"));
contentChildren.push(bullet("5 Sprachen: Deutsch, Englisch, Spanisch, Franz\u00f6sisch, Russisch (Pro)"));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 2. FEATURES ──
contentChildren.push(heading1("2. Features"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung ist in zwei Editionen verf\u00fcgbar: Die kostenlose Free-Version f\u00fcr den Einstieg " +
  "und die Pro-Version mit erweitertem Funktionsumfang f\u00fcr anspruchsvolle Nutzer."
));
contentChildren.push(emptyLine());

contentChildren.push(makeTable(
  ["Feature", "Free", "Pro (9,99 \u20ac)"],
  [
    ["Ger\u00e4te erfassen / bearbeiten / l\u00f6schen", "max. 50", "\u2713 unbegrenzt"],
    ["Dashboard mit Statistiken", "\u2713", "\u2713"],
    ["Suche & Filter nach Ger\u00e4tetyp", "\u2713", "\u2713"],
    ["Offline-Modus (IndexedDB)", "\u2713", "\u2713"],
    ["Responsive Design (Handy + Desktop)", "\u2713", "\u2713"],
    ["Progressive Web App (PWA)", "\u2713", "\u2713"],
    ["HA Sidebar-Integration (Ingress)", "\u2713", "\u2713"],
    ["Sprachen", "nur Englisch", "5 (DE, EN, ES, FR, RU)"],
    ["Kamera-Aufnahme", "\u2014", "\u2713"],
    ["QR-/Barcode-Scanner", "\u2014", "\u2713"],
    ["Foto-Speicherung pro Ger\u00e4t", "\u2014", "\u2713"],
    ["Excel Export / Import", "\u2014", "\u2713"],
    ["Home Assistant Sync (Bereiche)", "\u2014", "\u2713"],
  ],
  [50, 25, 25]
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 3. SYSTEMANFORDERUNGEN ──
contentChildren.push(heading1("3. Systemanforderungen"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung ist als Home Assistant Add-on konzipiert und ben\u00f6tigt eine kompatible HA-Installation."
));
contentChildren.push(emptyLine());

contentChildren.push(makeTable(
  ["Anforderung", "Details"],
  [
    ["Home Assistant", "Home Assistant OS oder Supervised Installation"],
    ["Architektur", "amd64 (64-Bit Intel/AMD)"],
    ["Browser", "Chrome, Firefox, Safari, Edge (aktuelle Version)"],
    ["Kamera/Scanner", "HTTPS erforderlich (z.\u202fB. \u00fcber Nabu Casa)"],
    ["Speicher", "Minimal (SQLite + IndexedDB)"],
  ],
  [35, 65]
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 4. INSTALLATION ──
contentChildren.push(heading1("4. Installation"));
contentChildren.push(bodyText(
  "Die Installation erfolgt direkt \u00fcber den Home Assistant Add-on Store. " +
  "Folgen Sie diesen Schritten, um die Ger\u00e4teverwaltung einzurichten:"
));
contentChildren.push(emptyLine());

const installSteps = [
  "\u00d6ffnen Sie Home Assistant und navigieren Sie zu Einstellungen \u2192 Add-ons.",
  "Klicken Sie auf \"Add-on Store\" (unten rechts).",
  "Suchen Sie nach \"Ger\u00e4teverwaltung\" oder f\u00fcgen Sie das Repository manuell hinzu:\nhttps://github.com/DerRegner-DE/ha-device-inventory",
  "Klicken Sie auf das Add-on und w\u00e4hlen Sie \"Installieren\".",
  "Aktivieren Sie die Option \"In Seitenleiste anzeigen\" f\u00fcr schnellen Zugriff.",
  "Starten Sie das Add-on \u00fcber die Schaltfl\u00e4che \"Starten\".",
  "Die Ger\u00e4teverwaltung ist nun \u00fcber die Seitenleiste erreichbar.",
];
installSteps.forEach((step, i) => {
  contentChildren.push(numberedItem(i + 1, step));
});

contentChildren.push(emptyLine());
contentChildren.push(screenshotPlaceholder("Add-on Store in Home Assistant"));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 5. AKTUALISIERUNGEN ──
contentChildren.push(heading1("5. Aktualisierungen"));
contentChildren.push(bodyText(
  "Wenn eine neue Version der Geräteverwaltung verfügbar ist, wird dies im Add-on-Bereich von Home Assistant angezeigt. " +
  "Sie können Updates manuell oder automatisch installieren:"
));
contentChildren.push(emptyLine());
contentChildren.push(bullet("Navigieren Sie zu Einstellungen → Add-ons → Geräteverwaltung."));
contentChildren.push(bullet("Ist ein Update verfügbar, erscheint eine Aktualisierungsschaltfläche."));
contentChildren.push(bullet("Alternativ aktivieren Sie \"Automatische Updates\" in den Add-on-Einstellungen."));
contentChildren.push(emptyLine());
contentChildren.push(bodyText(
  "Bei jedem Update wird ein Änderungsprotokoll (Changelog) bereitgestellt, " +
  "das alle Neuerungen und Fehlerbehebungen der jeweiligen Version auflistet. " +
  "Den Changelog erreichen Sie über den Link \"Änderungsprotokoll\" auf der Add-on-Infoseite."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 6. DEINSTALLATION ──
contentChildren.push(heading1("6. Deinstallation"));
contentChildren.push(bodyText(
  "Um die Geräteverwaltung zu entfernen:"
));
contentChildren.push(emptyLine());
contentChildren.push(numberedItem(1, "Navigieren Sie zu Einstellungen → Add-ons → Geräteverwaltung."));
contentChildren.push(numberedItem(2, "Klicken Sie auf \"Deinstallieren\" am unteren Rand der Seite."));
contentChildren.push(numberedItem(3, "Bestätigen Sie die Deinstallation."));
contentChildren.push(emptyLine());
contentChildren.push(bodyText(
  "Hinweis: Bei der Deinstallation werden alle lokal gespeicherten Gerätedaten auf dem Server gelöscht. " +
  "Im Browser gespeicherte Offline-Daten (IndexedDB) bleiben erhalten, bis der Browser-Cache geleert wird. " +
  "Erstellen Sie bei Bedarf vorher einen Excel-Export Ihrer Daten (Pro-Feature)."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 7. ERSTE SCHRITTE ──
contentChildren.push(heading1("7. Erste Schritte"));
contentChildren.push(bodyText(
  "Nach der Installation \u00f6ffnen Sie die Ger\u00e4teverwaltung \u00fcber die Home-Assistant-Seitenleiste. " +
  "Die Anwendung besteht aus vier Hauptbereichen:"
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("Dashboard"));
contentChildren.push(bodyText(
  "Das Dashboard zeigt eine \u00dcbersicht mit Statistiken: Gesamtanzahl der Ger\u00e4te, " +
  "Verteilung nach Ger\u00e4tetyp, Netzwerkverbindungen und Standorten. " +
  "So erkennen Sie auf einen Blick den Status Ihres Smart-Home-Inventars."
));
contentChildren.push(screenshotPlaceholder("Dashboard mit Ger\u00e4te\u00fcbersicht"));

contentChildren.push(heading2("Ger\u00e4teliste"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teliste zeigt alle erfassten Ger\u00e4te in einer \u00fcbersichtlichen Tabelle. " +
  "Nutzen Sie die Suchfunktion und die Filter nach Ger\u00e4tetyp, um schnell das gew\u00fcnschte Ger\u00e4t zu finden. " +
  "Jeder Eintrag kann direkt bearbeitet oder gel\u00f6scht werden."
));
contentChildren.push(screenshotPlaceholder("Ger\u00e4teliste mit Filter"));

contentChildren.push(heading2("Ger\u00e4t hinzuf\u00fcgen"));
contentChildren.push(bodyText(
  "\u00dcber die Schaltfl\u00e4che \"Ger\u00e4t hinzuf\u00fcgen\" \u00f6ffnet sich ein Formular mit allen verf\u00fcgbaren Feldern. " +
  "Pflichtfelder sind mit einem Sternchen (*) gekennzeichnet. " +
  "Die Felder sind in logische Gruppen unterteilt (siehe Kapitel 6)."
));
contentChildren.push(screenshotPlaceholder("Formular zum Hinzuf\u00fcgen"));

contentChildren.push(heading2("Einstellungen"));
contentChildren.push(bodyText(
  "In den Einstellungen konfigurieren Sie Sprache, Lizenz und Synchronisation. " +
  "Hier k\u00f6nnen Sie auch Ihren Pro-Lizenzschl\u00fcssel eingeben und die Datensynchronisation mit Home Assistant aktivieren."
));
contentChildren.push(screenshotPlaceholder("Einstellungen mit Lizenz und Sprache"));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 6. GERÄTE ERFASSEN ──
contentChildren.push(heading1("8. Ger\u00e4te erfassen"));
contentChildren.push(bodyText(
  "Beim Erfassen eines Ger\u00e4ts stehen Ihnen zahlreiche Felder zur Verf\u00fcgung, " +
  "die in sechs Gruppen organisiert sind. Pflichtfelder sind mit * markiert."
));
contentChildren.push(emptyLine());

// Grunddaten
contentChildren.push(heading2("Grunddaten"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Ger\u00e4tetyp *", "Auswahl aus 22 vordefinierten Typen"],
    ["Bezeichnung *", "Name des Ger\u00e4ts (z.\u202fB. \"FritzBox 6660 Cable\")"],
    ["Modell", "Modellbezeichnung des Herstellers"],
    ["Hersteller", "Name des Herstellers (z.\u202fB. \"AVM\")"],
  ],
  [30, 70]
));
contentChildren.push(emptyLine());

// Standort
contentChildren.push(heading2("Standort"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Bereich", "Standort aus Home Assistant Areas (mit Pro: automatisch synchronisiert)"],
  ],
  [30, 70]
));
contentChildren.push(emptyLine());

// Netzwerk & Strom
contentChildren.push(heading2("Netzwerk & Strom"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Integration", "Smart Home Integration (z.\u202fB. Zigbee2MQTT, Tuya, Fritz)"],
    ["Netzwerk", "WLAN, LAN, Zigbee, Bluetooth, DECT, Powerline, HomeMatic RF, USB"],
    ["Stromversorgung", "Netzteil, 230V, Batterie, Akku, USB, PoE, Solar, Starkstrom"],
    ["IP-Adresse", "Netzwerk-IP des Ger\u00e4ts (z.\u202fB. 192.168.178.1)"],
    ["MAC-Adresse", "Hardware-Adresse (z.\u202fB. AA:BB:CC:DD:EE:FF)"],
    ["Firmware", "Aktuelle Firmware-Version"],
  ],
  [30, 70]
));
contentChildren.push(emptyLine());

// Details
contentChildren.push(heading2("Details"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Seriennummer", "Seriennummer des Ger\u00e4ts"],
    ["Artikelnummer", "Artikelnummer oder Seriennummer des Herstellers"],
    ["Kaufdatum", "Datum der Anschaffung"],
    ["Garantie bis", "Ende der Garantiezeit"],
  ],
  [30, 70]
));
contentChildren.push(emptyLine());

// Home Assistant
contentChildren.push(heading2("Home Assistant"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Entity ID", "Home Assistant Entity-ID (z.\u202fB. light.wohnzimmer)"],
    ["Device ID", "Home Assistant Device-ID"],
  ],
  [30, 70]
));
contentChildren.push(emptyLine());

// Sonstiges
contentChildren.push(heading2("Sonstiges"));
contentChildren.push(makeTable(
  ["Feld", "Beschreibung"],
  [
    ["Funktion", "Wof\u00fcr wird das Ger\u00e4t verwendet?"],
    ["Notizen", "Weitere Hinweise und Anmerkungen"],
    ["Foto", "Ger\u00e4tebild per Kamera oder aus Galerie (Pro)"],
  ],
  [30, 70]
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 7. UNTERSTÜTZTE GERÄTETYPEN ──
contentChildren.push(heading1("9. Unterst\u00fctzte Ger\u00e4tetypen"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung unterst\u00fctzt 22 vordefinierte Ger\u00e4tetypen, " +
  "die das gesamte Spektrum eines modernen Smart Homes abdecken:"
));
contentChildren.push(emptyLine());

const deviceTypes = [
  "Router", "Repeater", "Powerline", "DECT Repeater",
  "Steckdose", "Lichtschalter", "Leuchtmittel", "Rollladen",
  "Thermostat", "Controller / Gateway", "Kamera", "T\u00fcrklingel",
  "Gong", "Sprachassistent", "Streaming", "Tablet",
  "Lautsprecher", "M\u00e4hroboter", "Drucker", "Sensor",
  "Smartphone", "Sonstiges",
];
deviceTypes.forEach(dt => contentChildren.push(bullet(dt)));

contentChildren.push(emptyLine());
contentChildren.push(bodyText(
  "Der Typ \"Sonstiges\" dient als Auffangkategorie f\u00fcr Ger\u00e4te, die keinem der vordefinierten Typen entsprechen."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 8. KAMERA & QR-SCANNER ──
contentChildren.push(heading1("10. Kamera & QR-Scanner"));
contentChildren.push(bodyText(
  "Mit der Pro-Version k\u00f6nnen Sie Ger\u00e4tefotos direkt \u00fcber die Kamera Ihres Ger\u00e4ts aufnehmen " +
  "und QR-Codes oder Barcodes scannen, um Ger\u00e4teinformationen automatisch zu \u00fcbernehmen."
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("Funktionsweise"));
contentChildren.push(bodyText(
  "Beim Hinzuf\u00fcgen oder Bearbeiten eines Ger\u00e4ts stehen Ihnen die Schaltfl\u00e4chen " +
  "\"Foto aufnehmen\" und \"QR-Code scannen\" zur Verf\u00fcgung. " +
  "Der QR-Scanner erkennt automatisch enthaltene Informationen und bef\u00fcllt die entsprechenden Formularfelder."
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("HTTPS-Voraussetzung"));
contentChildren.push(bodyText(
  "Die Kamera- und Scanner-Funktionen ben\u00f6tigen eine sichere HTTPS-Verbindung. " +
  "Dies ist eine Browser-Sicherheitsanforderung f\u00fcr den Zugriff auf Ger\u00e4tekameras. " +
  "Am einfachsten ist dies \u00fcber Nabu Casa (Home Assistant Cloud) zu realisieren."
));
contentChildren.push(emptyLine());

contentChildren.push(makeTable(
  ["Zugriff", "Kamera/Scanner", "Bildauswahl"],
  [
    ["HTTPS (Nabu Casa)", "\u2713 verf\u00fcgbar", "\u2713 verf\u00fcgbar"],
    ["HTTP (lokal)", "\u2014 nicht verf\u00fcgbar", "\u2713 verf\u00fcgbar"],
  ],
  [40, 30, 30]
));

contentChildren.push(emptyLine());
contentChildren.push(screenshotPlaceholder("Kamera-Dialog mit Optionen"));
contentChildren.push(screenshotPlaceholder("QR-Scanner in Aktion"));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 9. LIZENZ & PRO-UPGRADE ──
contentChildren.push(heading1("11. Lizenz & Pro-Upgrade"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung folgt einem Open-Core-Modell: Die Grundfunktionen stehen kostenlos zur Verf\u00fcgung, " +
  "w\u00e4hrend erweiterte Funktionen einen einmaligen Pro-Lizenzschl\u00fcssel erfordern."
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("Free-Version"));
contentChildren.push(bodyText(
  "Die Free-Version erm\u00f6glicht die Erfassung von bis zu 50 Ger\u00e4ten. " +
  "Alle Basisfunktionen wie Dashboard, Suche, Filter, Offline-Modus und die Sidebar-Integration " +
  "sind vollst\u00e4ndig nutzbar. Die Sprache ist auf Englisch beschr\u00e4nkt."
));

contentChildren.push(heading2("Pro-Version (9,99 \u20ac)"));
contentChildren.push(bodyText(
  "Mit dem Pro-Upgrade werden alle Beschr\u00e4nkungen aufgehoben: unbegrenzte Ger\u00e4teanzahl, " +
  "5 Sprachen, Kamera- und QR-Scanner-Funktionen, Foto-Speicherung, Excel-Export/Import " +
  "und die Synchronisation mit Home-Assistant-Bereichen."
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("Aktivierung"));
contentChildren.push(numberedItem(1, "\u00d6ffnen Sie die Einstellungen in der Ger\u00e4teverwaltung."));
contentChildren.push(numberedItem(2, "Geben Sie Ihren Lizenzschl\u00fcssel in das Feld \"Lizenzschl\u00fcssel\" ein."));
contentChildren.push(numberedItem(3, "Klicken Sie auf \"Aktivieren\"."));
contentChildren.push(numberedItem(4, "Die Pro-Funktionen sind sofort verf\u00fcgbar."));
contentChildren.push(emptyLine());
contentChildren.push(bodyText(
  "Der Lizenzschl\u00fcssel wird serverseitig auf Ihrer Home-Assistant-Instanz gespeichert " +
  "und erfordert keine Internetverbindung zur Validierung."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 10. EINSTELLUNGEN ──
contentChildren.push(heading1("12. Einstellungen"));

contentChildren.push(heading2("Sprache"));
contentChildren.push(bodyText(
  "In der Free-Version ist die Benutzeroberfl\u00e4che auf Englisch festgelegt. " +
  "Mit einer Pro-Lizenz stehen f\u00fcnf Sprachen zur Auswahl: Deutsch, Englisch, Spanisch, Franz\u00f6sisch und Russisch. " +
  "Die Sprachwahl wird sofort angewendet und im Browser gespeichert."
));

contentChildren.push(heading2("Synchronisation"));
contentChildren.push(bodyText(
  "Die Pro-Version bietet eine Synchronisation mit Home Assistant. " +
  "Dabei werden die in HA definierten Bereiche (Areas) automatisch als Standortauswahl " +
  "in der Ger\u00e4teverwaltung verf\u00fcgbar gemacht. " +
  "So m\u00fcssen Sie Raum- und Bereichszuordnungen nicht doppelt pflegen."
));

contentChildren.push(heading2("Datenexport"));
contentChildren.push(bodyText(
  "Mit der Pro-Version k\u00f6nnen Sie Ihren gesamten Ger\u00e4tebestand als Excel-Datei (.xlsx) exportieren. " +
  "Dies eignet sich f\u00fcr Datensicherung, Dokumentation oder die Migration auf ein anderes System. " +
  "Der Import erm\u00f6glicht das Wiederherstellen oder \u00dcbertragen von Ger\u00e4tedaten."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 11. TECHNISCHE HINWEISE ──
contentChildren.push(heading1("13. Technische Hinweise"));

contentChildren.push(heading2("HTTPS-Anforderung"));
contentChildren.push(bodyText(
  "Moderne Browser erfordern eine sichere HTTPS-Verbindung f\u00fcr den Zugriff auf Ger\u00e4tekameras " +
  "und bestimmte Web-APIs. Wenn Sie Home Assistant lokal \u00fcber HTTP nutzen, " +
  "sind die Kamera- und Scanner-Funktionen nicht verf\u00fcgbar. " +
  "Empfehlung: Nutzen Sie Nabu Casa (Home Assistant Cloud) f\u00fcr automatisches HTTPS."
));

contentChildren.push(heading2("Safari / iOS Einschr\u00e4nkungen"));
contentChildren.push(bodyText(
  "Safari auf iOS behandelt Ingress-iFrames restriktiver als andere Browser. " +
  "In bestimmten Konfigurationen kann der Kamerazugriff eingeschr\u00e4nkt sein. " +
  "F\u00fcr die beste Erfahrung empfehlen wir Google Chrome oder Firefox."
));

contentChildren.push(heading2("Offline-Modus"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung speichert Daten sowohl serverseitig (SQLite-Datenbank im Add-on) " +
  "als auch lokal im Browser (IndexedDB). " +
  "Bei Verbindungsverlust k\u00f6nnen Sie weiterhin auf Ihre Ger\u00e4tedaten zugreifen. " +
  "\u00c4nderungen werden synchronisiert, sobald die Verbindung wiederhergestellt ist."
));

contentChildren.push(heading2("Datenspeicherung"));
contentChildren.push(bodyText(
  "Alle Ger\u00e4tedaten werden ausschlie\u00dflich lokal gespeichert:"
));
contentChildren.push(bullet("Server: SQLite-Datenbank im Home Assistant Add-on Container"));
contentChildren.push(bullet("Client: IndexedDB im Browser f\u00fcr Offline-Zugriff und Zwischenspeicherung"));
contentChildren.push(bullet("Fotos: Serverseitig im Add-on-Verzeichnis"));
contentChildren.push(bodyText(
  "Es findet keine \u00dcbertragung an externe Server oder Drittanbieter statt."
));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 12. RECHTLICHE HINWEISE ──
contentChildren.push(heading1("14. Rechtliche Hinweise"));

contentChildren.push(heading2("Haftungsausschluss"));
contentChildren.push(bodyText(
  "Die Software \"Ger\u00e4teverwaltung\" wird \"wie besehen\" (as-is) bereitgestellt, ohne jegliche " +
  "ausdr\u00fcckliche oder stillschweigende Gew\u00e4hrleistung. Der Entwickler \u00fcbernimmt keine Haftung " +
  "f\u00fcr Sch\u00e4den, Datenverlust, Systemausf\u00e4lle oder sonstige Beeintr\u00e4chtigungen, " +
  "die durch die Nutzung oder Nichtverf\u00fcgbarkeit der Software entstehen."
));
contentChildren.push(bodyText(
  "Die Nutzung der Software erfolgt auf eigenes Risiko des Anwenders. " +
  "Dies gilt insbesondere, aber nicht ausschlie\u00dflich, f\u00fcr die Korrektheit der gespeicherten Daten, " +
  "die Verf\u00fcgbarkeit der Anwendung und die Kompatibilit\u00e4t mit Ihrem System."
));
contentChildren.push(emptyLine());

contentChildren.push(heading2("Datenschutz"));
contentChildren.push(bodyText(
  "Die Ger\u00e4teverwaltung wurde mit einem strikten Fokus auf Datenschutz und lokale Datenhaltung entwickelt:"
));
contentChildren.push(bullet("Alle Ger\u00e4tedaten werden ausschlie\u00dflich lokal gespeichert (Home Assistant Server und Browser IndexedDB)."));
contentChildren.push(bullet("Es erfolgt keine \u00dcbermittlung von Daten an Dritte."));
contentChildren.push(bullet("Die Lizenzpr\u00fcfung erfolgt vollst\u00e4ndig offline auf Ihrem Server."));
contentChildren.push(bullet("Es wird kein Tracking oder Analyse-Tool eingesetzt."));
contentChildren.push(bullet("Die Anwendung sammelt keine personenbezogenen Daten."));

contentChildren.push(new Paragraph({ children: [new PageBreak()] }));

// ── 13. SUPPORT & KONTAKT ──
contentChildren.push(heading1("15. Support & Kontakt"));
contentChildren.push(bodyText(
  "Bei Fragen, Fehlerberichten oder Verbesserungsvorschl\u00e4gen nutzen Sie bitte den Issue-Tracker auf GitHub:"
));
contentChildren.push(emptyLine());
contentChildren.push(bodyRuns([
  { text: "GitHub: ", bold: true },
  { text: "https://github.com/DerRegner-DE/ha-device-inventory", color: "2563EB" },
]));
contentChildren.push(emptyLine());
contentChildren.push(bodyText(
  "Dort finden Sie auch den Quellcode, die aktuelle Roadmap und k\u00f6nnen zur Weiterentwicklung beitragen."
));
contentChildren.push(emptyLine());
contentChildren.push(emptyLine());
contentChildren.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 400 },
  border: { top: { style: BorderStyle.SINGLE, size: 1, color: COL_SILVER } },
  children: [],
}));
contentChildren.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200 },
  children: [new TextRun({ text: "\u00A9 2026 DerRegner-DE \u2013 Alle Rechte vorbehalten.", font: FONT, size: ptToHalfPt(9), color: COL_GRAY, italics: true })],
}));

const contentSection = {
  properties: {
    type: SectionType.NEXT_PAGE,
    page: {
      margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
      pageNumbers: { start: 1 },
    },
  },
  headers: { default: contentHeader() },
  footers: { default: contentFooter() },
  children: contentChildren,
};

// ────────────────────────────────────────────────────────
// Build document
// ────────────────────────────────────────────────────────
const doc = new Document({
  creator: "DerRegner-DE",
  title: "Ger\u00e4teverwaltung \u2013 Produktdokumentation",
  description: "Smart Home Device Inventory Management \u2013 Version 1.0",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: ptToHalfPt(10), color: COL_BODY },
      },
    },
  },
  sections: [titleSection, contentSection],
});

(async () => {
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("C:/Users/Master/ClaudeHA/geraeteverwaltung/docs/Geraeteverwaltung_Dokumentation_DE.docx", buffer);
  console.log("Document created successfully (" + buffer.length + " bytes)");
})();
