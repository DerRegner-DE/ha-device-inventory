import { render } from "preact";
import { initBasePath } from "./utils/navigate";
import "./i18n"; // Initialize translations before rendering
import { initLicense } from "./license";
import { App } from "./app";
import "./styles/tailwind.css";

// Detect HA Ingress base path before anything else
initBasePath();

// Initialize license (async validation) then render
console.log("[GV] Starting license init...");
initLicense().finally(() => {
  console.log("[GV] License init done, rendering app. pathname:", window.location.pathname);
  const root = document.getElementById("app");
  if (root) {
    render(<App />, root);
  } else {
    console.error("[GV] #app element not found!");
  }
});
