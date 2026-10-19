const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const ExcelJS = require("exceljs");
const { HEADERS, ROLES, GROUPS, template, parse } = require("../src/excel");
const { createStore } = require("../src/store");
const { createService } = require("../src/service");
const { createApp } = require("../src/app");
const good = (email = "an@example.test") => [
  "Nguyễn Văn An",
  email,
  "Demo12345!",
  "Sales Rep",
  GROUPS[2],
  "0934567890",
];
async function workbook(rows, headers = HEADERS) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Nguoi dung");
  sheet.addRow(headers);
  rows.forEach((r) => sheet.addRow(r));
  return book.xlsx.writeBuffer();
}
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "n1-279-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "users.json");
  const store = createStore(filename);
  let time = 2_000_000;
  return {
    store,
    filename,
    service: createService({ store, now: () => time }),
    advance: (value) => {
      time += value;
    },
  };
}
test("Template: real XLSX, six headers, phone Text, named dropdown lists and three valid rows", async (t) => {
  const x = setup(t),
    buffer = await template();
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  assert.deepEqual(book.worksheets[0].getRow(1).values.slice(1), HEADERS);
  assert.equal(book.worksheets[0].getCell("F2").value, "0934567890");
  assert.deepEqual(book.worksheets[0].getCell("D2").dataValidation.formulae, [
    "DanhSachVaiTro",
  ]);
  assert.equal(book.definedNames.getRanges("DanhSachVaiTro").ranges.length, 1);
  assert.equal(book.worksheets.length, 3);
  const result = await x.service.preview(buffer);
  assert.equal(result.total, 3);
  assert.equal(result.valid, 3);
  assert.equal(x.store.state.users.length, 0);
});
test("Preview row numbers, per-row errors, empty row skipped; no passwords exposed", async (t) => {
  const x = setup(t);
  const bad = good("bad-email");
  bad[2] = "weak";
  bad[3] = "Unknown";
  bad[4] = "Missing";
  bad[5] = "123";
  const preview = await x.service.preview(await workbook([good(), [], bad]));
  assert.equal(preview.valid, 1);
  assert.equal(preview.invalid, 1);
  assert.deepEqual(
    preview.rows.map((r) => r.row),
    [2, 4],
  );
  assert.equal(preview.rows[1].errors.length, 5);
  assert.ok(!JSON.stringify(preview).includes("Demo12345!"));
  assert.ok(!JSON.stringify(preview).includes("weak"));
});
test("Execute imports good row, skips bad row, hashes password, persists and idempotent retry", async (t) => {
  const x = setup(t);
  const p = await x.service.preview(await workbook([good(), good("invalid")]));
  const result = await x.service.execute(p.previewId);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.total, 2);
  assert.equal(result.rows[1].status, "SKIPPED");
  assert.equal(x.store.state.users.length, 1);
  const user = createStore(x.filename).state.users[0];
  assert.equal(user.email, "an@example.test");
  assert.ok(!JSON.stringify(user).includes("Demo12345!"));
  const [salt, hash] = user.passwordHash.split(":");
  assert.deepEqual(
    await promisify(crypto.scrypt)("Demo12345!", salt, 64),
    Buffer.from(hash, "hex"),
  );
  assert.deepEqual(await x.service.execute(p.previewId), result);
  assert.equal(x.store.state.users.length, 1);
});
test("Duplicates in file: all copies invalid, case insensitive; existing email cannot be recreated", async (t) => {
  const x = setup(t);
  const p = await x.service.preview(
    await workbook([
      good(),
      good("AN@example.test"),
      good("other@example.test"),
    ]),
  );
  assert.equal(p.valid, 1);
  assert.equal(p.invalid, 2);
  await x.service.execute(p.previewId);
  const again = await x.service.preview(
    await workbook([good("other@example.test")]),
  );
  assert.equal(again.valid, 0);
  assert.match(again.rows[0].errors.join(" "), /đã tồn tại/);
  await assert.rejects(
    x.service.execute(again.previewId),
    (e) => e.status === 422,
  );
});
test("Concurrent previews revalidate on execute; only one account is created", async (t) => {
  const x = setup(t),
    buffer = await workbook([good()]);
  const a = await x.service.preview(buffer),
    b = await x.service.preview(buffer);
  const results = await Promise.allSettled([
    x.service.execute(a.previewId),
    x.service.execute(b.previewId),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(x.store.state.users.length, 1);
});
test("Concurrent retry of same preview returns same result without duplicate write", async (t) => {
  const x = setup(t),
    p = await x.service.preview(await workbook([good()]));
  const [a, b] = await Promise.all([
    x.service.execute(p.previewId),
    x.service.execute(p.previewId),
  ]);
  assert.deepEqual(a, b);
  assert.equal(x.store.state.users.length, 1);
});
test("Preview expires at 15min; unknown id rejected, no account saved", async (t) => {
  const x = setup(t),
    p = await x.service.preview(await workbook([good()]));
  x.advance(15 * 60_000);
  await assert.rejects(x.service.execute(p.previewId), (e) => e.status === 410);
  await assert.rejects(x.service.execute("fake"), (e) => e.status === 410);
  assert.equal(x.store.state.users.length, 0);
});
test("Malformed/header/empty/oversized row count rejected; formula invalid only its row", async (t) => {
  const x = setup(t);
  await assert.rejects(x.service.preview(Buffer.from("not excel")), /bị hỏng/);
  await assert.rejects(
    x.service.preview(await workbook([good()], ["Wrong"])),
    /Tiêu đề/,
  );
  await assert.rejects(x.service.preview(await workbook([])), /không có dòng/);
  const many = new ExcelJS.Workbook(),
    sheet = many.addWorksheet("Data");
  sheet.addRow(HEADERS);
  sheet.getCell("A1002").value = "Out of range";
  await assert.rejects(
    x.service.preview(await many.xlsx.writeBuffer()),
    /1.000/,
  );
  const formula = good("formula@example.test");
  formula[0] = { formula: "1+1", result: 2 };
  const p = await x.service.preview(await workbook([formula, good()]));
  assert.equal(p.invalid, 1);
  assert.equal(p.valid, 1);
  assert.match(p.rows[0].errors.join(" "), /công thức/);
});
test("Phone +84 normalized; required name/role/group and numeric phone missing zero rejected", async (t) => {
  const x = setup(t);
  const a = good();
  a[5] = "+84 934 567 890";
  a[3] = "sales rep";
  const b = good("b@example.test");
  b[0] = "";
  b[3] = "";
  b[4] = "";
  b[5] = 934567890;
  const c = good("c@example.test");
  c[5] = "";
  const p = await x.service.preview(await workbook([a, b, c]));
  assert.equal(p.valid, 2);
  assert.equal(p.rows[0].phone, "0934567890");
  assert.equal(p.rows[0].role, "Sales Rep");
  assert.equal(p.rows[1].errors.length, 4);
});
test("Downloadable report reads as XLSX and contains results/errors without passwords", async (t) => {
  const x = setup(t),
    p = await x.service.preview(await workbook([good(), good("bad")]));
  let book = new ExcelJS.Workbook();
  await book.xlsx.load(await x.service.downloadReport(p.previewId));
  assert.equal(book.worksheets[0].getCell("D2").value, "Hợp lệ");
  await x.service.execute(p.previewId);
  book = new ExcelJS.Workbook();
  await book.xlsx.load(await x.service.downloadReport(p.previewId));
  assert.equal(book.worksheets[0].getCell("D2").value, "Đã nhập");
  assert.equal(book.worksheets[0].getCell("D3").value, "Bỏ qua");
  assert.ok(!JSON.stringify(book.model).includes("Demo12345!"));
});
test("HTTP upload, template, missing/wrong/large file, execute and report", async (t) => {
  const x = setup(t),
    server = createApp(x.service).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = async (buffer, name) => {
    const body = new FormData();
    body.append("file", new Blob([buffer]), name);
    return fetch(base + "/api/import/users/preview", { method: "POST", body });
  };
  const templateResponse = await fetch(base + "/api/import/users/template");
  assert.equal(templateResponse.status, 200);
  assert.match(
    templateResponse.headers.get("content-disposition"),
    /mau-nhap-nguoi-dung.xlsx/,
  );
  const templateBuffer = Buffer.from(await templateResponse.arrayBuffer());
  assert.equal((await parse(templateBuffer)).length, 3);
  assert.equal((await upload(Buffer.from("bad"), "data.csv")).status, 400);
  assert.equal(
    (await upload(Buffer.alloc(2 * 1024 * 1024 + 1), "data.xlsx")).status,
    400,
  );
  assert.equal(
    (await fetch(base + "/api/import/users/preview", { method: "POST" }))
      .status,
    400,
  );
  const response = await upload(
    await workbook([good(), good("bad")]),
    "test.xlsx",
  );
  assert.equal(response.status, 200);
  const p = await response.json();
  const execution = await fetch(base + "/api/import/users/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      previewId: p.previewId,
      rows: [{ email: "hacked@example.test" }],
    }),
  });
  assert.equal(execution.status, 200);
  assert.equal((await execution.json()).imported, 1);
  assert.equal(x.store.state.users[0].email, "an@example.test");
  assert.equal(
    (await fetch(base + `/api/import/users/${p.previewId}/report`)).status,
    200,
  );
});
