import { useState, useEffect, useRef } from "preact/hooks";
import { apiGet, apiDelete } from "../api/client";
import { t } from "../i18n";
import { getApiBase } from "../utils/navigate";

interface Attachment {
  uuid: string;
  filename: string;
  mime_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * v2.5.0: Per-device installation photos with captions (Todo82 feature).
 * Separate from the single representative ``photos`` image — attachments
 * are many, captioned, meant for Einbauort/Nachlass documentation.
 */
export function AttachmentsSection({ deviceUuid }: { deviceUuid: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () =>
    apiGet<{ items: Attachment[] }>(`/devices/${deviceUuid}/attachments`)
      .then((r) => setItems(r?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, [deviceUuid]);

  const handleUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption.trim()) formData.append("caption", caption.trim());
      const res = await fetch(
        `${getApiBase()}/devices/${deviceUuid}/attachments`,
        { method: "POST", body: formData, signal: AbortSignal.timeout(30000) },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    } catch (e: any) {
      setError(e?.message || t("attachments.uploadFailed"));
    }
    setUploading(false);
  };

  const handleDelete = async (uuid: string) => {
    const ok = await apiDelete(`/attachments/${uuid}`);
    if (ok) refresh();
  };

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h3 class="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">
        {t("attachments.sectionTitle")}
      </h3>

      {loading ? (
        <p class="text-xs text-gray-500">{t("attachments.loading")}</p>
      ) : items.length === 0 ? (
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("attachments.empty")}
        </p>
      ) : (
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {items.map((a) => (
            <div key={a.uuid} class="relative group">
              <img
                src={`${getApiBase()}/attachments/${a.uuid}`}
                alt={a.caption || ""}
                class="w-full aspect-square object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                loading="lazy"
              />
              {a.caption && (
                <div class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-2 py-1 rounded-b-lg truncate">
                  {a.caption}
                </div>
              )}
              <button
                onClick={() => handleDelete(a.uuid)}
                class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title={t("common.delete")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div class="space-y-2">
        <input
          type="text"
          value={caption}
          onInput={(e) => setCaption((e.target as HTMLInputElement).value)}
          placeholder={t("attachments.captionPlaceholder")}
          class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          maxLength={200}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          class="w-full text-xs text-gray-600 dark:text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white file:text-sm file:font-medium file:cursor-pointer file:disabled:opacity-50"
        />
        {uploading && (
          <p class="text-xs text-gray-500">{t("attachments.uploading")}</p>
        )}
        {error && <p class="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
