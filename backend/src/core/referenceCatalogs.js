const { db, transaction } = require("./store");
const categories = {
  industry: [
    ["TECH", "Công nghệ thông tin"],
    ["TRADE", "Thương mại và phân phối"],
    ["MANUFACTURING", "Sản xuất"],
    ["EDUCATION", "Giáo dục và đào tạo"],
    ["FINANCE", "Tài chính và ngân hàng"],
    ["HEALTHCARE", "Y tế"],
    ["CONSTRUCTION", "Xây dựng và bất động sản"],
    ["LOGISTICS", "Vận tải và logistics"],
    ["SERVICES", "Dịch vụ"],
  ],
  company_size: [
    ["MICRO", "1–10 nhân sự"],
    ["SMALL", "11–50 nhân sự"],
    ["MEDIUM", "51–200 nhân sự"],
    ["LARGE", "201–500 nhân sự"],
    ["ENTERPRISE", "501–1.000 nhân sự"],
    ["CORPORATE", "Trên 1.000 nhân sự"],
  ],
  lead_source: [
    ["WEBSITE", "Website"],
    ["REFERRAL", "Khách hàng giới thiệu"],
    ["FACEBOOK", "Facebook"],
    ["GOOGLE", "Google Ads"],
    ["EVENT", "Hội thảo và sự kiện"],
    ["DIRECT", "Tiếp cận trực tiếp"],
    ["OTHER", "Nguồn khác"],
  ],
  activity_type: [
    ["CALL", "Gọi điện"],
    ["EMAIL", "Gửi email"],
    ["MEETING", "Gặp trực tiếp"],
    ["ONLINE", "Họp trực tuyến"],
  ],
};
const regions = [
  ["NORTH", "Miền Bắc"],
  ["CENTRAL", "Miền Trung"],
  ["SOUTH", "Miền Nam"],
];
async function initializeReferenceCatalogs() {
  const lock = await db.getConnection();
  let acquired = false;
  try {
    const [[r]] = await lock.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':reference-catalogs'),10) acquired",
    );
    if (!r.acquired) throw new Error("Không lấy được khóa khởi tạo danh mục.");
    acquired = true;
    return await transaction(async (c) => {
      const [[done]] = await c.query(
        "SELECT setting_value FROM crm_settings WHERE setting_key='reference_catalogs_v1'",
      );
      if (done) return { initialized: false, inserted: 0 };
      let inserted = 0;
      for (const [type, entries] of Object.entries(categories)) {
        for (const [code, name] of entries) {
          const [[existing]] = await c.query(
            "SELECT id FROM sales_categories WHERE type=? AND (code=? OR name=?) LIMIT 1",
            [type, "STD_" + code, name],
          );
          if (existing) continue;
          const [[n]] = await c.query(
            "SELECT COALESCE(MAX(sort_order),0)+1 n FROM sales_categories WHERE type=?",
            [type],
          );
          await c.query(
            "INSERT INTO sales_categories (type,code,name,sort_order,status) VALUES (?,?,?,?,'active')",
            [type, "STD_" + code, name, n.n],
          );
          inserted++;
        }
      }
      for (const [code, name] of regions) {
        const [[existing]] = await c.query(
          "SELECT id FROM regions WHERE code=? OR name=? LIMIT 1",
          ["VN_" + code, name],
        );
        if (!existing) {
          await c.query("INSERT INTO regions (code,name) VALUES (?,?)", [
            "VN_" + code,
            name,
          ]);
          inserted++;
        }
      }
      await c.query(
        "INSERT INTO crm_settings (setting_key,setting_value) VALUES ('reference_catalogs_v1',?)",
        [
          JSON.stringify({
            initialized_at: new Date().toISOString(),
            inserted,
          }),
        ],
      );
      return { initialized: true, inserted };
    });
  } finally {
    if (acquired)
      await lock.query(
        "SELECT RELEASE_LOCK(CONCAT(DATABASE(),':reference-catalogs'))",
      );
    lock.release();
  }
}
module.exports = { initializeReferenceCatalogs };
