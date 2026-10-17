import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Avatar,
  Button,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  BranchesOutlined,
  CheckOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  api,
  dateTime,
  download,
  errorText,
  money,
  readJSON,
  upload,
} from "../lib/api";
import { useAction, useMedia, useResource } from "../lib/hooks";
import {
  CustomFields,
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  StatusTag,
  phoneRules,
  required,
  userOptions,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
import ExcelImport from "../ui/ExcelImport";
import SavedFilters from "../ui/SavedFilters";
const statuses = ["Tiềm năng", "Đang giao dịch", "Khách hàng", "Ngừng hợp tác"];
export default function Customers() {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState({}),
    [tab, setTab] = useState("list"),
    [days, setDays] = useState(30),
    [editing, setEditing] = useState(null),
    [editOpen, setEditOpen] = useState(false),
    [selected, setSelected] = useState(null),
    [importOpen, setImportOpen] = useState(false),
    [mergeOpen, setMergeOpen] = useState(false);
  const parentOptions = useResource(editOpen ? "/customers" : null);
  const r = useResource("/customers", filters),
    care = useResource("/customers/care-list", { ...filters, days }),
    fields = useResource("/custom-fields", { entity_type: "customer" }),
    catalog = useResource("/categories"),
    directory = useResource("/customers/users-list"),
    regions = useResource("/organization/regions"),
    a = useAction();
  const { message } = App.useApp();
  const reload = () => {
    r.reload();
    care.reload();
  };
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  useEffect(() => {
    if (params.get("customer")) setSelected(Number(params.get("customer")));
    if (params.get("create") && auth.can("CUSTOMER", "write")) {
      setEditing(null);
      setEditOpen(true);
    }
  }, [params]);
  const edit = (row) => {
    setEditing(
      row ? { ...row, custom_fields: readJSON(row.custom_fields) } : null,
    );
    setEditOpen(true);
  };
  const columns = [
    {
      title: "Doanh nghiệp",
      dataIndex: "company_name",
      width: 250,
      render: (v, row) => (
        <>
          <button className="table-primary" onClick={() => setSelected(row.id)}>
            {v || row.name}
          </button>
          <span className="table-subtitle">
            {row.tax_code ? "MST: " + row.tax_code : "Chưa có mã số thuế"}
          </span>
        </>
      ),
    },
    {
      title: "Ngành nghề / Quy mô",
      render: (_, row) => (
        <div className="cell-stack">
          <span>{row.industry || "Chưa cập nhật"}</span>
          <Typography.Text type="secondary">
            {row.company_size || "—"}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (v) => (
        <Tag
          color={
            v === "Khách hàng"
              ? "green"
              : v === "Đang giao dịch"
                ? "cyan"
                : v === "Tiềm năng"
                  ? "blue"
                  : "default"
          }
        >
          {v}
        </Tag>
      ),
    },
    {
      title: "Chăm sóc",
      render: (_, row) => (
        <Tag color={row.risk_level === "Nguy cấp" ? "orange" : "green"}>
          {row.risk_level === "Nguy cấp" ? "Cần chú ý" : "Bình thường"}
        </Tag>
      ),
    },
    {
      title: "Người phụ trách",
      dataIndex: "assigned_user_name",
      render: (v) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined aria-hidden="true" />} />
          <span>{v || "Chưa phân công"}</span>
        </Space>
      ),
    },
    {
      title: "Thao tác",
      width: 150,
      render: (_, row) => (
        <Space size={0}>
          <Tooltip title="Xem hồ sơ 360">
            <Button
              type="text"
              aria-label={`Xem hồ sơ ${row.company_name}`}
              icon={<EyeOutlined aria-hidden="true" />}
              onClick={() => setSelected(row.id)}
            />
          </Tooltip>
          {auth.can("CUSTOMER", "write", row) && (
            <>
              <Button
                type="text"
                aria-label={`Sửa ${row.company_name}`}
                icon={<EditOutlined aria-hidden="true" />}
                onClick={() => edit(row)}
              />
              {tab === "care" && (
                <Button
                  type="text"
                  aria-label={`Đã liên hệ ${row.company_name}`}
                  icon={<CheckOutlined aria-hidden="true" />}
                  onClick={() =>
                    a.run(
                      () => api.put(`/customers/${row.id}/contacted`),
                      reload,
                      "Đã ghi nhận liên hệ.",
                    )
                  }
                />
              )}
              <Popconfirm
                title="Xóa khách hàng?"
                description="Hồ sơ có dữ liệu liên quan sẽ được giữ lại."
                onConfirm={() =>
                  a.run(() => api.delete("/customers/" + row.id), reload)
                }
              >
                <Button
                  type="text"
                  danger
                  aria-label={`Xóa ${row.company_name}`}
                  icon={<DeleteOutlined aria-hidden="true" />}
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];
  const active = tab === "care" ? care : r;
  const customPair =
    Object.entries(readJSON(filters.custom_fields, {}))[0] || [];
  const activeFields = fields.rows.filter((f) => f.is_active);
  return (
    <>
      <PageHeader
        title="Khách hàng & doanh nghiệp"
        description="Theo dõi hồ sơ 360, người liên hệ và những mối quan hệ cần được chăm sóc."
        actions={
          <>
            <RefreshButton resource={active} />
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() =>
                download("/customers/export", filters, "khach-hang.xlsx").catch(
                  (e) => message.error(errorText(e)),
                )
              }
            >
              Xuất Excel
            </Button>
            {auth.can("CUSTOMER", "write") && (
              <>
                <Button
                  icon={<UploadOutlined aria-hidden="true" />}
                  onClick={() => setImportOpen(true)}
                >
                  Nhập Excel
                </Button>
                {auth.has("Admin", "Director", "Team Lead") && (
                  <Button
                    icon={<BranchesOutlined aria-hidden="true" />}
                    onClick={() => setMergeOpen(true)}
                  >
                    Gộp trùng
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<PlusOutlined aria-hidden="true" />}
                  onClick={() => edit(null)}
                >
                  Thêm khách hàng
                </Button>
              </>
            )}
          </>
        }
      />
      <ResourceError resource={active} />
      <ResourceError resource={fields} />
      <DataCard>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "list",
              label: `Danh sách khách hàng${r.data ? " (" + r.rows.length + ")" : ""}`,
            },
            {
              key: "care",
              label: `Cần chăm sóc định kỳ${care.data ? " (" + care.rows.length + ")" : ""}`,
            },
          ]}
        />
        <div className="filter-bar">
          <Input
            prefix={<SearchOutlined aria-hidden="true" />}
            placeholder="Tên, mã số thuế, số điện thoại…"
            aria-label="Tìm khách hàng"
            value={filters.search || ""}
            onChange={(e) => setFilter("search", e.target.value)}
            allowClear
            className="search-input"
          />
          <Select
            aria-label="Lọc trạng thái khách hàng"
            placeholder="Trạng thái"
            allowClear
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={statuses.map((v) => ({ value: v, label: v }))}
          />
          <Select
            aria-label="Lọc ngành nghề"
            placeholder="Ngành nghề"
            allowClear
            value={filters.industry}
            onChange={(v) => setFilter("industry", v)}
            options={catalog.rows
              .filter((c) => c.type === "industry")
              .map((c) => ({ value: c.name, label: c.name }))}
          />
          <Select
            aria-label="Lọc quy mô"
            placeholder="Quy mô"
            allowClear
            value={filters.company_size}
            onChange={(v) => setFilter("company_size", v)}
            options={catalog.rows
              .filter((c) => c.type === "company_size")
              .map((c) => ({ value: c.name, label: c.name }))}
          />
          <Select
            aria-label="Lọc khu vực"
            placeholder="Khu vực"
            allowClear
            value={filters.region}
            onChange={(v) => setFilter("region", v)}
            options={regions.rows.map((c) => ({
              value: c.name,
              label: c.name,
            }))}
          />
          <Select
            aria-label="Lọc người phụ trách"
            placeholder="Người phụ trách"
            allowClear
            value={filters.owner_id}
            onChange={(v) => setFilter("owner_id", v)}
            options={userOptions(directory.rows)}
          />
          <Button onClick={() => setFilters({})}>Đặt lại</Button>
        </div>
        {tab === "care" && (
          <Space wrap className="section-gap">
            <Typography.Text type="secondary">
              Chưa tương tác trong
            </Typography.Text>
            <InputNumber
              aria-label="Số ngày cần chăm sóc"
              min={1}
              max={3650}
              value={days}
              onChange={(v) => setDays(v || 30)}
              suffix="ngày"
            />
          </Space>
        )}
        {activeFields.length > 0 && (
          <div className="filter-bar">
            <Select
              aria-label="Chọn trường tùy chỉnh để lọc"
              placeholder="Lọc theo trường tùy chỉnh"
              value={customPair[0]}
              allowClear
              options={activeFields.map((f) => ({
                value: f.field_key,
                label: f.field_name,
              }))}
              onChange={(key) =>
                setFilter(
                  "custom_fields",
                  key ? JSON.stringify({ [key]: "" }) : undefined,
                )
              }
            />
            {customPair[0] && (
              <Input
                aria-label="Giá trị trường tùy chỉnh"
                placeholder="Giá trị cần tìm"
                value={customPair[1]}
                onChange={(e) =>
                  setFilter(
                    "custom_fields",
                    JSON.stringify({ [customPair[0]]: e.target.value }),
                  )
                }
                style={{ maxWidth: 240 }}
              />
            )}
          </div>
        )}
        <SavedFilters
          entity="customers"
          criteria={filters}
          onApply={setFilters}
          canWrite={auth.can("CUSTOMER", "write")}
        />
        <Table
          rowKey="id"
          loading={active.loading}
          dataSource={active.rows}
          columns={columns}
          rowClassName={(row) =>
            row.risk_level === "Nguy cấp" ? "risk-row" : ""
          }
          scroll={{ x: 1080 }}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (n) => `${n} khách hàng`,
          }}
          locale={{ emptyText: "Chưa có khách hàng phù hợp với bộ lọc." }}
        />
      </DataCard>
      <EntityModal
        title={editing ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}
        record={editing}
        entity="customer"
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          if (params.has("create")) setParams({}, { replace: true });
        }}
        busy={a.busy}
        defaults={{ status: "Tiềm năng", created_by: auth.user.id }}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/customers/" + editing.id, v)
                : api.post("/customers", v),
            reload,
          )
        }
      >
        <div className="form-grid">
          <Form.Item
            className="full-span"
            name="company_name"
            label="Tên công ty / doanh nghiệp"
            rules={required}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item
            name="tax_code"
            label="Mã số thuế"
            rules={[
              {
                pattern: /^\d{10}(?:-?\d{3})?$/,
                message: "Mã số thuế gồm 10 hoặc 13 chữ số.",
              },
            ]}
          >
            <Input maxLength={14} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={required}>
            <Select options={statuses.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="industry" label="Ngành nghề">
            <Select
              allowClear
              options={catalog.rows
                .filter((c) => c.type === "industry")
                .map((c) => ({ value: c.name, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="company_size" label="Quy mô doanh nghiệp">
            <Select
              allowClear
              options={catalog.rows
                .filter((c) => c.type === "company_size")
                .map((c) => ({ value: c.name, label: c.name }))}
            />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: "email", message: "Email chưa đúng định dạng." }]}
          >
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={phoneRules}>
            <Input />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input />
          </Form.Item>
          <Form.Item name="region" label="Khu vực">
            <Select
              allowClear
              options={regions.rows.map((c) => ({
                value: c.name,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="created_by" label="Người sở hữu" rules={required}>
            <Select
              options={userOptions(directory.rows)}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="parent_id" label="Công ty mẹ">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={parentOptions.rows
                .filter((c) => c.id !== editing?.id)
                .map((c) => ({ value: c.id, label: c.company_name || c.name }))}
            />
          </Form.Item>
          <Form.Item className="full-span" name="address" label="Địa chỉ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <CustomFields fields={fields.rows} />
        </div>
      </EntityModal>
      {selected && (
        <CustomerDrawer
          key={selected}
          id={selected}
          onClose={() => {
            setSelected(null);
            if (params.has("customer")) setParams({}, { replace: true });
          }}
          onEdit={(row) => {
            setSelected(null);
            edit(row);
          }}
          onChanged={reload}
        />
      )}
      <ExcelImport
        entity="customers"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={reload}
      />
      {mergeOpen && (
        <CustomerMerge onClose={() => setMergeOpen(false)} onMerged={reload} />
      )}
    </>
  );
}
function CustomerMerge({ onClose, onMerged }) {
  const r = useResource("/customers/detect-duplicates"),
    a = useAction(),
    auth = useAuth();
  const [pair, setPair] = useState(null),
    [target, setTarget] = useState(null);
  return (
    <Modal
      open
      title="So sánh & gộp khách hàng trùng"
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <ResourceError resource={r} />
      <Typography.Paragraph type="secondary">
        So sánh hai hồ sơ, chọn hồ sơ giữ lại. Liên hệ, cơ hội, hoạt động và tệp
        sẽ được chuyển về cùng một khách hàng.
      </Typography.Paragraph>
      <Select
        className="entity-select section-gap"
        placeholder="Chọn cặp hồ sơ cần so sánh"
        options={r.rows.map((p, i) => ({
          value: i,
          label: `${p.left.company_name} ↔ ${p.right.company_name}`,
        }))}
        onChange={(i) => {
          setPair(r.rows[i]);
          setTarget(r.rows[i].left.id);
        }}
        loading={r.loading}
      />
      {!r.loading && !r.rows.length && (
        <Empty description="Không phát hiện khách hàng trùng trong phạm vi của bạn." />
      )}
      {pair && (
        <>
          <Row gutter={[14, 14]}>
            {[pair.left, pair.right].map((row) => (
              <Col xs={24} sm={12} key={row.id}>
                <div className="compare-card">
                  <strong>{row.company_name || row.name}</strong>
                  <p>MST: {row.tax_code || "Chưa có"}</p>
                  <p>Website: {row.website || "Chưa có"}</p>
                  <p>
                    Người phụ trách:{" "}
                    {row.assigned_user_name || "Chưa phân công"}
                  </p>
                  <Button
                    block
                    type={target === row.id ? "primary" : "default"}
                    onClick={() => setTarget(row.id)}
                  >
                    {target === row.id
                      ? "Hồ sơ được giữ lại"
                      : "Giữ lại hồ sơ này"}
                  </Button>
                </div>
              </Col>
            ))}
          </Row>
          <div className="form-actions">
            <Popconfirm
              title="Gộp hai khách hàng này?"
              description="Thao tác sẽ chuyển dữ liệu liên quan và không thể hoàn tác trực tiếp."
              onConfirm={() =>
                a.run(
                  () =>
                    api.post("/customers/merge", {
                      target_id: target,
                      source_id: [pair.left.id, pair.right.id].find(
                        (id) => id !== target,
                      ),
                    }),
                  () => {
                    onMerged();
                    onClose();
                  },
                )
              }
            >
              <Button
                type="primary"
                loading={a.busy}
                disabled={
                  !auth.can("CUSTOMER", "write", pair.left) ||
                  !auth.can("CUSTOMER", "write", pair.right)
                }
              >
                Xác nhận gộp
              </Button>
            </Popconfirm>
          </div>
        </>
      )}
    </Modal>
  );
}
export function CustomerDrawer({ id, onClose, onEdit, onChanged }) {
  const r = useResource(`/customers/${id}/360`),
    all = useResource("/customers"),
    directory = useResource("/customers/users-list"),
    auth = useAuth(),
    a = useAction(),
    small = useMedia("(max-width:575px)"),
    nav = useNavigate();
  const { message } = App.useApp();
  const [contactOpen, setContactOpen] = useState(false),
    [contact, setContact] = useState(null),
    [transfer, setTransfer] = useState(null),
    [ticket, setTicket] = useState(null),
    [ticketOpen, setTicketOpen] = useState(false),
    [note, setNote] = useState(
      () => sessionStorage.getItem(`crm:note:${auth.user.id}:${id}`) || "",
    ),
    [noteType, setNoteType] = useState("Ghi chú");
  const data = r.data?.data,
    customer = data?.customer;
  const write = customer && auth.can("CUSTOMER", "write", customer);
  const changed = () => {
    r.reload();
    onChanged();
  };
  const contactColumns = [
    {
      title: "Người liên hệ",
      dataIndex: "full_name",
      render: (v, row) => (
        <>
          <b>{v}</b>
          {!!row.is_primary && <Tag color="gold">Đầu mối chính</Tag>}
          <span className="table-subtitle">
            {row.position || "Chưa có chức danh"}
          </span>
        </>
      ),
    },
    {
      title: "Thông tin",
      render: (_, row) => (
        <div className="cell-stack">
          <span>{row.email || "—"}</span>
          <span>{row.phone || "—"}</span>
        </div>
      ),
    },
    { title: "Vai trò quyết định", dataIndex: "decision_role" },
    ...(write
      ? [
          {
            title: "Thao tác",
            render: (_, row) => (
              <Space size={0}>
                <Button
                  type="text"
                  aria-label={`Sửa liên hệ ${row.full_name}`}
                  icon={<EditOutlined aria-hidden="true" />}
                  onClick={() => {
                    setContact(row);
                    setContactOpen(true);
                  }}
                />
                <Button
                  type="text"
                  aria-label={`Đặt ${row.full_name} làm đầu mối chính`}
                  icon={
                    row.is_primary ? (
                      <StarFilled
                        aria-hidden="true"
                        style={{ color: "#d48806" }}
                      />
                    ) : (
                      <StarOutlined aria-hidden="true" />
                    )
                  }
                  disabled={!!row.is_primary}
                  onClick={() =>
                    a.run(
                      () => api.put(`/customers/contacts/${row.id}/primary`),
                      changed,
                    )
                  }
                />
                <Button
                  type="text"
                  aria-label={`Chuyển công ty ${row.full_name}`}
                  icon={<SwapOutlined aria-hidden="true" />}
                  onClick={() => setTransfer(row)}
                />
                <Popconfirm
                  title="Xóa liên hệ này?"
                  onConfirm={() =>
                    a.run(() => api.delete("/contacts/" + row.id), changed)
                  }
                >
                  <Button
                    type="text"
                    danger
                    aria-label={`Xóa liên hệ ${row.full_name}`}
                    icon={<DeleteOutlined aria-hidden="true" />}
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];
  const tabs = data
    ? [
        {
          key: "overview",
          label: "Tổng quan",
          children: (
            <>
              <Descriptions
                bordered
                size="small"
                column={{ xs: 1, sm: 2 }}
                items={[
                  {
                    key: "tax",
                    label: "Mã số thuế",
                    children: customer.tax_code || "—",
                  },
                  {
                    key: "industry",
                    label: "Ngành nghề",
                    children: customer.industry || "—",
                  },
                  {
                    key: "size",
                    label: "Quy mô",
                    children: customer.company_size || "—",
                  },
                  {
                    key: "web",
                    label: "Website",
                    children: customer.website || "—",
                  },
                  {
                    key: "address",
                    label: "Địa chỉ",
                    children: customer.address || "—",
                  },
                  {
                    key: "owner",
                    label: "Người phụ trách",
                    children:
                      directory.rows.find((u) => u.id === customer.created_by)
                        ?.full_name || "Chưa phân công",
                  },
                ]}
              />
              <Typography.Title level={5}>Nhóm công ty</Typography.Title>
              <Table
                size="small"
                rowKey="id"
                dataSource={data.groupBreakdown || []}
                pagination={false}
                columns={[
                  { title: "Doanh nghiệp", dataIndex: "company_name" },
                  {
                    title: "Giá trị hợp đồng",
                    dataIndex: "contract_value",
                    render: money,
                  },
                ]}
                scroll={{ x: 420 }}
              />
              {Object.entries(readJSON(customer.custom_fields)).length > 0 && (
                <>
                  <Typography.Title level={5}>
                    Thông tin bổ sung
                  </Typography.Title>
                  <Descriptions
                    column={1}
                    items={Object.entries(readJSON(customer.custom_fields)).map(
                      ([key, value]) => ({
                        key,
                        label: key,
                        children: String(value),
                      }),
                    )}
                  />
                </>
              )}
            </>
          ),
        },
        {
          key: "contacts",
          label: `Người liên hệ (${data.contacts.length})`,
          children: (
            <>
              {write && (
                <Button
                  className="section-gap"
                  type="primary"
                  icon={<PlusOutlined aria-hidden="true" />}
                  onClick={() => {
                    setContact(null);
                    setContactOpen(true);
                  }}
                >
                  Thêm liên hệ
                </Button>
              )}
              <Table
                rowKey="id"
                size="small"
                dataSource={data.contacts}
                columns={contactColumns}
                scroll={{ x: 680 }}
                pagination={{ pageSize: 8 }}
              />
            </>
          ),
        },
        {
          key: "deals",
          label: `Cơ hội (${data.deals.length})`,
          children: (
            <>
              {auth.can("DEAL", "write", customer) && (
                <Button
                  icon={<PlusOutlined aria-hidden="true" />}
                  className="section-gap"
                  onClick={() => nav(`/pipeline?create=1&customer=${id}`)}
                >
                  Tạo cơ hội
                </Button>
              )}
              <Table
                rowKey="id"
                dataSource={data.deals}
                scroll={{ x: 560 }}
                columns={[
                  {
                    title: "Cơ hội",
                    dataIndex: "title",
                    render: (v, row) => (
                      <button
                        className="table-primary"
                        onClick={() => nav("/pipeline?deal=" + row.id)}
                      >
                        {v}
                      </button>
                    ),
                  },
                  { title: "Giá trị", dataIndex: "amount", render: money },
                  {
                    title: "Kết quả",
                    dataIndex: "status",
                    render: (v) => <StatusTag value={v} />,
                  },
                ]}
                pagination={{ pageSize: 8 }}
              />
            </>
          ),
        },
        {
          key: "activities",
          label: `Hoạt động (${data.activities.length})`,
          children: (
            <>
              {auth.can("ACTIVITY", "write", customer) && (
                <>
                  <Select
                    className="section-gap"
                    aria-label="Loại hoạt động khách hàng"
                    value={noteType}
                    onChange={setNoteType}
                    options={["Ghi chú", "Cuộc gặp", "Liên hệ"].map((v) => ({
                      value: v,
                      label: v,
                    }))}
                  />
                  <div className="notes-composer">
                    <Input.TextArea
                      rows={3}
                      aria-label="Nội dung hoạt động khách hàng"
                      placeholder="Ghi lại nội dung trao đổi với khách hàng…"
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        sessionStorage.setItem(
                          `crm:note:${auth.user.id}:${id}`,
                          e.target.value,
                        );
                      }}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined aria-hidden="true" />}
                      loading={a.busy}
                      disabled={!note.trim()}
                      onClick={() =>
                        a.run(
                          () =>
                            api.post("/activities", {
                              customer_id: id,
                              activity_type: noteType,
                              content: note,
                            }),
                          () => {
                            setNote("");
                            sessionStorage.removeItem(
                              `crm:note:${auth.user.id}:${id}`,
                            );
                            changed();
                          },
                        )
                      }
                    >
                      Ghi nhận
                    </Button>
                  </div>
                </>
              )}
              {data.activities.length ? (
                <Timeline
                  items={data.activities.map((item) => ({
                    key: item.id,
                    title: (
                      <Space wrap>
                        <b>{item.activity_type}</b>
                        <Typography.Text type="secondary">
                          {dateTime(item.created_at)}
                        </Typography.Text>
                      </Space>
                    ),
                    content: (
                      <>
                        <Typography.Paragraph>
                          {item.content}
                        </Typography.Paragraph>
                        <Typography.Text type="secondary">
                          {item.author_name || "Hệ thống"}
                        </Typography.Text>
                      </>
                    ),
                  }))}
                />
              ) : (
                <Empty description="Chưa có hoạt động trong phạm vi của bạn." />
              )}
            </>
          ),
        },
        {
          key: "support",
          label: `Yêu cầu hỗ trợ (${data.tickets.length})`,
          children: (
            <>
              {write && (
                <Button
                  type="primary"
                  icon={<PlusOutlined aria-hidden="true" />}
                  className="section-gap"
                  onClick={() => {
                    setTicket(null);
                    setTicketOpen(true);
                  }}
                >
                  Tạo yêu cầu hỗ trợ
                </Button>
              )}
              <Table
                rowKey="id"
                dataSource={data.tickets}
                scroll={{ x: 560 }}
                columns={[
                  { title: "Yêu cầu", dataIndex: "title" },
                  { title: "Ưu tiên", dataIndex: "priority" },
                  { title: "Trạng thái", dataIndex: "status" },
                  {
                    title: "Thao tác",
                    render: (_, row) =>
                      write ? (
                        <Button
                          icon={<EditOutlined aria-hidden="true" />}
                          onClick={() => {
                            setTicket(row);
                            setTicketOpen(true);
                          }}
                        >
                          Cập nhật
                        </Button>
                      ) : (
                        "Chỉ xem"
                      ),
                  },
                ]}
                pagination={{ pageSize: 8 }}
              />
            </>
          ),
        },
        {
          key: "files",
          label: `Tệp đính kèm (${data.files.length})`,
          children: (
            <>
              {write && (
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (file.size > 10 * 1024 * 1024) {
                      message.error("Tệp không quá 10 MB.");
                      return Upload.LIST_IGNORE;
                    }
                    a.run(
                      () => upload(`/customers/${id}/files`, file),
                      changed,
                      "Đã lưu tệp đính kèm.",
                    );
                    return false;
                  }}
                >
                  <Button
                    icon={<UploadOutlined aria-hidden="true" />}
                    loading={a.busy}
                    className="section-gap"
                  >
                    Tải tệp lên
                  </Button>
                </Upload>
              )}
              <List
                dataSource={data.files}
                locale={{ emptyText: "Chưa có tệp đính kèm." }}
                renderItem={(f) => (
                  <List.Item
                    actions={[
                      <Button
                        key="download"
                        icon={<DownloadOutlined aria-hidden="true" />}
                        onClick={() =>
                          download(
                            `/customers/${id}/files/${f.id}`,
                            {},
                            f.file_name,
                          ).catch((e) => message.error(errorText(e)))
                        }
                      >
                        Tải xuống
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileOutlined aria-hidden="true" />}
                      title={f.file_name}
                      description={`${Math.ceil(f.size_bytes / 1024)} KB · ${dateTime(f.created_at)}`}
                    />
                  </List.Item>
                )}
              />
            </>
          ),
        },
      ]
    : [];
  return (
    <>
      <Drawer
        title="Hồ sơ khách hàng 360"
        open
        onClose={onClose}
        size={small ? "100%" : 1000}
        loading={r.loading && !r.data}
        extra={
          write && (
            <Button
              icon={<EditOutlined aria-hidden="true" />}
              onClick={() => onEdit(customer)}
            >
              Chỉnh sửa
            </Button>
          )
        }
      >
        <ResourceError resource={r} />
        {data && (
          <>
            <div className="record-detail-heading">
              <Tag color="blue">{customer.status}</Tag>
              <Tag
                color={customer.risk_level === "Nguy cấp" ? "orange" : "green"}
              >
                {customer.risk_level}
              </Tag>
              <Typography.Title level={3}>
                {customer.company_name || customer.name}
              </Typography.Title>
              <Typography.Text type="secondary">
                {customer.email ||
                  customer.phone ||
                  "Chưa cập nhật thông tin liên hệ"}
              </Typography.Text>
            </div>
            <div className="drawer-stats">
              {[
                ["Đã ký hợp đồng", data.signedValue],
                ["Cơ hội đang mở", data.openDealsValue],
                ["Tổng nhóm công ty", data.groupTotalValue],
              ].map(([label, value]) => (
                <div className="drawer-stat" key={label}>
                  <span>{label}</span>
                  <strong>{money(value)}</strong>
                </div>
              ))}
            </div>
            <Tabs items={tabs} />
          </>
        )}
      </Drawer>
      <EntityModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={contact ? "Chỉnh sửa liên hệ" : "Thêm người liên hệ"}
        record={contact}
        entity={"contact-" + id}
        defaults={{ decision_role: "Người dùng cuối", is_primary: false }}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              contact
                ? api.put("/contacts/" + contact.id, v)
                : api.post("/contacts/customer/" + id, v),
            changed,
          )
        }
      >
        <div className="form-grid">
          <Form.Item name="full_name" label="Họ và tên" rules={required}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Chức danh">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={phoneRules}>
            <Input />
          </Form.Item>
          <Form.Item
            name="decision_role"
            label="Vai trò quyết định mua"
            rules={required}
          >
            <Select
              options={[
                "Người quyết định",
                "Người ảnh hưởng",
                "Người dùng cuối",
                "Người cản trở",
              ].map((v) => ({ value: v, label: v }))}
            />
          </Form.Item>
          <Form.Item
            name="is_primary"
            label="Đầu mối liên hệ chính"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>
      </EntityModal>
      <EntityModal
        open={!!transfer}
        onClose={() => setTransfer(null)}
        title="Chuyển người liên hệ sang công ty khác"
        record={null}
        entity={"transfer-contact-" + transfer?.id}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              api.put(`/contacts/${transfer.id}/transfer`, {
                targetCustomerId: v.customer_id,
                transferReason: v.reason,
              }),
            changed,
          )
        }
      >
        <Alert
          type="info"
          showIcon
          title="Lịch sử liên hệ được giữ nguyên sau khi chuyển công ty."
          className="section-gap"
        />
        <Form.Item name="customer_id" label="Công ty mới" rules={required}>
          <Select
            showSearch
            optionFilterProp="label"
            options={all.rows
              .filter((c) => c.id !== id)
              .map((c) => ({ value: c.id, label: c.company_name || c.name }))}
          />
        </Form.Item>
        <Form.Item name="reason" label="Lý do chuyển" rules={required}>
          <Input.TextArea />
        </Form.Item>
      </EntityModal>
      <EntityModal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title={ticket ? "Cập nhật yêu cầu hỗ trợ" : "Tạo yêu cầu hỗ trợ"}
        record={ticket}
        defaults={{ priority: "Cao", status: "Mới", assigned_to: auth.user.id }}
        entity={"ticket-" + id}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              ticket
                ? api.put("/customers/tickets/" + ticket.id, v)
                : api.post("/customers/tickets", { ...v, customer_id: id }),
            changed,
          )
        }
      >
        <Form.Item name="title" label="Nội dung yêu cầu" rules={required}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <div className="form-grid">
          <Form.Item name="priority" label="Mức ưu tiên" rules={required}>
            <Select
              options={["Thấp", "Trung bình", "Cao", "Khẩn cấp"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={required}>
            <Select
              options={["Mới", "Đang xử lý", "Đã xử lý", "Đã đóng"].map(
                (v) => ({ value: v, label: v }),
              )}
            />
          </Form.Item>
          <Form.Item name="assigned_to" label="Người xử lý" rules={required}>
            <Select options={userOptions(directory.rows)} />
          </Form.Item>
        </div>
      </EntityModal>
    </>
  );
}
