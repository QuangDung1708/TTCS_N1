const ExcelJS = require("exceljs");
const HEADERS = [
  "Tên",
  "Email",
  "Mật khẩu tạm thời",
  "Vai trò (RBAC)",
  "Nhóm kinh doanh",
  "Số điện thoại",
];
const ROLES = [
  "Admin",
  "Director",
  "Team Lead",
  "Sales Rep",
  "Marketing",
  "Cust. Success",
  "Accountant",
];
const GROUPS = [
  "Khối Kinh Doanh Toàn Quốc",
  "Chi Nhánh Miền Bắc",
  "Phòng Kinh Doanh Hà Nội",
  "Phòng Marketing & Truyền Thông",
  "Phòng Chăm Sóc Khách Hàng",
  "Phòng Kế Toán - Tài Chính",
  "Ban Quản Trị Hệ Thống",
];
const normalize = (text) =>
  String(text ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
function styledSheet(workbook, name, headers, widths) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = headers.map((header, i) => ({
    header,
    width: widths?.[i] || 28,
  }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1677FF" },
  };
  sheet.getRow(1).height = 26;
  sheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + headers.length)}1`,
  };
  return sheet;
}
async function template() {
  const book = new ExcelJS.Workbook();
  const sheet = styledSheet(
    book,
    "Nguoi dung",
    HEADERS,
    [28, 32, 24, 20, 40, 22],
  );
  sheet.addRows([
    [
      "Nguyễn Văn An",
      "an.nguyen@example.test",
      "Demo12345!",
      "Sales Rep",
      GROUPS[2],
      "0934567890",
    ],
    [
      "Lê Hoàng Cường",
      "cuong.le@example.test",
      "Demo12345!",
      "Team Lead",
      GROUPS[1],
      "0923456789",
    ],
    [
      "Phạm Thu Hà",
      "ha.pham@example.test",
      "Demo12345!",
      "Marketing",
      GROUPS[3],
      "0945678901",
    ],
  ]);
  sheet.getColumn(6).numFmt = "@";
  const catalog = styledSheet(
    book,
    "Danh muc",
    ["Vai trò (RBAC)", "Nhóm kinh doanh"],
    [25, 45],
  );
  ROLES.forEach((role, i) => catalog.addRow([role, GROUPS[i]]));
  book.definedNames.add("'Danh muc'!$A$2:$A$8", "DanhSachVaiTro");
  book.definedNames.add("'Danh muc'!$B$2:$B$8", "DanhSachNhom");
  for (let row = 2; row <= 1001; row++) {
    sheet.getCell(row, 4).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["DanhSachVaiTro"],
      showErrorMessage: true,
      error: "Chọn vai trò trong danh mục.",
    };
    sheet.getCell(row, 5).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["DanhSachNhom"],
      showErrorMessage: true,
      error: "Chọn nhóm trong danh mục.",
    };
  }
  const guide = styledSheet(
    book,
    "Huong dan",
    ["Nội dung", "Quy định"],
    [28, 100],
  );
  guide.addRows([
    [
      "Dữ liệu mẫu",
      "Ba dòng mẫu dùng email example.test. Xóa/thay thế trước khi nhập người dùng của bạn.",
    ],
    [
      "Giới hạn",
      "Tệp .xlsx tối đa 2 MB, tối đa 1.000 dòng dữ liệu, đọc sheet đầu tiên.",
    ],
    [
      "Bắt buộc",
      "Tên, Email, Mật khẩu tạm thời, Vai trò (RBAC), Nhóm kinh doanh.",
    ],
    ["Mật khẩu", "8–128 ký tự, có chữ và số hoặc ký tự đặc biệt."],
    [
      "Điện thoại",
      "Không bắt buộc. Di động Việt Nam 03/05/07/08/09 (10 số), hoặc +84 tương đương. Định dạng Text để giữ số 0 đầu.",
    ],
    [
      "Email trùng",
      "Trùng trong file hoặc hệ thống sẽ báo lỗi, không cập nhật tài khoản cũ.",
    ],
    [
      "Nhập dữ liệu",
      "Xem trước không lưu tài khoản. Khi xác nhận: bỏ dòng lỗi, lưu dòng hợp lệ và báo tổng hợp.",
    ],
  ]);
  return book.xlsx.writeBuffer();
}
function cellText(cell) {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value.richText) return value.richText.map((t) => t.text).join("");
  if (value.hyperlink) return String(value.text || "");
  throw fail(
    "Ô chứa công thức hoặc kiểu dữ liệu không hỗ trợ. Hãy dán giá trị thuần.",
  );
}
async function parse(buffer) {
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(buffer);
  } catch {
    throw fail("Tệp Excel bị hỏng hoặc không phải .xlsx hợp lệ.");
  }
  const sheet = book.worksheets[0];
  if (!sheet) throw fail("Tệp Excel không có sheet dữ liệu.");
  if (sheet.rowCount > 1001)
    throw fail(
      "Tối đa 1.000 dòng dữ liệu. Vui lòng xóa các dòng dư ngoài mẫu.",
    );
  if (
    HEADERS.some(
      (header, i) =>
        normalize(cellText(sheet.getRow(1).getCell(i + 1))) !==
        normalize(header),
    )
  )
    throw fail(
      "Tiêu đề cột không đúng. Hãy tải và dùng mẫu Excel của hệ thống.",
    );
  const rows = [];
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const values = [],
      errors = [];
    for (let col = 1; col <= 6; col++) {
      try {
        values.push(cellText(row.getCell(col)));
      } catch {
        values.push("");
        errors.push(
          `${HEADERS[col - 1]}: không hỗ trợ công thức hoặc kiểu dữ liệu này.`,
        );
      }
    }
    if (!values.some((v) => v.trim()) && !errors.length) return;
    rows.push({
      row: number,
      name: values[0].trim(),
      email: values[1].trim().toLowerCase(),
      password: values[2],
      role: values[3].trim(),
      group: values[4].trim(),
      phone: values[5].trim(),
      errors,
    });
  });
  if (!rows.length) throw fail("Tệp không có dòng dữ liệu để nhập.");
  return rows;
}
function validate(rows, users) {
  const existing = new Set(users.map((u) => u.email.toLowerCase()));
  const counts = new Map();
  rows.forEach((r) => {
    if (r.email) counts.set(r.email, (counts.get(r.email) || 0) + 1);
  });
  return rows.map((original) => {
    const row = { ...original, errors: [...original.errors] };
    if (!row.name || row.name.length > 100)
      row.errors.push("Tên bắt buộc, tối đa 100 ký tự.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254)
      row.errors.push("Email không hợp lệ.");
    if (existing.has(row.email))
      row.errors.push("Email đã tồn tại trong hệ thống.");
    if (counts.get(row.email) > 1)
      row.errors.push("Email bị trùng trong tệp Excel.");
    if (
      row.password.length < 8 ||
      row.password.length > 128 ||
      !/[A-Za-z]/.test(row.password) ||
      !/[^A-Za-z\s]/.test(row.password)
    )
      row.errors.push(
        "Mật khẩu phải có 8–128 ký tự, gồm chữ và số/ký tự đặc biệt.",
      );
    const role = ROLES.find((v) => normalize(v) === normalize(row.role));
    const group = GROUPS.find((v) => normalize(v) === normalize(row.group));
    if (!role) row.errors.push("Vai trò không có trong danh mục.");
    else row.role = role;
    if (!group) row.errors.push("Nhóm kinh doanh không có trong danh mục.");
    else row.group = group;
    if (row.phone) {
      row.phone = row.phone.replace(/[\s.()-]/g, "").replace(/^\+84/, "0");
      if (!/^0[35789]\d{8}$/.test(row.phone))
        row.errors.push(
          "Số di động Việt Nam không hợp lệ; dùng Text để giữ số 0 đầu.",
        );
    }
    row.valid = row.errors.length === 0;
    return row;
  });
}
function safeRow(row) {
  return {
    row: row.row,
    name: row.name,
    email: row.email,
    role: row.role,
    group: row.group,
    phone: row.phone,
    valid: row.valid,
    errors: row.errors,
  };
}
async function report(rows) {
  const book = new ExcelJS.Workbook();
  const sheet = styledSheet(
    book,
    "Ket qua",
    ["Dòng", "Tên", "Email", "Kết quả", "Chi tiết"],
    [12, 28, 34, 20, 90],
  );
  rows.forEach((r) =>
    sheet.addRow([
      r.row,
      r.name,
      r.email,
      r.status === "IMPORTED"
        ? "Đã nhập"
        : r.status === "SKIPPED"
          ? "Bỏ qua"
          : r.valid
            ? "Hợp lệ"
            : "Không hợp lệ",
      r.errors.join("; "),
    ]),
  );
  sheet.getColumn(5).alignment = { wrapText: true, vertical: "top" };
  return book.xlsx.writeBuffer();
}
module.exports = {
  HEADERS,
  ROLES,
  GROUPS,
  fail,
  template,
  parse,
  validate,
  safeRow,
  report,
};
