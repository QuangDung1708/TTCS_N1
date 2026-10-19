const path = require("node:path");
const { createRequire } = require("node:module");
// Standard checkout: frontend/ and backend/ are siblings. An override remains
// available for isolated runtimes without making it a CI prerequisite.
const backendDir = path.resolve(
  process.env.CRM_BACKEND_DIR || path.join(__dirname, "../../backend"),
);
module.exports = {
  backendDir,
  backendRequire: createRequire(path.join(backendDir, "package.json")),
};
