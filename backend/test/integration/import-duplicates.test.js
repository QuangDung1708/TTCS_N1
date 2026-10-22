const h = require("./helpers");
const ExcelJS = require("exceljs");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
for (const entity of ["customers", "leads"]) {
  const row =
    entity === "customers"
      ? {
          company_name: "Exact import business",
          email: "exact@example.test",
          phone: "0912345678",
        }
      : {
          full_name: "Exact import lead",
          company_name: "Lead business",
          email: "exact-lead@example.test",
          source_id: 1,
        };
  test(`${entity}: preview detects same-file duplicates without persisting; execution and repeat cannot bypass rejection`, async () => {
    const preview = await h.api(
      "Admin",
      "post",
      `/api/${entity}/import/preview`,
      { rows: [row, row] },
    );
    expect(preview.status).toBe(200);
    expect(preview.body.valid).toBe(1);
    expect(preview.body.invalid).toBe(1);
    expect(preview.body.data[1].duplicate_blocked).toBe(true);
    const [[count]] = await h.db.query(
      `SELECT COUNT(*) n FROM ${entity} WHERE company_name=?`,
      [row.company_name],
    );
    expect(Number(count.n)).toBe(0);
    const execute = await h.api(
      "Admin",
      "post",
      `/api/${entity}/import/execute`,
      { rows: [row, row] },
    );
    expect(execute.body.imported).toBe(1);
    expect(execute.body.skipped).toBe(1);
    const repeat = await h.api("Admin", "post", `/api/${entity}/import-batch`, {
      rows: [{ ...row, duplicate_action: "update" }],
    });
    expect(repeat.body.imported).toBe(0);
    expect(repeat.body.data[0].duplicate_blocked).toBe(true);
    const exported = await h.api("Admin", "get", `/api/${entity}/export`);
    const previewExport = await h
      .request(h.app)
      .post(`/api/${entity}/import/preview`)
      .set("Authorization", "Bearer " + h.getTokens().Admin)
      .attach("file", exported.body, "roundtrip.xlsx");
    expect(previewExport.body.valid).toBe(0);
    expect(previewExport.body.data.every((r) => r.duplicate_blocked)).toBe(
      true,
    );
  });
  test(`${entity}: concurrent direct imports insert only one identical record; changed information remains valid`, async () => {
    const next = { ...row, company_name: row.company_name + " parallel" };
    const results = await Promise.all(
      [1, 2].map(() =>
        h.api("Admin", "post", `/api/${entity}/import/execute`, {
          rows: [next],
        }),
      ),
    );
    expect(results.reduce((sum, r) => sum + r.body.imported, 0)).toBe(1);
    const changed = await h.api(
      "Admin",
      "post",
      `/api/${entity}/import/preview`,
      { rows: [{ ...next, email: "changed@example.test" }] },
    );
    expect(changed.body.valid).toBe(1);
  });
}
test("Customer import preserves changed tax-code update but rejects an identical update", async () => {
  const row = {
    company_name: "Tax update",
    tax_code: "1234567890",
    phone: "0912345678",
  };
  expect(
    (
      await h.api("Admin", "post", "/api/customers/import/execute", {
        rows: [row],
      })
    ).body.imported,
  ).toBe(1);
  const blocked = await h.api(
    "Admin",
    "post",
    "/api/customers/import/execute",
    { rows: [{ ...row, duplicate_action: "update" }] },
  );
  expect(blocked.body.imported).toBe(0);
  const changed = await h.api(
    "Admin",
    "post",
    "/api/customers/import/execute",
    { rows: [{ ...row, phone: "0987654321", duplicate_action: "update" }] },
  );
  expect(changed.body.imported).toBe(1);
  const [[count]] = await h.db.query(
    "SELECT COUNT(*) n FROM customers WHERE tax_code=?",
    [row.tax_code],
  );
  expect(Number(count.n)).toBe(1);
});
test("Pipeline export uses shared Vietnamese workbook, related names and numeric money while keeping scope", async () => {
  await h.deal("Sales Rep", { title: "Visible export", amount: 1234567 });
  await h.deal("salesB", { title: "Hidden export" });
  const result = await h.api("Sales Rep", "get", "/api/deals/export");
  expect(result.status).toBe(200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(result.body);
  const sheet = book.getWorksheet("Dữ liệu");
  const headers = sheet.getRow(1).values;
  expect(headers).toContain("Tên cơ hội");
  expect(headers).toContain("Người liên hệ chính");
  expect(headers).not.toContain("owner_id");
  expect(sheet.rowCount).toBe(2);
  expect(sheet.getCell(2, headers.indexOf("Tên cơ hội")).value).toBe(
    "Visible export",
  );
  expect(sheet.getCell(2, headers.indexOf("Giá trị dự kiến (VNĐ)")).value).toBe(
    1234567,
  );
  expect(sheet.getCell(2, headers.indexOf("Người liên hệ chính")).value).toBe(
    "Contact",
  );
  expect(sheet.views[0].ySplit).toBe(1);
  expect(sheet.autoFilter).toBeTruthy();
  expect(sheet.getCell("A1").fill.fgColor.argb).toBe("FF173B63");
});
test("S4-05 recalculates existing leads after rules and input changes; score cannot be overwritten in a lead payload", async () => {
  const lead = await h.api("Admin", "post", "/api/leads", {
    full_name: "Auto score",
    company_name: "Scoring",
    email: "score-ac@example.test",
    source_id: 1,
    industry: "Technology",
    score: 999,
  });
  expect(lead.status).toBe(201);
  expect(
    (
      await h.api("Admin", "put", "/api/leads/scoring-rules", {
        warm: 30,
        hot: 70,
        rules: [
          { field_name: "industry", match_value: "Technology", points: 80 },
        ],
      })
    ).status,
  ).toBe(200);
  let [[saved]] = await h.db.query(
    "SELECT score,temperature FROM leads WHERE id=?",
    [lead.body.id],
  );
  expect(Number(saved.score)).toBe(80);
  expect(saved.temperature).toBe("HOT");
  expect(
    (
      await h.api("Admin", "put", "/api/leads/" + lead.body.id, {
        industry: "Other",
        score: 999,
        temperature: "HOT",
      })
    ).status,
  ).toBe(200);
  [[saved]] = await h.db.query(
    "SELECT score,temperature FROM leads WHERE id=?",
    [lead.body.id],
  );
  expect(Number(saved.score)).toBe(0);
  expect(saved.temperature).toBe("COLD");
  expect(
    (
      await h.api("Sales Rep", "put", "/api/leads/scoring-rules", {
        warm: 10,
        hot: 20,
        rules: [],
      })
    ).status,
  ).toBe(403);
});
