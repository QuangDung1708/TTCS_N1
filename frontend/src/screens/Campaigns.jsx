import { useState } from "react";
import { AutoComplete, Button, Form, Input, Table, Typography } from "antd";
import dayjs from "dayjs";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, money, dateOnly } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import {
  DataCard,
  DateField,
  MoneyField,
  PageHeader,
  RefreshButton,
  ResourceError,
  required,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
export default function Campaigns() {
  const r = useResource("/campaigns"),
    a = useAction(),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null);
  return (
    <>
      <PageHeader
        title="Chiến dịch marketing"
        description="Theo dõi từ nguồn lead đến cơ hội và giá trị đã chốt."
        actions={
          <>
            <RefreshButton resource={r} />
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden="true" />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Tạo chiến dịch
            </Button>
          </>
        }
      />
      <ResourceError resource={r} />
      <DataCard>
        <Table
          rowKey="id"
          dataSource={r.rows}
          loading={r.loading}
          scroll={{ x: 920 }}
          pagination={{ pageSize: 12 }}
          columns={[
            {
              title: "Chiến dịch",
              dataIndex: "name",
              render: (v, row) => (
                <div className="cell-stack">
                  <b>{v}</b>
                  <Typography.Text type="secondary">
                    {row.channel}
                  </Typography.Text>
                </div>
              ),
            },
            {
              title: "Thời gian",
              render: (_, row) =>
                dateOnly(row.start_date) + " – " + dateOnly(row.end_date),
            },
            { title: "Ngân sách", dataIndex: "budget", render: money },
            { title: "Lead", dataIndex: "lead_count" },
            { title: "Cơ hội", dataIndex: "deal_count" },
            { title: "Giá trị đã chốt", dataIndex: "won_value", render: money },
            {
              title: "Thao tác",
              render: (_, row) => (
                <Button
                  type="text"
                  icon={<EditOutlined aria-hidden="true" />}
                  aria-label={`Sửa chiến dịch ${row.name}`}
                  onClick={() => {
                    setEditing({ ...row, budget: Number(row.budget) });
                    setOpen(true);
                  }}
                />
              ),
            },
          ]}
        />
      </DataCard>
      <EntityModal
        title={editing ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch"}
        entity="campaign"
        open={open}
        onClose={() => setOpen(false)}
        record={editing}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/campaigns/" + editing.id, v)
                : api.post("/campaigns", v),
            r.reload,
          )
        }
      >
        <div className="form-grid">
          <Form.Item
            name="name"
            label="Tên chiến dịch"
            rules={required}
            className="full-span"
          >
            <Input maxLength={255} placeholder="Ví dụ: Tư vấn CRM tháng 11" />
          </Form.Item>
          <Form.Item name="budget" label="Ngân sách (VNĐ)" rules={required}>
            <MoneyField />
          </Form.Item>
          <Form.Item name="channel" label="Kênh marketing" rules={required}>
            <AutoComplete
              options={[
                "Website",
                "Email",
                "Facebook",
                "Google Ads",
                "Hội thảo",
                "Giới thiệu",
              ].map((value) => ({ value }))}
              placeholder="Chọn hoặc nhập kênh marketing"
              maxLength={100}
            />
          </Form.Item>
          <Form.Item name="start_date" label="Ngày bắt đầu" rules={required}>
            <DateField />
          </Form.Item>
          <Form.Item
            name="end_date"
            label="Ngày kết thúc"
            dependencies={["start_date"]}
            rules={[
              ...required,
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value ||
                  !getFieldValue("start_date") ||
                  !dayjs(value).isBefore(
                    dayjs(getFieldValue("start_date")),
                    "day",
                  )
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Ngày kết thúc phải từ ngày bắt đầu trở đi."),
                      ),
              }),
            ]}
          >
            <DateField />
          </Form.Item>
        </div>
      </EntityModal>
    </>
  );
}
