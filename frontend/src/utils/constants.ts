export interface DeviceType {
  id: string;
  labelKey: string;
}

export const DEVICE_TYPES: DeviceType[] = [
  { id: "Router", labelKey: "types.router" },
  { id: "Repeater", labelKey: "types.repeater" },
  { id: "Powerline", labelKey: "types.powerline" },
  { id: "DECT Repeater", labelKey: "types.dect_repeater" },
  { id: "Steckdose", labelKey: "types.outlet" },
  { id: "Lichtschalter", labelKey: "types.light_switch" },
  { id: "Leuchtmittel", labelKey: "types.light_bulb" },
  { id: "Aktor/Relais", labelKey: "types.relay" },
  { id: "Schalter/Taster", labelKey: "types.switch_button" },
  { id: "Rollladen", labelKey: "types.shutter" },
  { id: "Thermostat", labelKey: "types.thermostat" },
  { id: "Controller/Gateway", labelKey: "types.controller" },
  { id: "Kamera", labelKey: "types.camera" },
  { id: "Türklingel", labelKey: "types.doorbell" },
  { id: "Gong", labelKey: "types.chime" },
  { id: "Schloss", labelKey: "types.lock" },
  { id: "Alarmanlage", labelKey: "types.alarm" },
  { id: "Sprachassistent", labelKey: "types.voice_assistant" },
  { id: "Smart TV", labelKey: "types.smart_tv" },
  { id: "Streaming", labelKey: "types.streaming" },
  { id: "Display", labelKey: "types.display" },
  { id: "Tablet", labelKey: "types.tablet" },
  { id: "Lautsprecher", labelKey: "types.speaker" },
  { id: "Haushaltsgerät", labelKey: "types.appliance" },
  { id: "Mähroboter", labelKey: "types.mower" },
  { id: "Bewässerung", labelKey: "types.irrigation" },
  { id: "Ventilator", labelKey: "types.fan" },
  { id: "Fernbedienung", labelKey: "types.remote" },
  { id: "Drucker", labelKey: "types.printer" },
  { id: "Sensor", labelKey: "types.sensor" },
  { id: "Smartphone", labelKey: "types.smartphone" },
  { id: "Sonstiges", labelKey: "types.other" },
];

export function getDeviceTypeLabel(id: string): string {
  return DEVICE_TYPES.find((t) => t.id === id)?.labelKey ?? id;
}

export interface IntegrationItem {
  id: string;
  labelKey: string;
}

export const INTEGRATIONS: IntegrationItem[] = [
  { id: "fritz", labelKey: "fritz" },
  { id: "zigbee2mqtt", labelKey: "zigbee2mqtt" },
  { id: "zha", labelKey: "zha" },
  { id: "zwave_js", labelKey: "zwave_js" },
  { id: "shelly", labelKey: "shelly" },
  { id: "esphome", labelKey: "esphome" },
  { id: "localtuya", labelKey: "localtuya" },
  { id: "tuya", labelKey: "tuya" },
  { id: "boschshc", labelKey: "boschshc" },
  { id: "homematicip_cloud", labelKey: "homematicip_cloud" },
  { id: "hue", labelKey: "hue" },
  { id: "deconz", labelKey: "deconz" },
  { id: "ring", labelKey: "ring" },
  { id: "blink", labelKey: "blink" },
  { id: "alexa_media", labelKey: "alexa_media" },
  { id: "sonos", labelKey: "sonos" },
  { id: "google_cast", labelKey: "google_cast" },
  { id: "apple_tv", labelKey: "apple_tv" },
  { id: "home_connect", labelKey: "home_connect" },
  { id: "tplink", labelKey: "tplink" },
  { id: "tasmota", labelKey: "tasmota" },
  { id: "mqtt", labelKey: "mqtt" },
  { id: "matter", labelKey: "matter" },
  { id: "homekit_controller", labelKey: "homekit_controller" },
  { id: "unifi", labelKey: "unifi" },
  { id: "broadlink", labelKey: "broadlink" },
  { id: "landroid_cloud", labelKey: "landroid_cloud" },
  { id: "mobile_app", labelKey: "mobile_app" },
  { id: "browser_mod", labelKey: "browser_mod" },
  { id: "samsungtv", labelKey: "samsungtv" },
  { id: "webostv", labelKey: "webostv" },
  { id: "playstation_network", labelKey: "playstation_network" },
  { id: "ipp", labelKey: "ipp" },
  { id: "dlna_dmr", labelKey: "dlna_dmr" },
  { id: "Nicht angebunden", labelKey: "integrations.not_connected" },
  { id: "Sonstiges", labelKey: "integrations.other" },
];

export interface NetworkItem {
  id: string;
  labelKey: string;
}

