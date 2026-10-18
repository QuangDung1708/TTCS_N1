const h = require("./helpers");
const net = require("node:net");
let server,
  reject = false;
const messages = [],
  sockets = new Set();
const keys = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "ALLOW_SELF_REGISTRATION",
  "MAIL_DISPATCH_IMMEDIATE",
];
let previous = {};
beforeAll(async () => {
  await h.setup();
  previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 test ESMTP\r\n");
    let buffer = "",
      data = false,
      body = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const index = buffer.indexOf("\r\n"),
          line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line === ".") {
            messages.push(body);
            body = "";
            data = false;
            socket.write("250 queued\r\n");
          } else body += line + "\n";
        } else if (/^EHLO|^HELO/.test(line)) socket.write("250 test\r\n");
        else if (/^RCPT/.test(line) && reject) socket.write("550 rejected\r\n");
        else if (line === "DATA") {
          data = true;
          socket.write("354 send\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(server.address().port),
    SMTP_SECURE: "false",
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "crm@example.test",
    ALLOW_SELF_REGISTRATION: "true",
    MAIL_DISPATCH_IMMEDIATE: "true",
  });
});
afterAll(async () => {
  for (const key of keys)
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  for (const socket of sockets) socket.destroy();
  if (server) await new Promise((resolve) => server.close(resolve));
  await h.db.end();
});
const post = (path, body) =>
  h
    .request(h.app)
    .post("/api/auth/" + path)
    .send(body);
function decoded() {
  return messages
    .at(-1)
    .replace(/=\r?\n/g, "")
    .replace(/=([A-F0-9]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}
test("Registration sends a six-digit SMTP code immediately and enforces one send per email per 60 seconds atomically", async () => {
  const email = "new-signup@example.test";
  const requests = await Promise.all([
    post("send-register-otp", { email }),
    post("send-register-otp", { email }),
  ]);
  expect(requests.map((r) => r.status).sort()).toEqual([200, 429]);
  expect(
    requests.find((r) => r.status === 429).body.details.retry_after,
  ).toBeGreaterThan(0);
  expect(messages).toHaveLength(1);
  const otp_code = decoded().match(/CRM: (\d{6})/)[1];
  const body = {
    email,
    otp_code,
    full_name: "Người đăng ký",
    password: "Register9!",
    confirm_password: "Register9!",
    role_code: "Admin",
    roles: ["Admin"],
  };
  expect(
    (await post("register", { ...body, confirm_password: "Mismatch9!" }))
      .status,
  ).toBe(400);
  expect(
    (
      await post("register", {
        ...body,
        password: "onlyletters",
        confirm_password: "onlyletters",
      })
    ).status,
  ).toBe(400);
  expect((await post("register", { ...body, otp_code: "000000" })).status).toBe(
    400,
  );
  expect((await post("register", body)).status).toBe(201);
  const login = await post("login", { email, password: body.password });
  expect(login.status).toBe(200);
  expect(login.body.user.roles).toEqual(["Sales Rep"]);
  expect((await post("register", body)).status).toBe(409);
  expect(
    (await post("send-register-otp", { email: email.toUpperCase() })).status,
  ).toBe(409);
  const [[outbox]] = await h.db.query(
    "SELECT body,sent_at FROM mail_outbox WHERE recipient=?",
    [email],
  );
  expect(outbox.body).toBe("");
  expect(outbox.sent_at).not.toBeNull();
});
test("Cooldown expires using database time; wrong, expired and exhausted codes never create users", async () => {
  const email = "expired-signup@example.test";
  expect((await post("send-register-otp", { email })).status).toBe(200);
  const old = decoded().match(/CRM: (\d{6})/)[1];
  await h.db.query(
    "UPDATE api_rate_limits SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE bucket LIKE 'register-cooldown:%'",
  );
  expect((await post("send-register-otp", { email })).status).toBe(200);
  const next = decoded().match(/CRM: (\d{6})/)[1];
  const body = {
    email,
    full_name: "Expired",
    password: "Register9!",
    confirm_password: "Register9!",
    otp_code: next,
  };
  const [[r]] = await h.db.query(
    "SELECT COUNT(*) n FROM auth_email_codes WHERE email=? AND used_at IS NOT NULL",
    [email],
  );
  expect(r.n).toBe(1);
  if (old !== next)
    expect((await post("register", { ...body, otp_code: old })).status).toBe(
      400,
    );
  await h.db.query(
    "UPDATE auth_email_codes SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE email=?",
    [email],
  );
  expect((await post("register", body)).status).toBe(400);
});
test("Dashboard invitation and reset deliver immediately without the periodic worker; transport failure is reported", async () => {
  const email = "immediate-user@example.test";
  const created = await h.api("Admin", "post", "/api/users", {
    email,
    full_name: "Immediate",
    roles: ["Sales Rep"],
    temporary_password: "Immediate9!",
  });
  expect(created.status).toBe(201);
  expect(created.body.mail.status).toBe("sent");
  expect(decoded()).toContain("Immediate9!");
  expect((await post("forgot-password", { email })).status).toBe(200);
  expect(decoded()).toContain("reset-password?token=");
  reject = true;
  expect((await post("forgot-password", { email })).status).toBe(503);
  const [[failed]] = await h.db.query(
    "SELECT last_error,sent_at FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
    [email],
  );
  expect(failed.sent_at).toBeNull();
  expect(failed.last_error).toBe("EENVELOPE");
  reject = false;
  process.env.SMTP_HOST = "";
  expect((await post("forgot-password", { email })).status).toBe(503);
  expect(
    (await post("send-register-otp", { email: "no-config@example.test" }))
      .status,
  ).toBe(503);
  process.env.SMTP_HOST = "127.0.0.1";
  const { dotenvValue } = require("../../scripts/configure-mail");
  const dotenv = require("dotenv");
  for (const value of [
    "SimpleAppPassword",
    "pass#with space",
    "pass\\with\\slashes",
    'pass"quotes',
    "pass'quotes",
  ]) {
    expect(dotenv.parse("SMTP_PASS=" + dotenvValue(value)).SMTP_PASS).toBe(
      value,
    );
  }
  const { promisify } = require("node:util");
  const { execFile } = require("node:child_process");
  const count = messages.length;
  const checked = await promisify(execFile)(
    process.execPath,
    ["scripts/send-test-mail.js", "owned@example.test"],
    { cwd: require("node:path").resolve(__dirname, "../.."), env: process.env },
  );
  expect(checked.stdout).toContain("SMTP đã chấp nhận thư kiểm thử");
  expect(messages).toHaveLength(count + 1);
});
