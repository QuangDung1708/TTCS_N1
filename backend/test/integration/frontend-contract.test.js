const h = require("./helpers");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("UI session grants are authoritative, distinguish read/write roles and include recursive managed members", async () => {
  const lead = await h.api("Team Lead", "get", "/api/auth/me");
  expect(lead.status).toBe(200);
  expect(lead.body.managed_group_ids).toEqual(expect.arrayContaining([1, 3]));
  expect(lead.body.managed_user_ids).toContain(h.getUsers().salesChild.id);
  expect(lead.body.managed_user_ids).not.toContain(h.getUsers().salesB.id);
  await h.db.query(
    "INSERT INTO user_roles (user_id,role_code) VALUES (?,'Accountant')",
    [h.getUsers()["Sales Rep"].id],
  );
  const own = await h.api("Sales Rep", "get", "/api/auth/me");
  expect(own.body.grants.CUSTOMER).toEqual(
    expect.arrayContaining([
      { role: "Sales Rep", permission: "W*" },
      { role: "Accountant", permission: "R" },
    ]),
  );
});
test("UI directory includes child-team members and only active scoped identities", async () => {
  const r = await h.api("Team Lead", "get", "/api/customers/users-list");
  expect(r.body.data.map((u) => u.id)).toContain(h.getUsers().salesChild.id);
  expect(r.body.data.map((u) => u.id)).not.toContain(h.getUsers().salesB.id);
  expect(r.body.data.every((u) => !("password" in u))).toBe(true);
  expect(
    r.body.data.find((u) => u.id === h.getUsers()["Sales Rep"].id).roles,
  ).toContain("Sales Rep");
});
test("UI role matrix and real group member counts obey read authorization", async () => {
  expect(
    (await h.api("Director", "get", "/api/auth/role-matrix")).body.data,
  ).toEqual(require("../../src/config/roleMatrix"));
  expect(
    (await h.api("Sales Rep", "get", "/api/auth/role-matrix")).status,
  ).toBe(403);
  const r = await h.api("Admin", "get", "/api/organization/tree");
  expect(r.body.data.find((g) => g.id === 1).member_count).toBe(3);
});
test("Deal timeline filters preserve customer and owner scope", async () => {
  const did = await h.deal("Sales Rep");
  const [[d]] = await h.db.query("SELECT customer_id FROM deals WHERE id=?", [
    did,
  ]);
  const other = await h.customer();
  await h.api("Sales Rep", "post", "/api/activities", {
    customer_id: other,
    content: "Other customer note",
  });
  const r = await h.api("Sales Rep", "get", "/api/activities?deal_id=" + did);
  expect(r.body.data.length).toBeGreaterThan(0);
  expect(r.body.data.every((a) => a.deal_id === did)).toBe(true);
  const scoped = await h.api(
    "salesB",
    "get",
    "/api/activities?customer_id=" + d.customer_id,
  );
  expect(scoped.body.data).toEqual([]);
});
test("Public Ant Design form metadata is signed, minimal, uncached and creates a real sourced lead", async () => {
  const form = await h.api("Admin", "post", "/api/leads/forms", {
    name: "Website form",
    source_id: 1,
  });
  const meta = await h
    .request(h.app)
    .get(`/api/public/lead-forms/${form.body.public_key}/meta`);
  expect(meta.status).toBe(200);
  expect(meta.headers["cache-control"]).toBe("no-store");
  expect(Object.keys(meta.body).sort()).toEqual(["name", "signature", "stamp"]);
  const crypto = require("crypto");
  const stamp = String(Date.now() - 3000),
    signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(form.body.public_key + stamp)
      .digest("hex");
  const result = await h
    .request(h.app)
    .post(`/api/public/lead-forms/${form.body.public_key}`)
    .send({
      full_name: "Website visitor",
      company_name: "Actual submission",
      email: "visitor@example.test",
      phone: "0912345678",
      interest: "CRM",
      stamp,
      signature,
    });
  expect(result.status).toBe(201);
  const [[lead]] = await h.db.query(
    "SELECT source_id,status FROM leads WHERE id=?",
    [result.body.id],
  );
  expect(lead).toEqual({ source_id: 1, status: "NEW" });
});
test("User Roles: Director can read users but only Admin can mutate; Accountant has no AUTO access", async () => {
  expect((await h.api("Director", "get", "/api/users")).status).toBe(200);
  expect((await h.api("Director", "get", "/api/users/roles/list")).status).toBe(
    200,
  );
  expect(
    (await h.api("Director", "post", "/api/users", { full_name: "Forbidden" }))
      .status,
  ).toBe(403);
  expect(
    (await h.api("Director", "put", "/api/users/4/role", { roles: ["Admin"] }))
      .status,
  ).toBe(403);
  expect(
    (
      await h.api("Director", "put", "/api/users/4/status", {
        status: "inactive",
        receiver_id: 8,
      })
    ).status,
  ).toBe(403);
  expect((await h.api("Accountant", "get", "/api/notifications")).status).toBe(
    403,
  );
  expect(
    (await h.api("Accountant", "get", "/api/audit-logs/notifications")).status,
  ).toBe(403);
  expect((await h.api("Sales Rep", "get", "/api/notifications")).status).toBe(
    200,
  );
});
