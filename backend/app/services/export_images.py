"""v3.1.0 (GitHub #26): Bilder im PDF-Export.

Fuer Nachlass und Rueckbau sind Einbauort-Bilder oft wichtiger als jede
Tabellenzeile -- und ohne HA-Zugriff kommt niemand mehr an sie heran. Der
PDF-Export bekommt deshalb auf Wunsch einen Bildanhang:

* ``einbauort`` -- Einbauort-Bilder (Tabelle ``attachments``)
* ``fotos``     -- Geraetefotos (``photos``) und als Dokument angehaengte Bilder

Jedes Bild bekommt eine Marke (B1, B2, ...). In der Liste steht bei jedem
Geraet, welche Marken zu ihm gehoeren; im Anhang steht jedes Bild genau
einmal, mit den Geraeten, zu denen es gehoert. Gleicher Inhalt (gleicher
Hash) gilt als ein Bild, auch wenn er mehrfach hochgeladen wurde.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

from app.config import settings

IMAGE_KINDS = ("einbauort", "fotos")


@dataclass
class ExportImage:
    label: str
    path: Path
    caption: str | None
    devices: list[str] = field(default_factory=list)


def parse_kinds(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [k for k in (p.strip() for p in raw.split(",")) if k in IMAGE_KINDS]


def _docs_dir() -> Path:
    return settings.PHOTOS_DIR.parent / "documents"


def _doc_path(uuid: str) -> Path | None:
    matches = sorted(_docs_dir().glob(f"{uuid}.*"))
    return matches[0] if matches else None


def _digest(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def collect_images(conn, devices: list[dict], kinds: list[str]) -> tuple[dict[int, list[str]], list[ExportImage]]:
    """Return ``(refs_by_device_id, appendix)`` in device order."""
    refs: dict[int, list[str]] = {}
    appendix: list[ExportImage] = []
    by_digest: dict[str, ExportImage] = {}
    if not kinds or not devices:
        return refs, appendix

    for dev in devices:
        dev_id = dev.get("id")
        if dev_id is None:
            continue
        candidates: list[tuple[Path, str | None]] = []
        if "einbauort" in kinds:
            for r in conn.execute(
                "SELECT filename, caption FROM attachments WHERE device_id = ? AND deleted_at IS NULL "
                "ORDER BY sort_order, id", (dev_id,)
            ).fetchall():
                candidates.append((settings.PHOTOS_DIR / r["filename"], r["caption"]))
        if "fotos" in kinds:
            for r in conn.execute(
                "SELECT filename, caption FROM photos WHERE device_id = ? AND deleted_at IS NULL "
                "ORDER BY is_primary DESC, id", (dev_id,)
            ).fetchall():
                candidates.append((settings.PHOTOS_DIR / r["filename"], r["caption"]))
            for r in conn.execute(
                "SELECT uuid, filename, caption FROM documents WHERE device_id = ? AND deleted_at IS NULL "
                "AND mime_type LIKE 'image/%' AND (url IS NULL OR url = '') ORDER BY id", (dev_id,)
            ).fetchall():
                p = _doc_path(r["uuid"])
                if p is not None:
                    candidates.append((p, r["caption"] or r["filename"]))

        name = str(dev.get("bezeichnung") or "")
        for path, caption in candidates:
            if not path.exists():
                continue
            try:
                digest = _digest(path)
            except OSError:
                continue
            img = by_digest.get(digest)
            if img is None:
                img = ExportImage(label=f"B{len(appendix) + 1}", path=path, caption=caption)
                by_digest[digest] = img
                appendix.append(img)
            if name not in img.devices:
                img.devices.append(name)
            dev_refs = refs.setdefault(dev_id, [])
            if img.label not in dev_refs:
                dev_refs.append(img.label)
    return refs, appendix


def load_for_pdf(path: Path, max_px: int = 1600):
    """Verkleinert laden -- eine Handvoll 12-MP-Fotos ergaebe sonst ein PDF
    von etlichen hundert MB. Liefert ein PIL-Image oder None."""
    try:
        from PIL import Image, ImageOps

        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((max_px, max_px))
            return im.convert("RGB")
    except Exception:
        return None
