// Backward-compatible setup entry point. Use npm run migrate for new deployments.
const { migrate } = require("./migrate");
const { db } = require("../src/core/store");
migrate()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
