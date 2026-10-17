const { Router } = require("express");
const XLSX = require("xlsx");
const multer = require("multer");
const { db, transaction } = require("../core/store");
const { route, fail, id } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, requireRoles, record } = require("../core/access");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");
const headers = {
  user: ["full_name", "email", "phone", "role_code", "group_id"],
  customer: [
    "company_name",
    "tax_code",
    "industry",
    "company_size",
    "website",
    "address",
    "phone",
    "email",
    "status",
  ],
  lead: [
    "full_name",
    "email",
    "phone",
    "company_name",
    "interest",
    "source_id",
    "campaign_id",
    "industry",
    "company_size",
    "region",
    "interest_level",
  ],
};
function rows(req) {
  let data =
    req.body.rows ||
    req.body.usersToImport ||
    req.body.customers ||
    req.body.leads;
  if (req.file) {
    let book;
    try {
      book = XLSX.read(req.file.buffer, {
        type: "buffer",
        sheetRows: 1002,
      });
    } catch {
      fail(400, "Tệp Excel không hợp lệ.");
    }
    data = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {
      defval: null,
    });
  }
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      fail(400, "JSON không hợp lệ.");
    }
  }
  if (!Array.isArray(data) || !data.length || data.length > 1000)
    fail(400, "Cần từ 1 đến 1000 dòng.");
  return data;
}
async function apply(c, entity, user, row) {
  if (entity === "user")
    return require("./userRoutes").createUser(c, user, row);
  if (entity === "customer") {
    let existing;
    if (row.tax_code) {
      const [[r]] = await c.query("SELECT id FROM customers WHERE tax_code=?", [
        row.tax_code,
      ]);
      existing = r;
    }
    if (existing) {
      if (row.duplicate_action !== "update")
        fail(409, "Trùng mã số thuế. Chọn bỏ qua hoặc cập nhật.");
      await record(c, user, "CUSTOMER", "customers", existing.id, true);
    }
    return require("../core/customers").saveCustomer(
      c,
      user,
      row,
      existing?.id,
    );
  }
  if (entity === "lead") return require("../core/leads").saveLead(c, user, row);
}
function routerFor(entity) {
  const r = Router();
  r.use((req, res, next) =>
    /^\/(import(?:\/|$)|import-batch$|bulk-import$|export$)/.test(req.path)
      ? next()
      : next("router"),
  );
  r.use(
    authenticate,
    entity === "user"
      ? requireRoles("Admin")
      : authorize(entity === "customer" ? "CUSTOMER" : "LEAD"),
  );
  r.get(
    "/import/template",
    route(async (req, res) => {
      const sheet = XLSX.utils.aoa_to_sheet([headers[entity]]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Import");
      res
        .attachment(entity + "-template.xlsx")
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }),
  );
  r.post(
    "/import/preview",
    upload,
    route(async (req, res) => {
      const data = rows(req);
      const c = await db.getConnection();
      const result = [];
      try {
        await c.beginTransaction();
        for (let i = 0; i < data.length; i++) {
          await c.query("SAVEPOINT import_row");
          try {
            const rid = await apply(c, entity, req.user, data[i]);
            result.push({
              row: i + 2,
              valid: true,
              duplicate: !!(
                entity === "customer" && data[i].duplicate_action === "update"
              ),
              data: data[i],
            });
          } catch (e) {
            await c.query("ROLLBACK TO SAVEPOINT import_row");
            result.push({
              row: i + 2,
              valid: false,
              duplicate:
                e.code === "ER_DUP_ENTRY" ||
                (e.status === 409 && /^Trùng/.test(e.message)),
              error:
                e.code === "ER_DUP_ENTRY"
                  ? "Dữ liệu trùng."
                  : e.status
                    ? e.message
                    : "Dữ liệu không hợp lệ.",
              data: data[i],
            });
          }
        }
      } finally {
        await c.rollback();
        c.release();
      }
      res.json({
        data: result,
        valid: result.filter((x) => x.valid).length,
        invalid: result.filter((x) => !x.valid).length,
      });
    }),
  );
  const execute = route(async (req, res) => {
    const data = rows(req);
    const results = [];
    for (let i = 0; i < data.length; i++) {
      try {
        const rid = await transaction((c) =>
          apply(c, entity, req.user, data[i]),
        );
        results.push({ row: i + 2, success: true, id: rid });
      } catch (e) {
        results.push({
          row: i + 2,
          success: false,
          message:
            e.code === "ER_DUP_ENTRY"
              ? "Dữ liệu trùng."
              : e.status
                ? e.message
                : "Không thể nhập dòng này.",
        });
      }
    }
    res.json({
      data: results,
      imported: results.filter((r) => r.success).length,
      skipped: results.filter((r) => !r.success).length,
    });
  });
  r.post("/import/execute", upload, execute);
  r.post("/import-batch", execute);
  if (entity === "customer") r.post("/bulk-import", execute);
  if (entity !== "user")
    r.get(
      "/export",
      route(async (req, res) => {
        const result = await (
          entity === "customer"
            ? require("./customerRoutes")
            : require("./leadRoutes")
        ).list(req.user, req.query);
        const data = result.data.map((row) => {
          let cf = {};
          try {
            cf =
              typeof row.custom_fields === "string"
                ? JSON.parse(row.custom_fields)
                : row.custom_fields || {};
          } catch {}
          const out = { ...row, ...cf };
          delete out.custom_fields;
          delete out.custom_fields_data;
          for (const k of Object.keys(out))
            if (typeof out[k] === "string" && /^[=+@\-\t\r]/.test(out[k]))
              out[k] = "'" + out[k];
          return out;
        });
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.json_to_sheet(data),
          "Data",
        );
        res
          .attachment(entity + "-export.xlsx")
          .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
      }),
    );
  return r;
}
module.exports = routerFor;
