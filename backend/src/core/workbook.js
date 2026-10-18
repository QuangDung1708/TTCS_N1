const ExcelJS = require("exceljs");
const labels = {
  full_name: "Họ và tên",
  email: "Email",
  phone: "Số điện thoại",
  role_code: "Mã vai trò",
  group_id: "Mã nhóm kinh doanh",
  group_name: "Nhóm kinh doanh",
  temporary_password: "Mật khẩu tạm thời",
  title: "Tên báo giá",
  deal_id: "Mã cơ hội",
  customer_id: "Mã khách hàng",
  gross_amount: "Giá trị trước chiết khấu (VNĐ)",
  discount_percent: "Chiết khấu (%)",
  amount: "Tổng cộng (VNĐ)",
  company_name: "Tên doanh nghiệp",
  tax_code: "Mã số thuế",
  industry: "Ngành nghề",
  company_size: "Quy mô doanh nghiệp",
  website: "Website",
  address: "Địa chỉ",
  status: "Trạng thái",
  interest: "Nhu cầu quan tâm",
  source_id: "Mã nguồn lead",
  campaign_id: "Mã chiến dịch",
  region: "Khu vực",
  interest_level: "Mức độ quan tâm",
  created_by: "Mã người phụ trách",
  owner_id: "Mã nhân viên tiếp nhận",
  parent_id: "Mã công ty mẹ",
  total_contract_value: "Giá trị hợp đồng (VNĐ)",
  created_at: "Ngày tạo",
  source_name: "Tên nguồn lead",
  campaign_name: "Tên chiến dịch",
};
function normalize(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      { Tên: "full_name", "Vai trò (RBAC)": "role_code" }[key.trim()] ||
        Object.keys(labels).find(
          (k) => labels[k] === key.trim().replace(/\s*\*$/, ""),
        ) ||
        key.trim(),
      value,
    ]),
  );
}
async function workbook(entity, keys, data, template, lookups = []) {
  const book = new ExcelJS.Workbook();
  book.creator = "Enterprise CRM";
  book.calcProperties.fullCalcOnLoad = true;
  const sheet = book.addWorksheet("Dữ liệu", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  const safe = (v) => {
    if (v == null) return "";
    if (v instanceof Date)
      return Number.isFinite(v.getTime())
        ? v.toISOString().replace("T", " ").slice(0, 19)
        : "";
    if (typeof v === "number") return Number.isFinite(v) ? v : "";
    const str = typeof v === "object" ? JSON.stringify(v) : String(v);
    return str
      .toWellFormed()
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "");
  };
  const header = (key) =>
    entity === "user" && key === "full_name"
      ? "Tên"
      : entity === "user" && key === "role_code"
        ? "Vai trò (RBAC)"
        : labels[key] || key;
  sheet.addRow(keys.map((k) => safe(header(k))));
  for (const row of data)
    sheet.addRow(
      keys.map((k) => {
        const value = row[k];
        if (
          [
            "total_contract_value",
            "gross_amount",
            "amount",
            "discount_percent",
          ].includes(k) &&
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(Number(value))
        )
          return Number(value);
        return safe(value);
      }),
    );
  // A normal worksheet with a fixed header and filter avoids table/comment/VML
  // relationships that older Office installations may repair or discard.
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(data.length + 1, 1), column: keys.length },
  };
  sheet.properties.dyDescent = 0.25;
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    horizontalDpi: 300,
    verticalDpi: 300,
  };
  sheet.getRow(1).height = 32;
  keys.forEach((k, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = ["company_name", "interest", "address", "email"].includes(k)
      ? 36
      : 25;
    if (["phone", "tax_code"].includes(k)) col.numFmt = "@";
    if (["total_contract_value", "gross_amount", "amount"].includes(k))
      col.numFmt = '#,##0" ₫"';
  });
  sheet.eachRow((row, n) => {
    row.height = n === 1 ? 32 : 27;
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (n > 1 && n % 2 === 0)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F6FC" },
        };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDCE5EF" } },
        bottom: { style: "thin", color: { argb: "FFDCE5EF" } },
        left: { style: "thin", color: { argb: "FFDCE5EF" } },
        right: { style: "thin", color: { argb: "FFDCE5EF" } },
      };
    });
  });
  const guide = book.addWorksheet("Hướng dẫn");
  guide.columns = [{ width: 30 }, { width: 100 }];
  guide.addRows([
    ["Tệp", template ? "Mẫu nhập " + entity : "Dữ liệu xuất " + entity],
    [
      "Cách nhập",
      "Điền từ hàng 2 ở trang Dữ liệu. Giữ nguyên tiêu đề. Tối đa 1.000 hàng mỗi lần; dòng trống được bỏ qua.",
    ],
    [
      "Bắt buộc",
      entity === "user"
        ? "Tên, Email, Vai trò (RBAC). Nhóm kinh doanh nhập đúng tên từ trang Danh mục. Mật khẩu tạm thời có thể để trống để tự sinh; tài khoản nhận email nếu SMTP được cấu hình."
        : entity === "lead"
          ? "Họ và tên, Tên doanh nghiệp, Email hoặc Số điện thoại, Mã nguồn lead."
          : "Tên doanh nghiệp. Mã số thuế phải duy nhất nếu nhập.",
    ],
    [
      "Danh mục liên kết",
      "Các cột Mã dùng ID từ trang Danh mục. Ngành nghề / Quy mô nhập đúng tên danh mục. Chỉ có dữ liệu bạn được phép xem.",
    ],
    ["Số điện thoại / MST", "Giữ kiểu văn bản để không mất số 0 đầu."],
    [
      "Kiểm tra trước khi lưu",
      "Tải tệp trong màn hình Nhập Excel, kiểm tra từng dòng, xử lý dòng trùng rồi xác nhận nhập. File xuất không dùng để cập nhật ID bản ghi.",
    ],
    [
      "Tương thích",
      "Vẫn nhận tiêu đề kỹ thuật cũ như company_name, full_name, source_id. Mã trường tùy chỉnh được giữ nguyên.",
    ],
  ]);
  guide.eachRow((r) => {
    r.height = 48;
    r.alignment = { wrapText: true, vertical: "middle" };
  });
  if (lookups.length) {
    const lookup = book.addWorksheet("Danh mục");
    lookup.columns = [
      { header: "Loại", key: "type", width: 28 },
      { header: "Mã", key: "id", width: 20 },
      { header: "Tên", key: "name", width: 55 },
    ];
    lookup.addRows(lookups);
    lookup.views = [{ state: "frozen", ySplit: 1 }];
    lookup.autoFilter = { from: "A1", to: "C1" };
  }
  for (const ws of book.worksheets) {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: "FFFFFFFF" } };
    r.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF173B63" },
    };
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
module.exports = { workbook, normalize, labels };
