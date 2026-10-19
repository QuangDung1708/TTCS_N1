const express = require("express");
const multer = require("multer");
const path = require("node:path");
const { template, ROLES, GROUPS } = require("./excel");
function createApp(service) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (_req, file, next) => {
      if (!/\.xlsx$/i.test(file.originalname))
        return next(
          Object.assign(
            new Error("Chỉ chấp nhận tệp .xlsx. Hãy tải mẫu Excel."),
            { status: 400 },
          ),
        );
      next(null, true);
    },
  });
  const sendExcel = (res, name, buffer) =>
    res
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .attachment(name)
      .send(Buffer.from(buffer));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/import/users/catalogs", (_req, res) =>
    res.json({ roles: ROLES, groups: GROUPS }),
  );
  app.get("/api/import/users/template", async (_req, res) =>
    sendExcel(res, "mau-nhap-nguoi-dung.xlsx", await template()),
  );
  app.post(
    "/api/import/users/preview",
    upload.single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ message: "Vui lòng chọn tệp Excel." });
      res.json(await service.preview(req.file.buffer));
    },
  );
  app.post("/api/import/users/execute", async (req, res) =>
    res.json(await service.execute(req.body?.previewId)),
  );
  app.get("/api/import/users/:id/report", async (req, res) =>
    sendExcel(
      res,
      "bao-cao-nhap-nguoi-dung.xlsx",
      await service.downloadReport(req.params.id),
    ),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "API không tồn tại." }),
  );
  app.use(express.static(path.resolve(__dirname, "../../frontend")));
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError)
      return res
        .status(400)
        .json({
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Tệp vượt quá giới hạn 2 MB."
              : "Chỉ tải lên một tệp Excel, trường file.",
        });
    if (!error.status || error.status >= 500)
      console.error("request_failed", error.code || "INTERNAL_ERROR");
    res
      .status(error.status || 500)
      .json({
        message:
          error.status && error.status < 500
            ? error.type === "entity.parse.failed"
              ? "JSON không hợp lệ."
              : error.message
            : "Không thể xử lý dữ liệu. Vui lòng thử lại.",
      });
  });
  return app;
}
module.exports = { createApp };
