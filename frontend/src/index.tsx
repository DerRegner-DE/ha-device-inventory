import { render } from "preact";
import { initBasePath } from "./utils/navigate";
import { getLanguage, setLanguage } from "./i18n"; // Initialize translations before rendering
import { hasFeature, initLicense } from "./license";
import { App } from "./app";
import "./styles/tailwind.css";

// Detect HA Ingress base path before anything else
initBasePath();

// Initialize license (async validation) then render
initLicense().finally(() => {
  // v3.1.0: Free ist Englisch -- schon beim Start, nicht erst beim Oeffnen der Einstellungen.
  if (!hasFeature("multilingual") && getLanguage() !== "en") setLanguage("en");
  const root = document.getElementById("app");
  if (root) {
    render(<App />, root);
  }
});
