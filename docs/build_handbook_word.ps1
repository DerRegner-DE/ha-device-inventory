# Baut die Word-Handbuecher (DE/EN/ES/FR/RU) aus docs/HANDBUCH*.md und
# aktualisiert sie in Word: kompaktes Inhaltsverzeichnis, Seitenzahlen, PDF zur Kontrolle.
#
#   powershell -ExecutionPolicy Bypass -File docs\build_handbook_word.ps1
#
# Ergebnis: Apps\01_aktiv\Geraeteverwaltung\handbuch\Geraeteverwaltung_Handbuch_<LANG>.docx
# Kontroll-PDFs: im Arbeitsordner unter %TEMP%.
# Voraussetzungen:
#   - docx@9 in docs\node_modules: npm install --no-save --no-package-lock docx@9
#   - Microsoft Word
#
# Hinweise:
#   - Word bricht bei ExportAsFixedFormat ab, deshalb wird das PDF per SaveAs2 erzeugt.
#   - Gearbeitet wird an Kopien mit neuem Namen. Nach einem Absturz merkt sich Word
#     den Dateinamen und fragt beim naechsten Oeffnen unsichtbar nach; die Automatisierung haengt dann.
$ErrorActionPreference = "Stop"
$docs = $PSScriptRoot
$out = Join-Path $docs "..\..\handbuch" | Resolve-Path
$work = Join-Path $env:TEMP ("gv_handbuch_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Force $work | Out-Null

Push-Location $docs
node build_handbook.cjs --out="$work" | Out-Null
Pop-Location

$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  foreach ($l in "DE", "EN", "ES", "FR", "RU") {
    $f = "$work\Geraeteverwaltung_Handbuch_$l.docx"
    $d = $w.Documents.Open($f)
    # wdStyleTOC1 = -20, wdStyleTOC2 = -21: kompakte Zeilen, damit das Verzeichnis auf eine Seite passt.
    foreach ($s in -20, -21) { $st = $d.Styles.Item($s); $st.ParagraphFormat.SpaceBefore = 0; $st.ParagraphFormat.SpaceAfter = 0; $st.Font.Size = 10 }
    $null = $d.TablesOfContents(1).Update()
    $d.Save()
    $d.Close()
    $d = $w.Documents.Open($f)
    $d.SaveAs2("$work\Geraeteverwaltung_Handbuch_$l.pdf", 17)
    $d.Close()
    Copy-Item $f (Join-Path $out "Geraeteverwaltung_Handbuch_$l.docx") -Force
    "$l ok"
  }
} finally {
  $w.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($w) | Out-Null
}
"PDFs zur Kontrolle: $work"
