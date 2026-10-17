const h = require("./helpers");
const { businessJobs } = require("../../src/jobs/worker");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
const leadBody = {
  full_name: "Lead person",
  company_name: "Lead company",
  email: "lead@example.test",
  phone: "0912345678",
  source_id: 1,
  industry: "Technology",
  region: "North",
};
async function lead(extra = {}) {
  const r = await h.api("Marketing", "post", "/api/leads", {
    ...leadBody,
    ...extra,
  });
  expect(r.status).toBe(201);
  return r.body.id;
}
test("S4-02: source mandatory; read/write lead forbidden to CS/accountant", async () => {
  expect(
    (
      await h.api("Marketing", "post", "/api/leads", {
        ...leadBody,
        source_id: null,
      })
    ).status,
  ).toBe(400);
  for (const role of ["Cust. Success", "Accountant"]) {
    expect((await h.api(role, "get", "/api/leads")).status).toBe(403);
    expect((await h.api(role, "post", "/api/leads", leadBody)).status).toBe(
      403,
    );
  }
});
test("S4-05: configurable scoring recalculates and never drops cold leads", async () => {
  const rid = await lead();
  const r = await h.api("Director", "put", "/api/leads/scoring-rules", {
    rules: [{ field_name: "industry", match_value: "Technology", points: 80 }],
    warm: 30,
    hot: 70,
  });
  expect(r.status).toBe(200);
  expect(
    (await h.api("Marketing", "get", "/api/leads/" + rid)).body.data
      .temperature,
  ).toBe("HOT");
  await h.api("Marketing", "put", "/api/leads/" + rid, { industry: "Other" });
  const updated = (await h.api("Marketing", "get", "/api/leads/" + rid)).body
    .data;
  expect(updated.temperature).toBe("COLD");
  expect(updated.status).toBe("NEW");
});
test("S4-06: priority and round-robin assignment are persistent and idempotent", async () => {
  await h.db.query("UPDATE leads SET status='QUEUED'");
  await h.db.query("UPDATE users SET group_id=1 WHERE id=?", [
    h.getUsers().salesChild.id,
  ]);
  const r = await h.api("Director", "put", "/api/leads/assignment-rules", {
    rules: [
      {
        name: "North",
        priority: 1,
        region: "North",
        group_id: 1,
        sla_minutes: 5,
      },
      { name: "Fallback", priority: 2, group_id: 2 },
    ],
  });
  expect(r.status).toBe(200);
  const a = await lead(),
    b = await lead({ email: "second@example.test" });
  await businessJobs();
  const [[la]] = await h.db.query("SELECT * FROM leads WHERE id=?", [a]);
  const [[lb]] = await h.db.query("SELECT * FROM leads WHERE id=?", [b]);
  expect(la.group_id).toBe(1);
  expect(lb.group_id).toBe(1);
  expect(la.owner_id).not.toBe(lb.owner_id);
  await businessJobs();
  const [[again]] = await h.db.query("SELECT * FROM leads WHERE id=?", [a]);
  expect(again.owner_id).toBe(la.owner_id);
});
test("S4-07: accept/reject, SLA and team notification", async () => {
  const rid = await lead();
  await h.api("Marketing", "post", `/api/leads/${rid}/assign`, {
    owner_id: h.getUsers()["Sales Rep"].id,
    reason: "Test assignment",
    sla_minutes: 1,
  });
  expect(
    (await h.api("Sales Rep", "post", `/api/leads/${rid}/reject`, {})).status,
  ).toBe(400);
  expect(
    (await h.api("Sales Rep", "post", `/api/leads/${rid}/accept`, {})).status,
  ).toBe(200);
  await h.db.query(
    "UPDATE leads SET sla_due_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE id=?",
    [rid],
  );
  await businessJobs();
  expect(
    (await h.api("Sales Rep", "get", "/api/leads/" + rid)).body.data
      .sla_breached,
  ).toBe(1);
  expect(
    (await h.api("Team Lead", "get", "/api/notifications")).body.data.some(
      (n) => n.event_key === "lead-sla:" + rid,
    ),
  ).toBe(true);
  await h.api("Sales Rep", "post", `/api/leads/${rid}/activities`, {
    content: "Called customer",
  });
  expect(
    (await h.api("Sales Rep", "get", "/api/leads/" + rid)).body.data
      .sla_breached,
  ).toBe(0);
});
test("S4-08: conversion rolls back on failure, preserves history, cannot run twice", async () => {
  const rid = await lead();
  await h.api("Marketing", "post", `/api/leads/${rid}/assign`, {
    owner_id: h.getUsers()["Sales Rep"].id,
  });
  await h.api("Sales Rep", "post", `/api/leads/${rid}/activities`, {
    content: "Original lead history",
  });
  const [[before]] = await h.db.query("SELECT COUNT(*) n FROM customers");
  expect(
    (await h.api("Sales Rep", "post", `/api/leads/${rid}/convert`, {})).status,
  ).toBe(400);
  const [[after]] = await h.db.query("SELECT COUNT(*) n FROM customers");
  expect(after.n).toBe(before.n);
  const data = {
    deal: { stage_id: 1, expected_close_date: "2099-01-01", amount: 100 },
  };
  const r = await h.api("Sales Rep", "post", `/api/leads/${rid}/convert`, data);
  expect(r.status).toBe(201);
  const [[history]] = await h.db.query(
    "SELECT COUNT(*) n FROM customer_activities WHERE customer_id=? AND content=?",
    [r.body.customer_id, "Original lead history"],
  );
  expect(history.n).toBe(1);
  expect(
    (await h.api("Sales Rep", "post", `/api/leads/${rid}/convert`, data))
      .status,
  ).toBe(409);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/leads/" + rid, {
        full_name: "Changed",
      })
    ).status,
  ).toBe(409);
});
test("S4-04: duplicate comparison and merge preserve both activity histories", async () => {
  const a = await lead(),
    b = await lead();
  for (const rid of [a, b])
    await h.api("Marketing", "post", `/api/leads/${rid}/activities`, {
      content: "History " + rid,
    });
  const dup = await h.api("Marketing", "get", "/api/leads/duplicates");
  expect(dup.status).toBe(200);
  expect(
    dup.body.data.some(
      (x) => x.lead.id === a && x.matches.some((m) => m.id === b),
    ),
  ).toBe(true);
  expect(
    (
      await h.api("Marketing", "post", "/api/leads/merge", {
        target_id: a,
        source_id: b,
      })
    ).status,
  ).toBe(200);
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM lead_activities WHERE lead_id=?",
    [a],
  );
  expect(n.n).toBe(2);
  expect(
    (
      await h.api("Marketing", "put", "/api/leads/" + b, {
        full_name: "Changed",
      })
    ).status,
  ).toBe(409);
});
test("S5-01/02: opportunity validation, own kanban and cross-owner writes", async () => {
  const rid = await h.deal();
  expect((await h.api("salesB", "get", "/api/deals/" + rid)).status).toBe(403);
  expect(
    (await h.api("salesB", "put", `/api/deals/${rid}/stage`, { stage_id: 2 }))
      .status,
  ).toBe(403);
  expect((await h.api("Marketing", "post", "/api/deals", {})).status).toBe(403);
  const r = await h.api("Sales Rep", "get", "/api/deals/kanban");
  expect(r.status).toBe(200);
  expect(r.body.data.find((x) => x.id === 1).deals.map((x) => x.id)).toContain(
    rid,
  );
  const cid = await h.customer(),
    ct = await h.contact("Sales Rep", cid);
  const base = {
    title: "Invalid",
    customer_id: cid,
    contact_id: ct,
    source_id: 1,
    stage_id: 1,
  };
  expect(
    (
      await h.api("Sales Rep", "post", "/api/deals", {
        ...base,
        expected_close_date: "2000-01-01",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Sales Rep", "post", "/api/deals", {
        ...base,
        expected_close_date: "2099-01-01",
        probability: 99,
      })
    ).status,
  ).toBe(400);
});
test("S5-03: product lines recalculate persisted value and annual subscription", async () => {
  const p = await h.api("Director", "post", "/api/products", {
    code: "SUB",
    name: "Subscription",
    unit: "month",
    type: "SUBSCRIPTION",
    list_price: 100,
    floor_price: 80,
    cost_price: 40,
  });
  expect(p.status).toBe(201);
  const rid = await h.deal();
  expect(
    (
      await h.api("Sales Rep", "put", `/api/deals/${rid}/items`, {
        items: [
          { product_id: p.body.id, quantity: 2, periods: 6, period_months: 1 },
        ],
      })
    ).status,
  ).toBe(200);
  const r = await h.api("Sales Rep", "get", "/api/deals/" + rid);
  expect(Number(r.body.data.amount)).toBe(1200);
  expect(Number(r.body.data.annual_value)).toBe(2400);
  expect(Number(r.body.data.items[0].unit_price)).toBe(100);
  expect(
    (await h.api("Director", "delete", "/api/products/" + p.body.id)).status,
  ).toBe(409);
});
test("S5-04: checks meeting on the actual deal; overrides require team role and reason", async () => {
  const rid = await h.deal();
  await h.db.query(
    "UPDATE pipeline_stages SET exit_condition='require_meeting' WHERE id=1",
  );
  expect(
    (
      await h.api("Sales Rep", "put", `/api/deals/${rid}/stage`, {
        stage_id: 2,
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await h.api("Sales Rep", "put", `/api/deals/${rid}/stage`, {
        stage_id: 2,
        override_reason: "No",
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await h.api("Team Lead", "put", `/api/deals/${rid}/stage`, {
        stage_id: 2,
        override_reason: "Approved exception",
      })
    ).status,
  ).toBe(200);
  const another = await h.deal();
  await h.api("Sales Rep", "post", `/api/deals/${another}/activities`, {
    activity_type: "meeting",
    content: "Actual meeting",
  });
  expect(
    (
      await h.api("Sales Rep", "put", `/api/deals/${another}/stage`, {
        stage_id: 2,
      })
    ).status,
  ).toBe(200);
  await h.db.query(
    "UPDATE pipeline_stages SET exit_condition='none' WHERE id=1",
  );
});
test("S5-05: close validates real amount/date/reason and closed records are immutable", async () => {
  const rid = await h.deal();
  expect(
    (
      await h.api("Sales Rep", "post", `/api/deals/${rid}/close`, {
        status: "WON",
        win_reason_id: 1,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Sales Rep", "post", `/api/deals/${rid}/close`, {
        status: "WON",
        win_reason_id: 1,
        actual_amount: 125,
        signed_date: "2026-10-17",
      })
    ).status,
  ).toBe(200);
  expect(
    (await h.api("Sales Rep", "put", `/api/deals/${rid}`, { title: "Changed" }))
      .status,
  ).toBe(409);
  expect(
    (
      await h.api("Sales Rep", "post", `/api/deals/${rid}/reopen`, {
        reason: "No",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await h.api("Team Lead", "post", `/api/deals/${rid}/reopen`, {
        reason: "Approved",
      })
    ).status,
  ).toBe(200);
});
test("S5-06: forecast is amount multiplied by stage probability, from SQL data", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const rid = await h.deal("Sales Rep", {
    amount: 1000,
    expected_close_date: today,
  });
  const r = await h.api("Director", "get", "/api/deals/forecast");
  expect(r.status).toBe(200);
  expect(r.body.data.this_month.forecast).toBe(200);
  await h.db.query("UPDATE pipeline_stages SET win_probability=40 WHERE id=1");
  const updated = await h.api("Director", "get", "/api/deals/forecast");
  expect(updated.body.data.this_month.forecast).toBe(400);
});
test("S5-07/08: daily job flags stalled deals, reassignment is atomic and audited", async () => {
  const rid = await h.deal();
  await h.db.query(
    "UPDATE deals SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY),expected_close_date=DATE_SUB(UTC_DATE(),INTERVAL 1 DAY) WHERE id=?",
    [rid],
  );
  await h.db.query(
    "UPDATE customer_activities SET created_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 30 DAY) WHERE deal_id=?",
    [rid],
  );
  await h.db.query("DELETE FROM crm_job_runs WHERE job_name='deal-flags'");
  await businessJobs();
  const flags = await h.api("Team Lead", "get", "/api/deals/flagged");
  expect(
    flags.body.data.some(
      (d) => d.id === rid && d.stagnant === 1 && d.overdue === 1,
    ),
  ).toBe(true);
  const r = await h.api("Team Lead", "post", "/api/deals/reassign", {
    ids: [rid],
    owner_id: h.getUsers().salesChild.id,
    reason: "Coverage",
  });
  expect(r.status).toBe(200);
  expect((await h.api("Sales Rep", "get", "/api/deals/" + rid)).status).toBe(
    403,
  );
  expect((await h.api("salesChild", "get", "/api/deals/" + rid)).status).toBe(
    200,
  );
  const [[n]] = await h.db.query(
    "SELECT COUNT(*) n FROM audit_logs WHERE entity_type='deals' AND entity_id=? AND action_type='OWNER_CHANGE'",
    [rid],
  );
  expect(n.n).toBe(1);
});
