import { dateOnly, dateTime, money, readJSON } from "./api";
export const auditActions = {
  BOOTSTRAP_ADMIN: "Khởi tạo quản trị viên",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  ROLE_CHANGE: "Thay đổi vai trò",
  ROLE_UPDATE: "Thay đổi vai trò (nhật ký cũ)",
  GROUP_CHANGE: "Thay đổi nhóm",
  HANDOVER: "Bàn giao",
  OWNER_CHANGE: "Đổi người phụ trách",
  PRICE_CHANGE: "Thay đổi giá",
  TARGET_CHANGE: "Thay đổi chỉ tiêu",
  TARGET_UPDATE: "Cập nhật doanh số",
  STAGE_CHANGE: "Chuyển giai đoạn",
  STAGE_OVERRIDE: "Ghi đè điều kiện",
  CLOSE: "Đóng cơ hội",
  REOPEN: "Mở lại cơ hội",
  STATUS_CHANGE: "Đổi trạng thái",
  ORGANIZATION_CHANGE: "Thay đổi tổ chức",
  ASSIGN: "Phân công",
  CONVERT: "Chuyển đổi lead",
  MERGE: "Gộp dữ liệu",
  SCORE_CHANGE: "Thay đổi chấm điểm",
  ASSIGNMENT_RULE_CHANGE: "Đổi quy tắc phân bổ",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  LOCK: "Khóa tài khoản",
};
export const auditEntities = {
  users: "Người dùng",
  groups: "Nhóm kinh doanh",
  products: "Sản phẩm",
  deals: "Cơ hội",
  customers: "Khách hàng",
  leads: "Lead",
  sales_targets: "Chỉ tiêu",
  customer_contacts: "Người liên hệ",
  campaigns: "Chiến dịch",
  sales_categories: "Danh mục",
  pipeline_stages: "Giai đoạn pipeline",
  deal_reasons: "Lý do thắng/thua",
  competitors: "Đối thủ",
  custom_fields: "Trường tùy chỉnh",
  lead_assignment_rules: "Quy tắc phân bổ",
  lead_scoring_rules: "Quy tắc chấm điểm",
  lead_forms: "Biểu mẫu lead",
  quotes: "Báo giá",
};
const fields = {
  name: "Tên",
  company_name: "Tên khách hàng",
  full_name: "Họ và tên",
  title: "Tiêu đề",
  email: "Email",
  phone: "Số điện thoại",
  tax_code: "Mã số thuế",
  industry: "Ngành nghề",
  company_size: "Quy mô",
  website: "Website",
  address: "Địa chỉ",
  status: "Trạng thái",
  roles: "Vai trò",
  role_code: "Vai trò",
  group_id: "Nhóm",
  owner_id: "Người phụ trách",
  created_by: "Người tạo",
  parent_id: "Cấp trên",
  leader_id: "Trưởng nhóm",
  region_id: "Khu vực",
  region: "Khu vực",
  amount: "Giá trị",
  actual_amount: "Doanh thu thực tế",
  budget: "Ngân sách",
  channel: "Kênh marketing",
  start_date: "Ngày bắt đầu",
  end_date: "Ngày kết thúc",
  expected_close_date: "Ngày dự kiến chốt",
  signed_date: "Ngày ký",
  stage: "Giai đoạn",
  stage_id: "Giai đoạn",
  win_probability: "Xác suất thắng",
  probability: "Xác suất thắng",
  probability_note: "Lý do thay đổi xác suất",
  description: "Mô tả",
  reason: "Lý do",
  note: "Ghi chú",
  content: "Nội dung",
  code: "Mã",
  type: "Phân loại",
  unit: "Đơn vị",
  list_price: "Giá niêm yết",
  floor_price: "Giá sàn",
  cost_price: "Giá vốn",
  quantity: "Số lượng",
  periods: "Số kỳ",
  period_months: "Số tháng mỗi kỳ",
  unit_price: "Đơn giá",
  line_total: "Thành tiền",
  score: "Điểm",
  temperature: "Mức độ quan tâm",
  source_id: "Nguồn",
  campaign_id: "Chiến dịch",
  customer_id: "Khách hàng",
  contact_id: "Người liên hệ",
  deal_id: "Cơ hội",
  is_active: "Đang hoạt động",
  custom_fields: "Thông tin bổ sung",
  items: "Dòng sản phẩm",
  email_signature: "Chữ ký email",
  user_id: "Tài khoản",
  sla_minutes: "Thời hạn chăm sóc (phút)",
  win_reason_id: "Lý do thắng",
  loss_reason_id: "Lý do thua",
  competitor_id: "Đối thủ",
  field_name: "Tiêu chí",
  match_value: "Giá trị điều kiện",
  points: "Điểm",
  priority: "Độ ưu tiên",
  exit_condition: "Điều kiện chuyển bước",
  stagnant_days: "Ngưỡng đình trệ (ngày)",
  sort_order: "Thứ tự",
  must_change_password: "Cần đổi mật khẩu",
  warm: "Ngưỡng ấm",
  hot: "Ngưỡng nóng",
  rules: "Quy tắc",
  user_ids: "Các tài khoản",
  affected: "Số bản ghi ảnh hưởng",
};
const words = {
  Admin: "Quản trị hệ thống",
  Director: "Giám đốc kinh doanh",
  "Team Lead": "Trưởng nhóm kinh doanh",
  "Sales Rep": "Nhân viên kinh doanh",
  Marketing: "Marketing",
  "Cust. Success": "Chăm sóc khách hàng",
  Accountant: "Kế toán",
  OPEN: "Đang mở",
  WON: "Thành công",
  LOST: "Thất bại",
  NEW: "Mới",
  QUEUED: "Chờ phân bổ",
  ASSIGNED: "Đã phân công",
  CARING: "Đang chăm sóc",
  CONVERTED: "Đã chuyển đổi",
  MERGED: "Đã gộp",
  HOT: "Nóng",
  WARM: "Ấm",
  COLD: "Lạnh",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  ONE_TIME: "Sản phẩm một lần",
  SUBSCRIPTION: "Dịch vụ thuê bao",
  require_meeting: "Có cuộc gặp",
  none: "Không yêu cầu",
};
const hidden =
  /password|token|secret|hash|avatar|^id$|created_at|updated_at|last_activity_at/i;
