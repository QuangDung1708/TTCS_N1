const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { createStore } = require("./store");
const { createService } = require("./service");
const { createApp } = require("./app");
const port = Number(process.env.PORT || 5055);
const appUrl = process.env.APP_URL || `http://localhost:${port}`;
if (!/^https?:\/\//.test(appUrl))
  throw new Error("APP_URL phải là URL HTTP/HTTPS.");
const mode = process.env.MAIL_MODE || "file";
if (!["file", "smtp"].includes(mode))
  throw new Error("MAIL_MODE chỉ nhận file hoặc smtp.");
let sendMail;
if (mode === "smtp") {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  )
    throw new Error("Thiếu cấu hình SMTP trong .env của bản mẫu.");
  const transport = require("nodemailer").createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  sendMail = (message) =>
    transport.sendMail({
      ...message,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
    });
} else {
  sendMail = async (message) => {
    const dir = path.resolve(__dirname, "../outbox");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${Date.now()}-${crypto.randomUUID()}.txt`),
      `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
      { mode: 0o600 },
    );
  };
}
const store = createStore(path.resolve(__dirname, "../data/db.json"));
const service = createService({
  store,
  sendMail,
  appUrl: appUrl.replace(/\/$/, ""),
  onMailError: (error) =>
    console.error("mail_failed", error.code || "SMTP_ERROR"),
});
createApp(service).listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `N1-277: ${appUrl} | MAIL_MODE=${mode}${mode === "file" ? " (email demo: backend/outbox/)" : ""}`,
  ),
);
