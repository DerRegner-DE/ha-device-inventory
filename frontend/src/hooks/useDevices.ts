import { useState, useEffect } from "preact/hooks";
import { liveQuery } from "dexie";
import { db, type Device } from "../db/schema";

export type WarrantyStatus = "ok" | "warning" | "expired" | "none";

function warrantyBucket(garantieBis: string | undefined | null): WarrantyStatus {
  if (!garantieBis) return "none";
  try {
    const days = Math.ceil(
      (new Date(garantieBis).getTime() - Date.now()) / 86400000
    );
    if (isNaN(days)) return "none";
    if (days < 0) return "expired";
    if (days < 30) return "warning";
    return "ok";
  } catch {
    return "none";
  }
}

export function useDevices(
  filter?: {
    typ?: string;
    integration?: string;
    standort_area_id?: string;
    netzwerk?: string;
    stromversorgung?: string;
    warranty?: WarrantyStatus;
    search?: string;
  }
) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      let collection = db.devices.toCollection();

      if (filter?.typ) {
        collection = db.devices.where("typ").equals(filter.typ);
      } else if (filter?.integration) {
        collection = db.devices.where("integration").equals(filter.integration);
      } else if (filter?.standort_area_id) {
        collection = db.devices
          .where("standort_area_id")
          .equals(filter.standort_area_id);
      } else if (filter?.netzwerk) {
        collection = db.devices.where("netzwerk").equals(filter.netzwerk);
      }

      let result = await collection.toArray();

      if (filter?.netzwerk && filter?.typ) {
        // typ already applied as primary index; filter netzwerk here
        result = result.filter((d) => d.netzwerk === filter.netzwerk);
      }
      if (filter?.stromversorgung) {
        result = result.filter((d) => d.stromversorgung === filter.stromversorgung);
      }
      if (filter?.warranty) {
        result = result.filter((d) => warrantyBucket(d.garantie_bis) === filter.warranty);
      }

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(
          (d) =>
            d.bezeichnung.toLowerCase().includes(q) ||
            (d.modell && d.modell.toLowerCase().includes(q)) ||
            (d.hersteller && d.hersteller.toLowerCase().includes(q)) ||
            (d.standort_name && d.standort_name.toLowerCase().includes(q)) ||
            (d.mac_adresse && d.mac_adresse.toLowerCase().includes(q)) ||
            (d.ip_adresse && d.ip_adresse.toLowerCase().includes(q)) ||
            (d.seriennummer && d.seriennummer.toLowerCase().includes(q)) ||
            (d.integration && d.integration.toLowerCase().includes(q)) ||
            (d.funktion && d.funktion.toLowerCase().includes(q)) ||
            (d.typ && d.typ.toLowerCase().includes(q))
        );
      }

      return result.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }).subscribe({
      next: (result) => {
        setDevices(result);
        setLoading(false);
      },
      error: (err) => {
        console.error("useDevices error:", err);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [
    filter?.typ,
    filter?.integration,
    filter?.standort_area_id,
    filter?.netzwerk,
    filter?.stromversorgung,
    filter?.warranty,
    filter?.search,
  ]);

  return { devices, loading };
}

export function useDevice(uuid: string | undefined) {
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) {
      setDevice(null);
      setLoading(false);
      return;
    }

    const subscription = liveQuery(() => db.devices.get(uuid)).subscribe({
      next: (result) => {
        setDevice(result ?? null);
        setLoading(false);
      },
      error: (err) => {
        console.error("useDevice error:", err);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [uuid]);

  return { device, loading };
}

export function useDeviceCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const subscription = liveQuery(() => db.devices.count()).subscribe({
      next: setCount,
      error: (err) => console.error("useDeviceCount error:", err),
    });

    return () => subscription.unsubscribe();
  }, []);

  return count;
}
