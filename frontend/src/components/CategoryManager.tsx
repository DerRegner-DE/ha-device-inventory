import { useState, useEffect } from "preact/hooks";
import { apiGet, apiPost } from "../api/client";
import { t } from "../i18n";
import { getApiBase } from "../utils/navigate";

export interface Category {
  id: number;
  name: string;
  label_key: string | null;
  icon: string | null;
  is_custom: number;
  sort_order: number;
}

let cachedCategories: Category[] | null = null;
const listeners = new Set<(cats: Category[]) => void>();

export async function fetchCategories(force = false): Promise<Category[]> {
  if (cachedCategories && !force) return cachedCategories;
  const res = await apiGet<{ categories: Category[] }>("/categories");
  cachedCategories = res?.categories || [];
  listeners.forEach((l) => l(cachedCategories!));
  return cachedCategories;
}

export function subscribeCategories(cb: (cats: Category[]) => void): () => void {
  listeners.add(cb);
  if (cachedCategories) cb(cachedCategories);
  return () => listeners.delete(cb);
}

export function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>(cachedCategories || []);
  useEffect(() => {
    if (!cachedCategories) fetchCategories().catch(() => {});
    return subscribeCategories(setCats);
  }, []);
  return cats;
}

/** Resolve a category name to a display label. For built-ins, uses i18n key;
 *  for custom, returns the name verbatim. */
export function getCategoryLabel(name: string): string {
  if (!cachedCategories) return name;
  const cat = cachedCategories.find((c) => c.name === name);
  if (!cat) return name;
  if (cat.label_key) return t(cat.label_key) || name;
  return cat.name;
}

export function CategoryManager() {
  const cats = useCategories();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiPost<any>("/categories", { name });
      if (!res || !res.category) {
        setError(t("categories.createFailed") || "Create failed");
      } else {
        setNewName("");
        await fetchCategories(true);
      }
    } catch (e: any) {
      setError(e?.message || "error");
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    setDeleteResult(null);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/categories/${id}?reassign_to=Sonstiges`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || `HTTP ${res.status}`);
      } else {
        const body = await res.json();
        setDeleteResult(
          t("categories.deleteResult", {
            name: body.deleted_name,
            count: body.reassigned_devices,
          })
        );
        await fetchCategories(true);
      }
    } catch (e: any) {
      setError(e?.message || "error");
    }
    setDeleteConfirm(null);
  };

  const handleRename = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.detail || `HTTP ${res.status}`);
      } else {
        setEditingId(null);
        await fetchCategories(true);
      }
    } catch (e: any) {
      setError(e?.message || "error");
    }
  };

  const custom = cats.filter((c) => c.is_custom);
  const builtin = cats.filter((c) => !c.is_custom);

  return (
    <div class="space-y-3">
      <p class="text-xs text-gray-400">{t("categories.desc")}</p>

      {/* Custom categories (editable) */}
      {custom.length > 0 && (
        <div>
          <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t("categories.customHeader")}
          </h4>
          <ul class="space-y-1">
            {custom.map((c) => (
              <li
                key={c.id}
                class="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                {editingId === c.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onInput={(e) =>
                        setEditName((e.target as HTMLInputElement).value)
                      }
                      class="flex-1 px-2 py-1 text-sm border rounded"
                      maxLength={50}
                    />
                    <button
                      onClick={() => handleRename(c.id)}
                      class="text-xs text-[#1F4E79] hover:underline"
                    >
                      {t("common.save")}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      class="text-xs text-gray-500"
                    >
                      {t("common.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <span class="flex-1 text-sm text-gray-700 dark:text-gray-200">
                      {c.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      class="text-xs text-gray-500 hover:text-[#1F4E79]"
                    >
                      {t("common.edit")}
                    </button>
                    {deleteConfirm === c.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(c.id)}
                          class="text-xs text-red-600 font-medium"
                        >
                          {t("common.confirm")}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          class="text-xs text-gray-500"
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        class="text-xs text-red-500 hover:text-red-700"
                      >
                        {t("common.delete")}
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add new custom */}
      <div>
        <h4 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {t("categories.addNew")}
        </h4>
        <div class="flex gap-2">
          <input
            type="text"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            placeholder={t("categories.namePlaceholder") || "e.g. Smoke alarm"}
            class="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            class="px-4 py-2 bg-[#4CAF50] text-white text-sm rounded-lg disabled:opacity-50"
          >
            {creating ? "..." : t("categories.add") || "Add"}
          </button>
        </div>
      </div>

      {/* Built-in (read-only info) */}
      <details class="text-xs text-gray-500">
        <summary class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          {t("categories.builtinHeader", { count: builtin.length })}
        </summary>
        <ul class="mt-2 ml-2 space-y-0.5">
          {builtin.map((c) => (
            <li key={c.id} class="text-gray-400 dark:text-gray-500">
              {c.label_key ? t(c.label_key) : c.name}
            </li>
          ))}
        </ul>
      </details>

      {error && <p class="text-xs text-red-600">{error}</p>}
      {deleteResult && <p class="text-xs text-gray-500">{deleteResult}</p>}
    </div>
  );
}
