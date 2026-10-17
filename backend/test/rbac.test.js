const h = require("./integration/helpers");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("S1-05: sales A cannot read customer B, including the 360 endpoint", async () => {
  const cid = await h.customer("salesB");
  for (const suffix of ["", "/360"]) {
    const r = await h.api("Sales Rep", "get", "/api/customers/" + cid + suffix);
    expect(r.status).toBe(403);
    expect(r.body.message).toContain("Từ chối truy cập");
  }
});
test("S1-05: sales can read own customer", async () => {
  const cid = await h.customer();
  const r = await h.api("Sales Rep", "get", "/api/customers/" + cid);
  expect(r.status).toBe(200);
  expect(r.body.data.created_by).toBe(h.getUsers()["Sales Rep"].id);
});
test("S1-05: list and search are scoped to owner", async () => {
  await h.customer("salesB", { company_name: "Hidden Business" });
  const r = await h.api("Sales Rep", "get", "/api/customers?search=Hidden");
  expect(r.status).toBe(200);
  expect(r.body.scope).toBe("OWN");
  expect(r.body.data).toHaveLength(0);
});
test("S1-05/S2-06: team lead includes child groups but excludes another team", async () => {
  const cid = await h.customer("salesChild");
  const other = await h.customer("salesB");
  const r = await h.api("Team Lead", "get", "/api/customers");
  expect(r.status).toBe(200);
  expect(r.body.scope).toBe("GROUP");
  expect(r.body.data.map((x) => x.id)).toContain(cid);
  expect(r.body.data.map((x) => x.id)).not.toContain(other);
});
test("S1-05: director reads all groups", async () => {
  const r = await h.api("Director", "get", "/api/customers");
  expect(r.status).toBe(200);
  expect(r.body.scope).toBe("ALL");
  expect(r.body.data.length).toBeGreaterThanOrEqual(4);
});
