/**
 * v3.1.0 (Roadmap Nr. 2 / GitHub #27): Ruecklink aus der HA-Geraeteseite.
 *
 * Die per MQTT veroeffentlichten Geraete tragen als configuration_url
 * "homeassistant://app/<slug>/devices/<uuid>". HA laedt im iframe aber immer
 * nur die Startseite des Add-ons; die Endung "/devices/<uuid>" bekommt das
 * Add-on erst, wenn es sich per postMessage fuer die Panel-Eigenschaften
 * anmeldet ("home-assistant/subscribe-properties"). HA antwortet mit
 * "home-assistant/properties" und der Route -- auch bei jedem spaeteren
 * Routenwechsel, solange das Panel offen ist.
 *
 * Aeltere HA-Versionen ohne diesen Kanal antworten nicht; dann bleibt die App
 * einfach auf der Startseite.
 */
import { navigate } from "./navigate";

const DEVICE_ROUTE = /^\/devices\/[0-9a-f]{8,}$/i;

export function initHaDeepLink(): () => void {
  if (window.parent === window) return () => {}; // nicht im HA-iframe
  let lastHandled = "";

  const onMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as { type?: string; route?: { path?: string } } | null;
    if (!data || data.type !== "home-assistant/properties") return;
    const path = data.route?.path || "";
    if (!DEVICE_ROUTE.test(path) || path === lastHandled) return;
    lastHandled = path;
    navigate(path);
  };
  window.addEventListener("message", onMessage);

  try {
    window.parent.postMessage({ type: "home-assistant/subscribe-properties" }, "*");
  } catch {
    // Kein Zugriff auf das Elternfenster -- dann eben ohne Deep-Link.
  }
  return () => window.removeEventListener("message", onMessage);
}
