import { useEffect, useState } from "react";
import {
  Alert,
  App,
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
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  BranchesOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  SwapOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  api,
  dateTime,
  download,
  errorText,
  options,
  readJSON,
} from "../lib/api";
import { useAction, useMedia, useResource } from "../lib/hooks";
import {
  DataCard,
  DateField,
  PageHeader,
  RefreshButton,
  ResourceError,
  StatusTag,
  leadStates,
  phoneRules,
  required,
  userOptions,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
import ExcelImport from "../ui/ExcelImport";
import SavedFilters from "../ui/SavedFilters";
export const flattenGroups = (rows) =>
  rows.flatMap((row) => [
    { ...row, children: undefined },
    ...flattenGroups(row.children || []),
  ]);
export default function Leads() {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState({}),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null),
    [editOpen, setEditOpen] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [assign, setAssign] = useState(null),
    [reject, setReject] = useState(null),
    [convert, setConvert] = useState(null),
    [duplicates, setDuplicates] = useState(false),
    [rule, setRule] = useState(null),
    [formsOpen, setFormsOpen] = useState(false);
  const r = useResource("/leads", filters),
    directory = useResource("/customers/users-list"),
    catalog = useResource("/categories"),
    campaigns = useResource(
      auth.has("Admin", "Director", "Marketing") ? "/campaigns" : null,
    ),
    a = useAction();
  const { message } = App.useApp();
  const managers = auth.has("Admin", "Director", "Team Lead", "Marketing"),
    admins = auth.has("Admin", "Director");
  useEffect(() => {
    if (params.get("lead")) setSelected(Number(params.get("lead")));
  }, [params]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") r.reload();
    }, 30000);
    return () => clearInterval(timer);
  }, [r.reload]);
  const directoryName = (id) =>
    directory.rows.find((u) => u.id === id)?.full_name ||
    (id ? "ID " + id : "Chờ phân công");
  const edit = (row) => {
    setEditing(row);
    setEditOpen(true);
  };
  const canEdit = (row) =>
    auth.can("LEAD", "write", row) &&
    !["CONVERTED", "MERGED"].includes(row.status);
  const actions = (row) => (
    <Space size={0} wrap>
      {canEdit(row) && (
        <>
          <Button
            type="text"
            aria-label={`Sửa lead ${row.full_name}`}
            icon={<EditOutlined aria-hidden="true" />}
            onClick={() => edit(row)}
          />
          {managers && (
            <Button
              type="text"
              aria-label={`Phân bổ ${row.full_name}`}
              icon={<SwapOutlined aria-hidden="true" />}
              onClick={() => setAssign(row)}
            />
          )}
          {auth.can("DEAL", "write") && (
            <Button
              type="text"
              aria-label={`Chuyển đổi ${row.full_name}`}
              icon={<BranchesOutlined aria-hidden="true" />}
              onClick={() => setConvert(row)}
            />
          )}
        </>
      )}
      {row.owner_id === auth.user.id && row.status === "ASSIGNED" && (
        <>
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined aria-hidden="true" />}
            onClick={() =>
              a.run(
                () => api.post(`/leads/${row.id}/accept`),
                r.reload,
                "Đã nhận lead.",
              )
            }
          >
            Nhận
          </Button>
          <Button
            type="text"
            danger
            aria-label={`Từ chối ${row.full_name}`}
            icon={<CloseOutlined aria-hidden="true" />}
            onClick={() => setReject(row)}
          />
        </>
      )}
    </Space>
  );
  const cols = [
    {
      title: "Lead / Doanh nghiệp",
      dataIndex: "full_name",
      width: 230,
      render: (v, row) => (
        <>
          <button className="table-primary" onClick={() => setSelected(row.id)}>
            {v}
          </button>
          <span className="table-subtitle">{row.company_name}</span>
        </>
      ),
    },
    {
      title: "Liên hệ",
      render: (_, row) => (
        <div className="cell-stack">
          <span>{row.email || "—"}</span>
          <Typography.Text type="secondary">{row.phone || "—"}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
    {
      title: "Điểm / Ưu tiên",
      render: (_, row) => (
        <Space>
          <b>{Number(row.score)}</b>
          <StatusTag value={row.temperature} />
        </Space>
      ),
    },
    { title: "Người phụ trách", dataIndex: "owner_id", render: directoryName },
    {
      title: "SLA",
      render: (_, row) =>
        row.sla_breached ? (
          <Tag color="red">Quá SLA</Tag>
        ) : row.sla_due_at ? (
          <Typography.Text type="secondary">
            {dateTime(row.sla_due_at)}
          </Typography.Text>
        ) : (
          "—"
        ),
    },
    { title: "Thao tác", width: 190, render: (_, row) => actions(row) },
  ];
  return (
    <>
      <PageHeader
        title="Lead & phân bổ"
        description="Tiếp nhận đúng nguồn, ưu tiên đúng cơ hội và phản hồi khách hàng kịp thời."
        actions={
          <>
            <RefreshButton resource={r} />
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() =>
                download("/leads/export", filters, "leads.xlsx").catch((e) =>
                  message.error(errorText(e)),
                )
              }
            >
              Xuất Excel
            </Button>
            {auth.can("LEAD", "write") && (
              <>
                <Button
                  icon={<UploadOutlined aria-hidden="true" />}
                  onClick={() => setImportOpen(true)}
                >
                  Nhập Excel
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined aria-hidden="true" />}
                  onClick={() => edit(null)}
                >
                  Thêm lead
                </Button>
              </>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      {managers && (
        <div className="filter-bar">
          {auth.has("Admin", "Director", "Marketing") && (
            <Button
              icon={<BranchesOutlined aria-hidden="true" />}
              onClick={() => setFormsOpen(true)}
            >
              Biểu mẫu website
            </Button>
          )}
          <Button
            icon={<SwapOutlined aria-hidden="true" />}
            onClick={() => setDuplicates(true)}
          >
            Kiểm tra trùng
          </Button>
          {admins && (
            <>
              <Button
                icon={<SettingOutlined aria-hidden="true" />}
                onClick={() => setRule("scoring")}
              >
                Chấm điểm lead
              </Button>
              <Button
                icon={<SettingOutlined aria-hidden="true" />}
                onClick={() => setRule("assignment")}
              >
                Quy tắc phân bổ
              </Button>
            </>
          )}
        </div>
      )}
      <DataCard>
        <div className="filter-bar">
          <Input
            className="search-input"
            prefix={<SearchOutlined aria-hidden="true" />}
            aria-label="Tìm lead"
            placeholder="Tên, công ty, email, điện thoại…"
            value={filters.search || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            allowClear
          />
          <Select
            aria-label="Lọc trạng thái lead"
            placeholder="Trạng thái"
            value={filters.status}
            allowClear
            options={Object.entries(leadStates).map(([value, [label]]) => ({
              value,
              label,
            }))}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <Select
            aria-label="Lọc nguồn lead"
            placeholder="Nguồn lead"
            allowClear
            value={filters.source_id}
            options={options(
              catalog.rows.filter((c) => c.type === "lead_source"),
            )}
            onChange={(v) => setFilters((f) => ({ ...f, source_id: v }))}
          />
          <Select
            aria-label="Lọc phân loại lead"
            placeholder="Phân loại"
            allowClear
            value={filters.temperature}
            options={[
              { value: "HOT", label: "Nóng" },
              { value: "WARM", label: "Ấm" },
              { value: "COLD", label: "Lạnh" },
            ]}
            onChange={(v) => setFilters((f) => ({ ...f, temperature: v }))}
          />
          <Select
            aria-label="Lọc người phụ trách lead"
            placeholder="Người phụ trách"
            allowClear
            value={filters.owner_id}
            options={userOptions(directory.rows)}
            onChange={(v) => setFilters((f) => ({ ...f, owner_id: v }))}
          />
          <DateField
            aria-label="Lead từ ngày"
            placeholder="Từ ngày"
            value={filters.from}
            onChange={(v) => setFilters((f) => ({ ...f, from: v }))}
          />
          <DateField
            aria-label="Lead đến ngày"
            placeholder="Đến ngày"
            value={filters.to}
            onChange={(v) => setFilters((f) => ({ ...f, to: v }))}
          />
          <Button onClick={() => setFilters({})}>Đặt lại</Button>
        </div>
        <SavedFilters
          entity="leads"
          criteria={filters}
          onApply={setFilters}
          canWrite={auth.can("LEAD", "write")}
        />
        <Table
          rowKey="id"
          loading={r.loading}
          dataSource={r.rows}
          columns={cols}
          rowClassName={(row) => (row.sla_breached ? "risk-row" : "")}
          scroll={{ x: 1180 }}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (n) => `${n} lead`,
          }}
        />
      </DataCard>
      <EntityModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? "Chỉnh sửa lead" : "Thêm lead"}
        record={editing}
        entity="lead"
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/leads/" + editing.id, v)
                : api.post("/leads", v),
            r.reload,
          )
        }
      >
        <div className="form-grid">
          <Form.Item name="full_name" label="Họ và tên" rules={required}>
            <Input />
          </Form.Item>
          <Form.Item name="company_name" label="Công ty" rules={required}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: "email", message: "Email chưa đúng định dạng." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại"
            dependencies={["email"]}
            rules={[
              ...phoneRules,
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v || getFieldValue("email")
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Cần email hoặc số điện thoại."),
                      ),
              }),
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="source_id" label="Nguồn lead" rules={required}>
            <Select
              options={options(
                catalog.rows.filter((c) => c.type === "lead_source"),
              )}
              notFoundContent="Chưa có nguồn lead được khai báo."
            />
          </Form.Item>
          {auth.has("Admin", "Director", "Marketing") && (
            <Form.Item name="campaign_id" label="Chiến dịch">
              <Select allowClear options={options(campaigns.rows)} />
            </Form.Item>
          )}
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
          <Form.Item name="region" label="Khu vực">
            <Input />
          </Form.Item>
          <Form.Item name="interest_level" label="Mức độ quan tâm">
            <Input />
          </Form.Item>
          <Form.Item
            name="interest"
            label="Nhu cầu quan tâm"
            className="full-span"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </div>
      </EntityModal>
      {selected && (
        <LeadDrawer
          key={selected}
          id={selected}
          onClose={() => {
            setSelected(null);
            setParams({}, { replace: true });
          }}
          onEdit={(row) => {
            setSelected(null);
            edit(row);
          }}
          canEdit={canEdit}
          actions={actions}
          onChanged={r.reload}
        />
      )}
      <EntityModal
        open={!!assign}
        title="Phân bổ lead"
        onClose={() => setAssign(null)}
        record={null}
        entity={"lead-assign-" + assign?.id}
        busy={a.busy}
        onSave={(v) =>
          a.run(() => api.post(`/leads/${assign.id}/assign`, v), r.reload)
        }
      >
        <Typography.Paragraph>
          {assign?.full_name} · {assign?.company_name}
        </Typography.Paragraph>
        <Form.Item name="owner_id" label="Nhân viên tiếp nhận" rules={required}>
          <Select
            showSearch
            optionFilterProp="label"
            options={userOptions(
              directory.rows.filter((u) =>
                readJSON(u.roles, [u.role_code]).includes("Sales Rep"),
              ),
            )}
          />
        </Form.Item>
        <Form.Item name="sla_minutes" label="Thời hạn phản hồi (phút)">
          <InputNumber min={1} max={43200} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="reason" label="Lý do phân bổ">
          <Input.TextArea />
        </Form.Item>
      </EntityModal>
      <EntityModal
        open={!!reject}
        title="Từ chối lead"
        onClose={() => setReject(null)}
        record={null}
        entity={"lead-reject-" + reject?.id}
        busy={a.busy}
        onSave={(v) =>
          a.run(() => api.post(`/leads/${reject.id}/reject`, v), r.reload)
        }
      >
        <Alert
          type="info"
          showIcon
          title="Lead sẽ trở lại hàng chờ để được phân bổ lại."
          className="section-gap"
        />
        <Form.Item name="reason" label="Lý do từ chối" rules={required}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </EntityModal>
      {convert && (
        <ConvertLead
          lead={convert}
          onClose={() => setConvert(null)}
          onConverted={() => {
            r.reload();
            setSelected(null);
          }}
        />
      )}
      <ExcelImport
        open={importOpen}
        entity="leads"
        onClose={() => setImportOpen(false)}
        onImported={r.reload}
      />
      {rule && (
        <LeadRules
          kind={rule}
          onClose={() => setRule(null)}
          onChanged={r.reload}
        />
      )}
      <LeadDuplicates
        open={duplicates}
        onClose={() => setDuplicates(false)}
        onChanged={r.reload}
      />
      {formsOpen && (
        <LeadForms
          onClose={() => setFormsOpen(false)}
          sources={catalog.rows.filter((c) => c.type === "lead_source")}
          campaigns={campaigns.rows}
        />
      )}
    </>
  );
}
function LeadDrawer({ id, onClose, onEdit, canEdit, actions, onChanged }) {
  const r = useResource("/leads/" + id),
    auth = useAuth(),
    a = useAction(),
    small = useMedia("(max-width:575px)"),
    [note, setNote] = useState(
      () => sessionStorage.getItem(`crm:lead-note:${auth.user.id}:${id}`) || "",
    );
  const lead = r.data?.data;
  return (
    <Drawer
      title="Chi tiết lead"
      open
      onClose={onClose}
      size={small ? "100%" : 740}
      loading={r.loading && !r.data}
    >
      <ResourceError resource={r} />
      {lead && (
        <>
          <div className="record-detail-heading">
            <Space wrap>
              <StatusTag value={lead.status} />
              <StatusTag value={lead.temperature} />
              {!!lead.sla_breached && <Tag color="red">Quá SLA phản hồi</Tag>}
            </Space>
            <Typography.Title level={3}>{lead.full_name}</Typography.Title>
            <Typography.Text type="secondary">
              {lead.company_name}
            </Typography.Text>
            <div className="section-gap">{actions(lead)}</div>
          </div>
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            size="small"
            items={[
              { key: "email", label: "Email", children: lead.email || "—" },
              {
                key: "phone",
                label: "Điện thoại",
                children: lead.phone || "—",
              },
              {
                key: "industry",
                label: "Ngành nghề",
                children: lead.industry || "—",
              },
              {
                key: "size",
                label: "Quy mô",
                children: lead.company_size || "—",
              },
              {
                key: "score",
                label: "Điểm ưu tiên",
                children: Number(lead.score),
              },
              {
                key: "sla",
                label: "Hạn phản hồi",
                children: dateTime(lead.sla_due_at),
              },
              {
                key: "interest",
                label: "Nhu cầu",
                children: lead.interest || "—",
              },
            ]}
          />
          <Typography.Title level={5}>Lịch sử chăm sóc</Typography.Title>
          {canEdit(lead) && (
            <div className="notes-composer">
              <Input.TextArea
                aria-label="Nội dung hoạt động lead"
                rows={3}
                value={note}
                placeholder="Ghi nhận trao đổi với lead…"
                onChange={(e) => {
                  setNote(e.target.value);
                  sessionStorage.setItem(
                    `crm:lead-note:${auth.user.id}:${id}`,
                    e.target.value,
                  );
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined aria-hidden="true" />}
                disabled={!note.trim()}
                loading={a.busy}
                onClick={() =>
                  a.run(
                    () =>
                      api.post(`/leads/${id}/activities`, {
                        content: note,
                        activity_type: "Liên hệ",
                      }),
                    () => {
                      setNote("");
                      sessionStorage.removeItem(
                        `crm:lead-note:${auth.user.id}:${id}`,
                      );
                      r.reload();
                      onChanged();
                    },
                  )
                }
              >
                Ghi nhận
              </Button>
            </div>
          )}
          {lead.activities.length ? (
            <Timeline
              items={lead.activities.map((item) => ({
                key: item.id,
                title: dateTime(item.created_at),
                content: (
                  <>
                    <b>{item.activity_type}</b>
                    <Typography.Paragraph>{item.content}</Typography.Paragraph>
                  </>
                ),
              }))}
            />
          ) : (
            <Empty description="Chưa có hoạt động." />
          )}
        </>
      )}
    </Drawer>
  );
}
function ConvertLead({ lead, onClose, onConverted }) {
  const customers = useResource("/customers"),
    stages = useResource("/pipeline-stages"),
    fields = useResource("/custom-fields", { entity_type: "customer" }),
    dealFields = useResource("/custom-fields", { entity_type: "deal" }),
    a = useAction(),
    [form] = Form.useForm();
  const existing = Form.useWatch("customer_id", form);
  return (
    <EntityModal
      open
      title="Chuyển lead thành khách hàng & cơ hội"
      onClose={onClose}
      record={null}
      entity={"convert-" + lead.id}
      busy={a.busy}
      form={form}
      width={760}
      defaults={{ deal: { title: lead.company_name } }}
      onSave={(v) =>
        a.run(
          () => api.post(`/leads/${lead.id}/convert`, v),
          onConverted,
          "Đã chuyển đổi lead, giữ nguyên lịch sử chăm sóc.",
        )
      }
    >
      <Alert
        type="info"
        showIcon
        title={`${lead.full_name} · ${lead.company_name}`}
        description="Thông tin lead được chuyển sang khách hàng, người liên hệ và cơ hội trong một thao tác."
        className="section-gap"
      />
      <Form.Item
        name="customer_id"
        label="Gắn với khách hàng đã có (để trống để tạo mới)"
      >
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          options={customers.rows.map((c) => ({
            value: c.id,
            label: c.company_name || c.name,
          }))}
        />
      </Form.Item>
      <div className="form-grid">
        <Form.Item name={["deal", "title"]} label="Tên cơ hội" rules={required}>
          <Input />
        </Form.Item>
        <Form.Item
          name={["deal", "stage_id"]}
          label="Giai đoạn ban đầu"
          rules={required}
        >
          <Select options={options(stages.rows.filter((s) => s.is_active))} />
        </Form.Item>
        <Form.Item name={["deal", "amount"]} label="Giá trị dự kiến">
          <InputNumber min={0} max={1e12} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name={["deal", "expected_close_date"]}
          label="Ngày dự kiến chốt"
          rules={required}
        >
          <DateField />
        </Form.Item>
        {!existing &&
          fields.rows
            .filter((f) => f.is_active)
            .map((f) => (
              <NestedCustomField
                key={f.id}
                field={f}
                prefix={["customer", "custom_fields"]}
              />
            ))}
        {dealFields.rows
          .filter((f) => f.is_active)
          .map((f) => (
            <NestedCustomField
              key={f.id}
              field={f}
              prefix={["deal", "custom_fields"]}
            />
          ))}
      </div>
    </EntityModal>
  );
}
function NestedCustomField({ field: f, prefix }) {
  return (
    <Form.Item
      name={[...prefix, f.field_key]}
      label={f.field_name}
      rules={f.is_required ? required : []}
    >
      {f.field_type === "number" ? (
        <InputNumber style={{ width: "100%" }} />
      ) : f.field_type === "date" ? (
        <DateField />
      ) : f.field_type === "select" ? (
        <Select
          options={readJSON(f.options, []).map((value) => ({
            value,
            label: value,
          }))}
        />
      ) : (
        <Input />
      )}
    </Form.Item>
  );
}
function LeadRules({ kind, onClose, onChanged }) {
  const scoring = kind === "scoring",
    r = useResource(
      "/leads/" + (scoring ? "scoring-rules" : "assignment-rules"),
    ),
    groups = useResource("/organization/tree"),
    catalog = useResource(scoring ? "/categories" : null),
    a = useAction();
  const record = scoring
    ? {
        rules: r.rows,
        warm: r.data?.thresholds?.warm,
        hot: r.data?.thresholds?.hot,
      }
    : { rules: r.rows.map((row) => ({ ...row, is_active: !!row.is_active })) };
  return r.loading ? (
    <Modal open title="Đang tải cấu hình" onCancel={onClose} footer={null}>
      <p>Đang tải quy tắc đã lưu…</p>
    </Modal>
  ) : r.error ? (
    <Modal open title="Chưa tải được cấu hình" onCancel={onClose} footer={null}>
      <ResourceError resource={r} />
    </Modal>
  ) : (
    <EntityModal
      open
      title={scoring ? "Cấu hình chấm điểm lead" : "Quy tắc phân bổ tự động"}
      onClose={onClose}
      record={record}
      entity={"lead-rules-" + kind}
      busy={a.busy}
      width={950}
      draft={false}
      onSave={(v) =>
        a.run(
          () =>
            api.put(
              "/leads/" + (scoring ? "scoring-rules" : "assignment-rules"),
              v,
            ),
          onChanged,
        )
      }
    >
      <Typography.Paragraph type="secondary">
        {scoring
          ? "Điểm được tính lại khi thông tin lead thay đổi. Lead có điểm thấp vẫn được giữ lại."
          : "Quy tắc có thứ tự nhỏ hơn được xét trước. Nhân viên kinh doanh trong nhóm được phân lần lượt; lead chưa khớp quy tắc trở lại hàng chờ."}
      </Typography.Paragraph>
      {scoring && (
        <div className="form-grid">
          <Form.Item name="warm" label="Ngưỡng lead ấm" rules={required}>
            <InputNumber min={-10000} max={10000} />
          </Form.Item>
          <Form.Item name="hot" label="Ngưỡng lead nóng" rules={required}>
            <InputNumber min={-10000} max={10000} />
          </Form.Item>
        </div>
      )}
      <Form.List name="rules">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <div className="rule-row" key={field.key}>
                <div className="form-grid">
                  {scoring ? (
                    <>
                      <ScoringCriterion
                        index={field.name}
                        catalog={catalog.rows}
                      />
                      <Form.Item
                        name={[field.name, "points"]}
                        label="Điểm"
                        rules={required}
                      >
                        <InputNumber min={-1000} max={1000} />
                      </Form.Item>
                    </>
                  ) : (
                    <>
                      <Form.Item
                        name={[field.name, "name"]}
                        label="Tên quy tắc"
                        rules={required}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "priority"]}
                        label="Thứ tự ưu tiên"
                        rules={required}
                      >
                        <InputNumber min={0} max={10000} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "group_id"]}
                        label="Nhóm tiếp nhận"
                        rules={required}
                      >
                        <Select options={options(flattenGroups(groups.rows))} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "region"]}
                        label="Khu vực (bỏ trống để áp dụng mọi khu vực)"
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "industry"]}
                        label="Ngành nghề (bỏ trống để áp dụng mọi ngành)"
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "is_active"]}
                        label="Đang áp dụng"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "sla_minutes"]}
                        label="Thời hạn phản hồi (phút)"
                        rules={required}
                      >
                        <InputNumber min={1} max={43200} />
                      </Form.Item>
                    </>
                  )}
                </div>
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined aria-hidden="true" />}
                  onClick={() => remove(field.name)}
                >
                  Xóa quy tắc
                </Button>
              </div>
            ))}
            <Button
              block
              type="dashed"
              icon={<PlusOutlined aria-hidden="true" />}
              onClick={() =>
                add(
                  scoring
                    ? {}
                    : {
                        priority: fields.length + 1,
                        sla_minutes: 60,
                        is_active: true,
                      },
                )
              }
            >
              Thêm quy tắc
            </Button>
          </>
        )}
      </Form.List>
    </EntityModal>
  );
}
function ScoringCriterion({ index, catalog }) {
  const form = Form.useFormInstance(),
    criterion = Form.useWatch(["rules", index, "field_name"], form);
  const choices = catalog
    .filter(
      (c) =>
        c.type ===
        {
          source_id: "lead_source",
          industry: "industry",
          company_size: "company_size",
        }[criterion],
    )
    .map((c) => ({
      value: criterion === "source_id" ? String(c.id) : c.name,
      label: c.name,
    }));
  return (
    <>
      <Form.Item name={[index, "field_name"]} label="Tiêu chí" rules={required}>
        <Select
          options={[
            ["industry", "Ngành nghề"],
            ["company_size", "Quy mô"],
            ["source_id", "Nguồn lead"],
            ["interest_level", "Mức độ quan tâm"],
          ].map(([value, label]) => ({ value, label }))}
          onChange={() =>
            form.setFieldValue(["rules", index, "match_value"], null)
          }
        />
      </Form.Item>
      <Form.Item
        name={[index, "match_value"]}
        label="Giá trị cần khớp"
        rules={required}
      >
        {criterion === "interest_level" ? (
          <Input />
        ) : (
          <Select
            showSearch
            optionFilterProp="label"
            options={choices}
            notFoundContent="Chưa có giá trị trong danh mục."
          />
        )}
      </Form.Item>
    </>
  );
}
function LeadDuplicates({ open, onClose, onChanged }) {
  const r = useResource(open ? "/leads/duplicates" : null),
    a = useAction(),
    [pair, setPair] = useState(null),
    [target, setTarget] = useState(null);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Kiểm tra lead trùng"
      footer={null}
      width={850}
    >
      <ResourceError resource={r} />
      <Select
        className="entity-select section-gap"
        placeholder="Chọn lead cần kiểm tra"
        loading={r.loading}
        options={r.rows.map((p, i) => ({
          value: i,
          label: `${p.lead.full_name} · ${p.lead.company_name}`,
        }))}
        onChange={(v) => {
          setPair(r.rows[v]);
          setTarget(r.rows[v].lead.id);
        }}
      />
      {!r.loading && !r.rows.length && (
        <Empty description="Không phát hiện lead trùng." />
      )}
      {pair && (
        <>
          <Alert
            type="info"
            showIcon
            title={`${pair.matches.length} lead trùng · ${pair.customers.length} khách hàng có thể liên quan`}
            className="section-gap"
          />
          {pair.customers.length > 0 && (
            <List
              className="section-gap"
              size="small"
              header="Khách hàng đã có · có thể chọn khi chuyển đổi lead"
              dataSource={pair.customers}
              renderItem={(c) => (
                <List.Item>
                  {c.name} · {c.email || c.phone || ""}
                </List.Item>
              )}
            />
          )}
          <Row gutter={[12, 12]}>
            {[pair.lead, ...pair.matches].map((row) => (
              <Col xs={24} sm={12} key={row.id}>
                <div className="compare-card">
                  <strong>{row.full_name}</strong>
                  <p>{row.company_name}</p>
                  <p>{row.email || row.phone}</p>
                  <Button
                    block
                    type={target === row.id ? "primary" : "default"}
                    onClick={() => setTarget(row.id)}
                  >
                    {target === row.id
                      ? "Giữ lại hồ sơ này"
                      : "Chọn hồ sơ giữ lại"}
                  </Button>
                  {row.id !== target && (
                    <Popconfirm
                      title="Gộp lead này vào hồ sơ được giữ lại?"
                      onConfirm={() =>
                        a.run(
                          () =>
                            api.post("/leads/merge", {
                              target_id: target,
                              source_id: row.id,
                              reason: "Gộp lead trùng từ so sánh hồ sơ",
                            }),
                          () => {
                            r.reload();
                            onChanged();
                            setPair(null);
                          },
                        )
                      }
                    >
                      <Button block className="section-gap" loading={a.busy}>
                        Gộp vào hồ sơ đã chọn
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Modal>
  );
}
function LeadForms({ onClose, sources, campaigns }) {
  const r = useResource("/leads/forms"),
    a = useAction(),
    [open, setOpen] = useState(false),
    [embed, setEmbed] = useState("");
  const { message } = App.useApp();
  return (
    <>
      <Drawer open title="Biểu mẫu tiếp nhận lead" onClose={onClose} size={640}>
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden="true" />}
          className="section-gap"
          onClick={() => setOpen(true)}
        >
          Tạo biểu mẫu
        </Button>
        <ResourceError resource={r} />
        <List
          loading={r.loading}
          dataSource={r.rows}
          locale={{ emptyText: "Chưa có biểu mẫu được tạo." }}
          renderItem={(f) => (
            <List.Item
              actions={[
                <Button
                  key="embed"
                  onClick={() =>
                    setEmbed(
                      `<iframe src="${window.location.origin}/public/lead-forms/${f.public_key}" title="Liên hệ" width="100%" height="720"></iframe>`,
                    )
                  }
                >
                  Mã nhúng
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={f.name}
                description={
                  sources.find((s) => s.id === f.source_id)?.name ||
                  "Nguồn ID " + f.source_id
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
      <EntityModal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo biểu mẫu website"
        record={null}
        entity="lead-form"
        busy={a.busy}
        onSave={(v) =>
          a.run(
            async () => (await api.post("/leads/forms", v)).data,
            (data) => {
              setEmbed(
                `<iframe src="${window.location.origin}/public/lead-forms/${data.public_key}" title="Liên hệ" width="100%" height="720"></iframe>`,
              );
              r.reload();
            },
          )
        }
      >
        <Form.Item name="name" label="Tên biểu mẫu" rules={required}>
          <Input />
        </Form.Item>
        <Form.Item name="source_id" label="Nguồn lead" rules={required}>
          <Select options={options(sources)} />
        </Form.Item>
        <Form.Item name="campaign_id" label="Chiến dịch">
          <Select allowClear options={options(campaigns)} />
        </Form.Item>
      </EntityModal>
      <Modal
        open={!!embed}
        onCancel={() => setEmbed("")}
        title="Mã nhúng biểu mẫu"
        footer={
          <Button
            type="primary"
            onClick={() =>
              navigator.clipboard
                .writeText(embed)
                .then(() => message.success("Đã sao chép mã nhúng."))
                .catch(() =>
                  message.error("Bạn có thể chọn và sao chép mã trực tiếp."),
                )
            }
          >
            Sao chép mã
          </Button>
        }
      >
        <Typography.Paragraph>
          Chèn mã này vào website để nhận lead đúng nguồn.
        </Typography.Paragraph>
        <Input.TextArea
          aria-label="Mã nhúng biểu mẫu"
          value={embed}
          rows={5}
          readOnly
        />
      </Modal>
    </>
  );
}
