const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, TableOfContents, ExternalHyperlink,
  LevelFormat
} = require("docx");

// ---- Styling Constants ----
const PRIMARY = "1B4F72";
const ACCENT = "2E86C1";
const LIGHT_BG = "EBF5FB";
const GRAY_BG = "F2F3F4";
const WHITE = "FFFFFF";
const BLACK = "000000";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// ---- Helper functions ----
function heading(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22, color: PRIMARY })]
  });
}

function para(text, opts = {}) {
  const runs = [];
  if (typeof text === "string") {
    runs.push(new TextRun({ text, font: "Arial", size: 21, color: "333333", ...opts }));
  } else {
    text.forEach(t => runs.push(new TextRun({ font: "Arial", size: 21, color: "333333", ...t })));
  }
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

function bulletItem(text, bold_prefix = null) {
  const children = [];
  if (bold_prefix) {
    children.push(new TextRun({ text: bold_prefix, font: "Arial", size: 21, bold: true, color: "333333" }));
  }
  children.push(new TextRun({ text, font: "Arial", size: 21, color: "333333" }));
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children
  });
}

function bulletItemL2(text) {
  return new Paragraph({
    numbering: { reference: "bullets2", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: "333333" })]
  });
}

function screenshotPlaceholder(description) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { fill: GRAY_BG, type: ShadingType.CLEAR },
    children: [new TextRun({ text: `[Screenshot: ${description}]`, font: "Arial", size: 20, italics: true, color: "888888" })]
  });
}

function makeHeaderCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: PRIMARY, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: WHITE })] })]
  });
}

function makeCell(text, width, shading = null) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, color: "333333" })] })]
  });
}

function makeCellBold(text, width, shading = null) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: true, color: "333333" })] })]
  });
}

function checkCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, font: "Arial", size: 20, color: "333333" })] })]
  });
}

function numberedItem(refName, runs) {
  return new Paragraph({
    numbering: { reference: refName, level: 0 },
    spacing: { after: 80 },
    children: runs.map(r => new TextRun({ font: "Arial", size: 21, color: "333333", ...r }))
  });
}

function spacer(after = 120) {
  return new Paragraph({ spacing: { after } });
}

