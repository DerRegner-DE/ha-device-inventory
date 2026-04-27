import Dexie, { type EntityTable } from "dexie";

export interface Device {
  uuid: string;
  nr?: number;
  typ: string;
  bezeichnung: string;
  modell?: string;
  hersteller?: string;
  standort_area_id?: string;
  standort_name?: string;
  seriennummer?: string;
  mac_adresse?: string;
  ip_adresse?: string;
  firmware?: string;
  integration?: string;
  stromversorgung?: string;
  netzwerk?: string;
  anschaffungsdatum?: string;
  garantie_bis?: string;
  funktion?: string;
  anmerkungen?: string;
  ha_entity_id?: string;
  ha_device_id?: string;
  ain_artikelnr?: string;
  standort_floor_id?: string;
  // v2.5.0: link to parent device (Shelly 2PM channels, Tuya hubs etc.)
  // populated from HA's via_device_id during import.
  parent_uuid?: string;
  reviewed?: number;
  created_at: string;
  updated_at: string;
  sync_version: number;
  photos?: { uuid: string; is_primary: number; filename: string; mime_type: string }[];
}

export interface Photo {
  uuid: string;
  device_uuid: string;
  blob?: Blob;
  url?: string;
  caption?: string;
  is_primary: boolean;
  created_at: string;
}

export interface HaArea {
  area_id: string;
  name: string;
  floor_id?: string;
  floor_name?: string;
}

export interface SyncQueueItem {
  id?: number;
  entity_type: string;
  entity_uuid: string;
  action: "create" | "update" | "delete";
  payload: string;
  created_at: string;
}

class GeraeteDB extends Dexie {
  devices!: EntityTable<Device, "uuid">;
  photos!: EntityTable<Photo, "uuid">;
  haAreas!: EntityTable<HaArea, "area_id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("geraeteverwaltung");
    this.version(1).stores({
      devices:
        "uuid, nr, typ, bezeichnung, standort_area_id, integration, hersteller, netzwerk, updated_at",
      photos: "uuid, device_uuid, is_primary",
      haAreas: "area_id, name, floor_id",
      syncQueue: "++id, entity_type, entity_uuid, created_at",
    });
  }
}

export const db = new GeraeteDB();
