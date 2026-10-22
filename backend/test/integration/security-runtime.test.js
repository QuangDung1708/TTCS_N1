const h = require("./helpers");
const {
  businessJobs,
  mailJobs,
  runWorkerCycle,
} = require("../../src/jobs/worker");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const net = require("net");
const XLSX = require("xlsx");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("Unknown user/token claims and missing live sessions cannot authorize a request", async () => {
  const token = jwt.sign(
    {
      sub: String(h.getUsers()["Sales Rep"].id),
      jti: crypto.randomUUID(),
      role_code: "Admin",
    },
    process.env.JWT_SECRET,
    { issuer: "ttcs-crm", audience: "ttcs-client", expiresIn: "1h" },
  );
  expect(
    (
      await h
        .request(h.app)
        .get("/api/users")
        .set("Authorization", "Bearer " + token)
    ).status,
  ).toBe(401);
  expect((await h.request(h.app).get("/api/customers")).status).toBe(401);
});
test("Role change takes effect immediately for previously issued sessions; union of roles is explicit", async () => {
  const uid = h.getUsers()["Sales Rep"].id;
  expect((await h.api("Sales Rep", "get", "/api/leads")).status).toBe(200);
  await h.api("Admin", "put", `/api/users/${uid}/role`, {
    roles: ["Accountant"],
  });
  expect((await h.api("Sales Rep", "get", "/api/leads")).status).toBe(403);
  await h.api("Admin", "put", `/api/users/${uid}/role`, {
    roles: ["Sales Rep", "Marketing"],
  });
  const cid = await h.customer("salesB");
  expect(
    (await h.api("Sales Rep", "get", "/api/customers/" + cid)).status,
  ).toBe(200);
  await h.api("Admin", "put", `/api/users/${uid}/role`, {
    roles: ["Sales Rep"],
  });
  expect(
    (await h.api("Sales Rep", "get", "/api/customers/" + cid)).status,
  ).toBe(403);
});
test("Raw SQL-like filters remain bound parameters", async () => {
  await h.customer();
  const r = await h.api(
    "Sales Rep",
    "get",
    "/api/customers?search=" + encodeURIComponent("' OR 1=1 --"),
  );
  expect(r.status).toBe(200);
  expect(r.body.data).toHaveLength(0);
});
test("Readonly roles cannot mutate related endpoints or configure categories", async () => {
  const did = await h.deal();
  for (const role of ["Marketing", "Cust. Success", "Accountant"])
    for (const suffix of ["/stage", "/items"])
      expect(
        (
          await h.api(role, "put", `/api/deals/${did}${suffix}`, {
            stage_id: 2,
            items: [],
          })
        ).status,
      ).toBe(403);
  for (const role of [
    "Team Lead",
    "Sales Rep",
    "Marketing",
    "Cust. Success",
    "Accountant",
  ])
    expect(
      (
        await h.api(role, "post", "/api/pipeline-stages", {
          name: "No",
          code: "NO",
          probability: 50,
        })
      ).status,
    ).toBe(403);
});
test("Admin has full pricing access in audit snapshots", async () => {
  await h.api("Director", "post", "/api/products", {
    code: "AUDIT",
    name: "Product",
    unit: "Unit",
    type: "ONE_TIME",
    list_price: 100,
    floor_price: 80,
    cost_price: 33,
  });
  const admin = await h.api(
    "Admin",
    "get",
    "/api/audit-logs?entity_type=products",
  );
  expect(admin.status).toBe(200);
  expect(JSON.stringify(admin.body)).toContain("cost_price");
  const director = await h.api(
    "Director",
    "get",
    "/api/audit-logs?entity_type=products",
  );
  expect(JSON.stringify(director.body)).toContain("cost_price");
});
test("Public lead form requires signed timed submission; source cannot be overridden", async () => {
  const created = await h.api("Marketing", "post", "/api/leads/forms", {
    name: "Website enquiry",
    source_id: 1,
  });
  expect(created.status).toBe(201);
  expect(created.body.embed).toContain("/api/public/lead-forms/");
  const url = "/api/public/lead-forms/" + created.body.public_key;
  const page = await h.request(h.app).get(url);
  expect(page.status).toBe(200);
  expect(page.text).toContain('name="company_name"');
  const stamp = String(Date.now() - 3000),
    signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(created.body.public_key + stamp)
      .digest("hex");
  const body = {
    full_name: "Public visitor",
    company_name: "Public company",
    email: "public@example.test",
    phone: "0912345678",
    interest: "CRM",
    stamp,
    signature,
    source_id: 999,
  };
  expect(
    (
      await h
        .request(h.app)
        .post(url)
        .send({ ...body, signature: "invalid" })
    ).status,
  ).toBe(400);
  expect(
    (
      await h
        .request(h.app)
        .post(url)
        .send({ ...body, website_confirm: "spam" })
    ).status,
  ).toBe(400);
  const r = await h.request(h.app).post(url).send(body);
  expect(r.status).toBe(201);
  const [[lead]] = await h.db.query(
    "SELECT status,source_id FROM leads WHERE id=?",
    [r.body.id],
  );
  expect(lead).toEqual({ status: "NEW", source_id: 1 });
  for (let i = 0; i < 8; i++)
    await h
      .request(h.app)
      .post(url)
      .send({ ...body, signature: "invalid" });
  expect((await h.request(h.app).post(url).send(body)).status).toBe(429);
});
test("Campaign statistics retain attribution across conversion and closing", async () => {
  const campaign = await h.api("Marketing", "post", "/api/campaigns", {
    name: "Campaign",
    channel: "Web",
    budget: 200,
    start_date: "2026-01-01",
    end_date: "2099-01-01",
  });
  expect(campaign.status).toBe(200);
  const lead = await h.api("Marketing", "post", "/api/leads", {
    full_name: "Campaign contact",
    company_name: "Campaign business",
    email: "campaign@example.test",
    source_id: 1,
    campaign_id: campaign.body.id,
  });
  await h.api("Marketing", "post", `/api/leads/${lead.body.id}/assign`, {
    owner_id: h.getUsers()["Sales Rep"].id,
  });
  const conversion = await h.api(
    "Sales Rep",
    "post",
    `/api/leads/${lead.body.id}/convert`,
    { deal: { stage_id: 1, expected_close_date: "2099-01-01" } },
  );
  expect(conversion.status).toBe(201);
  const closed = await h.api(
    "Sales Rep",
    "post",
    `/api/deals/${conversion.body.deal_id}/close`,
    {
      status: "WON",
      win_reason_id: 1,
      actual_amount: 700,
      signed_date: "2026-10-17",
    },
  );
  expect(closed.status).toBe(200);
  const stats = await h.api("Marketing", "get", "/api/campaigns");
  const row = stats.body.data.find((r) => r.id === campaign.body.id);
  expect(row.lead_count).toBe(1);
  expect(row.deal_count).toBe(1);
  expect(Number(row.won_value)).toBe(700);
});
test("Unmatched leads enter queue and rejected leads remain available for manual assignment", async () => {
  const r = await h.api("Marketing", "post", "/api/leads", {
    full_name: "Unmatched",
    company_name: "Business",
    email: "queue@example.test",
    source_id: 1,
  });
  await businessJobs();
  const [[l]] = await h.db.query("SELECT status FROM leads WHERE id=?", [
    r.body.id,
  ]);
  expect(l.status).toBe("QUEUED");
  await h.api("Marketing", "post", `/api/leads/${r.body.id}/assign`, {
    owner_id: h.getUsers()["Sales Rep"].id,
  });
  expect(
    (
      await h.api("Sales Rep", "post", `/api/leads/${r.body.id}/reject`, {
        reason: "Wrong sector",
      })
    ).status,
  ).toBe(200);
  const [[after]] = await h.db.query(
    "SELECT status,owner_id FROM leads WHERE id=?",
    [r.body.id],
  );
  expect(after.status).toBe("QUEUED");
  expect(after.owner_id).toBeNull();
});
test("Concurrent conversion creates a single customer/contact/deal", async () => {
  const r = await h.api("Sales Rep", "post", "/api/leads", {
    full_name: "Concurrent",
    company_name: "Concurrent business",
    email: "concurrent@example.test",
    source_id: 1,
  });
  const body = { deal: { stage_id: 1, expected_close_date: "2099-01-01" } };
  const results = await Promise.all([
    h.api("Sales Rep", "post", `/api/leads/${r.body.id}/convert`, body),
    h.api("Sales Rep", "post", `/api/leads/${r.body.id}/convert`, body),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customers WHERE company_name='Concurrent business'",
  );
  expect(n.n).toBe(1);
});
test("Concurrent primary-contact updates never leave two primary contacts", async () => {
  const cid = await h.customer(),
    a = await h.contact("Sales Rep", cid),
    b = await h.contact("Sales Rep", cid);
  const responses = await Promise.all([
    h.api("Sales Rep", "put", `/api/customers/contacts/${a}/primary`, {}),
    h.api("Sales Rep", "put", `/api/customers/contacts/${b}/primary`, {}),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customer_contacts WHERE customer_id=? AND is_primary=1",
    [cid],
  );
  expect(n.n).toBe(1);
});
test("Bulk reassignment rolls back all rows if any record is outside scope", async () => {
  const own = await h.deal(),
    other = await h.deal("salesB");
  const r = await h.api("Team Lead", "post", "/api/deals/reassign", {
    ids: [own, other],
    owner_id: h.getUsers().salesChild.id,
    reason: "Transfer",
  });
  expect(r.status).toBe(403);
  const [[d]] = await h.db.query("SELECT owner_id FROM deals WHERE id=?", [
    own,
  ]);
  expect(d.owner_id).toBe(h.getUsers()["Sales Rep"].id);
});
test("Upload/download persists actual file and checks ownership on download", async () => {
  const cid = await h.customer();
  const r = await h
    .request(h.app)
    .post(`/api/customers/${cid}/files`)
    .set("Authorization", "Bearer " + h.getTokens()["Sales Rep"])
    .attach("file", Buffer.from("Actual file bytes"), {
      filename: "notes.txt",
      contentType: "text/plain",
    });
  expect(r.status).toBe(201);
  const same = await h.api(
    "Sales Rep",
    "get",
    `/api/customers/${cid}/files/${r.body.id}`,
  );
  expect(same.status).toBe(200);
  expect(same.body.toString()).toBe("Actual file bytes");
  expect(
    (await h.api("salesB", "get", `/api/customers/${cid}/files/${r.body.id}`))
      .status,
  ).toBe(403);
});
test("User import parses real xlsx, previews then imports only valid rows", async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        full_name: "Batch one",
        email: "batch1@example.test",
        role_code: "Sales Rep",
      },
      { full_name: "Bad email", email: "invalid", role_code: "Admin" },
    ]),
    "Import",
  );
  const file = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const r = await h
    .request(h.app)
    .post("/api/users/import/preview")
    .set("Authorization", "Bearer " + h.getTokens()["Admin"])
    .attach("file", file, { filename: "users.xlsx" });
  expect(r.status).toBe(200);
  expect(r.body.valid).toBe(1);
  expect(r.body.invalid).toBe(1);
  const executed = await h
    .request(h.app)
    .post("/api/users/import/execute")
    .set("Authorization", "Bearer " + h.getTokens()["Admin"])
    .attach("file", file, { filename: "users.xlsx" });
  expect(executed.body.imported).toBe(1);
  expect(executed.body.skipped).toBe(1);
});
test("SMTP outbox sends over a real local SMTP socket and clears delivered secret content", async () => {
  const captured = [];
  let rejectRecipient = false;
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 local-test ESMTP\r\n");
    let buffer = "",
      data = false,
      body = "";
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const i = buffer.indexOf("\r\n"),
          line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        if (data) {
          if (line === ".") {
            captured.push(body);
            body = "";
            data = false;
            socket.write("250 queued\r\n");
          } else body += line + "\n";
        } else if (/^EHLO|^HELO/.test(line)) socket.write("250 local-test\r\n");
        else if (/^RCPT/.test(line) && rejectRecipient)
          socket.write("550 recipient rejected\r\n");
        else if (/^MAIL|^RCPT/.test(line)) socket.write("250 OK\r\n");
        else if (line === "DATA") {
          data = true;
          socket.write("354 send data\r\n");
        } else if (line === "QUIT") {
          socket.end("221 bye\r\n");
        } else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_SECURE",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    Object.assign(process.env, {
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(server.address().port),
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "crm@example.test",
      SMTP_SECURE: "false",
    });
    await h
      .request(h.app)
      .post("/api/auth/forgot-password")
      .send({ email: h.getUsers()["Sales Rep"].email });
    const created = await h.api("Admin", "post", "/api/users", {
      email: "smtp-created@example.test",
      full_name: "SMTP Created",
      roles: ["Sales Rep"],
      group_id: 1,
    });
    expect(created.status).toBe(201);
    const [[activationMail]] = await h.db.query(
      "SELECT body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
      ["smtp-created@example.test"],
    );
    const temporary = activationMail.body.match(/Mật khẩu tạm: ([^\n]+)/)[1];
    const [[pending]] = await h.db.query(
      "SELECT COUNT(*) n FROM mail_outbox WHERE sent_at IS NULL AND next_attempt_at<=UTC_TIMESTAMP() AND attempts<10",
    );
    await Promise.all([mailJobs(), mailJobs()]);
    expect(captured).toHaveLength(pending.n);
    expect(
      captured.some((body) => body.includes("smtp-created@example.test")),
    ).toBe(true);
    expect(captured.some((body) => body.includes("text/html"))).toBe(true);
    await mailJobs();
    expect(captured).toHaveLength(pending.n);
    expect(
      captured.some((body) =>
        body
          .replace(/=\r?\n/g, "")
          .replace(/=([0-9A-F]{2})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          )
          .includes("reset-password?token="),
      ),
    ).toBe(true);
    const [[sent]] = await h.db.query(
      "SELECT COUNT(*) n FROM mail_outbox WHERE sent_at IS NOT NULL AND body='' ",
    );
    expect(sent.n).toBeGreaterThan(0);
    const { promisify } = require("node:util");
    const { execFile } = require("node:child_process");
    const verified = await promisify(execFile)(
      process.execPath,
      ["scripts/check-mail.js"],
      {
        cwd: require("node:path").resolve(__dirname, "../.."),
        env: process.env,
      },
    );
    expect(verified.stdout).toContain("SMTP đã kết nối và xác thực thành công");
    expect(captured).toHaveLength(pending.n);
    await h
      .request(h.app)
      .post("/api/auth/forgot-password")
      .send({ email: h.getUsers()["Sales Rep"].email });
    rejectRecipient = true;
    await mailJobs();
    const [[failed]] = await h.db.query(
      "SELECT id,attempts,sent_at,last_error FROM mail_outbox WHERE sent_at IS NULL ORDER BY id DESC LIMIT 1",
    );
    expect(failed.sent_at).toBeNull();
    expect(failed.attempts).toBe(1);
    expect(failed.last_error).toBe("EENVELOPE");
    rejectRecipient = false;
    await h.db.query(
      "UPDATE mail_outbox SET next_attempt_at=UTC_TIMESTAMP() WHERE id=?",
      [failed.id],
    );
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    await h.db.query("RENAME TABLE crm_job_runs TO crm_job_runs_mail_check");
    try {
      const result = await runWorkerCycle();
      expect(result[0].status).toBe("rejected");
      expect(result[1].status).toBe("fulfilled");
    } finally {
      await h.db.query("RENAME TABLE crm_job_runs_mail_check TO crm_job_runs");
      errorLog.mockRestore();
    }
    const [[retried]] = await h.db.query(
      "SELECT sent_at,body,last_error FROM mail_outbox WHERE id=?",
      [failed.id],
    );
    expect(retried.sent_at).not.toBeNull();
    expect(retried.body).toBe("");
    expect(retried.last_error).toBeNull();
    expect(captured).toHaveLength(pending.n + 1);
    const decoded = captured.map((body) =>
      Buffer.from(
        body
          .replace(/=\r?\n/g, "")
          .replace(/=([0-9A-F]{2})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
          ),
        "latin1",
      ).toString("utf8"),
    );
    expect(decoded.some((body) => body.includes(temporary))).toBe(true);
    const initialLogin = await h
      .request(h.app)
      .post("/api/auth/login")
      .send({ email: "smtp-created@example.test", password: temporary });
    expect(initialLogin.status).toBe(200);
    expect(initialLogin.body.user.must_change_password).toBeTruthy();
    await h
      .request(h.app)
      .post("/api/auth/forgot-password")
      .send({ email: "smtp-created@example.test" });
    await mailJobs();
    const delivered = captured[captured.length - 1]
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
    const token = delivered.match(/reset-password\?token=([a-f0-9]+)/)[1];
    const reset = await h
      .request(h.app)
      .post("/api/auth/reset-password")
      .send({ token, new_password: "SmtpReset9!" });
    expect(reset.status).toBe(200);
    expect(
      (
        await h
          .request(h.app)
          .post("/api/auth/login")
          .send({ email: "smtp-created@example.test", password: "SmtpReset9!" })
      ).status,
    ).toBe(200);
    expect(
      (
        await h
          .request(h.app)
          .post("/api/auth/reset-password")
          .send({ token, new_password: "AgainReset9!" })
      ).status,
    ).toBe(400);
  } finally {
    for (const key of keys)
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Mail configuration and admin status reveal missing setup and queue counts without exposing secrets", async () => {
  const { mailConfiguration } = require("../../src/core/mailConfig");
  const absent = mailConfiguration({
    SMTP_USER: "mail@example.test",
    SMTP_PASS: "private-not-to-return",
  });
  expect(absent.configured).toBe(false);
  expect(absent.missing).toContain("SMTP_HOST");
  expect(
    mailConfiguration({ SMTP_HOST: "localhost", SMTP_FROM: "crm@example.test" })
      .configured,
  ).toBe(true);
  expect(
    mailConfiguration({
      SMTP_HOST: "smtp.example.test",
      SMTP_USER: "mail@example.test",
      SMTP_PORT: "465",
      SMTP_PASS: "private",
    }).options.secure,
  ).toBe(true);
  const status = await h.api("Admin", "get", "/api/admin/mail/status");
  expect(status.status).toBe(200);
  expect(status.body.queue).toHaveProperty("pending");
  expect(JSON.stringify(status.body)).not.toMatch(
    /SMTP_PASS|private-not-to-return|recipient|reset-password/,
  );
  expect(
    (await h.api("Director", "get", "/api/admin/mail/status")).status,
  ).toBe(403);
  expect(
    (await h.api("Sales Rep", "get", "/api/admin/mail/status")).status,
  ).toBe(403);
});
