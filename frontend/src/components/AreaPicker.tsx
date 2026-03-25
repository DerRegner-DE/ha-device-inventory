import { useState, useEffect } from "preact/hooks";
import { FLOORS, Floor } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface HAArea {
  area_id: string;
  name: string;
  floor_id?: string | null;
}

interface HAFloor {
  floor_id: string;
  name: string;
  level?: number;
}

interface AreaPickerProps {
  value: string;
  onChange: (areaId: string, areaName: string) => void;
}

// Detect API base path (handles HA Ingress)
function getApiBase(): string {
  const ingressPath = document.querySelector("body")?.dataset?.ingressPath;
  if (ingressPath) return ingressPath;
  // Check if running under Ingress by looking at URL
  const path = window.location.pathname;
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  if (ingressMatch) return ingressMatch[1];
  return "";
}

export function AreaPicker({ value, onChange }: AreaPickerProps) {
  useLanguage();
  const [haFloors, setHaFloors] = useState<{ name: string; areas: { id: string; name: string }[] }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();

    async function fetchAreas() {
      try {
        const [areasRes, floorsRes] = await Promise.all([
          fetch(`${base}/api/ha/areas`),
          fetch(`${base}/api/ha/floors`),
        ]);

        if (!areasRes.ok || !floorsRes.ok) throw new Error("API error");

        const areasData = await areasRes.json();
        const floorsData = await floorsRes.json();

        if (cancelled) return;

        const areas: HAArea[] = areasData.areas || [];
        const floors: HAFloor[] = floorsData.floors || [];

        if (areas.length === 0) {
          // No HA areas available, use fallback
          setHaFloors(null);
          setLoading(false);
          return;
        }

        // Group areas by floor
        const floorMap = new Map<string, { name: string; level: number; areas: { id: string; name: string }[] }>();

        // Create floor entries
        for (const floor of floors) {
          floorMap.set(floor.floor_id, {
            name: floor.name,
            level: floor.level ?? 0,
            areas: [],
          });
        }

        // Assign areas to floors
        const unassigned: { id: string; name: string }[] = [];
        for (const area of areas) {
          const entry = { id: area.area_id, name: area.name };
          if (area.floor_id && floorMap.has(area.floor_id)) {
            floorMap.get(area.floor_id)!.areas.push(entry);
          } else {
            unassigned.push(entry);
          }
        }

        // Sort floors by level, then build result
        const sortedFloors = Array.from(floorMap.values())
          .sort((a, b) => a.level - b.level)
          .filter(f => f.areas.length > 0);

        // Sort areas within each floor alphabetically
        for (const floor of sortedFloors) {
          floor.areas.sort((a, b) => a.name.localeCompare(b.name));
        }

        const result = sortedFloors.map(f => ({ name: f.name, areas: f.areas }));

        // Add unassigned areas
        if (unassigned.length > 0) {
          unassigned.sort((a, b) => a.name.localeCompare(b.name));
          result.push({ name: t("areas.other") || "Sonstige", areas: unassigned });
        }

        setHaFloors(result);
      } catch {
        // API not available (offline, dev mode, etc.) - use fallback
        setHaFloors(null);
      }
      setLoading(false);
    }

    fetchAreas();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const areaId = select.value;
    if (!areaId) {
      onChange("", "");
      return;
    }
    const option = select.options[select.selectedIndex];
    onChange(areaId, option.text);
  };

  // Use HA floors/areas if available, otherwise fallback to constants
  const displayFloors = haFloors || FLOORS.map(f => ({
    name: f.name,
    areas: f.areas.map(a => ({ id: a.id, name: a.name })),
  }));

  return (
    <select
      value={value}
      onChange={handleChange}
      class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] appearance-none"
    >
      <option value="">{t("form.selectArea")}</option>
      {displayFloors.map((floor) => (
        <optgroup key={floor.name} label={floor.name}>
          {floor.areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