export const auditLabel = (key) =>
  fields[key] || key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export function auditValue(raw, key = "", users = []) {
  const value = readJSON(raw, raw);
  if (value == null || value === "") return "Chưa có";
  if (Array.isArray(value))
    return value.length
      ? value.map((v) => auditValue(v, key, users)).join("; ")
      : "Chưa có";
  if (typeof value === "object")
    return (
      Object.entries(value)
        .filter(([k]) => !hidden.test(k))
        .map(([k, v]) => `${auditLabel(k)}: ${auditValue(v, k, users)}`)
        .join("; ") || "Không có thông tin bổ sung"
    );
  if (["created_by", "owner_id", "leader_id", "user_id"].includes(key))
    return (
      users.find((u) => String(u.id) === String(value))?.full_name ||
      `Tài khoản #${value}`
    );
  if (
    /^(amount|actual_amount|budget|list_price|floor_price|cost_price|unit_price|line_total)$/.test(
      key,
    )
  )
    return money(value);
  if (/_date$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value))
    return dateOnly(value);
  if (/_at$/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value))
    return dateTime(value);
  if (
    ["is_active", "must_change_password"].includes(key) ||
    typeof value === "boolean"
  )
    return Number(value) ? "Có" : "Không";
  return words[value] || String(value);
}
export function auditEntries(raw, other, users = []) {
  const value = readJSON(raw, raw),
    comparison = readJSON(other, other);
  if (value == null) return [];
  if (typeof value !== "object" || Array.isArray(value))
    return [["Nội dung", auditValue(value, "", users)]];
  return Object.entries(value)
    .filter(
      ([k, v]) =>
        !hidden.test(k) &&
        !(k === "name" && value.company_name) &&
        !(v == null || v === "") &&
        !(
          comparison &&
          typeof comparison === "object" &&
          JSON.stringify(comparison[k]) === JSON.stringify(v)
        ),
    )
    .map(([k, v]) => [auditLabel(k), auditValue(v, k, users)]);
}
