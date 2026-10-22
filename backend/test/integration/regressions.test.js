const h = require("./helpers");
const crypto = require("crypto");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("Customer 360, aggregates, timeline and Excel do not reveal another deal owner data", async () => {
  const cid = await h.customer();
  const ct = await h.contact("Sales Rep", cid);
  const d = await h.api("Director", "post", "/api/deals", {
    title: "Private cross-owner deal",
    customer_id: cid,
    contact_id: ct,
    owner_id: h.getUsers().salesB.id,
    stage_id: 1,
    source_id: 1,
    expected_close_date: "2099-01-01",
  });
  expect(d.status).toBe(201);
  expect(
    (
      await h.api("salesB", "post", `/api/deals/${d.body.id}/activities`, {
        content: "Private cross-owner activity",
        activity_type: "meeting",
      })
    ).status,
  ).toBe(201);
  expect(
    (
      await h.api("salesB", "post", `/api/deals/${d.body.id}/close`, {
        status: "WON",
        actual_amount: 987654321,
        signed_date: "2026-10-17",
        win_reason_id: 1,
      })
    ).status,
  ).toBe(200);
  const profile = await h.api("Sales Rep", "get", `/api/customers/${cid}/360`);
  expect(profile.status).toBe(200);
  expect(profile.body.data.signedValue).toBe(0);
  expect(profile.body.data.groupTotalValue).toBe(0);
  expect(profile.body.data.deals).toHaveLength(0);
  expect(
    profile.body.data.activities.some(
      (a) => a.content === "Private cross-owner activity",
    ),
  ).toBe(false);
  const list = await h.api("Sales Rep", "get", "/api/customers");
  expect(list.body.data.find((c) => c.id === cid).total_contract_value).toBe(0);
  expect(
    (await h.api("Accountant", "get", `/api/customers/${cid}/360`)).body.data
      .activities,
  ).toHaveLength(0);
});
test("Marketing reports use owned scope even though customer module allows global writes", async () => {
  await h.customer("Sales Rep");
  const marketing = await h.api("Marketing", "get", "/api/dashboard/stats");
  expect(marketing.status).toBe(200);
  expect(marketing.body.kpi.totalCustomers).toBe(0);
});
test("Inactive custom fields preserve existing values and do not block future edits", async () => {
  const f = await h.api("Admin", "post", "/api/custom-fields", {
    field_name: "Old field",
    field_key: "old_field",
    field_type: "text",
    entity_type: "customer",
    is_required: true,
  });
  expect(f.status).toBe(201);
  const cid = await h.customer("Sales Rep", {
    custom_fields: { old_field: "Preserved" },
  });
  expect(
    (
      await h.api("Admin", "put", "/api/custom-fields/" + f.body.id, {
        is_active: false,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/customers/" + cid, {
        company_name: "Edited after field deactivation",
      })
    ).status,
  ).toBe(200);
  const [[stored]] = await h.db.query(
    "SELECT custom_fields FROM customers WHERE id=?",
    [cid],
  );
  expect(JSON.parse(stored.custom_fields)).toEqual({ old_field: "Preserved" });
});
test("Invalid images and oversized avatar return client errors, including the legacy upload URL", async () => {
  const token = h.getTokens()["Sales Rep"];
  for (const route of ["/api/users/profile/avatar", "/api/users/avatar"]) {
    const invalid = await h
      .request(h.app)
      .post(route)
      .set("Authorization", "Bearer " + token)
      .attach("avatar", Buffer.from("not an image"), {
        filename: "wrong.png",
        contentType: "image/png",
      });
    expect(invalid.status).toBe(400);
  }
  const large = await h
    .request(h.app)
    .post("/api/users/avatar")
    .set("Authorization", "Bearer " + token)
    .attach("avatar", Buffer.alloc(2 * 1024 * 1024 + 1), {
      filename: "big.png",
      contentType: "image/png",
    });
  expect(large.status).toBe(413);
});
test("Malformed filters and fractional pagination do not result in server errors", async () => {
  expect(
    (await h.api("Sales Rep", "get", "/api/customers?custom_fields=not-json"))
      .status,
  ).toBe(400);
  const p = await h.api("Admin", "get", "/api/users?page=1.7&pageSize=1.5");
  expect(p.status).toBe(200);
  expect(p.body.pageSize).toBe(1);
  expect((await h.api("Sales Rep", "get", "/api/customers/false")).status).toBe(
    400,
  );
});
test("Admin full access includes legacy product cost audit strings", async () => {
  await h.db.query(
    "INSERT INTO audit_logs (user_id,user_name,action_type,entity_type,entity_id,before_value,after_value) VALUES (?,?,?,?,?,?,?)",
    [
      h.getUsers().Director.id,
      "Director",
      "UPDATE",
      "products",
      1,
      "Old cost 1234",
      "New cost 5678",
    ],
  );
  const r = await h.api("Admin", "get", "/api/audit-logs?entity_type=products");
  expect(r.status).toBe(200);
  expect(JSON.stringify(r.body)).toContain("1234");
  expect(JSON.stringify(r.body)).toContain("5678");
});
test("Legacy lock URL performs handover and immediately invalidates the previous session", async () => {
  const cid = await h.customer("salesChild");
  const uid = h.getUsers().salesChild.id;
  expect(
    (
      await h.api("Admin", "put", `/api/users/${uid}/lock`, {
        receiver_id: h.getUsers()["Sales Rep"].id,
      })
    ).status,
  ).toBe(200);
  expect((await h.api("salesChild", "get", "/api/auth/me")).status).toBe(401);
  const [[c]] = await h.db.query(
    "SELECT created_by FROM customers WHERE id=?",
    [cid],
  );
  expect(c.created_by).toBe(h.getUsers()["Sales Rep"].id);
});
test("Updating pipeline configuration does not break editing existing opportunities", async () => {
  const cid = await h.customer();
  const contact = await h.contact("Sales Rep", cid);
  const created = await h.api("Sales Rep", "post", "/api/deals", {
    title: "Configuration resilience",
    customer_id: cid,
    contact_id: contact,
    stage_id: 1,
    source_id: 1,
    expected_close_date: "2099-01-01",
  });
  expect(created.status).toBe(201);
  expect(
    (
      await h.api("Director", "put", "/api/pipeline-stages/1", {
        probability: 90,
        is_active: false,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/deals/" + created.body.id, {
        title: "Edited after configuration change",
      })
    ).status,
  ).toBe(200);
  const after = (
    await h.api("Sales Rep", "get", "/api/deals/" + created.body.id)
  ).body.data;
  expect(Number(after.probability)).toBe(20);
  await h.api("Director", "put", "/api/pipeline-stages/1", { is_active: true });
});
test("Financial overflow returns a validation error and keeps the prior product lines intact", async () => {
  const cid = await h.customer(),
    ct = await h.contact("Sales Rep", cid);
  const d = await h.api("Sales Rep", "post", "/api/deals", {
    title: "Overflow check",
    customer_id: cid,
    contact_id: ct,
    stage_id: 1,
    source_id: 1,
    expected_close_date: "2099-01-01",
  });
  const p = await h.api("Director", "post", "/api/products", {
    code: "OVERFLOW",
    name: "Large value",
    unit: "Unit",
    type: "ONE_TIME",
    list_price: 1e12,
    floor_price: 0,
  });
  expect(p.status).toBe(201);
  expect(
    (
      await h.api("Sales Rep", "put", `/api/deals/${d.body.id}/items`, {
        items: [{ product_id: p.body.id, quantity: 1000000 }],
      })
    ).status,
  ).toBe(400);
  const [[count]] = await h.db.query(
    "SELECT COUNT(*) n FROM deal_items WHERE deal_id=?",
    [d.body.id],
  );
  expect(count.n).toBe(0);
});
test("Opt-in OTP registration cannot request a privileged role and consumes the code once", async () => {
  const previous = process.env.ALLOW_SELF_REGISTRATION;
  process.env.ALLOW_SELF_REGISTRATION = "true";
  try {
    const email = "registration@example.test";
    const r = await h
      .request(h.app)
      .post("/api/auth/send-register-otp")
      .send({ email });
    expect(r.status).toBe(200);
    const [[mail]] = await h.db.query(
      "SELECT body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
      [email],
    );
    const otp = mail.body.match(/\b\d{6}\b/)[0];
    const body = {
      email,
      full_name: "New registration",
      password: "SecureRegistration9",
      confirm_password: "SecureRegistration9",
      otp_code: otp,
      role_code: "Admin",
      roles: ["Admin"],
    };
    expect(
      (await h.request(h.app).post("/api/auth/register").send(body)).status,
    ).toBe(201);
    expect(
      (await h.request(h.app).post("/api/auth/register").send(body)).status,
    ).toBe(409);
    const [[u]] = await h.db.query(
      "SELECT role_code FROM users WHERE email=?",
      [email],
    );
    expect(u.role_code).toBe("Sales Rep");
  } finally {
    if (previous === undefined) delete process.env.ALLOW_SELF_REGISTRATION;
    else process.env.ALLOW_SELF_REGISTRATION = previous;
  }
});
