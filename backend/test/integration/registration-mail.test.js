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
        } else if (/^EHLO|^HELO/.test(line))
          socket.write("250-test\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (/^AUTH/.test(line))
          socket.write("535 Authentication failed\r\n");
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

test("API mail delivery works with database sessions at UTC+7, including pre-patch untouched queue rows", async () => {
  const pool = await Promise.all(
    Array.from({ length: 10 }, () => h.db.getConnection()),
  );
  const zones = new Map();
  for (const c of pool) {
    const [[row]] = await c.query("SELECT @@session.time_zone zone");
    zones.set(c.threadId, row.zone);
    await c.query("SET time_zone='+07:00'");
  }
  for (const c of pool) c.release();
  try {
    const signup = await post("send-register-otp", {
      email: "utc7-signup@example.test",
    });
    expect(signup.status).toBe(200);
    expect(decoded()).toMatch(/CRM: \d{6}/);
    const reset = await post("forgot-password", {
      email: h.getUsers()["Sales Rep"].email,
    });
    expect(reset.status).toBe(200);
    expect(decoded()).toContain("reset-password?token=");
    const created = await h.api("Admin", "post", "/api/users", {
      email: "utc7-created@example.test",
      full_name: "UTC+7",
      roles: ["Sales Rep"],
    });
    expect(created.status).toBe(201);
    expect(created.body.mail.status).toBe("sent");
    // Reproduce the old DEFAULT CURRENT_TIMESTAMP value stored seven hours ahead of UTC.
    const [legacy] = await h.db.query(
      "INSERT INTO mail_outbox (recipient,subject,body,next_attempt_at) VALUES ('legacy@example.test','Legacy queue','Legacy content',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 HOUR))",
    );
    await require("../../src/jobs/worker").mailJobs([legacy.insertId]);
    const [[sent]] = await h.db.query(
      "SELECT sent_at FROM mail_outbox WHERE id=?",
      [legacy.insertId],
    );
    expect(sent.sent_at).not.toBeNull();
    // A failed attempt still respects its actual retry time.
    const [retry] = await h.db.query(
      "INSERT INTO mail_outbox (recipient,subject,body,attempts,next_attempt_at) VALUES ('retry@example.test','Later','Retry content',1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))",
    );
    await require("../../src/jobs/worker").mailJobs([retry.insertId]);
    const [[waiting]] = await h.db.query(
      "SELECT sent_at,attempts FROM mail_outbox WHERE id=?",
      [retry.insertId],
    );
    expect(waiting.sent_at).toBeNull();
    expect(waiting.attempts).toBe(1);
  } finally {
    const all = await Promise.all(
      Array.from({ length: 10 }, () => h.db.getConnection()),
    );
    for (const c of all) {
      await c.query("SET time_zone=?", [zones.get(c.threadId)]);
      c.release();
    }
  }
});

test("A busy mail worker queues registration and password reset without claiming an SMTP failure, then sends each once", async () => {
  const c = await h.db.getConnection();
  const before = messages.length;
  await c.query("SELECT GET_LOCK(CONCAT(DATABASE(),':crm-mail-worker'),0)");
  let ids;
  try {
    const otp = await post("send-register-otp", {
      email: "busy-signup@example.test",
    });
    expect(otp.status).toBe(202);
    expect(otp.body.delivery).toBe("queued");
    const reset = await post("forgot-password", {
      email: h.getUsers()["Sales Rep"].email,
    });
    expect(reset.status).toBe(202);
    expect(reset.body.delivery).toBe("queued");
    const [pending] = await c.query(
      "SELECT id,attempts,last_error FROM mail_outbox WHERE sent_at IS NULL AND attempts=0",
    );
    expect(pending.length).toBeGreaterThanOrEqual(2);
    expect(pending.every((row) => row.last_error === null)).toBe(true);
    ids = pending.map((row) => row.id);
    expect(messages.length).toBe(before);
  } finally {
    await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':crm-mail-worker'))");
    c.release();
  }
  await require("../../src/jobs/worker").mailJobs(ids);
  const [sent] = await h.db.query(
    `SELECT sent_at FROM mail_outbox WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  expect(sent.every((row) => row.sent_at)).toBe(true);
  expect(messages.length).toBe(before + ids.length);
  await require("../../src/jobs/worker").mailJobs(ids);
  expect(messages.length).toBe(before + ids.length);
});

test("A stale API SMTP password reports EAUTH and restart guidance without exposing credentials", async () => {
  process.env.SMTP_USER = "test-sender@example.test";
  process.env.SMTP_PASS = "TestOnlyInvalidSecret";
  try {
    const result = await post("forgot-password", {
      email: h.getUsers()["Sales Rep"].email,
    });
    expect(result.status).toBe(503);
    expect(result.body.details.code).toBe("EAUTH");
    expect(result.body.message).toContain("backend");
    expect(result.body.message).toContain(".env");
    expect(JSON.stringify(result.body)).not.toContain(process.env.SMTP_PASS);
  } finally {
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
  }
});
