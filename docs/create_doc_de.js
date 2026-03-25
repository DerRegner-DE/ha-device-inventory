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

const PAGE_WIDTH = 11906; // A4
const PAGE_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9026

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
          children: [new TextRun({ text: "GERAETEVERWALTUNG", font: "Arial", size: 52, bold: true, color: PRIMARY })]
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
              new TextRun({ text: "Geraeteverwaltung ", font: "Arial", size: 16, bold: true, color: PRIMARY }),
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
        // TABLE OF CONTENTS
        heading("Inhaltsverzeichnis", HeadingLevel.HEADING_1),
        new TableOfContents("Inhaltsverzeichnis", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // 1. EINLEITUNG
        heading("1. Einleitung", HeadingLevel.HEADING_1),
        para("Die Geraeteverwaltung ist eine Offline-First Progressive Web App (PWA) zur vollstaendigen Erfassung und Verwaltung aller Smart Home Geraete. Als Home Assistant Add-on integriert sie sich nahtlos in die Sidebar und bietet eine komfortable Oberflaeche fuer die Inventarisierung von Routern, Sensoren, Kameras, Thermostaten und allen weiteren Geraeten."),
        para("Mit der App behalten Sie den Ueberblick ueber Ihr gesamtes Smart Home Inventar - inklusive Netzwerkinformationen, Standorten, Garantiedaten und Fotos. Dank Offline-Modus funktioniert die App auch ohne aktive Serververbindung."),
        new Paragraph({ spacing: { after: 120 } }),

        heading("Hauptmerkmale", HeadingLevel.HEADING_2),
        bulletItem("Vollstaendige Geraeteverwaltung ", "CRUD: "),
        bulletItem("mit automatischer Synchronisation", "Offline-Modus "),
        bulletItem("in 5 Sprachen (DE, EN, ES, FR, RU)", "Mehrsprachig "),
        bulletItem("mit automatischer Feld-Befuellung", "QR-/Barcode-Scanner "),
        bulletItem("direkt aus der App heraus", "Kamera-Aufnahme "),
        bulletItem("fuer Geraetedaten", "Excel Export/Import "),
        bulletItem("fuer Handy und Desktop", "Responsive Design "),

        new Paragraph({ children: [new PageBreak()] }),

        // 2. FEATURES
        heading("2. Features", HeadingLevel.HEADING_1),
        heading("Free vs. Pro im Vergleich", HeadingLevel.HEADING_2),
        para("Die Geraeteverwaltung ist in zwei Varianten verfuegbar:"),
        new Paragraph({ spacing: { after: 120 } }),

        // Feature comparison table
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [4513, 2256, 2257],
          rows: [
            new TableRow({ children: [
              makeHeaderCell("Feature", 4513),
              makeHeaderCell("Free", 2256),
              makeHeaderCell("Pro (9,99 \u20AC)", 2257),
            ]}),
            new TableRow({ children: [ makeCellBold("Geraete erfassen/bearbeiten/loeschen", 4513), checkCell("max. 50", 2256), checkCell("\u2713 unbegrenzt", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Dashboard mit Statistiken", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Suche & Filter", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Offline-Modus", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Responsive Design (Handy + Desktop)", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("HA Sidebar-Integration", 4513), checkCell("\u2713", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Sprachen", 4513), checkCell("Englisch", 2256), checkCell("5 Sprachen", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Kamera-Aufnahme", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("QR-/Barcode-Scanner", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Foto pro Geraet", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Excel Export / Import", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
            new TableRow({ children: [ makeCellBold("Home Assistant Sync (Bereiche)", 4513), checkCell("\u2014", 2256), checkCell("\u2713", 2257) ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // 3. SYSTEMANFORDERUNGEN
        heading("3. Systemanforderungen", HeadingLevel.HEADING_1),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3009, 6017],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Anforderung", 3009), makeHeaderCell("Details", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Home Assistant", 3009), makeCell("Home Assistant OS oder Supervised Installation", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Architektur", 3009), makeCell("amd64 (64-Bit Intel/AMD)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Browser", 3009), makeCell("Chrome, Firefox, Safari, Edge (aktuell)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Kamera/Scanner", 3009), makeCell("HTTPS erforderlich (z.B. Nabu Casa)", 6017) ]}),
            new TableRow({ children: [ makeCellBold("Speicher", 3009), makeCell("Minimal (SQLite Datenbank + IndexedDB)", 6017) ]}),
          ]
        }),

        new Paragraph({ spacing: { after: 200 } }),

        // 4. INSTALLATION
        heading("4. Installation", HeadingLevel.HEADING_1),
        heading("Add-on Repository hinzufuegen", HeadingLevel.HEADING_2),

        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Home Assistant oeffnen und zu ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Einstellungen \u2192 Add-ons", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " navigieren", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Auf ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Add-on Store", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " klicken (unten rechts)", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Oben rechts auf das ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Drei-Punkte-Menue", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " klicken \u2192 ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Repositories", font: "Arial", size: 21, bold: true, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Folgende URL eingeben:", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ spacing: { after: 80, before: 80 }, indent: { left: 720 },
          children: [new TextRun({ text: "https://github.com/DerRegner-DE/ha-device-inventory", font: "Consolas", size: 20, color: ACCENT })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Add-on ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "\"Geraeteverwaltung\"", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " suchen und installieren", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Add-on starten", font: "Arial", size: 21, bold: true, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 120 },
          children: [new TextRun({ text: "In der Sidebar erscheint ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "\"Geraeteverwaltung\"", font: "Arial", size: 21, bold: true, color: "333333" })] }),

        para([{ text: "Hinweis: ", bold: true }, { text: "Nach der Installation kann die Sprache in den Einstellungen der App auf Deutsch umgestellt werden (Pro-Feature)." }]),

        new Paragraph({ children: [new PageBreak()] }),

        // 5. ERSTE SCHRITTE
        heading("5. Erste Schritte", HeadingLevel.HEADING_1),
        para("Nach der Installation finden Sie die Geraeteverwaltung in der Home Assistant Sidebar. Die App besteht aus vier Bereichen:"),
        new Paragraph({ spacing: { after: 120 } }),
        bulletItem(" - Uebersicht ueber Ihre Geraete mit Statistiken nach Typ, Standort und Integration", "Dashboard"),
        bulletItem(" - Liste aller erfassten Geraete mit Such- und Filterfunktion", "Geraete"),
        bulletItem(" - Formular zum Erfassen neuer Geraete", "Hinzufuegen"),
        bulletItem(" - Sprache, Lizenz, Synchronisation und Datenexport", "Einstellungen"),

        heading("Navigation", HeadingLevel.HEADING_2),
        para("Die Navigation befindet sich am unteren Bildschirmrand und passt sich automatisch an die Bildschirmgroesse an. Auf dem Desktop wird die volle Bezeichnung angezeigt, auf dem Handy kompakte Icons."),

        new Paragraph({ children: [new PageBreak()] }),

        // 6. GERAETE ERFASSEN
        heading("6. Geraete erfassen", HeadingLevel.HEADING_1),
        para("Um ein neues Geraet zu erfassen, klicken Sie auf \"Hinzufuegen\" in der Navigation. Das Formular ist in mehrere aufklappbare Abschnitte unterteilt:"),
        new Paragraph({ spacing: { after: 120 } }),

        heading("Grunddaten", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2500, 6526],
          rows: [
            new TableRow({ children: [ makeHeaderCell("Feld", 2500), makeHeaderCell("Beschreibung", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Geraetetyp *", 2500), makeCell("Auswahl aus 21 vordefinierten Typen (Router, Sensor, Kamera etc.)", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Bezeichnung *", 2500), makeCell("Name des Geraets (z.B. \"FritzBox 6660 Cable\")", 6526) ]}),
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
            new TableRow({ children: [ makeCellBold("IP-Adresse", 2500), makeCell("Netzwerk-IP des Geraets (z.B. 192.168.178.1)", 6526) ]}),
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
            new TableRow({ children: [ makeCellBold("Seriennummer", 2500), makeCell("Seriennummer des Geraets", 6526) ]}),
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
            new TableRow({ children: [ makeCellBold("Funktion", 2500), makeCell("Wofuer wird das Geraet verwendet?", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Notizen", 2500), makeCell("Weitere Hinweise und Anmerkungen", 6526) ]}),
            new TableRow({ children: [ makeCellBold("Foto", 2500), makeCell("Geraetebild per Kamera oder aus Galerie (Pro)", 6526) ]}),
          ]
        }),

        heading("Unterstuetzte Geraetetypen", HeadingLevel.HEADING_2),
        para("Die App bietet 21 vordefinierte Geraetetypen sowie \"Sonstiges\" fuer nicht kategorisierte Geraete:"),
        new Paragraph({ spacing: { after: 120 } }),
        para("Router, Repeater, Powerline, DECT Repeater, Steckdose, Lichtschalter, Leuchtmittel, Rollladen, Thermostat, Controller/Gateway, Kamera, Tuerklingel, Gong, Sprachassistent, Streaming, Tablet, Lautsprecher, Maehroboter, Drucker, Sensor, Smartphone, Sonstiges"),

        new Paragraph({ children: [new PageBreak()] }),

        // 7. KAMERA & QR-SCANNER
        heading("7. Kamera & QR-Scanner", HeadingLevel.HEADING_1),
        para([{ text: "Hinweis: ", bold: true }, { text: "Kamera und QR-Scanner sind Pro-Features und benoetigen eine HTTPS-Verbindung." }]),
        new Paragraph({ spacing: { after: 120 } }),

        heading("Foto aufnehmen", HeadingLevel.HEADING_2),
        para("Ueber das Kamera-Icon oben rechts im Formular oeffnet sich der Foto-Dialog:"),
        bulletItem(" - Oeffnet die Kamera des Geraets (Handy: Rueckkamera, Desktop: Webcam)", "Foto aufnehmen"),
        bulletItem(" - Waehlt ein bestehendes Bild aus der Galerie/Dateiauswahl", "Bild auswaehlen"),
        new Paragraph({ spacing: { after: 120 } }),
        para("Nach der Aufnahme oder Auswahl wird eine Vorschau angezeigt. Sie koennen das Bild verwerfen (\"Erneut aufnehmen\") oder bestaetigen (\"Foto verwenden\"). Bei \"Erneut aufnehmen\" gelangen Sie direkt zurueck zur Kamera."),

        heading("QR-/Barcode-Scanner", HeadingLevel.HEADING_2),
        para("Ueber das QR-Icon oben rechts im Formular starten Sie den Scanner. Halten Sie einen QR-Code oder Barcode in den Rahmen. Erkannte Daten werden automatisch in die passenden Formularfelder eingetragen (Seriennummer, MAC-Adresse etc.)."),

        heading("Voraussetzungen", HeadingLevel.HEADING_2),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [3009, 3009, 3008],
          rows: [
            new TableRow({ children: [
              makeHeaderCell("Zugriff", 3009),
              makeHeaderCell("Kamera/Scanner", 3009),
              makeHeaderCell("Bildauswahl", 3008),
            ]}),
            new TableRow({ children: [
              makeCellBold("HTTPS (Nabu Casa)", 3009),
              checkCell("\u2713 verfuegbar", 3009),
              checkCell("\u2713 verfuegbar", 3008),
            ]}),
            new TableRow({ children: [
              makeCellBold("HTTP (lokal)", 3009),
              checkCell("\u2014 nicht verfuegbar", 3009),
              checkCell("\u2713 verfuegbar", 3008),
            ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // 8. LIZENZ & PRO-UPGRADE
        heading("8. Lizenz & Pro-Upgrade", HeadingLevel.HEADING_1),
        heading("Free-Version", HeadingLevel.HEADING_2),
        para("Die kostenlose Version umfasst alle Grundfunktionen mit einem Limit von 50 Geraeten und Englisch als einzige Sprache. Ideal zum Testen und fuer kleine Smart Home Installationen."),

        heading("Pro-Version (9,99 EUR)", HeadingLevel.HEADING_2),
        para("Die Pro-Version entfernt alle Einschraenkungen und bietet zusaetzliche Features wie Kamera, QR-Scanner, Excel-Export und alle 5 Sprachen. Die Lizenz ist unbefristet."),

        heading("Lizenz aktivieren", HeadingLevel.HEADING_2),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Oeffnen Sie die ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Einstellungen", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " in der App", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Geben Sie Ihren ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "Lizenzschluessel", font: "Arial", size: 21, bold: true, color: "333333" }),
            new TextRun({ text: " ein", font: "Arial", size: 21, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 80 },
          children: [new TextRun({ text: "Klicken Sie auf ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "\"Aktivieren\"", font: "Arial", size: 21, bold: true, color: "333333" })] }),
        new Paragraph({ numbering: { reference: "numbers2", level: 0 }, spacing: { after: 120 },
          children: [new TextRun({ text: "Alle Pro-Features sind ", font: "Arial", size: 21, color: "333333" }),
            new TextRun({ text: "sofort verfuegbar", font: "Arial", size: 21, bold: true, color: "333333" })] }),

        para("Der Lizenzschluessel wird serverseitig gespeichert und ist nach einem Neustart des Add-ons weiterhin aktiv."),

        new Paragraph({ children: [new PageBreak()] }),

        // 9. TECHNISCHE HINWEISE
        heading("9. Technische Hinweise", HeadingLevel.HEADING_1),

        heading("HTTPS-Anforderung", HeadingLevel.HEADING_2),
        para("Kamera und QR-/Barcode-Scanner benoetigen eine sichere Verbindung (HTTPS). Dies ist eine Sicherheitsanforderung moderner Browser, keine Einschraenkung der App. Ueber eine lokale HTTP-Verbindung (z.B. http://192.168.x.x:8123) stehen diese Funktionen nicht zur Verfuegung."),
        para([{ text: "Empfehlung: ", bold: true }, { text: "Nutzen Sie Nabu Casa (Home Assistant Cloud) fuer sicheren HTTPS-Zugriff von ueberall - auch fuer Kamera und Scanner." }]),

        heading("iOS / Safari", HeadingLevel.HEADING_2),
        para("Die App laeuft grundsaetzlich auf allen Plattformen (Windows, Mac, Android, iOS). Auf iOS/Safari kann die Kamerafunktion innerhalb des Home Assistant Ingress-iframes eingeschraenkt sein, da Safari strengere Berechtigungen fuer Kamerazugriff in iframes verlangt. Die Bildauswahl aus der Galerie funktioniert als Alternative."),

        heading("Offline-Modus", HeadingLevel.HEADING_2),
        para("Alle Geraetedaten werden lokal im Browser (IndexedDB) gespeichert. Die App funktioniert auch ohne aktive Serververbindung. Aenderungen werden automatisch synchronisiert, sobald die Verbindung wiederhergestellt ist. Der Synchronisationsstatus wird oben rechts in der App angezeigt (gruener Punkt = verbunden)."),

        heading("Datenspeicherung", HeadingLevel.HEADING_2),
        bulletItem("SQLite-Datenbank auf dem Home Assistant Server", "Server: "),
        bulletItem("IndexedDB im Browser (Offline-Kopie)", "Client: "),
        bulletItem("Auf dem Server im Add-on-Verzeichnis", "Fotos: "),

        new Paragraph({ children: [new PageBreak()] }),

        // 10. CHANGELOG
        heading("10. Changelog", HeadingLevel.HEADING_1),

        heading("Version 1.3.8", HeadingLevel.HEADING_3),
        bulletItem("Kamera-UX ueberarbeitet: Kamera ist primaerer Button, \"Bild auswaehlen\" sekundaer"),
        bulletItem("\"Erneut aufnehmen\" geht direkt zurueck zur Kamera"),
        bulletItem("Foto im Formular wird nicht mehr abgeschnitten"),

        heading("Version 1.3.7", HeadingLevel.HEADING_3),
        bulletItem("Fix: Webcam-Livebild spielt korrekt ab auf Mobilgeraeten"),
        bulletItem("Ausloeser-Button erst aktiv wenn Kamera-Feed bereit"),

        heading("Version 1.3.6", HeadingLevel.HEADING_3),
        bulletItem("Kamera-UI vollstaendig in 5 Sprachen uebersetzt"),
        bulletItem("Versionen ueber alle Komponenten synchronisiert"),
        bulletItem("Changelog wird im Home Assistant Add-on angezeigt"),

        heading("Version 1.3.0", HeadingLevel.HEADING_3),
        bulletItem("Lizenz-System (Free/Pro)"),
        bulletItem("QR-/Barcode-Scanner mit automatischer Feld-Befuellung"),
        bulletItem("Kamera-Aufnahme mit Vorschau"),
        bulletItem("Excel Export / Import"),
        bulletItem("5 Sprachen (DE, EN, ES, FR, RU)"),

        heading("Version 1.0.0", HeadingLevel.HEADING_3),
        bulletItem("Erste Veroeffentlichung als Home Assistant Add-on"),
        bulletItem("Geraete CRUD mit Offline-Modus"),
        bulletItem("Dashboard mit Statistiken"),
        bulletItem("Home Assistant Sidebar-Integration"),

        new Paragraph({ children: [new PageBreak()] }),

        // 11. SUPPORT & KONTAKT
        heading("11. Support & Kontakt", HeadingLevel.HEADING_1),

        heading("GitHub", HeadingLevel.HEADING_2),
        para("Fuer Fehlerberichte, Feature-Anfragen und technische Fragen:"),
        new Paragraph({ spacing: { after: 120 },
          children: [new ExternalHyperlink({
            link: "https://github.com/DerRegner-DE/ha-device-inventory/issues",
            children: [new TextRun({ text: "github.com/DerRegner-DE/ha-device-inventory/issues", font: "Arial", size: 21, color: ACCENT, underline: {} })]
          })]
        }),

        heading("Lizenz erwerben", HeadingLevel.HEADING_2),
        para("Fuer den Erwerb einer Pro-Lizenz wenden Sie sich bitte an den Entwickler ueber GitHub."),

        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 10 } },
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Geraeteverwaltung v1.3.8 | \u00A9 2026 DerRegner-DE", font: "Arial", size: 18, color: "999999" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Smart Home Device Inventory Management fuer Home Assistant", font: "Arial", size: 18, color: "999999" })]
        }),
      ]
    }
  ]
});

// ---- Generate File ----
const outPath = process.argv[2] || "Geraeteverwaltung_Dokumentation_DE.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Document created: " + outPath);
});
