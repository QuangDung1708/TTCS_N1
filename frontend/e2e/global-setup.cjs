const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
module.exports = async () => {
  if (
    !/^crm_test_[a-z0-9]+$/.test(process.env.DB_NAME || "") ||
    process.env.ALLOW_DB_TEST_RESET !== "1"
  )
    throw Error(
      "E2E requires disposable DB_NAME=crm_test_ui and ALLOW_DB_TEST_RESET=1.",
    );
  const backend =
    process.env.CRM_BACKEND_DIR || path.resolve(__dirname, "../../backend");
  Object.assign(process.env, {
    JWT_SECRET: crypto.randomBytes(48).toString("hex"),
    RUN_WORKER: "false",
    ALLOW_SELF_REGISTRATION: "true",
    NODE_ENV: "test",
    SMTP_HOST: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    FRONTEND_URL: "http://127.0.0.1:5174",
    CORS_ORIGINS: "http://127.0.0.1:5174",
    PUBLIC_API_URL: "http://127.0.0.1:5002",
    PORT: "5002",
  });
  const mysql = require(path.join(backend, "node_modules/mysql2/promise"));
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4`,
  );
  await connection.end();
  const h = require(path.join(backend, "test/integration/helpers"));
  await h.setup();
  // This manifest belongs only to the explicitly reset disposable database.
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      `${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}:${process.env.DB_NAME}`,
    )
    .digest("hex")
    .slice(0, 12);
  fs.rmSync(
    path.join(backend, ".local-test-data", `examples-${fingerprint}.json`),
    { force: true },
  );
  const a = await h.customer("Sales Rep", {
    company_name: "E2E Khách hàng A",
    tax_code: "1234567890",
  });
  const b = await h.customer("salesB", { company_name: "E2E Khách hàng B" });
  const child = await h.customer("salesChild", {
    company_name: "E2E Khách hàng nhóm con",
  });
  const cs = await h.customer("Cust. Success", {
    company_name: "E2E Khách hàng CS",
  });
  await h.contact("Sales Rep", a);
  const deal = await h.deal("Sales Rep", {
    title: "E2E Cơ hội A",
    amount: 12000000,
    expected_close_date: new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10),
  });
  await h.deal("salesB", { title: "E2E Cơ hội B", amount: 7000000 });
  await h.db.query(
    "UPDATE pipeline_stages SET exit_condition='require_meeting' WHERE id=1",
  );
  await h.db.query(
    "INSERT INTO products (id,code,name,type,unit,list_price,floor_price,cost_price,status) VALUES (1,'E2E-SUB','E2E Thuê bao','SUBSCRIPTION','tháng',100000,80000,50000,'ACTIVE')",
  );
  await h.db.query(
    "INSERT INTO crm_notifications (user_id,event_key,message) VALUES (4,?,'E2E Cơ hội cần theo dõi')",
    ["deal-flag:" + deal],
  );
  const hash = await require(path.join(backend, "src/core/auth")).bcrypt.hash(
    h.password,
    10,
  );
  await h.db.query(
    "INSERT INTO users (id,email,password,full_name,role_code,group_id) VALUES (10,'multi@example.test',?,'E2E Đa vai trò','Sales Rep',1)",
    [hash],
  );
  await h.db.query(
    "INSERT INTO user_roles (user_id,role_code) VALUES (10,'Sales Rep'),(10,'Accountant')",
  );
  fs.writeFileSync(
    path.join(__dirname, "fixture-ids.json"),
    JSON.stringify({ a, b, child, cs, deal }),
  );
  await h.db.end();
  const server = spawn(process.execPath, ["index.js"], {
    cwd: backend,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (b) => {
    log += b.toString();
  });
  server.stderr.on("data", (b) => {
    log += b.toString();
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5002/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) {
    server.kill();
    throw Error("E2E backend failed: " + log);
  }
  return async () => {
    server.kill("SIGTERM");
  };
};
