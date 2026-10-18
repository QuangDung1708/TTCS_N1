import Select from "../ui/LinkedSelect";
import { useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api, download, errorText, money } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  required,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
export default function Quotes() {
  const auth = useAuth(),
    [params] = useSearchParams(),
    [search, setSearch] = useState(""),
    r = useResource("/quotes", { search }),
    deals = useResource("/deals"),
    a = useAction(),
    { message } = App.useApp();
  const [open, setOpen] = useState(
      params.has("create") && auth.can("QUOTE", "write"),
    ),
    [editing, setEditing] = useState(null);
  return (
    <>
      <PageHeader
        title="Báo giá nháp"
        description="Lập bản nháp từ cơ hội và các dòng sản phẩm đã lưu."
        actions={
          <>
            <RefreshButton resource={r} />
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() =>
                download("/quotes/export", { search }, "bao-gia.xlsx").catch(
                  (e) => message.error(errorText(e)),
                )
              }
            >
              Xuất Excel
            </Button>
            {auth.can("QUOTE", "write") && (
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden="true" />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Tạo báo giá nháp
              </Button>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <DataCard>
        <div className="filter-bar">
          <Input
            className="search-input"
            aria-label="Tìm báo giá"
            placeholder="Tìm tên báo giá…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Table
          rowKey="id"
          dataSource={r.rows}
          loading={r.loading}
          scroll={{ x: 850 }}
          columns={[
            { title: "Báo giá", dataIndex: "title", render: (v) => <b>{v}</b> },
            {
              title: "Cơ hội",
              dataIndex: "deal_id",
              render: (v) =>
                deals.rows.find((d) => d.id === v)?.title || `Cơ hội #${v}`,
            },
            { title: "Giá trị gốc", dataIndex: "gross_amount", render: money },
            {
              title: "Chiết khấu",
              dataIndex: "discount_percent",
              render: (v) => Number(v) + "%",
            },
            {
              title: "Giá trị sau chiết khấu",
              dataIndex: "amount",
              render: money,
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              render: (v) => <Tag>{v === "DRAFT" ? "Bản nháp" : v}</Tag>,
            },
            {
              title: "Thao tác",
              render: (_, q) =>
                q.status === "DRAFT" && auth.can("QUOTE", "write", q) ? (
                  <Space>
                    <Button
                      icon={<EditOutlined aria-hidden="true" />}
                      aria-label={`Sửa báo giá ${q.title}`}
                      onClick={() => {
                        setEditing({
                          ...q,
                          discount_percent: Number(q.discount_percent),
                        });
                        setOpen(true);
                      }}
                    />
                    <Popconfirm
                      title="Xóa báo giá nháp?"
                      onConfirm={() =>
                        a.run(() => api.delete("/quotes/" + q.id), r.reload)
                      }
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined aria-hidden="true" />}
                        aria-label={`Xóa báo giá ${q.title}`}
                      />
                    </Popconfirm>
                  </Space>
                ) : (
                  <Typography.Text type="secondary">Chỉ xem</Typography.Text>
                ),
            },
          ]}
        />
      </DataCard>
      <EntityModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Sửa báo giá nháp" : "Tạo báo giá nháp"}
        entity="quote"
        record={editing}
        defaults={{
          discount_percent: 0,
          deal_id: Number(params.get("deal")) || undefined,
        }}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/quotes/" + editing.id, v)
                : api.post("/quotes", { ...v, owner_id: auth.user.id }),
            r.reload,
          )
        }
      >
        <Form.Item name="title" label="Tên báo giá" rules={required}>
          <Input />
        </Form.Item>
        {!editing && (
          <Form.Item name="deal_id" label="Cơ hội" rules={required}>
            <Select
              showSearch
              optionFilterProp="label"
              options={deals.rows.map((d) => ({ value: d.id, label: d.title }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="discount_percent"
          label="Chiết khấu (%)"
          rules={required}
        >
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
      </EntityModal>
    </>
  );
}
