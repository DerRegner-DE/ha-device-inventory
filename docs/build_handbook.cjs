/**
 * Baut die Word-Handbuecher aus den Markdown-Handbuechern.
 *
 * Eine Quelle je Sprache: docs/HANDBUCH.md (de) und docs/HANDBUCH.<lang>.md.
 * Die Word-Fassung wird daraus erzeugt und nie von Hand gepflegt -- so laufen
 * Markdown und Word nicht mehr auseinander (die alten build_*_doc.cjs standen
 * bei "Version 1.0", als die App bei 3.0 war).
 *
 * Aufruf:  node docs/build_handbook.cjs [--out=<Ordner>] [--lang=de|en|es|fr|ru]
 * Ohne --out landen die Dateien in ../../handbuch (Projektordner, nicht im
 * Repo -- *.docx ist in .gitignore).
 * Voraussetzung: npm install --no-save --no-package-lock docx@9 (in docs/).
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, ExternalHyperlink,
} = require('docx');

const DOCS = __dirname;
const VERSION = (fs.readFileSync(path.join(DOCS, '..', 'addon', 'config.yaml'), 'utf8')
  .match(/^version:\s*"([^"]+)"/m) || [, '?'])[1];
const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=');
const OUT = path.resolve(arg('out') || path.join(DOCS, '..', '..', 'handbuch'));
const LOGO = fs.readFileSync(path.join(DOCS, 'logo.png'));

const LANGS = {
  de: { file: 'HANDBUCH.md', sub: 'Benutzerhandbuch', toc: 'Inhaltsverzeichnis', page: 'Seite', ver: 'Version', date: 'Stand' },
  en: { file: 'HANDBUCH.en.md', sub: 'User Manual', toc: 'Contents', page: 'Page', ver: 'Version', date: 'As of' },
  es: { file: 'HANDBUCH.es.md', sub: 'Manual de usuario', toc: 'Índice', page: 'Página', ver: 'Versión', date: 'Fecha' },
  fr: { file: 'HANDBUCH.fr.md', sub: "Manuel d'utilisation", toc: 'Sommaire', page: 'Page', ver: 'Version', date: 'État' },
  ru: { file: 'HANDBUCH.ru.md', sub: 'Руководство пользователя', toc: 'Содержание', page: 'Стр.', ver: 'Версия', date: 'Дата' },
};

const DARK = '333333', MID = '666666', LIGHT = '999999', HEAD = '1F4E79', BG = 'F2F5F9', W = 9026;
const FONT = 'Arial';
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

// ---------------------------------------------------------------- inline ---
function inline(text, base = {}) {
  const runs = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m;
  const push = (t, o = {}) => { if (t) runs.push(new TextRun({ text: t, font: FONT, size: 20, color: DARK, ...base, ...o })); };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[2]) push(m[2], { bold: true });
    else if (m[3]) push(m[3], { italics: true });
    else if (m[4]) push(m[4], { font: 'Consolas', size: 18 });
    else if (m[5]) {
      if (/^https?:/.test(m[6])) {
        runs.push(new ExternalHyperlink({ link: m[6], children: [new TextRun({ text: m[5], font: FONT, size: 20, color: '1F4E79', underline: {}, ...base })] }));
      } else push(m[5]); // interner Anker: im Word steht das Kapitel im Inhaltsverzeichnis
    }
    last = re.lastIndex;
  }
  push(text.slice(last));
  return runs;
}

const para = (text, opts = {}) => new Paragraph({ spacing: { before: 60, after: 60 }, ...opts, children: inline(text, opts.run || {}) });

// ----------------------------------------------------------------- table ---
function table(rows) {
  const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const head = cells[0], body = cells.slice(2);
  const n = head.length;
  // Spaltenbreite nach Textmenge, jede Spalte mindestens 1/6 der Breite.
  const len = head.map((_, i) => Math.max(...cells.filter((_, ri) => ri !== 1).map((r) => (r[i] || '').length), 4));
  const min = W / 6, sum = len.reduce((a, b) => a + b, 0);
  let widths = len.map((l) => Math.max(min, (W * l) / sum));
  const scale = W / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.floor(w * scale));
  const cell = (t, i, header, shade) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: header ? { fill: HEAD, type: ShadingType.CLEAR } : shade ? { fill: BG, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: inline(t, header ? { bold: true, color: 'FFFFFF' } : {}) })],
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, i, true)) }),
      ...body.map((r, ri) => new TableRow({ children: head.map((_, i) => cell(r[i] || '', i, false, ri % 2 === 0)) })),
    ],
  });
}

// ----------------------------------------------------------------- parse ---
function parse(md) {
  const out = [];
  const lines = md.replace(/\r/g, '').split('\n');
  let i = 0, listNo = 0, skipping = false, chapters = 0;
  // Leerzeilen zwischen Listenpunkten beenden die Liste nicht (sonst zaehlt Word 1, 1, 1).
  const nextNonEmpty = (k) => { while (k < lines.length && !lines[k].trim()) k++; return k; };
  while (i < lines.length) {
    let l = lines[i];
    if (/^# /.test(l) || (i < 6 && /^\*?[^:]{2,16}\s?:\s*\*?v?\d/.test(l))) { i++; continue; }
    if (/^## /.test(l)) {
      // Das Markdown-Inhaltsverzeichnis ersetzt im Word das echte Verzeichnis.
      skipping = /^## (Inhalt|Inhaltsverzeichnis|Contents|Table of Contents|Índice|Contenido|Tabla de contenidos?|Sommaire|Table des matières|Содержание|Оглавление)\s*$/i.test(l);
      // Erstes Kapitel ohne Seitenumbruch, damit eine kurze Einleitung nicht allein auf einer Seite steht.
      if (!skipping) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: chapters > 0, children: [new TextRun({ text: l.slice(3).trim(), font: FONT })] })); chapters++; }
      i++; continue;
    }
    if (skipping) { i++; continue; }
    if (/^### /.test(l)) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: l.slice(4).trim(), font: FONT })] })); i++; continue; }
    if (/^#### /.test(l)) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: l.slice(5).trim(), font: FONT })] })); i++; continue; }
    if (/^---\s*$/.test(l) || /^\s*$/.test(l)) { i++; continue; }
    if (/^```/.test(l)) {
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        out.push(new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: lines[i], font: 'Consolas', size: 18 })] }));
        i++;
      }
      i++; continue;
    }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      out.push(table(rows), new Paragraph({ children: [] }));
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        let t = lines[i].replace(/^\s*[-*] /, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*] /.test(lines[i]) && !/^\s*\d+\. /.test(lines[i])) t += ' ' + lines[i++].trim();
        out.push(new Paragraph({ numbering: { reference: 'bullet', level: 0 }, spacing: { before: 30, after: 30 }, children: inline(t) }));
      }
      continue;
    }
    if (/^\s*\d+\. /.test(l)) {
      listNo++;
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        let t = lines[i].replace(/^\s*\d+\. /, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*\d+\. /.test(lines[i])) {
          if (/^\s*```/.test(lines[i])) { i++; continue; }
          t += ' ' + lines[i++].trim();
        }
        out.push(new Paragraph({ numbering: { reference: 'num', level: 0, instance: listNo }, spacing: { before: 40, after: 40 }, children: inline(t) }));
        const k = nextNonEmpty(i);
        if (k < lines.length && /^\s*\d+\. /.test(lines[k])) i = k;
      }
      continue;
    }
    if (/^> /.test(l)) {
      let t = '';
      while (i < lines.length && /^>/.test(lines[i])) t += ' ' + lines[i++].replace(/^>\s?/, '');
      out.push(para(t.trim(), { indent: { left: 400 }, run: { italics: true, color: MID } }));
      continue;
    }
    let t = l.trim();
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|\||[-*] |\d+\. |> |```|---)/.test(lines[i].trim())) t += ' ' + lines[i++].trim();
    out.push(para(t));
  }
  return out;
}

// ----------------------------------------------------------------- build ---
async function build(lang, cfg) {
  const src = path.join(DOCS, cfg.file);
  if (!fs.existsSync(src)) { console.log(`- ${lang}: ${cfg.file} fehlt, uebersprungen`); return; }
  const md = fs.readFileSync(src, 'utf8');
  const title = (md.match(/^# (.+?)(?:\s+—.*)?$/m) || [, 'Geräteverwaltung'])[1].trim();
  // Versionszeile unter dem Titel, in jeder Sprache anders beschriftet ("Stand:", "Version :", "Версия:" ...).
  const stand = ((md.split('\n').slice(0, 6).join('\n').match(/^\*?[^:\n]{2,16}\s?:\s*(\*?v?\d.*)$/m)) || [, ''])[1].replace(/\*/g, '').trim();
  const page = { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1300, bottom: 1300, left: 1300 } };

  const doc = new Document({
    creator: 'DerRegner', title: `${title} — ${cfg.sub}`,
    styles: {
      default: { document: { run: { font: FONT, size: 20 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONT, color: HEAD }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: FONT, color: DARK }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONT, color: MID }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullet', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
        { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 340 } } } }] },
      ],
    },
    features: { updateFields: true },
    sections: [
      {
        properties: { page },
        children: [
          ...Array.from({ length: 6 }, () => new Paragraph({ children: [] })),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 250, height: 200 }, altText: { title: 'Logo', description: 'DerRegner', name: 'logo' } })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 160 }, children: [new TextRun({ text: title, font: FONT, size: 56, bold: true, color: DARK })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: cfg.sub, font: FONT, size: 28, color: MID })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${cfg.ver} ${VERSION}  |  Home Assistant Add-on`, font: FONT, size: 22, color: MID })] }),
          stand ? new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${cfg.date}${lang === 'fr' ? ' :' : ':'} ${stand}`, font: FONT, size: 18, color: LIGHT })] }) : new Paragraph({ children: [] }),
          ...Array.from({ length: 10 }, () => new Paragraph({ children: [] })),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '© 2026 DerRegner', font: FONT, size: 16, color: LIGHT })] }),
        ],
      },
      {
        properties: { page },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 50, height: 40 }, altText: { title: 'L', description: 'Logo', name: 'hl' } })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${title} ${VERSION}  |  ${cfg.page} `, font: FONT, size: 16, color: LIGHT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: LIGHT })] })] }) },
        children: [
          // Kein Heading-Stil, sonst fuehrt das Verzeichnis sich selbst auf.
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: cfg.toc, font: FONT, size: 32, bold: true, color: HEAD })] }),
          new TableOfContents(cfg.toc, { hyperlink: true, headingStyleRange: '1-2' }),
          new Paragraph({ children: [new PageBreak()] }),
          ...parse(md),
        ],
      },
    ],
  });
  fs.mkdirSync(OUT, { recursive: true });
  const name = `Geraeteverwaltung_Handbuch_${lang.toUpperCase()}.docx`;
  fs.writeFileSync(path.join(OUT, name), await Packer.toBuffer(doc));
  console.log(`- ${lang}: ${path.join(OUT, name)}`);
}

(async () => {
  console.log(`Handbuch ${VERSION} -> ${OUT}`);
  const only = arg('lang');
  for (const [lang, cfg] of Object.entries(LANGS)) if (!only || only === lang) await build(lang, cfg);
})();
