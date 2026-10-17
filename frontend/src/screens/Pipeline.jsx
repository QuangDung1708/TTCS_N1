import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  HolderOutlined,
  PlusOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "../auth/AuthProvider";
import {
  api,
  dateOnly,
  dateTime,
  download,
  errorText,
  money,
  readJSON,
} from "../lib/api";
import { useAction, useMedia, useResource } from "../lib/hooks";
import {
  CustomFields,
  DataCard,
  DateField,
  EmptyState,
  PageHeader,
  RefreshButton,
  ResourceError,
  StatusTag,
  required,
  userOptions,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
import { flattenGroups } from "./Leads";
const managerRoles = ["Admin", "Director", "Team Lead"];
const conditions = {
  none: "Không yêu cầu",
  require_meeting: "Cần ghi nhận cuộc gặp",
  require_contact: "Cần liên hệ chính",
  require_products: "Cần dòng sản phẩm",
  require_quote: "Cần báo giá",
};
function DealCard({ deal, onOpen, draggable }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    disabled: !draggable,
  });
  return (
    <article
      ref={setNodeRef}
      className={"deal-card" + (isDragging ? " is-dragging" : "")}
      data-deal-id={deal.id}
    >
      <div className="deal-card-header">
        <button className="table-primary" onClick={() => onOpen(deal.id)}>
          {deal.title}
        </button>
        {draggable && (
          <button
            className="drag-handle"
            aria-label={`Kéo cơ hội ${deal.title}`}
            {...attributes}
            {...listeners}
          >
            <HolderOutlined aria-hidden="true" />
          </button>
        )}
      </div>
      <p>{deal.company_name || deal.customer_name}</p>
      <strong className="deal-card-amount">
        {money(deal.status === "WON" ? deal.actual_amount : deal.amount)}
      </strong>
      <div className="deal-card-footer">
        <span>
          <UserOutlined aria-hidden="true" />{" "}
          {deal.owner_name || "Chưa phân công"}
        </span>
      </div>
      <div className="deal-card-footer" style={{ marginTop: 10 }}>
        <span>
          <CalendarOutlined aria-hidden="true" />{" "}
          {dateOnly(deal.expected_close_date)}
        </span>
        {!!(deal.stagnant || deal.overdue) && deal.status === "OPEN" && (
          <Tag
            color="orange"
            icon={<ExclamationCircleOutlined aria-hidden="true" />}
          >
            {deal.overdue ? "Quá hạn" : "Đình trệ"}
          </Tag>
        )}
      </div>
    </article>
  );
}
function Column({ stage, rows, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    disabled: stage.closed,
  });
  return (
    <section
      ref={setNodeRef}
      className={"kanban-column" + (isOver ? " is-over" : "")}
      data-stage-id={stage.id}
    >
      <div className="kanban-column-header">
        <div className="column-title">
          <span>{stage.name}</span>
          <Tag>{stage.closed ? stage.code : stage.win_probability + "%"}</Tag>
        </div>
        <div className="column-meta">
          <span>{rows.length} cơ hội</span>
          <span>
            {money(
              rows.reduce(
                (n, d) =>
                  n + Number(d.status === "WON" ? d.actual_amount : d.amount),
                0,
              ),
            )}
          </span>
        </div>
        {!stage.closed && (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 11, display: "block", marginTop: 8 }}
          >
            {conditions[stage.exit_condition]}
          </Typography.Text>
        )}
      </div>
      {rows.length ? children : <EmptyState description="Chưa có cơ hội" />}
    </section>
  );
}
export default function Pipeline() {
  const auth = useAuth(),
    manager = auth.has(...managerRoles),
    [filters, setFilters] = useState({}),
    r = useResource("/deals", filters),
    directory = useResource("/customers/users-list"),
    groups = useResource("/organization/tree"),
    fields = useResource("/custom-fields", { entity_type: "deal" }),
    a = useAction(),
    { message } = App.useApp();
  const [view, setView] = useState("kanban"),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState([]),
    [transfer, setTransfer] = useState(false),
    [override, setOverride] = useState(null),
    [params, setParams] = useSearchParams();
  const detail = Number(params.get("deal")) || null;
  useEffect(() => {
    if (params.get("create") && auth.can("DEAL", "write")) {
      setEditing({ customer_id: Number(params.get("customer")) || undefined });
      setOpen(true);
    }
  }, [params]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );
  const stages = r.data?.stages || [];
  const show = (id) => setParams({ deal: id });
  const reload = () => {
    r.reload();
    setSelected([]);
  };
  const start = (row) => {
    setEditing(
      row
        ? {
            ...row,
            amount: Number(row.amount),
            probability: Number(row.probability),
            expected_close_date: row.expected_close_date?.slice(0, 10),
            custom_fields: readJSON(row.custom_fields),
          }
        : null,
    );
    setOpen(true);
  };
  const transition = async (id, stage_id) => {
    try {
      await api.put(`/deals/${id}/stage`, { stage_id });
      message.success("Đã chuyển giai đoạn.");
      reload();
      return true;
    } catch (e) {
      if (e.response?.status === 422 && manager)
        setOverride({ id, stage_id, missing: errorText(e) });
      else message.error(errorText(e));
      return false;
    }
  };
  const set = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  const openDeals = r.rows.filter((d) => d.status === "OPEN"),
    pipeline = openDeals.reduce((n, d) => n + Number(d.amount), 0),
    weighted = openDeals.reduce(
      (n, d) =>
        n +
        (Number(d.amount) *
          Number(
            stages.find((s) => s.id === d.stage_id)?.win_probability || 0,
          )) /
          100,
      0,
    ),
    won = r.rows.filter((d) => d.status === "WON");
  const cols = [
    {
      title: "Cơ hội / Khách hàng",
      render: (_, d) => (
        <div className="cell-stack">
          <button className="table-primary" onClick={() => show(d.id)}>
            {d.title}
          </button>
          <Typography.Text type="secondary">
            {d.company_name || d.customer_name}
          </Typography.Text>
        </div>
      ),
    },
    { title: "Giá trị", dataIndex: "amount", render: money },
    {
      title: "Giai đoạn",
      render: (_, d) => stages.find((s) => s.id === d.stage_id)?.name || "—",
    },
    {
      title: "Kết quả",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
    {
      title: "Ngày dự kiến chốt",
      dataIndex: "expected_close_date",
      render: dateOnly,
    },
    { title: "Phụ trách", dataIndex: "owner_name" },
    {
      title: "Cảnh báo",
      render: (_, d) =>
        d.status === "OPEN" && !!(d.stagnant || d.overdue) ? (
          <Tag color="orange">{d.overdue ? "Quá hạn" : "Đình trệ"}</Tag>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Cơ hội & pipeline"
        description="Theo dõi tiến độ thương vụ, điều kiện giai đoạn và dự báo doanh số."
        actions={
          <>
            <RefreshButton resource={r} />
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() =>
                download("/deals/export", filters, "co-hoi.xlsx").catch((e) =>
                  message.error(errorText(e)),
                )
              }
            >
              Xuất Excel
            </Button>
            {auth.can("DEAL", "write") && (
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden="true" />}
                onClick={() => start(null)}
              >
                Thêm cơ hội
              </Button>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <Row gutter={[16, 16]} className="metrics-row">
        {[
          ["Tổng giá trị đang mở", pipeline, "#1677ff"],
          ["Dự báo theo xác suất giai đoạn", weighted, "#16856a"],
          [
            "Giá trị đã thắng",
            won.reduce((n, d) => n + Number(d.actual_amount), 0),
            "#b7791f",
          ],
        ].map(([title, value, color]) => (
          <Col xs={24} md={8} key={title}>
            <Card className="metric-card">
              <Statistic
                title={title}
                value={value}
                formatter={money}
                styles={{ content: { color } }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      <DataCard>
        <div className="filter-bar">
          <Input
            aria-label="Tìm cơ hội"
            placeholder="Tìm tên cơ hội…"
            className="search-input"
            value={filters.search}
            allowClear
            onChange={(e) => set("search", e.target.value)}
          />
          <Select
            aria-label="Lọc người sở hữu"
            placeholder="Người sở hữu"
            allowClear
            value={filters.owner_id}
            onChange={(v) => set("owner_id", v)}
            options={userOptions(directory.rows)}
          />
          <Select
            aria-label="Lọc nhóm"
            placeholder="Nhóm kinh doanh"
            allowClear
            value={filters.group_id}
            onChange={(v) => set("group_id", v)}
            options={flattenGroups(groups.rows).map((g) => ({
              value: g.id,
              label: g.name,
            }))}
          />
          <DateField
            placeholder="Ngày chốt từ"
            value={filters.from}
            onChange={(v) => set("from", v)}
            style={{ width: 160 }}
          />
          <DateField
            placeholder="Ngày chốt đến"
            value={filters.to}
            onChange={(v) => set("to", v)}
            style={{ width: 160 }}
          />
          {fields.rows
            .filter((f) => f.is_active)
            .map((f) => (
              <Input
                key={f.id}
                placeholder={f.field_name}
                aria-label={`Lọc ${f.field_name}`}
                style={{ width: 160 }}
                value={readJSON(filters.custom_fields)[f.field_key] || ""}
                onChange={(e) =>
                  setFilters((v) => ({
                    ...v,
                    custom_fields: JSON.stringify({
                      ...readJSON(v.custom_fields),
                      [f.field_key]: e.target.value,
                    }),
                  }))
                }
              />
            ))}
          <Button onClick={() => setFilters({})}>Đặt lại</Button>
        </div>
        <div className="inline-between section-gap">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "kanban", label: "Pipeline" },
              { value: "list", label: "Danh sách" },
              ...(manager
                ? [
                    { value: "flags", label: "Cần can thiệp" },
                    { value: "forecast", label: "Dự báo" },
                  ]
                : []),
            ]}
          />
          {manager && view === "list" && (
            <Button
              icon={<SwapOutlined aria-hidden="true" />}
              disabled={!selected.length}
              onClick={() => setTransfer(true)}
            >
              Phân bổ {selected.length || ""} cơ hội
            </Button>
          )}
        </div>
        {view === "kanban" ? (
          <>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              Kéo thẻ bằng tay nắm để chuyển giai đoạn; hoặc mở cơ hội và chọn
              “Chuyển giai đoạn”.
            </Typography.Paragraph>
            <DndContext
              sensors={sensors}
              onDragEnd={({ active, over }) => {
                const d = r.rows.find((d) => d.id === active.id);
                if (over && d?.stage_id !== over.id) transition(d.id, over.id);
              }}
            >
              <div className="kanban-board">
                {[
                  ...stages.filter(
                    (s) =>
                      s.is_active || openDeals.some((d) => d.stage_id === s.id),
                  ),
                  {
                    id: "WON",
                    name: "Chốt thành công",
                    code: "Won",
                    closed: true,
                  },
                  {
                    id: "LOST",
                    name: "Chưa thành công",
                    code: "Lost",
                    closed: true,
                  },
                ].map((s) => {
                  const rows = r.rows.filter((d) =>
                    s.closed
                      ? d.status === s.code.toUpperCase()
                      : d.status === "OPEN" && d.stage_id === s.id,
                  );
                  return (
                    <Column key={s.id} stage={s} rows={rows}>
                      {rows.map((d) => (
                        <DealCard
                          key={d.id}
                          deal={d}
                          onOpen={show}
                          draggable={!s.closed && auth.can("DEAL", "write", d)}
                        />
                      ))}
                    </Column>
                  );
                })}
              </div>
            </DndContext>
          </>
        ) : view === "forecast" ? (
          <Forecast
            filters={filters}
            users={directory.rows}
            groups={flattenGroups(groups.rows)}
          />
        ) : (
          <Table
            rowKey="id"
            columns={cols}
            dataSource={
              view === "flags"
                ? r.rows.filter(
                    (d) => d.status === "OPEN" && (d.stagnant || d.overdue),
                  )
                : r.rows
            }
            loading={r.loading}
            scroll={{ x: 1100 }}
            rowClassName={(d) =>
              d.status === "OPEN" && (d.stagnant || d.overdue) ? "risk-row" : ""
            }
            rowSelection={
              manager && view === "list"
                ? {
                    selectedRowKeys: selected,
                    onChange: setSelected,
                    getCheckboxProps: (d) => ({
                      disabled:
                        d.status !== "OPEN" || !auth.can("DEAL", "write", d),
                    }),
                  }
                : undefined
            }
            pagination={{ pageSize: 12, showSizeChanger: true }}
          />
        )}
      </DataCard>
      <DealEditor
        open={open}
        onClose={() => {
          setOpen(false);
          if (params.has("create")) setParams({});
        }}
        record={editing}
        stages={stages}
        fields={fields.rows}
        users={directory.rows}
        onSaved={reload}
      />
      <DealDrawer
        id={detail}
        onClose={() => setParams({})}
        stages={stages}
        reasons={r.data?.reasons || []}
        competitors={r.data?.competitors || []}
        onEdit={start}
        onChanged={reload}
        onTransition={transition}
      />
      <EntityModal
        title="Ghi đè điều kiện giai đoạn"
        entity="stage-override"
        draft={false}
        open={!!override}
        onClose={() => setOverride(null)}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              api.put(`/deals/${override.id}/stage`, {
                stage_id: override.stage_id,
                ...v,
              }),
            reload,
          )
        }
      >
        <Alert
          type="warning"
          showIcon
          title={override?.missing}
          className="section-gap"
        />
        <Form.Item name="override_reason" label="Lý do ghi đè" rules={required}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </EntityModal>
      <EntityModal
        title="Phân bổ lại cơ hội"
        entity="deal-transfer"
        open={transfer}
        onClose={() => setTransfer(false)}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () => api.post("/deals/reassign", { ids: selected, ...v }),
            reload,
          )
        }
      >
        <Typography.Paragraph>
          {selected.length} cơ hội được chuyển cùng toàn bộ lịch sử.
        </Typography.Paragraph>
        <Form.Item name="owner_id" label="Người tiếp nhận" rules={required}>
          <Select options={userOptions(directory.rows)} />
        </Form.Item>
        <Form.Item name="reason" label="Lý do" rules={required}>
          <Input.TextArea />
        </Form.Item>
      </EntityModal>
    </>
  );
}
function DealEditor({ open, onClose, record, stages, fields, users, onSaved }) {
  const [form] = Form.useForm(),
    customer = Form.useWatch("customer_id", form),
    stage = Form.useWatch("stage_id", form),
    customers = useResource(open ? "/customers" : null),
    contacts = useResource(
      open && customer ? `/contacts/customer/${customer}` : null,
    ),
    sources = useResource("/categories", { type: "lead_source" }),
    auth = useAuth(),
    campaigns = useResource(
      auth.has("Admin", "Director", "Marketing") ? "/campaigns" : null,
    ),
    a = useAction();
  const sourceRows = Array.isArray(contacts.data)
    ? contacts.data
    : contacts.rows;
  return (
    <EntityModal
      title={record?.id ? "Chỉnh sửa cơ hội" : "Thêm cơ hội"}
      entity="deal"
      open={open}
      onClose={onClose}
      record={record}
      form={form}
      defaults={{
        expected_close_date: dayjs().format("YYYY-MM-DD"),
        amount: 0,
        owner_id: auth.user.id,
      }}
      busy={a.busy}
      onSave={(v) =>
        a.run(
          () =>
            record?.id
              ? api.put("/deals/" + record.id, v)
              : api.post("/deals", v),
          onSaved,
        )
      }
    >
      <div className="form-grid">
        <Form.Item
          name="title"
          label="Tên cơ hội"
          rules={required}
          className="full-span"
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="customer_id"
          label="Khách hàng doanh nghiệp"
          rules={required}
        >
          <Select
            showSearch
            optionFilterProp="label"
            onChange={() => form.setFieldValue("contact_id", null)}
            options={customers.rows.map((c) => ({
              value: c.id,
              label: c.company_name || c.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="contact_id"
          label="Người liên hệ chính"
          rules={required}
          extra={
            !sourceRows.length
              ? "Thêm liên hệ trong hồ sơ khách hàng trước khi tạo cơ hội."
              : undefined
          }
        >
          <Select
            loading={contacts.loading}
            options={sourceRows.map((c) => ({
              value: c.id,
              label: c.full_name,
            }))}
          />
        </Form.Item>
        <Form.Item name="stage_id" label="Giai đoạn" rules={required}>
          <Select
            disabled={!!record?.id}
            options={stages
              .filter((s) => s.is_active || s.id === record?.stage_id)
              .map((s) => ({ value: s.id, label: s.name }))}
            onChange={(v) =>
              form.setFieldsValue({
                probability: Number(
                  stages.find((s) => s.id === v)?.win_probability,
                ),
                probability_note: null,
              })
            }
          />
        </Form.Item>
        <Form.Item name="source_id" label="Nguồn cơ hội" rules={required}>
          <Select
            options={sources.rows.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Giá trị dự kiến"
          rules={required}
          extra={
            record?.items?.length
              ? "Giá trị được tính từ dòng sản phẩm."
              : undefined
          }
        >
          <InputNumber
            min={0}
            max={1e12}
            disabled={!!record?.items?.length}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          name="expected_close_date"
          label="Ngày dự kiến chốt"
          rules={required}
        >
          <DateField
            disabledDate={(d) =>
              !record?.id && d.isBefore(dayjs().startOf("day"))
            }
          />
        </Form.Item>
        <Form.Item name="probability" label="Xác suất thắng (%)">
          <InputNumber
            min={0}
            max={100}
            placeholder={String(
              stages.find((s) => s.id === stage)?.win_probability ?? "",
            )}
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item name="probability_note" label="Ghi chú khi sửa xác suất">
          <Input.TextArea />
        </Form.Item>
        {auth.has(...managerRoles) && (
          <Form.Item name="owner_id" label="Người sở hữu" rules={required}>
            <Select options={userOptions(users)} />
          </Form.Item>
        )}
        {campaigns.rows.length > 0 && (
          <Form.Item name="campaign_id" label="Chiến dịch">
            <Select
              allowClear
              options={campaigns.rows.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
        )}
        <CustomFields fields={fields} />
      </div>
    </EntityModal>
  );
}
function DealDrawer({
  id,
  onClose,
  stages,
  reasons,
  competitors,
  onEdit,
  onChanged,
  onTransition,
}) {
  const nav = useNavigate();
  const auth = useAuth(),
    small = useMedia("(max-width:767px)"),
    r = useResource(id ? "/deals/" + id : null),
    activities = useResource(
      id && auth.can("ACTIVITY") ? "/activities" : null,
      { deal_id: id },
    ),
    a = useAction();
  const d = r.data?.data,
    [mode, setMode] = useState(null),
    [toStage, setToStage] = useState(null),
    [note, setNote] = useState(""),
    [activityType, setActivityType] = useState("meeting");
  const key = `crm:draft:${auth.user.id}:deal-note:${id}`;
  useEffect(() => {
    setMode(null);
    setNote(sessionStorage.getItem(key) || "");
  }, [key]);
  const reload = () => {
    r.reload();
    activities.reload();
    onChanged();
  };
  const editable = d?.status === "OPEN" && auth.can("DEAL", "write", d);
  return (
    <>
      <Drawer
        title="Hồ sơ cơ hội"
        open={!!id}
        onClose={onClose}
        size={small ? "100%" : 940}
        loading={r.loading && !r.data}
      >
        <ResourceError resource={r} />
        {d && (
          <>
            <div className="record-detail-heading">
              <Space>
                <StatusTag value={d.status} />
                <Tag>{stages.find((s) => s.id === d.stage_id)?.name}</Tag>
              </Space>
              <Typography.Title level={3}>{d.title}</Typography.Title>
              <Space wrap>
                {editable && (
                  <>
                    <Button
                      icon={<EditOutlined aria-hidden="true" />}
                      onClick={() => onEdit(d)}
                    >
                      Chỉnh sửa
                    </Button>
                    <Button onClick={() => setMode("products")}>
                      Dòng sản phẩm
                    </Button>
                    {auth.can("QUOTE", "write", d) && (
                      <Button
                        onClick={() => nav(`/quotes?create=1&deal=${d.id}`)}
                      >
                        Tạo báo giá nháp
                      </Button>
                    )}
                    <Button type="primary" onClick={() => setMode("WON")}>
                      Chốt thắng
                    </Button>
                    <Button danger onClick={() => setMode("LOST")}>
                      Báo thua
                    </Button>
                  </>
                )}
                {d.status !== "OPEN" &&
                  auth.has(...managerRoles) &&
                  auth.can("DEAL", "write", d) && (
                    <Button onClick={() => setMode("reopen")}>
                      Mở lại cơ hội
                    </Button>
                  )}
              </Space>
            </div>
            {d.status !== "OPEN" && (
              <Alert
                showIcon
                type="info"
                title="Cơ hội đã đóng và được khóa chỉnh sửa."
                className="section-gap"
              />
            )}
            {editable && (
              <div className="filter-bar">
                <Select
                  aria-label="Giai đoạn tiếp theo"
                  placeholder="Chọn giai đoạn tiếp theo"
                  value={toStage}
                  onChange={setToStage}
                  options={stages
                    .filter((s) => s.is_active && s.id !== d.stage_id)
                    .map((s) => ({ value: s.id, label: s.name }))}
                />
                <Button
                  icon={<ArrowRightOutlined aria-hidden="true" />}
                  disabled={!toStage}
                  onClick={async () => {
                    if (await onTransition(d.id, toStage)) {
                      r.reload();
                      activities.reload();
                      setToStage(null);
                    }
                  }}
                >
                  Chuyển giai đoạn
                </Button>
              </div>
            )}
            <div className="drawer-stats">
              <div className="drawer-stat">
                <span>Giá trị dự kiến</span>
                <strong>{money(d.amount)}</strong>
              </div>
              <div className="drawer-stat">
                <span>Giá trị theo năm</span>
                <strong>{money(d.annual_value)}</strong>
              </div>
              <div className="drawer-stat">
                <span>Xác suất thắng</span>
                <strong>{Number(d.probability)}%</strong>
              </div>
            </div>
            <Descriptions
              size="small"
              column={small ? 1 : 2}
              items={[
                {
                  key: "date",
                  label: "Dự kiến chốt",
                  children: dateOnly(d.expected_close_date),
                },
                {
                  key: "condition",
                  label: "Điều kiện giai đoạn",
                  children:
                    conditions[
                      stages.find((s) => s.id === d.stage_id)?.exit_condition
                    ],
                },
                {
                  key: "actual",
                  label: "Giá trị chốt thực tế",
                  children: d.status === "WON" ? money(d.actual_amount) : "—",
                },
                {
                  key: "signed",
                  label: "Ngày ký",
                  children: dateOnly(d.signed_date),
                },
                {
                  key: "reason",
                  label: "Lý do thắng / thua",
                  children:
                    reasons.find(
                      (x) => x.id === (d.win_reason_id || d.loss_reason_id),
                    )?.name || "—",
                },
                {
                  key: "competitor",
                  label: "Đối thủ",
                  children:
                    competitors.find((x) => x.id === d.competitor_id)?.name ||
                    "—",
                },
                {
                  key: "note",
                  label: "Ghi chú",
                  children: d.loss_note || d.probability_note || "—",
                },
              ]}
            />
            <Tabs
              items={[
                {
                  key: "items",
                  label: `Sản phẩm (${d.items.length})`,
                  children: (
                    <Table
                      rowKey="id"
                      size="small"
                      dataSource={d.items}
                      pagination={false}
                      scroll={{ x: 700 }}
                      columns={[
                        { title: "Sản phẩm", dataIndex: "product_name" },
                        { title: "SL", dataIndex: "quantity" },
                        {
                          title: "Đơn giá",
                          dataIndex: "unit_price",
                          render: money,
                        },
                        { title: "Số kỳ", dataIndex: "periods" },
                        { title: "Tháng / kỳ", dataIndex: "period_months" },
                        {
                          title: "Thành tiền",
                          dataIndex: "line_total",
                          render: money,
                        },
                      ]}
                    />
                  ),
                },
                ...(auth.can("ACTIVITY")
                  ? [
                      {
                        key: "activity",
                        label: "Lịch sử & cuộc gặp",
                        children: (
                          <>
                            <ResourceError resource={activities} />
                            {editable && auth.can("ACTIVITY", "write", d) && (
                              <>
                                <Select
                                  aria-label="Loại hoạt động cơ hội"
                                  value={activityType}
                                  onChange={setActivityType}
                                  options={[
                                    { value: "meeting", label: "Cuộc gặp" },
                                    { value: "call", label: "Cuộc gọi" },
                                    { value: "note", label: "Ghi chú" },
                                  ]}
                                  className="section-gap"
                                />
                                <div className="notes-composer">
                                  <Input.TextArea
                                    aria-label="Ghi chú cơ hội"
                                    value={note}
                                    rows={3}
                                    onChange={(e) => {
                                      setNote(e.target.value);
                                      sessionStorage.setItem(
                                        key,
                                        e.target.value,
                                      );
                                    }}
                                  />
                                  <Button
                                    type="primary"
                                    disabled={!note.trim()}
                                    loading={a.busy}
                                    onClick={() =>
                                      a.run(
                                        () =>
                                          api.post(
                                            `/deals/${d.id}/activities`,
                                            {
                                              activity_type: activityType,
                                              content: note,
                                            },
                                          ),
                                        () => {
                                          setNote("");
                                          sessionStorage.removeItem(key);
                                          reload();
                                        },
                                      )
                                    }
                                  >
                                    Ghi nhận
                                  </Button>
                                </div>
                              </>
                            )}
                            <Timeline
                              items={activities.rows.map((v) => ({
                                title: dateTime(v.created_at),
                                content: (
                                  <>
                                    <b>{v.activity_type}</b>
                                    <p>{v.content}</p>
                                  </>
                                ),
                              }))}
                            />
                          </>
                        ),
                      },
                    ]
                  : []),
                {
                  key: "custom",
                  label: "Thông tin bổ sung",
                  children: (
                    <Descriptions
                      column={1}
                      items={Object.entries(d.custom_fields_data || {}).map(
                        ([k, v]) => ({ key: k, label: k, children: String(v) }),
                      )}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Drawer>
      {d && (
        <>
          <ProductsEditor
            open={mode === "products"}
            onClose={() => setMode(null)}
            deal={d}
            onSaved={reload}
          />
          <EntityModal
            title={
              mode === "WON"
                ? "Chốt cơ hội thành công"
                : mode === "LOST"
                  ? "Đóng cơ hội thất bại"
                  : "Mở lại cơ hội"
            }
            entity={"deal-result-" + id}
            draft={false}
            open={["WON", "LOST", "reopen"].includes(mode)}
            onClose={() => setMode(null)}
            busy={a.busy}
            defaults={{
              actual_amount: Number(d.amount),
              signed_date: dayjs().format("YYYY-MM-DD"),
            }}
            onSave={(v) =>
              a.run(
                () =>
                  mode === "reopen"
                    ? api.post(`/deals/${id}/reopen`, v)
                    : api.post(`/deals/${id}/close`, { status: mode, ...v }),
                reload,
              )
            }
          >
            {mode === "WON" ? (
              <>
                <Form.Item
                  name="actual_amount"
                  label="Giá trị chốt thực tế"
                  rules={required}
                >
                  <InputNumber min={0} max={1e12} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="signed_date" label="Ngày ký" rules={required}>
                  <DateField />
                </Form.Item>
                <Form.Item
                  name="win_reason_id"
                  label="Lý do thắng"
                  rules={required}
                >
                  <Select
                    options={reasons
                      .filter((x) => x.type === "WON")
                      .map((x) => ({ value: x.id, label: x.name }))}
                  />
                </Form.Item>
              </>
            ) : mode === "LOST" ? (
              <>
                <Form.Item
                  name="loss_reason_id"
                  label="Lý do thua"
                  rules={required}
                >
                  <Select
                    options={reasons
                      .filter((x) => x.type === "LOST")
                      .map((x) => ({ value: x.id, label: x.name }))}
                  />
                </Form.Item>
                <Form.Item
                  name="competitor_id"
                  label="Đối thủ thắng thầu (nếu có)"
                >
                  <Select
                    allowClear
                    options={competitors.map((x) => ({
                      value: x.id,
                      label: x.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="loss_note" label="Ghi chú">
                  <Input.TextArea />
                </Form.Item>
              </>
            ) : (
              <Form.Item name="reason" label="Lý do mở lại" rules={required}>
                <Input.TextArea />
              </Form.Item>
            )}
            {mode !== "reopen" && auth.has(...managerRoles) && (
              <Form.Item
                name="override_reason"
                label="Lý do ghi đè (chỉ nhập khi chưa đủ điều kiện giai đoạn)"
              >
                <Input.TextArea />
              </Form.Item>
            )}
          </EntityModal>
        </>
      )}
    </>
  );
}
function ProductsEditor({ open, onClose, deal, onSaved }) {
  const products = useResource(open ? "/products" : null),
    [form] = Form.useForm(),
    rows = Form.useWatch("items", form) || [],
    a = useAction();
  const total = rows.reduce(
    (n, r) =>
      n +
      Number(r?.quantity || 0) *
        Number(r?.unit_price || 0) *
        (products.rows.find((p) => p.id === r?.product_id)?.type ===
        "SUBSCRIPTION"
          ? Number(r?.periods || 1)
          : 1),
    0,
  );
  return (
    <EntityModal
      title="Dòng sản phẩm & dịch vụ"
      entity={"deal-items-" + deal.id}
      open={open}
      onClose={onClose}
      width={980}
      record={{
        id: deal.id,
        items: deal.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
      }}
      form={form}
      busy={a.busy}
      onSave={(v) =>
        a.run(
          () => api.put(`/deals/${deal.id}/items`, { items: v.items || [] }),
          onSaved,
        )
      }
    >
      <ResourceError resource={products} />
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...rest }) => {
              const p = products.rows.find(
                (p) => p.id === rows[name]?.product_id,
              );
              return (
                <Card
                  size="small"
                  key={key}
                  className="section-gap"
                  extra={
                    <Button
                      danger
                      type="text"
                      aria-label={`Xóa dòng ${name + 1}`}
                      icon={<DeleteOutlined aria-hidden="true" />}
                      onClick={() => remove(name)}
                    />
                  }
                  title={`Dòng ${name + 1}`}
                >
                  <div className="form-grid">
                    <Form.Item
                      {...rest}
                      name={[name, "product_id"]}
                      label="Sản phẩm"
                      rules={required}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={products.rows
                          .filter((p) => p.status?.toUpperCase() === "ACTIVE")
                          .map((p) => ({ value: p.id, label: p.name }))}
                        onChange={(id) => {
                          const p = products.rows.find((p) => p.id === id);
                          form.setFieldValue(
                            ["items", name, "unit_price"],
                            Number(p.list_price),
                          );
                          form.setFieldValue(["items", name, "periods"], 1);
                          form.setFieldValue(
                            ["items", name, "period_months"],
                            1,
                          );
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "quantity"]}
                      label="Số lượng"
                      rules={required}
                    >
                      <InputNumber
                        min={0.001}
                        max={1e6}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...rest}
                      name={[name, "unit_price"]}
                      label="Đơn giá"
                      rules={required}
                    >
                      <InputNumber
                        min={0}
                        max={1e12}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    {p?.type === "SUBSCRIPTION" && (
                      <>
                        <Form.Item
                          {...rest}
                          name={[name, "periods"]}
                          label="Số kỳ thanh toán"
                          rules={required}
                        >
                          <InputNumber
                            min={1}
                            max={1200}
                            precision={0}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...rest}
                          name={[name, "period_months"]}
                          label="Số tháng / kỳ"
                          rules={required}
                        >
                          <InputNumber
                            min={1}
                            max={120}
                            precision={0}
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
            <Button
              icon={<PlusOutlined aria-hidden="true" />}
              onClick={() => add({ quantity: 1, periods: 1, period_months: 1 })}
              className="section-gap"
            >
              Thêm dòng sản phẩm
            </Button>
          </>
        )}
      </Form.List>
      <Alert
        type="info"
        showIcon
        title={"Tổng dự tính: " + money(total)}
        description="Giá trị chính thức và giá trị theo năm được server tính lại từ các dòng đã lưu."
        className="section-gap"
      />
    </EntityModal>
  );
}
function Forecast({ filters, users, groups }) {
  const r = useResource("/deals/forecast", {
      owner_id: filters.owner_id,
      group_id: filters.group_id,
    }),
    auth = useAuth(),
    a = useAction(),
    [period, setPeriod] = useState("this_month"),
    [by, setBy] = useState("users"),
    [target, setTarget] = useState(false);
  const d = r.data?.data?.[period];
  return (
    <>
      <ResourceError resource={r} />
      <Space wrap className="section-gap">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "this_month", label: "Tháng này" },
            { value: "next_month", label: "Tháng sau" },
            { value: "this_quarter", label: "Quý này" },
          ]}
        />
        <Segmented
          value={by}
          onChange={setBy}
          options={[
            { value: "users", label: "Theo nhân viên" },
            { value: "groups", label: "Theo nhóm" },
          ]}
        />
        {auth.can("KPI", "write") && (
          <Button
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => setTarget(true)}
          >
            Giao chỉ tiêu
          </Button>
        )}
        <RefreshButton resource={r} />
      </Space>
      {d && (
        <>
          <div className="drawer-stats">
            {[
              ["Dự báo có trọng số", d.forecast],
              ["Thực tế đã chốt", d.actual],
              ["Chỉ tiêu", d.target],
            ].map(([label, v]) => (
              <div className="drawer-stat" key={label}>
                <span>{label}</span>
                <strong>{money(v)}</strong>
              </div>
            ))}
          </div>
          <Progress
            percent={
              d.target
                ? Math.round((Number(d.actual) / Number(d.target)) * 100)
                : 0
            }
            format={(v) => `${v}% chỉ tiêu`}
          />
          <Table
            rowKey={by === "users" ? "owner_id" : "group_id"}
            loading={r.loading}
            dataSource={d[by]}
            scroll={{ x: 700 }}
            columns={[
              {
                title: by === "users" ? "Nhân viên" : "Nhóm",
                render: (_, row) =>
                  by === "users"
                    ? users.find((u) => u.id === row.owner_id)?.full_name ||
                      `Tài khoản #${row.owner_id}`
                    : groups.find((g) => g.id === row.group_id)?.name ||
                      "Chưa phân nhóm",
              },
              { title: "Dự báo", dataIndex: "forecast", render: money },
              { title: "Đã chốt", dataIndex: "actual", render: money },
              { title: "Chỉ tiêu", dataIndex: "target", render: money },
            ]}
          />
        </>
      )}
      <EntityModal
        title="Giao chỉ tiêu doanh số"
        entity="sales-target"
        open={target}
        onClose={() => setTarget(false)}
        busy={a.busy}
        onSave={(v) => a.run(() => api.post("/targets", v), r.reload)}
      >
        <Form.Item name="user_id" label="Nhân viên" rules={required}>
          <Select options={userOptions(users)} />
        </Form.Item>
        <Form.Item name="start_date" label="Từ ngày" rules={required}>
          <DateField />
        </Form.Item>
        <Form.Item name="end_date" label="Đến ngày" rules={required}>
          <DateField />
        </Form.Item>
        <Form.Item name="amount" label="Chỉ tiêu" rules={required}>
          <InputNumber min={0} max={1e12} style={{ width: "100%" }} />
        </Form.Item>
      </EntityModal>
    </>
  );
}
