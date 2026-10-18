import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Tag,
  Typography,
  Result,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { errorText, readJSON } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
export const roleLabels = {
  Admin: "Quản trị hệ thống",
  Director: "Giám đốc kinh doanh",
  "Team Lead": "Trưởng nhóm kinh doanh",
  "Sales Rep": "Nhân viên kinh doanh",
  Marketing: "Marketing",
  "Cust. Success": "Chăm sóc khách hàng",
  Accountant: "Kế toán",
};
export const leadStates = {
  NEW: ["Mới", "blue"],
  QUEUED: ["Chờ phân bổ", "gold"],
  ASSIGNED: ["Đã phân công", "cyan"],
  CARING: ["Đang chăm sóc", "processing"],
  CONVERTED: ["Đã chuyển đổi", "green"],
  MERGED: ["Đã gộp", "default"],
};
export const statusNames = {
  ...leadStates,
  OPEN: ["Đang mở", "blue"],
  WON: ["Thành công", "green"],
  LOST: ["Thất bại", "red"],
  HOT: ["Nóng", "red"],
  WARM: ["Ấm", "orange"],
  COLD: ["Lạnh", "blue"],
};
export function StatusTag({ value }) {
  const [label, color] = statusNames[value] || [
    value || "Chưa cập nhật",
    "default",
  ];
  return <Tag color={color}>{label}</Tag>;
}
export const required = [
  { required: true, message: "Vui lòng nhập thông tin này." },
];
export const phoneRules = [
  {
    pattern: /^(0|\+84)[35789]\d{8}$/,
    message: "Nhập số điện thoại Việt Nam hợp lệ.",
  },
];
export const passwordRules = [
  ...required,
  { min: 8, message: "Mật khẩu tối thiểu 8 ký tự." },
  {
    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
    message: "Mật khẩu cần có chữ và số.",
  },
];
export function PageHeader({
  eyebrow = "KHÔNG GIAN LÀM VIỆC",
  title,
  description,
  actions,
  children,
}) {
  return (
    <section className="page-heading">
      <div className="page-heading-main">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <Typography.Title level={2}>{title}</Typography.Title>
          {description && (
            <Typography.Paragraph type="secondary">
              {description}
            </Typography.Paragraph>
          )}
        </div>
        <Space wrap className="page-actions">
          {actions}
        </Space>
      </div>
      {children}
    </section>
  );
}
export function RefreshButton({ resource }) {
  return (
    <Button
      icon={<ReloadOutlined aria-hidden="true" spin={resource.loading} />}
      loading={resource.loading}
      onClick={resource.reload}
    >
      Làm mới
    </Button>
  );
}
export function ResourceError({ resource }) {
  return resource.error ? (
    <Alert
      type="error"
      showIcon
      title="Chưa tải được dữ liệu"
      description={errorText(resource.error)}
      action={<Button onClick={resource.reload}>Thử lại</Button>}
      className="section-gap"
    />
  ) : null;
}
export function DataCard({ children, ...props }) {
  return (
    <Card className="data-card" {...props}>
      {children}
    </Card>
  );
}
export function EmptyState({ description = "Chưa có dữ liệu", action }) {
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description}>
      {action}
    </Empty>
  );
}
export function LoadingPage() {
  return (
    <div className="page-loader">
      <Spin indicator={<SyncOutlined aria-hidden="true" spin />} size="large" />
      <span>Đang tải không gian làm việc…</span>
    </div>
  );
}
export function AccessDenied() {
  const nav = useNavigate();
  return (
    <Result
      status="403"
      title="Bạn chưa có quyền truy cập"
      subTitle="Trang này không thuộc phạm vi vai trò được cấp cho bạn."
      extra={
        <Button
          type="primary"
          icon={<ArrowLeftOutlined aria-hidden="true" />}
          onClick={() => nav("/")}
        >
          Về tổng quan
        </Button>
      }
    />
  );
}
export function Guard({ module, roles, children }) {
  const auth = useAuth();
  if (!auth.can(module) || (roles && !auth.has(...roles)))
    return <AccessDenied />;
  return children;
}
export function DateField({ value, onChange, ...props }) {
  const selected = value ? dayjs(value) : null;
  return (
    <DatePicker
      value={selected?.isValid() ? selected : null}
      format={["DD/MM/YYYY", "YYYY-MM-DD"]}
      placeholder="dd/mm/yyyy"
      needConfirm={false}
      getPopupContainer={() => document.body}
      onChange={(d) => onChange?.(d?.format("YYYY-MM-DD") || null)}
      style={{ width: "100%" }}
      {...props}
    />
  );
}
export function MoneyField(props) {
  return (
    <InputNumber
      min={0}
      max={1e12}
      precision={0}
      suffix="₫"
      placeholder="0"
      formatter={(v) => String(v ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
      parser={(v) => String(v ?? "").replace(/[^\d-]/g, "")}
      style={{ width: "100%" }}
      {...props}
    />
  );
}
export function CustomFields({ fields }) {
  return fields
    .filter((f) => f.is_active)
    .map((f) => (
      <Form.Item
        key={f.id}
        name={["custom_fields", f.field_key]}
        label={f.field_name}
        rules={f.is_required ? required : []}
      >
        {f.field_type === "number" ? (
          <InputNumber style={{ width: "100%" }} />
        ) : f.field_type === "date" ? (
          <DateField />
        ) : f.field_type === "select" ? (
          <Select
            allowClear
            options={readJSON(f.options, []).map((v) => ({
              value: v,
              label: v,
            }))}
          />
        ) : (
          <Input />
        )}
      </Form.Item>
    ));
}
export const userOptions = (rows) =>
  rows.map((u) => ({
    value: u.id,
    label: `${u.full_name}${u.group_name ? " · " + u.group_name : ""}`,
  }));
export const lookup = (rows, id) =>
  rows.find((r) => Number(r.id) === Number(id));