export const NETWORKS: NetworkItem[] = [
  { id: "WLAN", labelKey: "networks.wlan" },
  { id: "LAN", labelKey: "networks.lan" },
  { id: "Zigbee", labelKey: "networks.zigbee" },
  { id: "Z-Wave", labelKey: "networks.zwave" },
  { id: "Bluetooth", labelKey: "networks.bluetooth" },
  { id: "Thread/Matter", labelKey: "networks.thread_matter" },
  { id: "DECT", labelKey: "networks.dect" },
  { id: "Powerline", labelKey: "networks.powerline" },
  { id: "HomeMatic RF", labelKey: "networks.homematic_rf" },
  { id: "KNX", labelKey: "networks.knx" },
  { id: "Modbus", labelKey: "networks.modbus" },
  { id: "1-Wire", labelKey: "networks.onewire" },
  { id: "RS-232", labelKey: "networks.rs232" },
  { id: "EnOcean", labelKey: "networks.enocean" },
  { id: "USB", labelKey: "networks.usb" },
];

export interface PowerItem {
  id: string;
  labelKey: string;
}

export const POWER_SOURCES: PowerItem[] = [
  { id: "Netzteil", labelKey: "power.adapter" },
  { id: "230V", labelKey: "power.mains" },
  { id: "Batterie", labelKey: "power.battery" },
  { id: "Akku", labelKey: "power.rechargeable" },
  { id: "USB", labelKey: "power.usb" },
  { id: "PoE", labelKey: "power.poe" },
  { id: "Solar", labelKey: "power.solar" },
  { id: "Starkstrom", labelKey: "power.high_voltage" },
];

export interface FloorArea {
  id: string;
  name: string;
}

export interface Floor {
  id: string;
  name: string;
  areas: FloorArea[];
}

export const FLOORS: Floor[] = [
  {
    id: "ground_floor",
    name: "Ground Floor",
    areas: [
      { id: "living_room", name: "Living Room" },
      { id: "kitchen", name: "Kitchen" },
      { id: "bathroom", name: "Bathroom" },
      { id: "bedroom", name: "Bedroom" },
      { id: "hallway", name: "Hallway" },
      { id: "office", name: "Office" },
      { id: "guest_room", name: "Guest Room" },
    ],
  },
  {
    id: "upper_floor",
    name: "Upper Floor",
    areas: [
      { id: "master_bedroom", name: "Master Bedroom" },
      { id: "kids_room", name: "Kids Room" },
      { id: "upper_bathroom", name: "Bathroom" },
      { id: "upper_hallway", name: "Hallway" },
    ],
  },
  {
    id: "basement",
    name: "Basement",
    areas: [
      { id: "utility_room", name: "Utility Room" },
      { id: "storage", name: "Storage" },
      { id: "workshop", name: "Workshop" },
      { id: "laundry", name: "Laundry Room" },
    ],
  },
  {
    id: "outdoor",
    name: "Outdoor",
    areas: [
      { id: "garage", name: "Garage" },
      { id: "garden", name: "Garden" },
      { id: "terrace", name: "Terrace" },
      { id: "carport", name: "Carport" },
    ],
  },
  {
    id: "other",
    name: "Other",
    areas: [{ id: "unassigned", name: "Unassigned" }],
  },
];

export function getAreaName(areaId: string): string {
  for (const floor of FLOORS) {
    const area = floor.areas.find((a) => a.id === areaId);
    if (area) return area.name;
  }
  return areaId;
}

export function getFloorForArea(areaId: string): Floor | undefined {
  return FLOORS.find((f) => f.areas.some((a) => a.id === areaId));
}

export const TYPE_ICONS: Record<string, string> = {
  Router: "wifi",
  Repeater: "signal",
  Powerline: "bolt",
  "DECT Repeater": "phone",
  Steckdose: "plug",
  Lichtschalter: "toggle-on",
  Leuchtmittel: "lightbulb",
  "Aktor/Relais": "toggle-on",
  "Schalter/Taster": "toggle-on",
  Rollladen: "blinds",
  Thermostat: "thermometer",
  "Controller/Gateway": "server",
  Kamera: "camera",
  "Türklingel": "bell",
  Gong: "bell-ring",
  Schloss: "lock",
  Alarmanlage: "shield",
  Sprachassistent: "mic",
  "Smart TV": "tv",
  Streaming: "tv",
  Display: "tablet",
  Tablet: "tablet",
  Lautsprecher: "speaker",
  "Haushaltsgerät": "device",
  "Mähroboter": "robot",
  "Bewässerung": "sensor",
  Ventilator: "device",
  Fernbedienung: "device",
  Drucker: "printer",
  Sensor: "sensor",
  Smartphone: "smartphone",
  Sonstiges: "device",
};
