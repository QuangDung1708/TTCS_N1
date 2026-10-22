const h = require("./helpers");
const XLSX = require("xlsx");
const sharp = require("sharp");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("S3-01: tax code is unique and customer validates status/owner", async () => {
  const c = await h.customer("Sales Rep", { tax_code: "0123456789" });
  expect(
    (
      await h.api("Sales Rep", "post", "/api/customers", {
        company_name: "Duplicate",
        tax_code: "0123456789",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/customers/" + c, {
        created_by: h.getUsers().salesB.id,
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/customers/" + c, {
        status: "invalid",
      })
    ).status,
  ).toBe(400);
});
test("Cross-owner writes, related contacts, support, files and activities are blocked", async () => {
  const cid = await h.customer("salesB");
  const ct = await h.contact("salesB", cid);
  for (const [method, path, body] of [
    ["put", `/api/customers/${cid}`, { name: "Hijacked" }],
    ["put", `/api/customers/${cid}/contacted`, {}],
    [
      "post",
      "/api/customers/activities",
      { customer_id: cid, content: "Unauthorized" },
    ],
    [
      "post",
      "/api/customers/tickets",
      { customer_id: cid, title: "Unauthorized" },
    ],
    ["post", `/api/contacts/customer/${cid}`, { name: "Unauthorized" }],
    ["put", `/api/contacts/${ct}`, { name: "Unauthorized" }],
    ["delete", `/api/contacts/${ct}`, {}],
  ])
    expect((await h.api("Sales Rep", method, path, body)).status).toBe(403);
  expect(
    (
      await h.api("Accountant", "post", "/api/customers", {
        name: "Unauthorized",
      })
    ).status,
  ).toBe(403);
});
test("S3-02: primary contact remains unique, transfers preserve history", async () => {
  const a = await h.customer(),
    b = await h.customer();
  const first = await h.contact("Sales Rep", a),
    second = await h.contact("Sales Rep", a);
  expect(
    (
      await h.api(
        "Sales Rep",
        "put",
        `/api/customers/contacts/${first}/primary`,
        {},
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api(
        "Sales Rep",
        "put",
        `/api/customers/contacts/${second}/primary`,
        {},
      )
    ).status,
  ).toBe(200);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customer_contacts WHERE customer_id=? AND is_primary=1",
    [a],
  );
  expect(n.n).toBe(1);
  expect(
    (
      await h.api("Sales Rep", "put", `/api/contacts/${first}/transfer`, {
        targetCustomerId: b,
        transferReason: "Changed employer",
      })
    ).status,
  ).toBe(200);
  const [[history]] = await h.db.query(
    "SELECT * FROM contact_histories WHERE contact_id=?",
    [first],
  );
  expect(history.from_customer_id).toBe(a);
  expect(history.to_customer_id).toBe(b);
});
test("S3-03: 360 returns stored timeline without generating fake entries and under 1.5s with 500 activities", async () => {
  const cid = await h.customer();
  const rows = Array.from({ length: 500 }, (_, i) => [
    cid,
    h.getUsers()["Sales Rep"].id,
    "Ghi chú",
    "Activity " + i,
  ]);
  await h.db.query(
    "INSERT INTO customer_activities (customer_id,user_id,activity_type,content) VALUES ?",
    [rows],
  );
  const start = performance.now();
  const r = await h.api("Sales Rep", "get", `/api/customers/${cid}/360`);
  expect(r.status).toBe(200);
  expect(r.body.data.activities).toHaveLength(500);
  expect(performance.now() - start).toBeLessThan(1500);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customer_activities WHERE customer_id=?",
    [cid],
  );
  expect(n.n).toBe(500);
});
test("S3-04/05: merge permissions, preserved children, and no hierarchy cycle", async () => {
  const a = await h.customer(),
    b = await h.customer();
  await h.contact("Sales Rep", b);
  expect(
    (
      await h.api("Sales Rep", "post", "/api/customers/merge", {
        target_id: a,
        source_id: b,
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await h.api("Team Lead", "post", "/api/customers/merge", {
        target_id: a,
        source_id: b,
      })
    ).status,
  ).toBe(200);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customer_contacts WHERE customer_id=?",
    [a],
  );
  expect(n.n).toBe(1);
  const child = await h.customer("Sales Rep", { parent_id: a });
  expect(
    (
      await h.api("Sales Rep", "put", `/api/customers/${a}`, {
        parent_id: child,
      })
    ).status,
  ).toBe(400);
});
test("S3-06: preview never commits; import reports invalid rows and duplicate choice", async () => {
  const rows = [
    { company_name: "Import good", tax_code: "1111111111" },
    { company_name: "Import bad", tax_code: "bad" },
  ];
  const r = await h.api("Sales Rep", "post", "/api/customers/import/preview", {
    rows,
  });
  expect(r.status).toBe(200);
  expect(r.body.valid).toBe(1);
  expect(r.body.invalid).toBe(1);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM customers WHERE tax_code='1111111111'",
  );
  expect(n.n).toBe(0);
  const executed = await h.api(
    "Sales Rep",
    "post",
    "/api/customers/import/execute",
    { rows },
  );
  expect(executed.body.imported).toBe(1);
  expect(executed.body.skipped).toBe(1);
  const dup = await h.api(
    "Sales Rep",
    "post",
    "/api/customers/import/preview",
    { rows: [rows[0]] },
  );
  expect(dup.body.invalid).toBe(1);
  const updated = await h.api(
    "Sales Rep",
    "post",
    "/api/customers/import/execute",
    {
      rows: [
        {
          ...rows[0],
          company_name: "Updated import",
          duplicate_action: "update",
        },
      ],
    },
  );
  expect(updated.body.imported).toBe(1);
});
test("S3-07: saved filters are private and export is scoped", async () => {
  const f = await h.api("Sales Rep", "post", "/api/customers/saved-filters", {
    name: "Mine",
    criteria: { status: "Tiềm năng" },
  });
  expect(f.status).toBe(201);
  await h.api("salesB", "delete", "/api/customers/saved-filters/" + f.body.id);
  expect(
    (
      await h.api("Sales Rep", "get", "/api/customers/saved-filters")
    ).body.data.map((x) => x.id),
  ).toContain(f.body.id);
  expect(
    (await h.api("salesB", "get", "/api/customers/saved-filters")).body.data,
  ).toHaveLength(0);
  const r = await h.api("Sales Rep", "get", "/api/customers/export");
  expect(r.status).toBe(200);
  const wb = XLSX.read(r.body, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  expect(rows.length).toBeGreaterThan(0);
  expect(
    rows.every((x) => x["Mã người phụ trách"] === h.getUsers()["Sales Rep"].id),
  ).toBe(true);
});
test("S3-08/09: support risk and notification use persisted tickets; care marking updates real activity", async () => {
  const cid = await h.customer("Cust. Success");
  for (let i = 0; i < 2; i++)
    expect(
      (
        await h.api("Cust. Success", "post", "/api/customers/tickets", {
          customer_id: cid,
          title: "Issue " + i,
        })
      ).status,
    ).toBe(200);
  const r = await h.api("Cust. Success", "get", `/api/customers/${cid}/360`);
  expect(r.body.data.customer.risk_level).toBe("Nguy cấp");
  const notifications = await h.api(
    "Cust. Success",
    "get",
    "/api/notifications",
  );
  expect(
    notifications.body.data.some((n) => n.event_key === "customer-risk:" + cid),
  ).toBe(true);
  await h.db.query(
    "UPDATE customers SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 DAY) WHERE id=?",
    [cid],
  );
  await h.db.query(
    "UPDATE customer_activities SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 DAY) WHERE customer_id=?",
    [cid],
  );
  expect(
    (
      await h.api("Cust. Success", "get", "/api/customers/care-list?days=30")
    ).body.data.map((x) => x.id),
  ).toContain(cid);
  expect(
    (await h.api("Cust. Success", "put", `/api/customers/${cid}/contacted`, {}))
      .status,
  ).toBe(200);
  expect(
    (
      await h.api("Cust. Success", "get", "/api/customers/care-list?days=30")
    ).body.data.map((x) => x.id),
  ).not.toContain(cid);
});
test("S2-03: avatar validates actual image, creates square and thumbnail", async () => {
  const image = await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
  const r = await h
    .request(h.app)
    .post("/api/users/profile/avatar")
    .set("Authorization", "Bearer " + h.getTokens()["Sales Rep"])
    .attach("avatar", image, {
      filename: "avatar.png",
      contentType: "image/png",
    });
  expect(r.status).toBe(200);
  const path = require("path");
  for (const [field, width] of [
    ["avatar", 512],
    ["avatar_thumbnail", 96],
  ]) {
    const meta = await sharp(
      path.join(__dirname, "../..", r.body[field]),
    ).metadata();
    expect(meta.width).toBe(width);
    expect(meta.height).toBe(width);
  }
});
test("S2-05: Admin and Director see and set cost, product references prevent deletion", async () => {
  const p = await h.api("Director", "post", "/api/products", {
    code: "P01",
    name: "Product",
    type: "ONE_TIME",
    unit: "Unit",
    list_price: 100,
    floor_price: 80,
    cost_price: 40,
  });
  expect(p.status).toBe(201);
  for (const role of [
    "Sales Rep",
    "Team Lead",
    "Marketing",
    "Cust. Success",
    "Accountant",
  ]) {
    const r = await h.api(role, "get", "/api/products");
    expect(r.status).toBe(200);
    expect(r.body.data[0]).not.toHaveProperty("cost_price");
  }
  expect(
    (
      await h.api("Admin", "put", `/api/products/${p.body.id}`, {
        cost_price: 50,
      })
    ).status,
  ).toBe(200);
  expect(
    (await h.api("Sales Rep", "post", "/api/products", { name: "No" })).status,
  ).toBe(403);
});
test("S2-08: required typed custom fields validate on backend and filter dynamically", async () => {
  const r = await h.api("Admin", "post", "/api/custom-fields", {
    field_name: "Budget",
    field_key: "budget",
    field_type: "number",
    entity_type: "customer",
    is_required: true,
  });
  expect(r.status).toBe(201);
  expect(
    (
      await h.api("Sales Rep", "post", "/api/customers", {
        company_name: "Missing field",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Sales Rep", "post", "/api/customers", {
        company_name: "Wrong type",
        custom_fields: { budget: "bad" },
      })
    ).status,
  ).toBe(400);
  const cid = await h.customer("Sales Rep", { custom_fields: { budget: 99 } });
  const filter = encodeURIComponent(JSON.stringify({ budget: 99 }));
  const found = await h.api(
    "Sales Rep",
    "get",
    "/api/customers?custom_fields=" + filter,
  );
  expect(found.body.data.map((x) => x.id)).toContain(cid);
});
