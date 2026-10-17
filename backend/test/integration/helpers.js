// Fixtures live only in an explicitly disposable test database; application data is never seeded.
const crypto = require("crypto");
if (
  !/^crm_test(?:_[a-z0-9]+)?$/.test(process.env.DB_NAME || "") ||
  process.env.ALLOW_DB_TEST_RESET !== "1"
)
  throw new Error(
    "Integration tests require DB_NAME=crm_test and ALLOW_DB_TEST_RESET=1. Never run against application data.",
  );
process.env.JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
process.env.NODE_ENV = "test";
const { db } = require("../../src/core/store");
const { migrate, schema } = require("../../sql/migrate");
const { bcrypt } = require("../../src/core/auth");
const request = require("supertest");
const app = require("../../index");
const password = "IntegrationOnly9!";
const roles = [
  "Admin",
  "Director",
  "Team Lead",
  "Sales Rep",
  "Marketing",
  "Cust. Success",
  "Accountant",
];
let users, tokens;
async function setup() {
  await migrate();
  const c = await db.getConnection();
  try {
    await c.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of Object.keys(schema))
      if (table !== "crm_migrations")
        await c.query(`TRUNCATE TABLE \`${table}\``);
    await c.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    c.release();
  }
  await db.query(
    "INSERT INTO `groups` (id,name,parent_id) VALUES (1,'Team A',NULL),(2,'Team B',NULL),(3,'Child A',1)",
  );
  users = {};
  tokens = {};
  const hashed = await bcrypt.hash(password, 10);
  const fixtures = [
    ...roles.map((role, i) => ({
      key: role,
      role,
      group:
        role === "Team Lead" || role === "Sales Rep" || role === "Cust. Success"
          ? 1
          : null,
    })),
    { key: "salesB", role: "Sales Rep", group: 2 },
    { key: "salesChild", role: "Sales Rep", group: 3 },
  ];
  for (const [i, f] of fixtures.entries()) {
    const uid = i + 1,
      mail = `test${uid}@example.test`;
    await db.query(
      "INSERT INTO users (id,email,password,full_name,role_code,group_id) VALUES (?,?,?,?,?,?)",
      [uid, mail, hashed, f.key, f.role, f.group],
    );
    await db.query("INSERT INTO user_roles (user_id,role_code) VALUES (?,?)", [
      uid,
      f.role,
    ]);
    users[f.key] = { id: uid, email: mail, group_id: f.group };
    const r = await request(app)
      .post("/api/auth/login")
      .send({ email: mail, password });
    if (r.status !== 200)
      throw new Error("Fixture login failed: " + JSON.stringify(r.body));
    tokens[f.key] = r.body.token;
  }
  await db.query("UPDATE `groups` SET leader_id=? WHERE id=1", [
    users["Team Lead"].id,
  ]);
  await db.query(
    "INSERT INTO sales_categories (id,type,code,name) VALUES (1,'lead_source','WEBSITE','Website'),(2,'industry','TECH','Technology')",
  );
  await db.query(
    "INSERT INTO pipeline_stages (id,code,name,win_probability,probability,sort_order,exit_condition,stagnant_days) VALUES (1,'DISCOVERY','Discovery',20,20,1,'none',7),(2,'PROPOSAL','Proposal',60,60,2,'none',7)",
  );
  await db.query(
    "INSERT INTO deal_reasons (id,name,type) VALUES (1,'Fit','WON'),(2,'Budget','LOST')",
  );
  return { users, tokens };
}
function api(role, method, url, body) {
  const req = request(app)
    [method](url)
    .set("Authorization", "Bearer " + tokens[role]);
  if (/\/(export|template)(\?|$)|\/files\/\d+$/.test(url))
    req.buffer(true).parse((res, cb) => {
      const chunks = [];
      res.on("data", (b) => chunks.push(b));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  return body === undefined ? req : req.send(body);
}
async function customer(role = "Sales Rep", extra = {}) {
  const r = await api(role, "post", "/api/customers", {
    company_name: "Business " + crypto.randomUUID(),
    ...extra,
  });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body.id;
}
async function contact(role, cid) {
  const r = await api(role, "post", "/api/contacts/customer/" + cid, {
    full_name: "Contact",
    phone: "0912345678",
  });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body.contactId;
}
async function deal(role = "Sales Rep", extra = {}) {
  const cid = await customer(role);
  const contactId = await contact(role, cid);
  const r = await api(role, "post", "/api/deals", {
    title: "Opportunity",
    customer_id: cid,
    contact_id: contactId,
    stage_id: 1,
    source_id: 1,
    expected_close_date: "2099-01-01",
    amount: 100,
    ...extra,
  });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body.id;
}
module.exports = {
  setup,
  api,
  customer,
  contact,
  deal,
  db,
  app,
  request,
  password,
  roles,
  getUsers: () => users,
  getTokens: () => tokens,
};
