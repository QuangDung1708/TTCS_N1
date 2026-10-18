const h = require("./helpers");
const ExcelJS = require("exceljs");
const XLSX = require("xlsx");
const { mailHTML } = require("../../src/core/mailContent");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("Excel template is a styled table with frozen header, instructions and live catalog IDs; Vietnamese headings import", async () => {
  const r = await h.api("Marketing", "get", "/api/leads/import/template");
  expect(r.status).toBe(200);
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(r.body);
  const sheet = b.worksheets[0];
  expect(sheet.autoFilter).toBeTruthy();
  expect(sheet.getCell("A1").fill.fgColor.argb).toBe("FF173B63");
  expect(sheet.views[0].ySplit).toBe(1);
  expect(sheet.getColumn(1).width).toBeGreaterThanOrEqual(20);
  expect(b.getWorksheet("Hướng dẫn")).toBeTruthy();
  expect(
    b
      .getWorksheet("Danh mục")
      .getSheetValues()
      .flat()
      .some((v) => v === "Website"),
  ).toBe(true);
  const row = {
    "Họ và tên": "Excel tiếng Việt",
    "Tên doanh nghiệp": "Doanh nghiệp nhập",
    Email: "import-vn@example.test",
    "Mã nguồn lead": 1,
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([row]), "Dữ liệu");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const res = await h
    .request(h.app)
    .post("/api/leads/import/preview")
    .set("Authorization", "Bearer " + h.getTokens().Marketing)
    .attach("file", buf, "leads.xlsx");
  expect(res.status).toBe(200);
  expect(res.body.valid).toBe(1);
});
test("Lead owner changes save atomically, update group/SLA and cannot escape team scope", async () => {
  const created = await h.api("Marketing", "post", "/api/leads", {
    full_name: "Owner edit",
    company_name: "Owner",
    email: "owner-edit@example.test",
    source_id: 1,
    owner_id: h.getUsers()["Sales Rep"].id,
  });
  expect(created.status).toBe(201);
  const lid = created.body.id;
  let [[r]] = await h.db.query("SELECT * FROM leads WHERE id=?", [lid]);
  expect(r.owner_id).toBe(h.getUsers()["Sales Rep"].id);
  expect(r.group_id).toBe(1);
  expect(r.sla_due_at).toBeTruthy();
  const forbidden = await h.api("Team Lead", "put", "/api/leads/" + lid, {
    full_name: "Must rollback",
    owner_id: h.getUsers().salesB.id,
  });
  expect(forbidden.status).toBe(403);
  [[r]] = await h.db.query("SELECT * FROM leads WHERE id=?", [lid]);
  expect(r.full_name).toBe("Owner edit");
  const own = await h.api("Sales Rep", "put", "/api/leads/" + lid, {
    owner_id: h.getUsers().salesB.id,
  });
  expect(own.status).toBe(403);
});
test("Sales category code may be generated uniquely and appears immediately in shared metadata", async () => {
  for (const type of [
    "industry",
    "company_size",
    "lead_source",
    "activity_type",
  ]) {
    const r = await h.api("Director", "post", "/api/categories", {
      type,
      name: "Tên " + type,
    });
    expect(r.status).toBe(201);
    const list = await h.api("Sales Rep", "get", "/api/categories");
    const row = list.body.data.find((v) => v.id === r.body.id);
    expect(row.code).toMatch(new RegExp("^" + type.toUpperCase() + "_"));
  }
});
test("Mail HTML preserves Vietnamese text and clickable reset link without interpreting names as HTML", () => {
  const html = mailHTML(
    "Khôi phục",
    'Xin chào <img src=x>\nhttps://example.test/reset-password?token=abc&next="x"',
  );
  expect(html).toContain("&lt;img src=x&gt;");
  expect(html).not.toContain("<img src=x>");
  expect(html).toContain('<a href="https://example.test/');
  expect(html).toContain("&amp;next=&quot;x&quot;");
});
test("Sales can select campaign names without reading campaign budgets and reports", async () => {
  const campaign = await h.api("Marketing", "post", "/api/campaigns", {
    name: "Linked campaign",
    budget: 1000000,
    channel: "Website",
    start_date: "2026-10-18",
    end_date: "2026-11-18",
  });
  expect(campaign.status).toBe(200);
  const options = await h.api("Sales Rep", "get", "/api/campaigns/options");
  expect(options.status).toBe(200);
  expect(options.body.data.find((c) => c.id === campaign.body.id)).toEqual({
    id: campaign.body.id,
    name: "Linked campaign",
  });
  await h.api("Sales Rep", "post", "/api/leads", {
    full_name: "Export linked lead",
    company_name: "Export",
    email: "export-linked@example.test",
    source_id: 1,
    campaign_id: campaign.body.id,
  });
  const exported = await h.api("Sales Rep", "get", "/api/leads/export");
  const wb = XLSX.read(exported.body, { type: "buffer" });
  const row = XLSX.utils
    .sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    .find((r) => r["Họ và tên"] === "Export linked lead");
  expect(row["Tên nguồn lead"]).toBe("Website");
  expect(row["Tên chiến dịch"]).toBe("Linked campaign");
  expect((await h.api("Sales Rep", "get", "/api/campaigns")).status).toBe(403);
  expect(
    (await h.api("Accountant", "get", "/api/campaigns/options")).status,
  ).toBe(403);
});
test("Customer template includes configured fields and the formatted export can be imported with typed custom values", async () => {
  const field = await h.api("Admin", "post", "/api/custom-fields", {
    entity_type: "customer",
    field_name: "Số máy",
    field_key: "devices",
    field_type: "number",
    is_active: true,
    is_required: true,
  });
  expect(field.status).toBe(201);
  const template = await h.api(
    "Sales Rep",
    "get",
    "/api/customers/import/template",
  );
  const t = XLSX.read(template.body, { type: "buffer" });
  expect(
    XLSX.utils.sheet_to_json(t.Sheets[t.SheetNames[0]], { header: 1 })[0],
  ).toContain("devices");
  await h.customer("Sales Rep", {
    company_name: "=2+2",
    phone: "+84912345678",
    custom_fields: { devices: 42 },
  });
  const exported = await h.api("Sales Rep", "get", "/api/customers/export");
  const exportedBook = XLSX.read(exported.body, { type: "buffer" });
  const exportedSheet = exportedBook.Sheets[exportedBook.SheetNames[0]];
  expect(exportedSheet.A2.t).toBe("s");
  expect(exportedSheet.A2.f).toBeUndefined();
  const exportedRows = XLSX.utils.sheet_to_json(exportedSheet);
  expect(exportedRows[0]["Số điện thoại"]).toBe("0912345678");
  const preview = await h
    .request(h.app)
    .post("/api/customers/import/preview")
    .set("Authorization", "Bearer " + h.getTokens()["Sales Rep"])
    .attach("file", exported.body, "customers.xlsx");
  expect(preview.status).toBe(200);
  expect(preview.body.valid).toBe(0);
  expect(preview.body.data[0].duplicate_blocked).toBe(true);
  expect(preview.body.data[0].data.devices).toBe(42);
});

