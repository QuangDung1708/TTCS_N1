const { Router } = require("express");
const { db, transaction, insert, update, audit } = require("../core/store");
const { route, fail, id, text, number, json } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, has, requireRoles } = require("../core/access");
function catalog(table, validate, { module = "CATEGORY", beforeDelete } = {}) {
  const r = Router();
  r.use(authenticate, authorize(module));
  r.get(
    "/",
    route(async (req, res) => {
      let sql = `SELECT * FROM ${table}`;
      const args = [];
      if (table === "sales_categories" && req.query.type) {
        sql += " WHERE type=?";
        args.push(req.query.type);
      }
      if (table === "custom_fields" && req.query.entity_type) {
        sql += " WHERE entity_type=?";
        args.push(req.query.entity_type);
      }
      sql +=
        table === "pipeline_stages" || table === "sales_categories"
          ? " ORDER BY sort_order,id"
          : " ORDER BY id";
      let [data] = await db.query(sql, args);
      if (table === "products" && !has(req.user, "Director"))
        data = data.map(({ cost_price, ...p }) => p);
      res.json({ data, canViewCostPrice: has(req.user, "Director") });
    }),
  );
  r.post(
    "/",
    route(async (req, res) => {
      const rid = await transaction(async (c) => {
        const data = await validate(c, req.user, req.body);
        const rid = await insert(c, table, data);
        await audit(c, req.user, "CREATE", table, rid, null, data);
        return rid;
      });
      res.status(201).json({ id: rid });
    }),
  );
  r.put(
    "/:id",
    route(async (req, res) => {
      await transaction(async (c) => {
        const [[old]] = await c.query(
          `SELECT * FROM ${table} WHERE id=? FOR UPDATE`,
          [id(req.params.id)],
        );
        if (!old) fail(404, "Không tìm thấy bản ghi.");
        const data = await validate(c, req.user, req.body, old);
        await update(c, table, old.id, data);
        await audit(c, req.user, "UPDATE", table, old.id, old, data);
      });
      res.json({ success: true });
    }),
  );
  r.delete(
    "/:id",
    route(async (req, res) => {
      await transaction(async (c) => {
        const [[old]] = await c.query(
          `SELECT * FROM ${table} WHERE id=? FOR UPDATE`,
          [id(req.params.id)],
        );
        if (!old) fail(404, "Không tìm thấy bản ghi.");
        if (beforeDelete) await beforeDelete(c, old);
        await c.query(`DELETE FROM ${table} WHERE id=?`, [old.id]);
        await audit(c, req.user, "DELETE", table, old.id, old, null);
      });
      res.json({ success: true });
    }),
  );
  return r;
}
async function product(c, user, b, old = {}) {
  if ("cost_price" in b && !has(user, "Director"))
    fail(403, "Chỉ Giám đốc kinh doanh được xem và sửa giá vốn.");
  const v = { ...old, ...b };
  const types = {
    "Sản phẩm một lần": "ONE_TIME",
    "Dịch vụ thuê bao": "SUBSCRIPTION",
  };
  const type = types[v.type] || v.type || "ONE_TIME";
  if (!["ONE_TIME", "SUBSCRIPTION"].includes(type))
    fail(400, "Loại sản phẩm không hợp lệ.");
  const list = number(v.list_price, "Giá niêm yết"),
    floor = number(v.floor_price, "Giá sàn");
  if (floor > list) fail(400, "Giá sàn không lớn hơn giá niêm yết.");
  return {
    code: text(v.code, "Mã sản phẩm", 50).toUpperCase(),
    name: text(v.name, "Tên sản phẩm"),
    unit: text(v.unit, "Đơn vị", 50),
    type,
    list_price: list,
    floor_price: floor,
    cost_price: v.cost_price == null ? null : number(v.cost_price, "Giá vốn"),
    status: old.status || "ACTIVE",
  };
}
const products = catalog("products", product, {
  beforeDelete: async (c, p) => {
    const [[r]] = await c.query(
      "SELECT COUNT(*) n FROM deal_items WHERE product_id=?",
      [p.id],
    );
    if (r.n)
      fail(409, "Sản phẩm đã được tham chiếu; chỉ được ngừng kinh doanh.");
    const [exists] = await c.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quote_items'",
    );
    if (exists.length) {
      const [[q]] = await c.query(
        "SELECT COUNT(*) n FROM quote_items WHERE product_id=?",
        [p.id],
      );
      if (q.n) fail(409, "Sản phẩm đã có trong báo giá.");
    }
  },
});
products.put(
  "/:id/toggle-status",
  route(async (req, res) => {
    await transaction(async (c) => {
      const [[p]] = await c.query(
        "SELECT * FROM products WHERE id=? FOR UPDATE",
        [id(req.params.id)],
      );
      if (!p) fail(404, "Không tìm thấy sản phẩm.");
      const status =
        String(p.status).toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await update(c, "products", p.id, { status });
      await audit(
        c,
        req.user,
        "STATUS_CHANGE",
        "products",
        p.id,
        { status: p.status },
        { status },
      );
    });
    res.json({ success: true });
  }),
);
async function category(c, u, b, old = {}) {
  const v = { ...old, ...b };
  if (v.sort_order === undefined) {
    const [[n]] = await c.query(
      "SELECT COALESCE(MAX(sort_order),0)+1 n FROM sales_categories WHERE type=?",
      [v.type],
    );
    v.sort_order = n.n;
  }
  if (
    !["industry", "company_size", "lead_source", "activity_type"].includes(
      v.type,
    )
  )
    fail(400, "Loại danh mục không hợp lệ.");
  return {
    type: v.type,
    code: text(v.code, "Mã", 80).toUpperCase(),
    name: text(v.name, "Tên", 100),
    description: v.description || null,
    sort_order: number(v.sort_order || 0, "Thứ tự", 0, 100000),
    status: v.status || "active",
  };
}
const categories = catalog("sales_categories", category, {
  beforeDelete: async (c, row) => {
    const checks = [
      ["customers", "industry", row.name],
      ["customers", "industry_code", row.code],
      ["customers", "company_size", row.name],
      ["leads", "source_id", row.id],
      ["lead_forms", "source_id", row.id],
      ["deals", "source_id", row.id],
      ["leads", "industry", row.name],
      ["leads", "company_size", row.name],
      ["customer_activities", "activity_type_id", row.id],
    ];
    for (const [table, col, val] of checks) {
      const [[r]] = await c.query(
        `SELECT COUNT(*) n FROM ${table} WHERE ${col}=?`,
        [val],
      );
      if (r.n) fail(409, "Danh mục đang được tham chiếu.");
    }
  },
});
async function swap(c, table, first, second) {
  const ids = [id(first), id(second)].sort((a, b) => a - b);
  if (ids[0] === ids[1]) fail(400, "Cần hai bản ghi khác nhau.");
  const [rows] = await c.query(
    `SELECT * FROM ${table} WHERE id IN (?,?) ORDER BY id FOR UPDATE`,
    ids,
  );
  if (rows.length !== 2) fail(404, "Không tìm thấy bản ghi.");
  if (table === "sales_categories" && rows[0].type !== rows[1].type)
    fail(400, "Khác loại danh mục.");
  await update(c, table, rows[0].id, { sort_order: rows[1].sort_order });
  await update(c, table, rows[1].id, { sort_order: rows[0].sort_order });
}
for (const [router, table] of [[categories, "sales_categories"]])
  router.put(
    "/:id/swap-order",
    route(async (req, res) => {
      await transaction(async (c) => {
        const [[row]] = await c.query(`SELECT * FROM ${table} WHERE id=?`, [
          id(req.params.id),
        ]);
        if (!row) fail(404, "Không tìm thấy bản ghi.");
        const up = req.body.direction === "UP";
        const [[next]] = await c.query(
          `SELECT * FROM ${table} WHERE type=? AND sort_order ${up ? "<" : ">"} ? ORDER BY sort_order ${up ? "DESC" : "ASC"} LIMIT 1`,
          [row.type, row.sort_order],
        );
        if (next) await swap(c, table, row.id, next.id);
      });
      res.json({ success: true });
    }),
  );
