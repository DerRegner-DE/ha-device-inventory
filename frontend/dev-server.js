// Dev server wrapper - changes to frontend directory before starting Vite
process.chdir(__dirname);
import("./node_modules/vite/bin/vite.js");
