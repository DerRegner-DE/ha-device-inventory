import { render } from "preact";
import { initBasePath } from "./utils/navigate";
import "./i18n"; // Initialize translations before rendering
import { initLicense } from "./license";
import { App } from "./app";
import "./styles/tailwind.css";

// Detect HA Ingress base path before anything else
initBasePath();

// Initialize license (async validation) then render
initLicense().finally(() => {
  const root = document.getElementById("app");
  if (root) {
    render(<App />, root);
  }
});
