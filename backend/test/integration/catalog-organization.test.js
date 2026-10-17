const h = require("./helpers");
const XLSX = require("xlsx");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("S2-07: category CRUD, references and display order are persisted", async () => {
  const first = await h.api("Director", "post", "/api/categories", {
    type: "industry",
    name: "Manufacturing",
    code: "MANU",
  });
  expect(first.status).toBe(201);
  const second = await h.api("Director", "post", "/api/categories", {
    type: "industry",
    name: "Logistics",
    code: "LOG",
  });
  expect(second.status).toBe(201);
  expect(
    (
      await h.api(
        "Director",
        "put",
        `/api/categories/${second.body.id}/swap-order`,
        { direction: "UP" },
      )
    ).status,
  ).toBe(200);
  const items = (
    await h.api("Sales Rep", "get", "/api/categories?type=industry")
  ).body.data;
  expect(items.find((x) => x.id === second.body.id).sort_order).toBeLessThan(
    items.find((x) => x.id === first.body.id).sort_order,
  );
  await h.customer("Sales Rep", { industry: "Manufacturing" });
  expect(
    (await h.api("Director", "delete", "/api/categories/" + first.body.id))
      .status,
  ).toBe(409);
  expect(
    (
      await h.api("Director", "put", "/api/categories/" + second.body.id, {
        name: "Logistics 2",
        status: "inactive",
      })
    ).status,
  ).toBe(200);
  expect(
    (await h.api("Director", "delete", "/api/categories/" + second.body.id))
      .status,
  ).toBe(200);
  expect(
    (
      await h.api("Director", "post", "/api/categories", {
        type: "unknown",
        name: "Wrong",
        code: "X",
      })
    ).status,
  ).toBe(400);
});
test("S2-09: stage configuration, swaps, immutable existing deal stage and referenced deletion", async () => {
  const first = await h.api("Director", "post", "/api/pipeline-stages", {
    code: "NEW",
    name: "New stage",
    probability: 75,
    exit_condition: "require_products",
  });
  expect(first.status).toBe(201);
  const second = await h.api("Director", "post", "/api/deals/stages", {
    code: "NEXT",
    name: "Next stage",
    probability: 90,
  });
  expect(second.status).toBe(201);
  expect(
    (
      await h.api("Director", "post", "/api/pipeline-stages/swap-order", {
        id1: first.body.id,
        id2: second.body.id,
      })
    ).status,
  ).toBe(200);
  const deal = await h.deal();
  expect(
    (await h.api("Director", "delete", "/api/pipeline-stages/1")).status,
  ).toBe(409);
  expect(
    (
      await h.api("Director", "put", "/api/pipeline-stages/1", {
        name: "Updated discovery",
        probability: 30,
      })
    ).status,
  ).toBe(200);
  const after = (await h.api("Sales Rep", "get", "/api/deals/" + deal)).body
    .data;
  expect(after.stage_id).toBe(1);
  expect(after.probability).toBe("20.00");
  expect(
    (
      await h.api(
        "Sales Rep",
        "post",
        "/api/pipeline-stages/validate-transition",
        { deal_id: deal, next_stage_id: 2 },
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await h.api(
        "Director",
        "post",
        "/api/pipeline-stages/validate-transition",
        { deal_id: deal, next_stage_id: 2 },
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api(
        "Director",
        "put",
        "/api/deals/stages/" + second.body.id + "/swap-order",
        { direction: "UP" },
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api("Director", "post", "/api/pipeline-stages", {
        code: "BAD",
        name: "Wrong",
        probability: 101,
      })
    ).status,
  ).toBe(400);
});
test("S2-10: competitor and distinct won/lost reason CRUD; referenced reason cannot be removed", async () => {
  const competitor = await h.api("Director", "post", "/api/deals/competitors", {
    name: "Competitor",
    website: "https://example.test",
  });
  expect(competitor.status).toBe(201);
  expect(
    (
      await h.api("Director", "put", "/api/competitors/" + competitor.body.id, {
        strengths: "Delivery",
      })
    ).status,
  ).toBe(200);
  const reason = await h.api("Director", "post", "/api/deals/reasons", {
    name: "Another loss",
    type: "LOSS",
  });
  expect(reason.status).toBe(201);
  const deal = await h.deal();
  expect(
    (
      await h.api("Sales Rep", "post", `/api/deals/${deal}/close`, {
        status: "LOST",
        loss_reason_id: reason.body.id,
        competitor_id: competitor.body.id,
      })
    ).status,
  ).toBe(200);
  expect(
    (await h.api("Director", "delete", "/api/deal-reasons/" + reason.body.id))
      .status,
  ).toBe(409);
  expect(
    (
      await h.api(
        "Director",
        "delete",
        "/api/competitors/" + competitor.body.id,
      )
    ).status,
  ).toBe(409);
  const unused = await h.api("Director", "post", "/api/competitors", {
    name: "Unused",
  });
  expect(
    (await h.api("Director", "delete", "/api/competitors/" + unused.body.id))
      .status,
  ).toBe(200);
});
test("S2-06: organization creation assigns leader, geography, members; prevents loops and orphaned groups", async () => {
  const region = await h.api("Director", "post", "/api/organization/regions", {
    name: "North",
    code: "N",
  });
  expect(region.status).toBe(201);
  const leader = h.getUsers()["salesB"].id;
  const group = await h.api("Director", "post", "/api/organization/groups", {
    name: "New region group",
    leader_id: leader,
    region_id: region.body.id,
    parent_id: 1,
  });
  expect(group.status).toBe(200);
  const tree = await h.api("Director", "get", "/api/organization/tree");
  expect(
    tree.body.data.find((g) => g.id === 1).children.map((g) => g.id),
  ).toContain(group.body.id);
  const [[u]] = await h.db.query("SELECT group_id FROM users WHERE id=?", [
    leader,
  ]);
  expect(u.group_id).toBe(group.body.id);
  const [[r]] = await h.db.query(
    "SELECT COUNT(*) n FROM user_roles WHERE user_id=? AND role_code='Team Lead'",
    [leader],
  );
  expect(r.n).toBe(1);
  expect(
    (
      await h.api("Director", "put", "/api/organization/groups/1", {
        parent_id: group.body.id,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Director", "post", "/api/organization/groups", {
        name: "No leader",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api(
        "Director",
        "post",
        `/api/organization/groups/${group.body.id}/assign-member`,
        { user_id: h.getUsers().salesChild.id },
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api("Director", "get", `/api/groups/${group.body.id}/members`)
    ).body.data.map((x) => x.id),
  ).toContain(h.getUsers().salesChild.id);
  expect(
    (
      await h.api(
        "Director",
        "delete",
        `/api/organization/groups/${group.body.id}`,
      )
    ).status,
  ).toBe(409);
  expect((await h.api("Director", "get", "/api/groups/tree")).status).toBe(200);
  expect(
    (await h.api("Director", "get", "/api/organization/regions")).status,
  ).toBe(200);
});
test("S1-08: admin search, pagination, role filter and email edit preserve account identity", async () => {
  const uid = h.getUsers()["Accountant"].id;
  expect(
    (
      await h.api("Admin", "put", "/api/users/" + uid, {
        full_name: "Finance",
        email: "finance@example.test",
      })
    ).status,
  ).toBe(200);
  const found = await h.api(
    "Admin",
    "get",
    "/api/users?search=finance&role=Accountant&status=" +
      encodeURIComponent("Hoạt động") +
      "&pageSize=1",
  );
  expect(found.status).toBe(200);
  expect(found.body.data).toHaveLength(1);
  expect(found.body.data[0].id).toBe(uid);
  expect(found.body.pageSize).toBe(1);
  expect(
    (await h.api("Admin", "get", "/api/users/roles/list")).body.data,
  ).toHaveLength(7);
  expect((await h.api("Admin", "get", "/api/users/groups/list")).status).toBe(
    200,
  );
  expect(
    (await h.api("Admin", "get", "/api/users/" + uid + "/customers-count"))
      .status,
  ).toBe(200);
});
test("S2-08: select/date fields validate and deal custom fields are filterable and exported", async () => {
  const choice = await h.api("Admin", "post", "/api/custom-fields", {
    field_name: "Segment",
    field_key: "segment",
    field_type: "select",
    entity_type: "deal",
    options: ["Enterprise", "SMB"],
    is_required: true,
  });
  expect(choice.status).toBe(201);
  const dateField = await h.api("Admin", "post", "/api/custom-fields", {
    field_name: "Review date",
    field_key: "review_date",
    field_type: "date",
    entity_type: "deal",
    is_required: false,
  });
  expect(dateField.status).toBe(201);
  const own = await h.deal("Sales Rep", {
    custom_fields: { segment: "Enterprise", review_date: "2099-01-01" },
  });
  const filter = encodeURIComponent(JSON.stringify({ segment: "Enterprise" }));
  const filtered = await h.api(
    "Sales Rep",
    "get",
    "/api/deals?owner_id=" +
      h.getUsers()["Sales Rep"].id +
      "&status=OPEN&custom_fields=" +
      filter,
  );
  expect(filtered.body.data.map((d) => d.id)).toContain(own);
  const exported = await h.api("Sales Rep", "get", "/api/deals/export");
  expect(exported.status).toBe(200);
  const wb = XLSX.read(exported.body, { type: "buffer" }),
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  expect(rows.some((r) => r.segment === "Enterprise")).toBe(true);
  expect(
    (
      await h.api("Admin", "put", "/api/custom-fields/" + choice.body.id, {
        field_type: "number",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await h.api("Admin", "put", "/api/custom-fields/" + choice.body.id, {
        is_required: false,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/deals/" + own, {
        custom_fields: { segment: "Invalid" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/deals/" + own, {
        custom_fields: { segment: "SMB", review_date: "2099-02-30" },
      })
    ).status,
  ).toBe(400);
  expect(
    (await h.api("Sales Rep", "get", "/api/custom-fields?entity_type=deal"))
      .status,
  ).toBe(200);
});
test("S3-04: near-identical company names and canonical website hosts are detected", async () => {
  const a = await h.customer("Sales Rep", {
      company_name: "Acme Technologies Vietnam",
      website: "https://www.acme.test/about",
    }),
    b = await h.customer("Sales Rep", {
      company_name: "Acme Technologes Vietnam",
      website: "acme.test",
    });
  const r = await h.api("Team Lead", "get", "/api/customers/detect-duplicates");
  expect(r.status).toBe(200);
  const pair = r.body.data.find((x) => x.left.id === a && x.right.id === b);
  expect(pair.reasons).toContain("company_name");
  expect(pair.reasons).toContain("website");
});
test("S5-06: forecast compares persisted targets and scoped dashboard uses real totals", async () => {
  const today = new Date(),
    year = today.getUTCFullYear(),
    month = today.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const uid = h.getUsers()["Sales Rep"].id;
  const target = await h.api("Director", "post", "/api/targets", {
    user_id: uid,
    start_date: from,
    end_date: to,
    amount: 2000,
  });
  expect(target.status).toBe(201);
  expect(
    (
      await h.api("Director", "post", "/api/targets", {
        user_id: uid,
        start_date: from,
        end_date: to,
        amount: 100,
      })
    ).status,
  ).toBe(409);
  const forecast = await h.api(
    "Director",
    "get",
    "/api/deals/forecast?owner_id=" + uid + "&group_id=1",
  );
  expect(forecast.status).toBe(200);
  expect(forecast.body.data.this_month.target).toBe(2000);
  const dashboard = await h.api("Sales Rep", "get", "/api/dashboard/stats");
  expect(dashboard.status).toBe(200);
  expect(dashboard.body.kpi.totalCustomers).toBeGreaterThan(0);
  expect(Number.isFinite(dashboard.body.kpi.targetProgress)).toBe(true);
  expect(
    (await h.api("Sales Rep", "get", "/api/dashboard/notifications")).status,
  ).toBe(200);
  expect(
    (await h.api("Sales Rep", "get", "/api/audit-logs/notifications")).status,
  ).toBe(200);
  const audit = await h.api(
    "Admin",
    "get",
    "/api/audit-logs?entity_type=sales_targets&from=" + from + "&to=" + to,
  );
  expect(audit.status).toBe(200);
  expect(audit.body.data.some((x) => x.entity_id === target.body.id)).toBe(
    true,
  );
});
test("S4-09: scoped filters, saved filters and team waiting queue", async () => {
  const r = await h.api("Marketing", "post", "/api/leads", {
    full_name: "Queue person",
    company_name: "Queue business",
    email: "queue-lead@example.test",
    source_id: 1,
  });
  expect(r.status).toBe(201);
  const queue = await h.api(
    "Team Lead",
    "get",
    "/api/leads?status=NEW&source_id=1&temperature=COLD&search=Queue&from=2000-01-01&to=2099-01-01",
  );
  expect(queue.status).toBe(200);
  expect(queue.body.data.map((x) => x.id)).toContain(r.body.id);
  const f = await h.api("Sales Rep", "post", "/api/leads/saved-filters", {
    filter_name: "High priority",
    criteria: { temperature: "HOT" },
  });
  expect(f.status).toBe(201);
  expect(
    (await h.api("Sales Rep", "get", "/api/leads/saved-filters")).body.data.map(
      (x) => x.id,
    ),
  ).toContain(f.body.id);
  expect(
    (
      await h.api(
        "Sales Rep",
        "delete",
        "/api/leads/saved-filters/" + f.body.id,
      )
    ).status,
  ).toBe(200);
});
test("Configurable care days and per-user read notifications persist", async () => {
  expect(
    (await h.api("Director", "put", "/api/settings", { care_days: 45 })).status,
  ).toBe(200);
  expect(
    (await h.api("Director", "get", "/api/settings")).body.data.some(
      (r) => r.setting_key === "care_days" && r.setting_value === "45",
    ),
  ).toBe(true);
  await h.db.query(
    "INSERT INTO crm_notifications (user_id,event_key,message) VALUES (?,?,?)",
    [h.getUsers()["Sales Rep"].id, "test-read", "Read this"],
  );
  const r = await h.api("Sales Rep", "get", "/api/notifications");
  const n = r.body.data.find((x) => x.event_key === "test-read");
  expect(
    (
      await h.api(
        "Sales Rep",
        "put",
        "/api/notifications/" + n.id + "/read",
        {},
      )
    ).status,
  ).toBe(200);
  const [[stored]] = await h.db.query(
    "SELECT read_at FROM crm_notifications WHERE id=?",
    [n.id],
  );
  expect(stored.read_at).not.toBeNull();
});