// ---- Build Document ----
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 21 } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: PRIMARY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: PRIMARY },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "bullets2",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers2",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers3",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [
    // ===== TITLE PAGE =====
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "GERÄTEVERWALTUNG", font: "Arial", size: 52, bold: true, color: PRIMARY })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Smart Home Device Inventory Management", font: "Arial", size: 28, color: ACCENT })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Home Assistant Add-on", font: "Arial", size: 24, color: "666666" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: ACCENT, space: 10 } },
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: "Version 1.3.8", font: "Arial", size: 24, color: "555555" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Produktdokumentation", font: "Arial", size: 22, color: "777777" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 2000 },
          children: [new TextRun({ text: "Deutsch", font: "Arial", size: 20, color: "999999" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u00A9 2026 DerRegner-DE", font: "Arial", size: 20, color: "999999" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ExternalHyperlink({
            link: "https://github.com/DerRegner-DE/ha-device-inventory",
            children: [new TextRun({ text: "github.com/DerRegner-DE/ha-device-inventory", font: "Arial", size: 18, color: ACCENT, underline: {} })]
          })]
        }),
      ]
    },

    // ===== MAIN CONTENT =====
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: ACCENT, space: 4 } },
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Geräteverwaltung ", font: "Arial", size: 16, bold: true, color: PRIMARY }),
              new TextRun({ text: "| Dokumentation v1.3.8", font: "Arial", size: 16, color: "999999" }),
            ]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Seite ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
            ]
          })]
        })
      },
      children: [
        // ===== TABLE OF CONTENTS =====
        heading("Inhaltsverzeichnis", HeadingLevel.HEADING_1),
        new TableOfContents("Inhaltsverzeichnis", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ===== 1. EINLEITUNG / ÜBERBLICK =====
        heading("1. Einleitung", HeadingLevel.HEADING_1),
        para("Die Geräteverwaltung ist eine Offline-First Progressive Web App (PWA) zur vollständigen Erfassung und Verwaltung aller Smart Home Geräte. Als Home Assistant Add-on integriert sie sich nahtlos in die Sidebar und bietet eine komfortable Oberfläche für die Inventarisierung sämtlicher Geräte in Ihrem Zuhause."),
        para("Mit der App behalten Sie den Überblick über Ihr gesamtes Smart Home Inventar \u2013 inklusive Netzwerkinformationen, Standorten, Garantiedaten und Fotos. Dank Offline-Modus funktioniert die App auch ohne aktive Serververbindung."),
        spacer(),

        heading("Für wen ist die App?", HeadingLevel.HEADING_2),
        bulletItem("Smart Home Besitzer, die den Überblick über alle Geräte behalten möchten"),
        bulletItem("Techniker und Administratoren, die Netzwerk- und Geräteinformationen dokumentieren"),
        bulletItem("Hausverwalter mit mehreren Gebäuden oder Mieteinheiten"),
        bulletItem("Jeder, der Garantiezeiten, Seriennummern und Kaufdaten zentral verwalten möchte"),
        spacer(),

        heading("Hauptmerkmale", HeadingLevel.HEADING_2),
        bulletItem("Geräte anlegen, bearbeiten, suchen und löschen", "Vollständige Verwaltung: "),
        bulletItem("mit automatischer Synchronisation", "Offline-Modus: "),
        bulletItem("Englisch (Free) + 4 weitere Sprachen mit Pro (DE, ES, FR, RU)", "Mehrsprachig: "),
        bulletItem("mit automatischer Feld-Befüllung (Pro)", "QR-/Barcode-Scanner: "),
        bulletItem("direkt aus der App heraus (Pro)", "Kamera-Aufnahme: "),
        bulletItem("für Gerätedaten (Pro)", "Excel Export/Import: "),
        bulletItem("für Handy und Desktop", "Responsive Design: "),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 2. FEATURES =====
        heading("2. Features", HeadingLevel.HEADING_1),
        heading("Free vs. Pro im Vergleich", HeadingLevel.HEADING_2),
        para("Die Geräteverwaltung ist in zwei Varianten verfügbar:"),
        spacer(),

        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4513, 2256, 2257],
          rows: [
            new TableRow({ children: [
              makeHeaderCell("Feature", 4513),
              makeHeaderCell("Free", 2256),
              makeHeaderCell("Pro (9,99 \u20AC)", 2257),
            ]}),
            new TableRow({ children: [ makeCellBold("Geräte erfassen / bearbeiten / löschen", 4513), checkCell("max. 50", 2256), checkCell("\u2713 unbegrenzt", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Dashboard mit Statistiken", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Suche & Filter", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Offline-Modus (PWA)", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Responsive Design (Handy + Desktop)", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Home Assistant Sidebar-Integration", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Sprachen", 4513), checkCell("nur Englisch", 2256), checkCell("5 (DE, EN, ES, FR, RU)", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Kamera-Aufnahme", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("QR-/Barcode-Scanner mit Feld-Befüllung", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Foto pro Gerät", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Excel Export / Import", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Home Assistant Sync (Bereiche)", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
          ]
        }),

        spacer(),
        para([{ text: "Hinweis: ", bold: true }, { text: "Die Free-Version ist ausschließlich auf Englisch verfügbar. Mit der Pro-Lizenz werden vier zusätzliche Sprachen freigeschaltet: Deutsch, Spanisch, Französisch und Russisch." }]),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 3. SYSTEMANFORDERUNGEN =====
        heading("3. Systemanforderungen", HeadingLevel.HEADING_1),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3009, 6017],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Anforderung", 3009), makeHeaderCell("Details", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Home Assistant", 3009), makeCell("Home Assistant OS oder Supervised Installation", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Architektur", 3009), makeCell("amd64 (64-Bit Intel/AMD)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Browser", 3009), makeCell("Chrome, Firefox, Safari, Edge (aktuell)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Kamera / Scanner", 3009), makeCell("HTTPS erforderlich (z.B. über Nabu Casa)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Speicher", 3009), makeCell("Minimal (SQLite-Datenbank + IndexedDB im Browser)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Netzwerk", 3009), makeCell("Lokales Netzwerk oder Nabu Casa Cloud-Zugriff", 6017) ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 4. INSTALLATION =====
        heading("4. Installation", HeadingLevel.HEADING_1),
        heading("Add-on Repository hinzufügen", HeadingLevel.HEADING_2),

        numberedItem("numbers", [
          { text: "Home Assistant öffnen und zu " },
          { text: "Einstellungen \u2192 Add-ons", bold: true },
          { text: " navigieren" },
        ]),
        numberedItem("numbers", [
          { text: "Auf " },
          { text: "Add-on Store", bold: true },
          { text: " klicken (unten rechts)" },
        ]),
        numberedItem("numbers", [
          { text: "Oben rechts auf das " },
          { text: "Drei-Punkte-Menü", bold: true },
          { text: " klicken \u2192 " },
          { text: "Repositories", bold: true },
        ]),
        numberedItem("numbers", [
          { text: "Folgende URL eingeben:" },
        ]),
        new Paragraph({ spacing: { after: 80, before: 80 }, indent: { left: 720 },
          children: [new TextRun({ text: "https://github.com/DerRegner-DE/ha-device-inventory", font: "Consolas", size: 20, color: ACCENT })]
        }),
        numberedItem("numbers", [
          { text: "Add-on " },
          { text: "\"Geräteverwaltung\"", bold: true },
          { text: " suchen und installieren" },
        ]),
        numberedItem("numbers", [
          { text: "Add-on starten", bold: true },
        ]),
        numberedItem("numbers", [
          { text: "In der Sidebar erscheint " },
          { text: "\"Geräteverwaltung\"", bold: true },
        ]),

        spacer(),
        screenshotPlaceholder("Home Assistant Add-on Store mit Geräteverwaltung"),
        spacer(),

        para([{ text: "Hinweis: ", bold: true }, { text: "In der Free-Version steht ausschließlich Englisch als Sprache zur Verfügung. Nach der Aktivierung einer Pro-Lizenz kann die Sprache in den Einstellungen umgestellt werden." }]),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 5. ERSTE SCHRITTE / BEDIENUNG =====
        heading("5. Erste Schritte", HeadingLevel.HEADING_1),
        para("Nach der Installation finden Sie die Geräteverwaltung in der Home Assistant Sidebar. Die App besteht aus vier Hauptbereichen:"),
        spacer(),

        heading("Dashboard", HeadingLevel.HEADING_2),
        para("Übersicht über Ihre Geräte mit Statistiken nach Typ, Standort und Integration. Auf einen Blick sehen Sie, wie viele Geräte erfasst sind und wie sie verteilt sind."),
        screenshotPlaceholder("Dashboard mit Gerätestatistiken"),
        spacer(),

        heading("Geräte", HeadingLevel.HEADING_2),
        para("Liste aller erfassten Geräte mit Such- und Filterfunktion. Sie können nach Name, Typ, Bereich oder anderen Kriterien filtern. Durch Antippen eines Geräts gelangen Sie zur Detailansicht, in der Sie alle Informationen einsehen und bearbeiten können."),
        screenshotPlaceholder("Geräteliste mit Such- und Filterfunktion"),
        spacer(),

        heading("Hinzufügen", HeadingLevel.HEADING_2),
        para("Formular zum Erfassen neuer Geräte. Die Felder sind in übersichtliche Gruppen unterteilt (Grunddaten, Standort, Netzwerk, Details usw.). Pflichtfelder sind mit einem Stern (*) gekennzeichnet."),
        screenshotPlaceholder("Formular zum Hinzufügen eines neuen Geräts"),
        spacer(),

        heading("Einstellungen", HeadingLevel.HEADING_2),
        para("Sprache, Lizenz, Synchronisation und Datenexport. Hier aktivieren Sie Ihre Pro-Lizenz und konfigurieren die App nach Ihren Wünschen."),
        screenshotPlaceholder("Einstellungen mit Lizenz-Aktivierung"),
        spacer(),

        heading("Navigation", HeadingLevel.HEADING_3),
        para("Die Navigation befindet sich am unteren Bildschirmrand und passt sich automatisch an die Bildschirmgröße an. Auf dem Desktop wird die volle Bezeichnung angezeigt, auf dem Handy kompakte Icons."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 6. GERÄTE ERFASSEN =====
        heading("6. Geräte erfassen", HeadingLevel.HEADING_1),
        para("Um ein neues Gerät zu erfassen, klicken Sie auf \"Hinzufügen\" in der Navigation. Das Formular ist in mehrere aufklappbare Abschnitte unterteilt:"),
        spacer(),

        heading("Grunddaten", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Gerätetyp *", 2500), makeCell("Auswahl aus 21 vordefinierten Typen (Router, Sensor, Kamera etc.)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Bezeichnung *", 2500), makeCell("Name des Geräts (z.B. \"FritzBox 6660 Cable\")", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Modell", 2500), makeCell("Modellbezeichnung des Herstellers", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Hersteller", 2500), makeCell("Name des Herstellers (z.B. \"AVM\")", 6526) ]}),
          ]
        }),
        para([{ text: "* Pflichtfelder", italics: true, size: 18, color: "999999" }]),

        heading("Standort", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Bereich", 2500), makeCell("Standort aus Home Assistant Areas (mit Pro: automatisch synchronisiert)", 6526) ]}),
          ]
        }),

        heading("Netzwerk & Strom", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Integration", 2500), makeCell("Smart Home Integration (z.B. Zigbee2MQTT, Tuya, Fritz)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Netzwerk", 2500), makeCell("Verbindungsart: WLAN, LAN, Zigbee, Bluetooth, DECT, Powerline, HomeMatic RF, USB", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Stromversorgung", 2500), makeCell("Netzteil, 230V, Batterie, Akku, USB, PoE, Solar, Starkstrom", 6526) ]}),
            new TableRow({ children: [ makeCellBold("IP-Adresse", 2500), makeCell("Netzwerk-IP des Geräts (z.B. 192.168.178.1)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("MAC-Adresse", 2500), makeCell("Hardware-Adresse (z.B. AA:BB:CC:DD:EE:FF)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Firmware", 2500), makeCell("Aktuelle Firmware-Version", 6526) ]}),
          ]
        }),

        heading("Details", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Seriennummer", 2500), makeCell("Seriennummer des Geräts", 6526) ]}),
            new TableRow({ children: [ makeCellBold("AIN / Artikelnr.", 2500), makeCell("AVM-Identifikationsnummer oder Artikelnummer", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Kaufdatum", 2500), makeCell("Datum der Anschaffung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Garantie bis", 2500), makeCell("Ende der Garantiezeit", 6526) ]}),
          ]
        }),

        heading("Home Assistant", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Entity ID", 2500), makeCell("Home Assistant Entity-ID (z.B. light.wohnzimmer)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Device ID", 2500), makeCell("Home Assistant Device-ID", 6526) ]}),
          ]
        }),

        heading("Sonstiges", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Funktion", 2500), makeCell("Wofür wird das Gerät verwendet?", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Notizen", 2500), makeCell("Weitere Hinweise und Anmerkungen", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Foto", 2500), makeCell("Gerätebild per Kamera oder aus Galerie (Pro)", 6526) ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 7. UNTERSTÜTZTE GERÄTETYPEN =====
        heading("7. Unterstützte Gerätetypen", HeadingLevel.HEADING_1),
        para("Die App bietet 21 vordefinierte Gerätetypen sowie die Kategorie \"Sonstiges\" für nicht kategorisierte Geräte:"),
        spacer(),
        bulletItem("Router"),
        bulletItem("Repeater"),
        bulletItem("Powerline"),
        bulletItem("DECT Repeater"),
        bulletItem("Steckdose"),
        bulletItem("Lichtschalter"),
        bulletItem("Leuchtmittel"),
        bulletItem("Rollladen"),
        bulletItem("Thermostat"),
        bulletItem("Controller / Gateway"),
        bulletItem("Kamera"),
        bulletItem("Türklingel"),
        bulletItem("Gong"),
        bulletItem("Sprachassistent"),
        bulletItem("Streaming"),
        bulletItem("Tablet"),
        bulletItem("Lautsprecher"),
        bulletItem("Mähroboter"),
        bulletItem("Drucker"),
        bulletItem("Sensor"),
        bulletItem("Smartphone"),
        bulletItem("Sonstiges"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 8. KAMERA & QR-SCANNER =====
        heading("8. Kamera & QR-Scanner", HeadingLevel.HEADING_1),
        para([{ text: "Hinweis: ", bold: true }, { text: "Kamera und QR-Scanner sind Pro-Features und benötigen eine HTTPS-Verbindung." }]),
        spacer(),

        heading("Foto aufnehmen", HeadingLevel.HEADING_2),
        para("Über das Kamera-Icon oben rechts im Formular öffnet sich der Foto-Dialog:"),
        bulletItem("Öffnet die Kamera des Geräts (Handy: Rückkamera, Desktop: Webcam)", "Foto aufnehmen \u2013 "),
        bulletItem("Wählt ein bestehendes Bild aus der Galerie/Dateiauswahl", "Bild auswählen \u2013 "),
        spacer(),
        para("Nach der Aufnahme oder Auswahl wird eine Vorschau angezeigt. Sie können das Bild verwerfen (\"Erneut aufnehmen\") oder bestätigen (\"Foto verwenden\"). Bei \"Erneut aufnehmen\" gelangen Sie direkt zurück zur Kamera."),
        screenshotPlaceholder("Kamera-Dialog mit Vorschau und Aufnahme-Button"),
        spacer(),

        heading("QR-/Barcode-Scanner", HeadingLevel.HEADING_2),
        para("Über das QR-Icon oben rechts im Formular starten Sie den Scanner. Halten Sie einen QR-Code oder Barcode in den Rahmen. Erkannte Daten werden automatisch in die passenden Formularfelder eingetragen (Seriennummer, MAC-Adresse etc.)."),
        screenshotPlaceholder("QR-Scanner mit erkanntem Code"),
        spacer(),

        heading("Verfügbarkeit nach Zugriffsart", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3009, 3009, 3008],
          rows: [
            new TableRow({ children: [
              makeHeaderCell("Zugriffsart", 3009),
              makeHeaderCell("Kamera / Scanner", 3009),
              makeHeaderCell("Bildauswahl", 3008),
            ]}),
            new TableRow({ children: [
              makeCellBold("HTTPS (z.B. Nabu Casa)", 3009),
              checkCell("\u2713 verfügbar", 3009),
              checkCell("\u2713 verfügbar", 3008),
            ]}),
            new TableRow({ children: [
              makeCellBold("HTTP (lokal)", 3009),
              checkCell("\u2014 nicht verfügbar", 3009),
              checkCell("\u2713 verfügbar", 3008),
            ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 9. LIZENZ & PRO-UPGRADE =====
        heading("9. Lizenz & Pro-Upgrade", HeadingLevel.HEADING_1),

        heading("Free-Version", HeadingLevel.HEADING_2),
        para("Die kostenlose Version umfasst alle Grundfunktionen mit einem Limit von 50 Geräten. Als Sprache steht ausschließlich Englisch zur Verfügung. Ideal zum Testen und für kleine Smart Home Installationen."),

        heading("Pro-Version (9,99 \u20AC)", HeadingLevel.HEADING_2),
        para("Die Pro-Version entfernt alle Einschränkungen und bietet zusätzliche Features:"),
        bulletItem("Unbegrenzte Anzahl an Geräten"),
        bulletItem("5 Sprachen: Deutsch, Englisch, Spanisch, Französisch, Russisch"),
        bulletItem("Kamera-Aufnahme mit Vorschau"),
        bulletItem("QR-/Barcode-Scanner mit automatischer Feld-Befüllung"),
        bulletItem("Foto pro Gerät"),
        bulletItem("Excel Export / Import"),
        bulletItem("Home Assistant Sync (Bereiche)"),
        spacer(),
        para("Die Lizenz ist unbefristet und einmalig zu zahlen."),

        heading("Lizenz aktivieren", HeadingLevel.HEADING_2),
        numberedItem("numbers2", [
          { text: "Öffnen Sie die " },
          { text: "Einstellungen", bold: true },
          { text: " in der App" },
        ]),
        numberedItem("numbers2", [
          { text: "Geben Sie Ihren " },
          { text: "Lizenzschlüssel", bold: true },
          { text: " ein" },
        ]),
        numberedItem("numbers2", [
          { text: "Klicken Sie auf " },
          { text: "\"Aktivieren\"", bold: true },
        ]),
        numberedItem("numbers2", [
          { text: "Alle Pro-Features sind " },
          { text: "sofort verfügbar", bold: true },
        ]),

        spacer(),
        screenshotPlaceholder("Einstellungen mit Lizenzschlüssel-Eingabe"),
        spacer(),
        para("Der Lizenzschlüssel wird serverseitig gespeichert und ist nach einem Neustart des Add-ons weiterhin aktiv."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 10. EINSTELLUNGEN =====
        heading("10. Einstellungen", HeadingLevel.HEADING_1),

        heading("Sprache", HeadingLevel.HEADING_2),
        para("In der Free-Version ist die Benutzeroberfläche ausschließlich auf Englisch verfügbar. Mit einer Pro-Lizenz können Sie zwischen fünf Sprachen wechseln: Deutsch, Englisch, Spanisch, Französisch und Russisch. Die Sprachauswahl wird sofort übernommen und gespeichert."),

        heading("Synchronisation", HeadingLevel.HEADING_2),
        para("Der Synchronisationsstatus wird oben rechts in der App angezeigt. Ein grüner Punkt bedeutet, dass die Verbindung zum Server aktiv ist. Die Synchronisation erfolgt automatisch im Hintergrund."),
        para("Bei einer Unterbrechung der Verbindung arbeitet die App im Offline-Modus weiter. Alle Änderungen werden lokal gespeichert und automatisch synchronisiert, sobald die Verbindung wiederhergestellt ist."),

        heading("Datenexport", HeadingLevel.HEADING_2),
        para("Mit der Pro-Version können Sie Ihre Gerätedaten als Excel-Datei exportieren und importieren. Dies ermöglicht die Datensicherung, den Austausch zwischen Installationen und die Massenbearbeitung von Gerätedaten."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 11. TECHNISCHE HINWEISE =====
        heading("11. Technische Hinweise", HeadingLevel.HEADING_1),

        heading("HTTPS-Anforderung", HeadingLevel.HEADING_2),
        para("Kamera und QR-/Barcode-Scanner benötigen eine sichere Verbindung (HTTPS). Dies ist eine Sicherheitsanforderung moderner Browser, keine Einschränkung der App. Über eine lokale HTTP-Verbindung (z.B. http://192.168.x.x:8123) stehen diese Funktionen nicht zur Verfügung."),
        para([{ text: "Empfehlung: ", bold: true }, { text: "Nutzen Sie Nabu Casa (Home Assistant Cloud) für sicheren HTTPS-Zugriff von überall \u2013 auch für Kamera und Scanner." }]),

        heading("iOS / Safari", HeadingLevel.HEADING_2),
        para("Die App läuft grundsätzlich auf allen Plattformen (Windows, Mac, Android, iOS). Auf iOS/Safari kann die Kamerafunktion innerhalb des Home Assistant Ingress-iframes eingeschränkt sein, da Safari strengere Berechtigungen für Kamerazugriff in iframes verlangt. Die Bildauswahl aus der Galerie funktioniert als Alternative."),

        heading("Offline-Modus", HeadingLevel.HEADING_2),
        para("Alle Gerätedaten werden lokal im Browser (IndexedDB) gespeichert. Die App funktioniert auch ohne aktive Serververbindung. Änderungen werden automatisch synchronisiert, sobald die Verbindung wiederhergestellt ist. Der Synchronisationsstatus wird oben rechts in der App angezeigt (grüner Punkt = verbunden)."),

        heading("Datenspeicherung", HeadingLevel.HEADING_2),
        bulletItem("SQLite-Datenbank auf dem Home Assistant Server", "Server: "),
        bulletItem("IndexedDB im Browser (Offline-Kopie)", "Client: "),
        bulletItem("Auf dem Server im Add-on-Verzeichnis", "Fotos: "),
        spacer(),
        para("Es werden keine Daten in der Cloud oder bei Drittanbietern gespeichert."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 12. RECHTLICHE HINWEISE =====
        heading("12. Rechtliche Hinweise", HeadingLevel.HEADING_1),

        heading("Haftungsausschluss", HeadingLevel.HEADING_2),
        para("Die Software wird \"wie besehen\" (as-is) bereitgestellt, ohne jegliche ausdrückliche oder stillschweigende Gewährleistung, einschließlich, aber nicht beschränkt auf die Gewährleistung der Marktgängigkeit, der Eignung für einen bestimmten Zweck und der Nichtverletzung von Rechten Dritter."),
        spacer(),
        para("Der Entwickler übernimmt keine Haftung für direkte, indirekte, zufällige, besondere oder Folgeschäden, die aus der Nutzung oder der Unmöglichkeit der Nutzung der Software entstehen. Dies umfasst insbesondere, aber nicht ausschließlich:"),
        bulletItem("Datenverlust oder Beschädigung von Daten"),
        bulletItem("Ausfälle oder Unterbrechungen der Software"),
        bulletItem("Fehlerhafte Darstellung oder Verarbeitung von Gerätedaten"),
        bulletItem("Schäden an Geräten oder Systemen, die im Zusammenhang mit der Nutzung der Software stehen"),
        spacer(),
        para("Die Nutzung der Software erfolgt ausschließlich auf eigenes Risiko des Anwenders. Der Entwickler empfiehlt, regelmäßige Datensicherungen durchzuführen."),
        spacer(),

        heading("Datenschutz", HeadingLevel.HEADING_2),
        para("Der Schutz Ihrer Daten hat für uns höchste Priorität. Die Geräteverwaltung wurde nach dem Prinzip der Datensparsamkeit entwickelt:"),
        spacer(),
        bulletItem("Alle Gerätedaten werden ausschließlich lokal gespeichert \u2013 auf dem Home Assistant Server (SQLite-Datenbank) und im Browser (IndexedDB)."),
        bulletItem("Es werden keine Daten an Dritte übermittelt."),
        bulletItem("Es findet keine Datenerhebung, kein Tracking und keine Analyse des Nutzerverhaltens statt."),
        bulletItem("Die Lizenzprüfung erfolgt vollständig offline anhand des lokal gespeicherten Lizenzschlüssels."),
        bulletItem("Fotos werden ausschließlich auf dem Home Assistant Server gespeichert und nicht an externe Dienste übertragen."),
        spacer(),
        para("Die App benötigt keine Internetverbindung für den Betrieb. Eine Netzwerkverbindung ist nur für den Zugriff auf den Home Assistant Server im lokalen Netzwerk oder über Nabu Casa erforderlich."),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== 13. SUPPORT & KONTAKT =====
        heading("13. Support & Kontakt", HeadingLevel.HEADING_1),

        heading("GitHub", HeadingLevel.HEADING_2),
        para("Für Fehlerberichte, Feature-Anfragen und technische Fragen nutzen Sie bitte die GitHub Issues:"),
        new Paragraph({ spacing: { after: 120 },
          children: [new ExternalHyperlink({
            link: "https://github.com/DerRegner-DE/ha-device-inventory/issues",
            children: [new TextRun({ text: "github.com/DerRegner-DE/ha-device-inventory/issues", font: "Arial", size: 21, color: ACCENT, underline: {} })]
          })]
        }),

        heading("Repository", HeadingLevel.HEADING_2),
        para("Der Quellcode ist öffentlich verfügbar:"),
        new Paragraph({ spacing: { after: 120 },
          children: [new ExternalHyperlink({
            link: "https://github.com/DerRegner-DE/ha-device-inventory",
            children: [new TextRun({ text: "github.com/DerRegner-DE/ha-device-inventory", font: "Arial", size: 21, color: ACCENT, underline: {} })]
          })]
        }),

        heading("Lizenz erwerben", HeadingLevel.HEADING_2),
        para("Für den Erwerb einer Pro-Lizenz wenden Sie sich bitte an den Entwickler über GitHub."),

        // Footer
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 10 } },
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Geräteverwaltung v1.3.8 | \u00A9 2026 DerRegner-DE", font: "Arial", size: 18, color: "999999" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Smart Home Device Inventory Management für Home Assistant", font: "Arial", size: 18, color: "999999" })]
        }),
      ]
    }
  ]
});

// ---- Generate File ----
const outPath = process.argv[2] || "C:/Users/Master/ClaudeHA/geraeteverwaltung/docs/Geraeteverwaltung_Dokumentation_DE.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Dokument erstellt: " + outPath);
  console.log("Dateigröße: " + (buffer.length / 1024).toFixed(1) + " KB");
}).catch(err => {
  console.error("Fehler beim Erstellen:", err);
  process.exit(1);
});
