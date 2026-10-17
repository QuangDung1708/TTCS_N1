import dayjs from "dayjs";
import { useState } from "react";
import { Button, DatePicker, Select, Table, Tag, Typography } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import { dateTime, readJSON } from "../lib/api";
import { useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  userOptions,
} from "../ui/common";
const entities = {
  users: "Người dùng",
  groups: "Nhóm kinh doanh",
  products: "Sản phẩm",
  deals: "Cơ hội",
  customers: "Khách hàng",
  leads: "Lead",
  sales_targets: "Chỉ tiêu",
  customer_contacts: "Người liên hệ",
};
const actions = {
  ROLE_CHANGE: "Thay đổi vai trò",
  GROUP_CHANGE: "Thay đổi nhóm",
  HANDOVER: "Bàn giao",
  OWNER_CHANGE: "Đổi người phụ trách",
  PRICE_CHANGE: "Thay đổi giá",
  TARGET_CHANGE: "Thay đổi chỉ tiêu",
  STAGE_CHANGE: "Chuyển giai đoạn",
  STAGE_OVERRIDE: "Ghi đè điều kiện",
  CLOSE: "Đóng cơ hội",
  REOPEN: "Mở lại cơ hội",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  STATUS_CHANGE: "Đổi trạng thái",
  ORGANIZATION_CHANGE: "Thay đổi tổ chức",
};
function Value({ value }) {
  const data = readJSON(value, value);
  if (data == null)
    return <Typography.Text type="secondary">—</Typography.Text>;
  return (
    <pre className="audit-value">
      {typeof data === "object" ? JSON.stringify(data, null, 2) : String(data)}
    </pre>
  );
}
export default function Audit() {
  const [filters, setFilters] = useState({}),
    r = useResource("/audit-logs", filters),
    users = useResource("/customers/users-list");
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v || undefined }));
  return (
    <>
      <PageHeader
        title="Nhật ký thay đổi"
        description="Theo dõi người thực hiện, thời điểm và giá trị trước / sau của thay đổi nhạy cảm."
        actions={<RefreshButton resource={r} />}
      />
      <ResourceError resource={r} />
      <DataCard>
        <div className="filter-bar">
          <Select
            aria-label="Loại đối tượng"
            placeholder="Loại đối tượng"
            value={filters.entity_type}
            onChange={(v) => set("entity_type", v)}
            allowClear
            style={{ minWidth: 190 }}
            options={Object.entries(entities).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            aria-label="Người thực hiện"
            placeholder="Người thực hiện"
            showSearch
            optionFilterProp="label"
            value={filters.user_id}
            onChange={(v) => set("user_id", v)}
            allowClear
            style={{ minWidth: 200 }}
            options={userOptions(users.rows)}
          />
          <Select
            aria-label="Hành động"
            placeholder="Hành động"
            allowClear
            value={filters.action_type}
            onChange={(v) => set("action_type", v)}
            style={{ minWidth: 190 }}
            options={Object.entries(actions).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <DatePicker.RangePicker
            value={
              filters.from && filters.to
                ? [dayjs(filters.from), dayjs(filters.to)]
                : null
            }
            onChange={(_, d) =>
              setFilters((f) => ({
                ...f,
                from: d[0] || undefined,
                to: d[1] || undefined,
              }))
            }
          />
          <Button
            icon={<ClearOutlined aria-hidden="true" />}
            onClick={() => setFilters({})}
          >
            Xóa bộ lọc
          </Button>
        </div>
        <Typography.Paragraph type="secondary">
          Hiển thị tối đa 500 thay đổi mới nhất phù hợp bộ lọc. Nội dung chỉ
          đọc.
        </Typography.Paragraph>
        <Table
          rowKey="id"
          dataSource={r.rows}
          loading={r.loading}
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          columns={[
            {
              title: "Thời điểm",
              dataIndex: "created_at",
              width: 170,
              render: dateTime,
            },
            {
              title: "Người thực hiện",
              dataIndex: "user_id",
              width: 170,
              render: (v) =>
                users.rows.find((u) => u.id === v)?.full_name ||
                `Tài khoản #${v}`,
            },
            {
              title: "Hành động",
              dataIndex: "action_type",
              width: 180,
              render: (v) => <Tag color="blue">{actions[v] || v}</Tag>,
            },
            {
              title: "Đối tượng",
              width: 160,
              render: (_, row) => (
                <div>
                  {entities[row.entity_type] || row.entity_type}
                  <Typography.Text type="secondary">
                    {" "}
                    #{row.entity_id}
                  </Typography.Text>
                </div>
              ),
            },
            {
              title: "Giá trị trước",
              dataIndex: "before_value",
              width: 290,
              render: (v) => <Value value={v} />,
            },
            {
              title: "Giá trị sau",
              dataIndex: "after_value",
              width: 290,
              render: (v) => <Value value={v} />,
            },
            {
              title: "Lý do / Nội dung",
              dataIndex: "description",
              render: (v, row) => v || row.reason || "—",
            },
          ]}
        />
      </DataCard>
    </>
  );
}
