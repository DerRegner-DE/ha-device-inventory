// Dev server wrapper - changes to frontend directory before starting Vite
process.chdir(__dirname);
const { execFileSync } = require("child_process");
execFileSync("node", ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0", "--port", "5173"], { stdio: "inherit" });
