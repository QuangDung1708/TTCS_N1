import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api, money, readJSON } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import {
  DataCard,
  MoneyField,
  PageHeader,
  RefreshButton,
  ResourceError,
  required,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
const categoryTabs = [
  ["industry", "Ngành nghề"],
  ["company_size", "Quy mô doanh nghiệp"],
  ["lead_source", "Nguồn lead"],
  ["activity_type", "Loại hoạt động"],
  ["stages", "Giai đoạn pipeline"],
];
const modes = {
  products: {
    title: "Sản phẩm & bảng giá",
    description: "Một danh mục giá thống nhất cho các cơ hội kinh doanh.",
    path: "/products",
  },
  categories: {
    title: "Danh mục bán hàng",
    description:
      "Chuẩn hóa ngành nghề, nguồn lead và các bước trong quy trình bán hàng.",
    path: "/categories",
  },
  "deal-reasons": {
    title: "Lý do thắng / thua & đối thủ",
    description:
      "Ghi nhận điều tạo nên thành công và học từ mỗi cơ hội chưa thành công.",
    path: "/deal-reasons",
  },
  "custom-fields": {
    title: "Trường tùy chỉnh",
    description: "Bổ sung thông tin phù hợp cho hồ sơ khách hàng và cơ hội.",
    path: "/custom-fields",
  },
};
export default function Catalogs({ kind }) {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    [tab, setTab] = useState(
      params.get("tab") ||
        (kind === "deal-reasons"
          ? "WON"
          : kind === "custom-fields"
            ? "customer"
            : "industry"),
    ),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false);
  const mode = modes[kind],
    stage = kind === "categories" && tab === "stages",
    competitor = kind === "deal-reasons" && tab === "competitors";
  const path = stage
    ? "/pipeline-stages"
    : competitor
      ? "/competitors"
      : mode.path;
  const r = useResource(
      path,
      kind === "categories" && !stage
        ? { type: tab }
        : kind === "custom-fields"
          ? { entity_type: tab }
          : {},
    ),
    a = useAction();
  const canWrite =
    kind === "custom-fields"
      ? auth.has("Admin")
      : auth.can("CATEGORY", "write");
  const [form] = Form.useForm();
  const fieldType = Form.useWatch("field_type", form);
  const isProduct = kind === "products";
  const rows = r.rows.filter(
    (row) =>
      (kind !== "deal-reasons" || competitor || row.type === tab) &&
      (!search ||
        [row.name, row.code, row.field_name, row.field_key].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        )),
  );
  const start = (row) => {
    setEditing(
      row
        ? {
            ...row,
            list_price: Number(row.list_price),
            floor_price: Number(row.floor_price),
            ...(auth.has("Director")
              ? {
                  cost_price:
                    row.cost_price == null ? undefined : Number(row.cost_price),
                }
              : {}),
            options: readJSON(row.options, []).join("\n"),
            is_required: !!row.is_required,
            is_active: row.is_active === undefined ? true : !!row.is_active,
          }
        : null,
    );
    setOpen(true);
  };
  const cols = [
    {
      title: isProduct
        ? "Mã sản phẩm"
        : kind === "custom-fields"
          ? "Trường dữ liệu"
          : "Tên danh mục",
      dataIndex: isProduct
        ? "code"
        : kind === "custom-fields"
          ? "field_name"
          : "name",
      render: (v, row) => (
        <div className="cell-stack">
          <b>{v}</b>
          <Typography.Text type="secondary">
            {isProduct
              ? row.name
              : row.code || row.field_key || row.description}
          </Typography.Text>
        </div>
      ),
    },
  ];
  if (isProduct)
    cols.push(
      {
        title: "Loại / Đơn vị",
        render: (_, row) => (
          <>
            <Tag color={row.type === "SUBSCRIPTION" ? "purple" : "blue"}>
              {row.type === "SUBSCRIPTION"
                ? "Dịch vụ thuê bao"
                : "Sản phẩm một lần"}
            </Tag>
            <span className="table-subtitle">{row.unit}</span>
          </>
        ),
      },
      { title: "Giá niêm yết", dataIndex: "list_price", render: money },
      { title: "Giá sàn", dataIndex: "floor_price", render: money },
      ...(auth.has("Director")
        ? [
            {
              title: "Giá vốn",
              dataIndex: "cost_price",
              render: (v) => (v == null ? "—" : money(v)),
            },
          ]
        : []),
      {
        title: "Trạng thái",
        dataIndex: "status",
        render: (v) => (
          <Tag
            color={String(v).toUpperCase() === "ACTIVE" ? "green" : "default"}
          >
            {String(v).toUpperCase() === "ACTIVE"
              ? "Đang kinh doanh"
              : "Ngừng kinh doanh"}
          </Tag>
        ),
      },
    );
  else if (stage)
    cols.push(
      {
        title: "Xác suất thắng",
        dataIndex: "win_probability",
        render: (v) => `${Number(v)}%`,
      },
      {
        title: "Điều kiện rời giai đoạn",
        dataIndex: "exit_condition",
        render: (v) =>
          ({
            none: "Không yêu cầu",
            require_meeting: "Có cuộc gặp",
            require_contact: "Có liên hệ chính",
            require_products: "Có sản phẩm",
            require_quote: "Có báo giá",
          })[v] || v,
      },
      {
        title: "Cảnh báo đình trệ",
        dataIndex: "stagnant_days",
        render: (v) => v + " ngày",
      },
    );
  else if (kind === "custom-fields")
    cols.push(
      {
        title: "Kiểu dữ liệu",
        dataIndex: "field_type",
        render: (v) =>
          ({
            text: "Văn bản",
            number: "Số",
            date: "Ngày",
            select: "Danh sách chọn",
          })[v] || v,
      },
      {
        title: "Bắt buộc",
        dataIndex: "is_required",
        render: (v) => (
          <Tag color={v ? "orange" : "default"}>
            {v ? "Bắt buộc" : "Tùy chọn"}
          </Tag>
        ),
      },
      {
        title: "Sử dụng",
        dataIndex: "is_active",
        render: (v) => (
          <Tag color={v ? "green" : "default"}>
            {v ? "Đang dùng" : "Ngừng dùng"}
          </Tag>
        ),
      },
    );
  else
    cols.push({
      title: "Mô tả",
      dataIndex: "description",
      render: (v) => v || "—",
    });
  if (canWrite)
    cols.push({
      title: "Thao tác",
      key: "actions",
      width: stage || kind === "categories" ? 190 : 130,
      render: (_, row) => (
        <Space size={0}>
          <Button
            type="text"
            aria-label={`Sửa ${row.name || row.field_name}`}
            icon={<EditOutlined aria-hidden="true" />}
            onClick={() => start(row)}
          />
          {(stage || kind === "categories") &&
            ["UP", "DOWN"].map((d) => (
              <Button
                key={d}
                type="text"
                aria-label={`${d === "UP" ? "Đưa lên" : "Đưa xuống"} ${row.name}`}
                icon={
                  d === "UP" ? (
                    <ArrowUpOutlined aria-hidden="true" />
                  ) : (
                    <ArrowDownOutlined aria-hidden="true" />
                  )
                }
                onClick={() =>
                  a.run(
                    () =>
                      api.put(`${path}/${row.id}/swap-order`, { direction: d }),
                    r.reload,
                  )
                }
              />
            ))}
          {isProduct ? (
            <Popconfirm
              title="Thay đổi trạng thái kinh doanh?"
              onConfirm={() =>
                a.run(
                  () => api.put(`${path}/${row.id}/toggle-status`),
                  r.reload,
                )
              }
            >
              <Button
                type="text"
                aria-label={`Đổi trạng thái ${row.name}`}
                icon={<StopOutlined aria-hidden="true" />}
              />
            </Popconfirm>
          ) : kind === "custom-fields" ? null : (
            <Popconfirm
              title="Xóa bản ghi này?"
              description="Dữ liệu đang được tham chiếu sẽ được giữ lại."
              onConfirm={() =>
                a.run(() => api.delete(`${path}/${row.id}`), r.reload)
              }
            >
              <Button
                danger
                type="text"
                aria-label={`Xóa ${row.name}`}
                icon={<DeleteOutlined aria-hidden="true" />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    });
  const save = async (v) => {
    const data = { ...v };
    if (kind === "categories" && !stage) data.type = tab;
    if (kind === "deal-reasons" && !competitor) data.type = tab;
    if (kind === "custom-fields") {
      data.entity_type = tab;
      data.options = (v.options || "")
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (isProduct && !auth.has("Director")) delete data.cost_price;
    return !!(await a.run(
      () =>
        editing ? api.put(path + "/" + editing.id, data) : api.post(path, data),
      r.reload,
    ));
  };
  const tabs =
    kind === "categories"
      ? categoryTabs
      : kind === "deal-reasons"
        ? [
            ["WON", "Lý do thắng"],
            ["LOST", "Lý do thua"],
            ["competitors", "Đối thủ cạnh tranh"],
          ]
        : kind === "custom-fields"
          ? [
              ["customer", "Khách hàng"],
              ["deal", "Cơ hội"],
            ]
          : [];
  return (
    <>
      <PageHeader
        title={mode.title}
        description={mode.description}
        actions={
          <>
            <RefreshButton resource={r} />
            {canWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden="true" />}
                onClick={() => start(null)}
              >
                Thêm mới
              </Button>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <DataCard>
        {tabs.length > 0 && (
          <Tabs
            activeKey={tab}
            onChange={(v) => {
              setTab(v);
              setParams({ tab: v }, { replace: true });
            }}
            items={tabs.map(([key, label]) => ({ key, label }))}
          />
        )}
        <div className="filter-bar">
          <Input
            className="search-input"
            prefix={<SearchOutlined aria-hidden="true" />}
            aria-label="Tìm danh mục"
            placeholder="Tìm theo tên hoặc mã…"
            value={search}
            allowClear
            onChange={(e) => setSearch(e.target.value)}
          />
          {!canWrite && <Tag>Quyền chỉ xem</Tag>}
        </div>
        <Table
          rowKey="id"
          dataSource={rows}
          loading={r.loading}
          columns={cols}
          scroll={{ x: isProduct ? 980 : 650 }}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (n) => `${n} bản ghi`,
          }}
        />
      </DataCard>
      <EntityModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Chỉnh sửa thông tin" : "Thêm thông tin mới"}
        record={editing}
        entity={kind + "-" + tab}
        busy={a.busy}
        onSave={save}
        form={form}
        defaults={
          isProduct
            ? { type: "ONE_TIME" }
            : stage
              ? {
                  win_probability: 0,
                  exit_condition: "none",
                  stagnant_days: 14,
                  is_active: true,
                }
              : kind === "custom-fields"
                ? { field_type: "text", is_active: true, is_required: false }
                : {}
        }
      >
        <div className="form-grid">
          {kind === "custom-fields" ? (
            <>
              <Form.Item
                name="field_name"
                label="Tên hiển thị"
                rules={required}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="field_key"
                label="Mã trường"
                rules={[
                  ...required,
                  {
                    pattern: /^[A-Za-z][A-Za-z0-9_]*$/,
                    message: "Dùng chữ, số và dấu gạch dưới.",
                  },
                ]}
              >
                <Input disabled={!!editing} />
              </Form.Item>
              <Form.Item
                name="field_type"
                label="Kiểu dữ liệu"
                rules={required}
              >
                <Select
                  disabled={!!editing}
                  options={[
                    { value: "text", label: "Văn bản" },
                    { value: "number", label: "Số" },
                    { value: "date", label: "Ngày" },
                    { value: "select", label: "Danh sách chọn" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="is_required"
                label="Bắt buộc nhập"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              {fieldType === "select" && (
                <Form.Item
                  name="options"
                  label="Các lựa chọn (mỗi dòng một lựa chọn)"
                  className="full-span"
                  rules={required}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              )}
              <Form.Item
                name="is_active"
                label="Đang sử dụng"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          ) : (
            <>
              {(isProduct ||
                stage ||
                (kind === "categories" && !competitor)) && (
                <Form.Item name="code" label="Mã định danh" rules={required}>
                  <Input maxLength={50} />
                </Form.Item>
              )}
              <Form.Item
                name="name"
                label={competitor ? "Tên đối thủ" : "Tên"}
                rules={required}
              >
                <Input maxLength={255} />
              </Form.Item>
              {isProduct ? (
                <>
                  <Form.Item name="type" label="Loại sản phẩm" rules={required}>
                    <Select
                      options={[
                        { value: "ONE_TIME", label: "Sản phẩm một lần" },
                        { value: "SUBSCRIPTION", label: "Dịch vụ thuê bao" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="unit" label="Đơn vị tính" rules={required}>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="list_price"
                    label="Giá niêm yết"
                    rules={required}
                  >
                    <MoneyField />
                  </Form.Item>
                  <Form.Item
                    name="floor_price"
                    label="Giá sàn"
                    rules={required}
                  >
                    <MoneyField />
                  </Form.Item>
                  {auth.has("Director") && (
                    <Form.Item name="cost_price" label="Giá vốn">
                      <MoneyField />
                    </Form.Item>
                  )}
                </>
              ) : stage ? (
                <>
                  <Form.Item
                    name="win_probability"
                    label="Xác suất thắng (%)"
                    rules={required}
                  >
                    <InputNumber min={0} max={100} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="exit_condition" label="Điều kiện bắt buộc">
                    <Select
                      options={[
                        ["none", "Không yêu cầu"],
                        ["require_meeting", "Có cuộc gặp"],
                        ["require_contact", "Có liên hệ chính"],
                        ["require_products", "Có dòng sản phẩm"],
                        ["require_quote", "Có báo giá"],
                      ].map(([value, label]) => ({ value, label }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="stagnant_days"
                    label="Số ngày không hoạt động trước khi cảnh báo"
                    rules={required}
                  >
                    <InputNumber min={1} max={3650} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    name="is_active"
                    label="Đang sử dụng"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </>
              ) : competitor ? (
                <>
                  <Form.Item name="website" label="Website">
                    <Input />
                  </Form.Item>
                  <Form.Item name="strengths" label="Điểm mạnh">
                    <Input.TextArea />
                  </Form.Item>
                  <Form.Item name="weaknesses" label="Điểm cần lưu ý">
                    <Input.TextArea />
                  </Form.Item>
                </>
              ) : null}
              <Form.Item name="description" label="Mô tả" className="full-span">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}
        </div>
      </EntityModal>
    </>
  );
}
