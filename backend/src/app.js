const express = require("express");
const path = require("node:path");
function createApp(service) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  const budgets = new Map();
  app.use("/api", (req, res, next) => {
    const time = Date.now();
    for (const [key, value] of budgets)
      if (value.until <= time) budgets.delete(key);
    const entry = budgets.get(req.ip) || { count: 0, until: time + 60_000 };
    budgets.set(req.ip, entry);
    if (++entry.count > 20)
      return res
        .status(429)
        .set(
          "Retry-After",
          String(Math.max(1, Math.ceil((entry.until - time) / 1000))),
        )
        .json({ message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." });
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/auth/forgot-password", async (req, res) =>
    res.json(await service.forgot(req.body?.email)),
  );
  app.post("/api/auth/reset-password", async (req, res) =>
    res.json(await service.reset(req.body || {})),
  );
  app.post("/api/auth/check-reset-token", (req, res) => {
    service.validToken(req.body?.token);
    res.json({ valid: true });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "API không tồn tại." }),
  );
  const frontend = path.resolve(__dirname, "../../frontend");
  app.use(express.static(frontend));
  app.get("/reset-password", (_req, res) =>
    res.sendFile(path.join(frontend, "index.html")),
  );
  app.use((error, _req, res, _next) =>
    res
      .status(error.status || 500)
      .json({
        message:
          error.status && error.status < 500
            ? error.type === "entity.parse.failed"
              ? "JSON không hợp lệ."
              : error.message
            : "Có lỗi hệ thống. Vui lòng thử lại sau.",
      }),
  );
  return app;
}
module.exports = { createApp };
