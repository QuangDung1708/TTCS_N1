const { Router } = require("express");
const XLSX = require("xlsx");
const { workbook, normalize } = require("../core/workbook");
const multer = require("multer");
const { db } = require("../core/store");
const { route, fail } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, requireRoles, record } = require("../core/access");
const { lockImport, unlockImport } = require("../core/importDuplicates");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");
const headers = {
  user: [
    "full_name",
    "email",
    "temporary_password",
    "role_code",
    "group_name",
    "phone",
  ],
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
  return data
    .map(normalize)
    .filter((r) => Object.values(r).some((v) => v !== null && v !== ""));
}
async function apply(c, entity, user, row) {
  if (entity === "user") {
    if (row.group_name) {
      const [groups] = await c.query("SELECT id FROM `groups` WHERE name=?", [
        row.group_name,
      ]);
      if (groups.length !== 1)
        fail(
          400,
          groups.length
            ? "Tên nhóm bị trùng, dùng group_id để chọn chính xác."
            : "Nhóm kinh doanh không tồn tại.",
        );
      row = { ...row, group_id: groups[0].id };
    }
    return require("./userRoutes").createUser(c, user, row);
  }
  if (entity === "customer") {
    const [fields] = await c.query(
      "SELECT field_key FROM custom_fields WHERE entity_type='customer' AND is_active=1",
    );
    const custom = {};
    for (const f of fields)
      if (Object.hasOwn(row, f.field_key))
        custom[f.field_key] = row[f.field_key];
    if (Object.keys(custom).length)
      row = {
        ...row,
        custom_fields: { ...(row.custom_fields || {}), ...custom },
      };
    let existing;
    if (row.tax_code) {
      const [[r]] = await c.query("SELECT id FROM customers WHERE tax_code=?", [
        row.tax_code,
      ]);
      existing = r;
    }
    const update = existing && row.duplicate_action === "update";
    if (update)
      await record(c, user, "CUSTOMER", "customers", existing.id, true);
    return require("../core/customers").saveCustomer(
      c,
      user,
      row,
      update ? existing.id : undefined,
      { rejectExactDuplicate: true, taxConflict: !!existing && !update },
    );
  }
  if (entity === "lead")
    return require("../core/leads").saveLead(c, user, row, undefined, {
      rejectExactDuplicate: true,
    });
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
      const lookups = [];
      const templateKeys = [...headers[entity]];
      if (entity === "customer") {
        const [fields] = await db.query(
          "SELECT field_key,field_name FROM custom_fields WHERE entity_type='customer' AND is_active=1 ORDER BY id",
        );
        templateKeys.push(...fields.map((f) => f.field_key));
        lookups.push(
          ...fields.map((f) => ({
            type: "Trường tùy chỉnh",
            id: f.field_key,
            name: f.field_name,
          })),
        );
      }
      if (entity !== "user") {
        const [cats] = await db.query(
          "SELECT id,name,type FROM sales_categories WHERE status='active' ORDER BY type,sort_order,id",
        );
        if (entity === "lead") {
          const [campaigns] = await db.query(
            "SELECT id,name FROM campaigns ORDER BY name",
          );
          lookups.push(...campaigns.map((r) => ({ ...r, type: "Chiến dịch" })));
        }
        lookups.push(
          ...cats.map((r) => ({
            ...r,
            type: {
              industry: "Ngành nghề",
              company_size: "Quy mô",
              lead_source: "Nguồn lead",
              activity_type: "Hoạt động",
            }[r.type],
          })),
        );
      } else {
        const [groups] = await db.query(
          "SELECT id,name FROM `groups` ORDER BY name",
        );
        lookups.push(
          ...groups.map((r) => ({ ...r, type: "Nhóm kinh doanh" })),
          ...[
            "Admin",
            "Director",
            "Team Lead",
            "Sales Rep",
            "Marketing",
            "Cust. Success",
            "Accountant",
          ].map((r) => ({ type: "Vai trò", id: r, name: r })),
        );
      }
      res
        .attachment(entity + "-template.xlsx")
        .send(await workbook(entity, templateKeys, [], true, lookups));
    }),
  );
  r.post(
    "/import/preview",
    upload,
    route(async (req, res) => {
      const data = rows(req);
      const c = await db.getConnection();
      const result = [];
      let locked = false;
      try {
        if (entity !== "user") {
          await lockImport(c, entity);
          locked = true;
        }
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
              duplicate_blocked: !!e.details?.duplicate_blocked,
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
        try {
          await c.rollback();
        } finally {
          try {
            if (locked) await unlockImport(c, entity);
          } finally {
            c.release();
          }
        }
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
    const c = await db.getConnection();
    let locked = false;
    try {
      if (entity !== "user") {
        await lockImport(c, entity);
        locked = true;
      }
      for (let i = 0; i < data.length; i++) {
        try {
          await c.beginTransaction();
          const rid = await apply(c, entity, req.user, data[i]);
          await c.commit();
          results.push({ row: i + 2, success: true, id: rid });
        } catch (e) {
          await c.rollback();
          results.push({
            row: i + 2,
            success: false,
            duplicate_blocked: !!e.details?.duplicate_blocked,
            message:
              e.code === "ER_DUP_ENTRY"
                ? "Dữ liệu trùng."
                : e.status
                  ? e.message
                  : "Không thể nhập dòng này.",
          });
        }
      }
    } finally {
      try {
        if (locked) await unlockImport(c, entity);
      } finally {
        c.release();
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
        const sourceNames = new Map(),
          campaignNames = new Map();
        if (entity === "lead") {
          const [sources] = await db.query(
            "SELECT id,name FROM sales_categories WHERE type='lead_source'",
          );
          const [campaigns] = await db.query("SELECT id,name FROM campaigns");
          for (const r of sources) sourceNames.set(r.id, r.name);
          for (const r of campaigns) campaignNames.set(r.id, r.name);
        }
        const data = result.data.map((row) => {
          let cf = {};
          try {
            cf =
              typeof row.custom_fields === "string"
                ? JSON.parse(row.custom_fields)
                : row.custom_fields || {};
          } catch {}
          const out = {
            ...row,
            ...cf,
            ...(entity === "lead"
              ? {
                  source_name: sourceNames.get(row.source_id) || "",
                  campaign_name: campaignNames.get(row.campaign_id) || "",
                }
              : {}),
          };
          delete out.custom_fields;
          delete out.custom_fields_data;
          return out;
        });
        const extras =
          entity === "customer"
            ? ["created_by", "parent_id", "total_contract_value"]
            : ["owner_id", "status", "source_name", "campaign_name"];
        const keys = [...headers[entity], ...extras];
        for (const row of result.data) {
          let cf = {};
          try {
            cf =
              typeof row.custom_fields === "string"
                ? JSON.parse(row.custom_fields)
                : row.custom_fields || {};
          } catch {}
          for (const key of Object.keys(cf))
            if (!keys.includes(key)) keys.push(key);
        }
        res
          .attachment(entity + "-export.xlsx")
          .send(await workbook(entity, keys, data, false));
      }),
    );
  return r;
}
module.exports = routerFor;
