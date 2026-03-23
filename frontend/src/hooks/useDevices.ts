import { useState, useEffect } from "preact/hooks";
import { liveQuery } from "dexie";
import { db, type Device } from "../db/schema";

export function useDevices(
  filter?: {
    typ?: string;
    integration?: string;
    standort_area_id?: string;
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
      }

      let result = await collection.toArray();

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
  }, [filter?.typ, filter?.integration, filter?.standort_area_id, filter?.search]);

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
