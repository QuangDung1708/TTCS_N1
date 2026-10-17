require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { db } = require("./src/core/store");
const { route, errorHandler } = require("./src/core/http");
const app = express();
app.disable("x-powered-by");
// Configure exact proxy hops only when deployed behind a trusted reverse proxy.
if (process.env.TRUST_PROXY_HOPS)
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
const origins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((x) => x.trim());
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    exposedHeaders: ["X-Session-Idle-Seconds"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use((req, res, next) => {
  req.body = req.body || {};
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(
  "/uploads/avatars",
  express.static(path.join(__dirname, "uploads/avatars")),
);
app.get(
  "/api/health",
  route(async (req, res) => {
    await db.query("SELECT 1");
    const [[migration]] = await db.query(
      "SELECT version FROM crm_migrations WHERE version='001_sprint_1_5'",
    );
    res.status(migration ? 200 : 503).json({
      status: migration ? "ok" : "migration_required",
      database: "mysql",
      mailConfigured: !!process.env.SMTP_HOST,
    });
  }),
);
app.use("/api/auth", require("./src/routes/authRoutes"));
const imports = require("./src/routes/importRoutes");
app.use("/api/users", imports("user"), require("./src/routes/userRoutes"));
app.use(
  "/api/customers",
  imports("customer"),
  require("./src/routes/customerRoutes"),
);
app.use("/api/leads", imports("lead"), require("./src/routes/leadRoutes"));
app.use("/api/public", require("./src/routes/leadRoutes").publicRouter);
app.use("/api/campaigns", require("./src/routes/campaignRoutes"));
app.use("/api/deals/stages", require("./src/routes/catalogRoutes").stages);
app.use("/api/deals/reasons", require("./src/routes/catalogRoutes").reasons);
app.use(
  "/api/deals/competitors",
  require("./src/routes/catalogRoutes").competitors,
);
app.use("/api/deals", require("./src/routes/dealRoutes"));
app.use("/api/contacts", require("./src/routes/contactRoutes"));
app.use("/api/activities", require("./src/routes/activityRoutes"));
app.use("/api/quotes", require("./src/routes/quoteRoutes"));
const catalogs = require("./src/routes/catalogRoutes");
for (const [url, router] of [
  ["products", catalogs.products],
  ["categories", catalogs.categories],
  ["pipeline-stages", catalogs.stages],
  ["deal-reasons", catalogs.reasons],
  ["competitors", catalogs.competitors],
  ["custom-fields", catalogs.fields],
])
  app.use("/api/" + url, router);
app.use("/api/organization", require("./src/routes/organizationRoutes"));
app.use("/api/groups", require("./src/routes/groupRoutes"));
const { router: system, auditRouter } = require("./src/routes/systemRoutes");
app.use("/api", system);
app.get(
  "/api/audit-logs/notifications",
  require("./src/core/auth").authenticate,
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT id,message title,message AS `desc`,created_at FROM crm_notifications WHERE user_id=? ORDER BY id DESC LIMIT 100",
      [req.user.id],
    );
    res.json({ data });
  }),
);
app.use("/api/audit-logs", auditRouter);
app.use("/api/audit_logs", auditRouter);
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use((req, res) =>
  res.status(404).json({
    message: "Không tìm thấy API.",
    suggestion: "Kiểm tra đường dẫn hoặc quay lại trang trước.",
  }),
);
app.use(errorHandler);
if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters.",
    );
  const port = Number(process.env.PORT || 5001);
  const stopWorker =
    process.env.RUN_WORKER === "false"
      ? async () => {}
      : require("./src/jobs/worker").startWorker();
  const server = app.listen(port, process.env.BIND_HOST || "127.0.0.1", () =>
    console.log("CRM API listening on port " + port),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, () =>
      server.close(async () => {
        await stopWorker();
        await db.end();
        process.exit(0);
      }),
    );
}
module.exports = app;
