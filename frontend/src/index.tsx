import { render } from "preact";
import "./i18n"; // Initialize translations before rendering
import { initLicense } from "./license";
import { App } from "./app";
import "./styles/tailwind.css";

// Initialize license (async validation) then render
initLicense().finally(() => {
  const root = document.getElementById("app");
  if (root) {
    render(<App />, root);
  }
});