test("Reference catalogs persist once, preserve configured entries, and do not restore intentionally deleted values", async () => {
  const {
    initializeReferenceCatalogs,
  } = require("../../src/core/referenceCatalogs");
  const [[before]] = await h.db.query("SELECT COUNT(*) n FROM users");
  const first = await initializeReferenceCatalogs();
  expect(first.initialized).toBe(true);
  const [sizes] = await h.db.query(
    "SELECT * FROM sales_categories WHERE type='company_size'",
  );
  expect(sizes.some((r) => r.name === "51–200 nhân sự")).toBe(true);
  const [regions] = await h.db.query("SELECT * FROM regions");
  expect(regions.map((r) => r.name)).toContain("Miền Bắc");
  const [[existing]] = await h.db.query(
    "SELECT name FROM sales_categories WHERE id=1",
  );
  expect(existing.name).toBe("Website");
  const [[after]] = await h.db.query("SELECT COUNT(*) n FROM users");
  expect(after.n).toBe(before.n);
  await h.db.query(
    "UPDATE sales_categories SET name='Quy mô riêng' WHERE id=?",
    [sizes[0].id],
  );
  await h.db.query("DELETE FROM sales_categories WHERE id=?", [sizes[1].id]);
  const second = await initializeReferenceCatalogs();
  expect(second.initialized).toBe(false);
  const [[custom]] = await h.db.query(
    "SELECT name FROM sales_categories WHERE id=?",
    [sizes[0].id],
  );
  expect(custom.name).toBe("Quy mô riêng");
  const [[deleted]] = await h.db.query(
    "SELECT COUNT(*) n FROM sales_categories WHERE id=?",
    [sizes[1].id],
  );
  expect(deleted.n).toBe(0);
});

test("The six-column user template accepts group names and an optional validated temporary password", async () => {
  const template = await h.api("Admin", "get", "/api/users/import/template");
  expect(template.status).toBe(200);
  const book = XLSX.read(template.body, { type: "buffer" });
  expect(
    XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })[0],
  ).toEqual([
    "Tên",
    "Email",
    "Mật khẩu tạm thời",
    "Vai trò (RBAC)",
    "Nhóm kinh doanh",
    "Số điện thoại",
  ]);
  const row = {
    Tên: "Nhân sự Excel",
    Email: "six-columns@example.test",
    "Mật khẩu tạm thời": "Crm@123456",
    "Vai trò (RBAC)": "Sales Rep",
    "Nhóm kinh doanh": "Team A",
    "Số điện thoại": "0937261844",
  };
  const preview = await h.api("Admin", "post", "/api/users/import/preview", {
    rows: [row],
  });
  expect(preview.body.valid).toBe(1);
  const executed = await h.api("Admin", "post", "/api/users/import/execute", {
    rows: [row],
  });
  expect(executed.body.imported).toBe(1);
  const [[saved]] = await h.db.query(
    "SELECT password,group_id,must_change_password FROM users WHERE email=?",
    [row.Email],
  );
  expect(saved.group_id).toBe(1);
  expect(saved.must_change_password).toBe(1);
  expect(
    await require("../../src/core/auth").bcrypt.compare(
      "Crm@123456",
      saved.password,
    ),
  ).toBe(true);
  const bad = await h.api("Admin", "post", "/api/users/import/preview", {
    rows: [{ ...row, Email: "weak@example.test", "Mật khẩu tạm thời": "123" }],
  });
  expect(bad.body.invalid).toBe(1);
});

test("Excel exports have XML-safe cells, numeric totals and headers even with zero records", async () => {
  const { workbook } = require("../../src/core/workbook");
  const buffer = await workbook(
    "quote",
    ["title", "amount", "created_at"],
    [
      {
        title: "Tên\u0001\u000b có dấu & < >",
        amount: "1500000.00",
        created_at: new Date("invalid"),
      },
    ],
    false,
  );
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(buffer);
  expect(b.worksheets[0].getCell("A2").value).toBe("Tên có dấu & < >");
  expect(b.worksheets[0].getCell("B2").value).toBe(1500000);
  const empty = await h.api("salesB", "get", "/api/quotes/export");
  expect(empty.status).toBe(200);
  const w = XLSX.read(empty.body, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], {
    header: 1,
  });
  expect(rows[0]).toContain("Tên báo giá");
});
