import Select from "../ui/LinkedSelect";
import dayjs from "dayjs";
import { useState } from "react";
import { Button, DatePicker, Table, Tag, Typography } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import { dateTime } from "../lib/api";
import { useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  userOptions,
} from "../ui/common";
import {
  auditActions as actions,
  auditEntities as entities,
  auditEntries,
} from "../lib/auditText";
function Value({ value, other, users }) {
  const entries = auditEntries(value, other, users);
  if (!entries.length)
    return <Typography.Text type="secondary">Chưa có</Typography.Text>;
  return (
    <div className="audit-details">
      {entries.map(([label, text], i) => (
        <p key={i}>
          <strong>{label}:</strong> {text}
        </p>
      ))}
    </div>
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
                from: d?.[0] || undefined,
                to: d?.[1] || undefined,
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
          scroll={{ x: 980 }}
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
              render: (v, row) =>
                row.user_name ||
                users.rows.find((u) => u.id === v)?.full_name ||
                (v ? `Tài khoản #${v}` : "Hệ thống"),
            },
            {
              title: "Hành động",
              dataIndex: "action_type",
              width: 180,
              render: (v) => (
                <Tag color="blue">{actions[v] || "Thao tác hệ thống"}</Tag>
              ),
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
              render: (v, row) => (
                <Value value={v} other={row.after_value} users={users.rows} />
              ),
            },
            {
              title: "Giá trị sau",
              dataIndex: "after_value",
              width: 290,
              render: (v, row) => (
                <Value value={v} other={row.before_value} users={users.rows} />
              ),
            },
            {
              title: "Nội dung thay đổi",
              dataIndex: "description",
              render: (v, row) =>
                v ||
                row.reason ||
                `${row.user_name || "Hệ thống"} đã thực hiện thao tác ${(actions[row.action_type] || "cập nhật dữ liệu").toLowerCase()} đối với ${(entities[row.entity_type] || "bản ghi").toLowerCase()} #${row.entity_id || "—"}.`,
            },
          ]}
        />
      </DataCard>
    </>
  );
}