async function stage(c, u, b, old = {}) {
  const v = { ...old, ...b };
  if (v.sort_order === undefined) {
    const [[n]] = await c.query(
      "SELECT COALESCE(MAX(sort_order),0)+1 n FROM pipeline_stages",
    );
    v.sort_order = n.n;
  }
  const p = number(
    b.win_probability ?? b.probability ?? old.win_probability ?? 0,
    "Xác suất",
    0,
    100,
  );
  const condition =
    b.exit_condition ?? b.required_condition ?? old.exit_condition ?? "none";
  if (
    ![
      "none",
      "require_meeting",
      "require_contact",
      "require_products",
      "require_quote",
    ].includes(condition)
  )
    fail(400, "Điều kiện giai đoạn không hợp lệ.");
  return {
    code: text(v.code || "STAGE_" + Date.now(), "Mã", 80).toUpperCase(),
    name: text(v.name, "Tên", 100),
    description: v.description || null,
    win_probability: p,
    probability: p,
    sort_order: number(v.sort_order || 0, "Thứ tự", 0, 10000),
    exit_condition: condition,
    required_condition: condition,
    stagnant_days: number(v.stagnant_days || 14, "Số ngày đình trệ", 1, 3650),
    is_active: v.is_active === undefined ? true : !!v.is_active,
  };
}
const stages = catalog("pipeline_stages", stage, {
  beforeDelete: async (c, row) => {
    const [[r]] = await c.query(
      "SELECT COUNT(*) n FROM deals WHERE stage_id=? OR stage=?",
      [row.id, row.code],
    );
    if (r.n) fail(409, "Giai đoạn đang có cơ hội.");
  },
});
stages.put(
  "/:id/swap-order",
  route(async (req, res) => {
    await transaction(async (c) => {
      const [[s]] = await c.query(
        "SELECT id,sort_order FROM pipeline_stages WHERE id=?",
        [id(req.params.id)],
      );
      if (!s) fail(404, "Không tìm thấy giai đoạn.");
      const up = req.body.direction === "UP";
      const [[next]] = await c.query(
        `SELECT id FROM pipeline_stages WHERE sort_order ${up ? "<" : ">"}? ORDER BY sort_order ${up ? "DESC" : "ASC"} LIMIT 1`,
        [s.sort_order],
      );
      if (next) await swap(c, "pipeline_stages", s.id, next.id);
    });
    res.json({ success: true });
  }),
);
stages.post(
  "/swap-order",
  route(async (req, res) => {
    await transaction((c) =>
      swap(c, "pipeline_stages", req.body.id1, req.body.id2),
    );
    res.json({ success: true });
  }),
);
// Actual transition validation is shared with the write operation.
stages.post(
  "/validate-transition",
  route(async (req, res) => {
    const { validateTransition } = require("../core/deals");
    await transaction((c) =>
      validateTransition(
        c,
        req.user,
        req.body.deal_id,
        req.body.next_stage_id,
        req.body,
      ),
    );
    res.json({ allowed: true });
  }),
);
const reasons = catalog(
  "deal_reasons",
  async (c, u, b, o = {}) => {
    const v = { ...o, ...b };
    const type = String(v.type || "LOST")
      .toUpperCase()
      .replace("LOSS", "LOST")
      .replace("WIN", "WON");
    if (!["WON", "LOST"].includes(type)) fail(400, "Loại lý do không hợp lệ.");
    return {
      name: text(v.name, "Tên", 100),
      type,
      description: v.description || null,
    };
  },
  {
    beforeDelete: async (c, r) => {
      const [[x]] = await c.query(
        "SELECT COUNT(*) n FROM deals WHERE win_reason_id=? OR loss_reason_id=?",
        [r.id, r.id],
      );
      if (x.n) fail(409, "Lý do đang được sử dụng.");
    },
  },
);
const competitors = catalog(
  "competitors",
  async (c, u, b, o = {}) => {
    const v = { ...o, ...b };
    return {
      name: text(v.name, "Tên"),
      website: v.website || null,
      strengths: v.strengths || null,
      weaknesses: v.weaknesses || null,
      description: v.description || null,
    };
  },
  {
    beforeDelete: async (c, r) => {
      const [[x]] = await c.query(
        "SELECT COUNT(*) n FROM deals WHERE competitor_id=?",
        [r.id],
      );
      if (x.n) fail(409, "Đối thủ đang được sử dụng.");
    },
  },
);
const fields = catalog(
  "custom_fields",
  async (c, u, b, o = {}) => {
    if (!has(u, "Admin"))
      fail(403, "Chỉ Admin được cấu hình trường tùy chỉnh.");
    const v = { ...o, ...b };
    if (!["customer", "deal"].includes(v.entity_type))
      fail(400, "Loại đối tượng không hợp lệ.");
    if (!["text", "number", "date", "select"].includes(v.field_type))
      fail(400, "Kiểu trường không hợp lệ.");
    const key = text(v.field_key, "Mã trường", 100);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key))
      fail(400, "Mã trường chỉ chứa chữ, số và dấu gạch dưới.");
    if (
      o.id &&
      (o.field_key !== key ||
        o.field_type !== v.field_type ||
        o.entity_type !== v.entity_type)
    )
      fail(409, "Không đổi mã/kiểu trường đã tạo để bảo toàn dữ liệu.");
    const options = json(v.options, []);
    if (
      !Array.isArray(options) ||
      (v.field_type === "select" && !options.length)
    )
      fail(400, "Danh sách chọn không hợp lệ.");
    return {
      field_name: text(v.field_name, "Tên trường", 100),
      field_key: key,
      field_type: v.field_type,
      entity_type: v.entity_type,
      is_required: !!v.is_required,
      is_active: v.is_active === undefined ? true : !!v.is_active,
      options: JSON.stringify(options),
      status: v.is_active === false ? "inactive" : "active",
    };
  },
  {
    beforeDelete: async () =>
      fail(409, "Ngừng sử dụng trường thay vì xóa để giữ dữ liệu."),
  },
);
module.exports = {
  products,
  categories,
  stages,
  reasons,
  competitors,
  fields,
  swap,
};
