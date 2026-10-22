const h = require("./helpers");
const XLSX = require("xlsx");
const { hash } = require("../../src/core/auth");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("S1-05: draft quote list/detail/search/export and writes obey owner/team scope", async () => {
  const did = await h.deal("Sales Rep", { amount: 1000 });
  const q = await h.api("Sales Rep", "post", "/api/quotes", {
    deal_id: did,
    title: "Private quote",
    discount_percent: 10,
  });
  expect(q.status).toBe(201);
  const own = await h.api("Sales Rep", "get", "/api/quotes/" + q.body.id);
  expect(Number(own.body.data.amount)).toBe(900);
  for (const [method, path, body] of [
    ["get", "/api/quotes/" + q.body.id],
    ["put", "/api/quotes/" + q.body.id, { discount_percent: 20 }],
    ["delete", "/api/quotes/" + q.body.id],
  ])
    expect((await h.api("salesB", method, path, body)).status).toBe(403);
  expect(
    (await h.api("salesB", "get", "/api/quotes?search=Private")).body.data,
  ).toHaveLength(0);
  expect(
    (await h.api("Team Lead", "get", "/api/quotes/" + q.body.id)).status,
  ).toBe(200);
  expect((await h.api("Marketing", "get", "/api/quotes")).status).toBe(403);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/quotes/" + q.body.id, {
        discount_percent: 20,
      })
    ).status,
  ).toBe(200);
  const exported = await h.api("salesB", "get", "/api/quotes/export");
  expect(exported.status).toBe(200);
  const wb = XLSX.read(exported.body, { type: "buffer" });
  expect(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])).toHaveLength(0);
  const audit = await h.api(
    "Admin",
    "get",
    "/api/audit-logs?entity_type=quotes",
  );
  expect(
    audit.body.data.some((a) => a.action_type === "DISCOUNT_OR_OWNER_CHANGE"),
  ).toBe(true);
});
test("S1-05: activities use the same scoped customer/deal ownership in lists, exports and direct access", async () => {
  const cid = await h.customer();
  const a = await h.api("Sales Rep", "post", "/api/activities", {
    customer_id: cid,
    content: "Private activity",
    activity_type: "meeting",
  });
  expect(a.status).toBe(201);
  expect(
    (await h.api("salesB", "get", "/api/activities/" + a.body.id)).status,
  ).toBe(403);
  expect(
    (await h.api("salesB", "get", "/api/activities?search=Private")).body.data,
  ).toHaveLength(0);
  expect(
    (await h.api("Team Lead", "get", "/api/activities/" + a.body.id)).status,
  ).toBe(200);
  expect((await h.api("Accountant", "get", "/api/activities")).status).toBe(
    403,
  );
  const exported = await h.api("Sales Rep", "get", "/api/activities/export");
  const wb = XLSX.read(exported.body, { type: "buffer" });
  expect(
    XLSX.utils
      .sheet_to_json(wb.Sheets[wb.SheetNames[0]])
      .some((r) => r.id === a.body.id),
  ).toBe(true);
});
test("S5-04: require_quote blocks actual transition until a persisted quote exists", async () => {
  const d = await h.deal();
  await h.api("Director", "put", "/api/pipeline-stages/1", {
    exit_condition: "require_quote",
  });
  expect(
    (await h.api("Sales Rep", "put", `/api/deals/${d}/stage`, { stage_id: 2 }))
      .status,
  ).toBe(422);
  expect(
    (await h.api("Sales Rep", "post", "/api/quotes", { deal_id: d })).status,
  ).toBe(201);
  expect(
    (await h.api("Sales Rep", "put", `/api/deals/${d}/stage`, { stage_id: 2 }))
      .status,
  ).toBe(200);
  await h.api("Director", "put", "/api/pipeline-stages/1", {
    exit_condition: "none",
  });
});
test("S1-02: expired DB sessions fail independently of the JWT expiry", async () => {
  await h.db.query(
    "UPDATE auth_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE token_hash=?",
    [hash(h.getTokens()["Cust. Success"])],
  );
  expect((await h.api("Cust. Success", "get", "/api/auth/me")).status).toBe(
    401,
  );
});
test("S1-03: reset links last 30 minutes and an expired token is rejected", async () => {
  const email = h.getUsers().Director.email;
  await h.request(h.app).post("/api/auth/forgot-password").send({ email });
  const [[token]] = await h.db.query(
    "SELECT *,TIMESTAMPDIFF(MINUTE,UTC_TIMESTAMP(),expires_at) remaining FROM auth_reset_tokens WHERE user_id=? ORDER BY id DESC LIMIT 1",
    [h.getUsers().Director.id],
  );
  expect(token.remaining).toBeGreaterThanOrEqual(29);
  const [[mail]] = await h.db.query(
    "SELECT body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
    [email],
  );
  const raw = mail.body.match(/token=([a-f0-9]+)/)[1];
  await h.db.query(
    "UPDATE auth_reset_tokens SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE id=?",
    [token.id],
  );
  expect(
    (
      await h
        .request(h.app)
        .post("/api/auth/reset-password")
        .send({ token: raw, newPassword: "ValidPassword9" })
    ).status,
  ).toBe(400);
});
