import Select from "../ui/LinkedSelect";
import { useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { api, dateTime } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { useAction, useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  required,
  phoneRules,
  roleLabels,
  userOptions,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
import ExcelImport from "../ui/ExcelImport";
export default function Users() {
  const auth = useAuth(),
    [filters, setFilters] = useState({}),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(20),
    r = useResource("/users", { ...filters, page, pageSize }),
    roles = useResource("/users/roles/list"),
    groups = useResource("/users/groups/list"),
    directory = useResource("/customers/users-list"),
    a = useAction();
  const [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [lock, setLock] = useState(null),
    [importOpen, setImportOpen] = useState(false),
    count = useResource(lock ? `/users/${lock.id}/customers-count` : null);
  const filter = (k, v) => {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
    setPage(1);
  };
  const write = auth.has("Admin");
  const start = (u) => {
    setEditing(u);
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="Quản trị người dùng"
        description="Cấp nhiều vai trò, quản lý nhóm và bàn giao dữ liệu khi khóa tài khoản."
        actions={
          <>
            <RefreshButton resource={r} />
            {write && (
              <Button onClick={() => setImportOpen(true)}>Nhập Excel</Button>
            )}
            {write && (
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden="true" />}
                onClick={() => start(null)}
              >
                Thêm người dùng
              </Button>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <DataCard>
        <div className="filter-bar">
          <Input
            aria-label="Tìm người dùng"
            placeholder="Tìm tên hoặc email…"
            prefix={<SearchOutlined aria-hidden="true" />}
            allowClear
            className="search-input"
            value={filters.search}
            onChange={(e) => filter("search", e.target.value)}
          />
          <Select
            placeholder="Vai trò"
            allowClear
            style={{ minWidth: 190 }}
            value={filters.role}
            onChange={(v) => filter("role", v)}
            options={roles.rows.map((g) => ({
              value: g.code,
              label: roleLabels[g.code],
            }))}
          />
          <Select
            placeholder="Nhóm"
            allowClear
            style={{ minWidth: 160 }}
            value={filters.group_id}
            onChange={(v) => filter("group_id", v)}
            options={groups.rows.map((g) => ({ value: g.id, label: g.name }))}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            style={{ minWidth: 150 }}
            value={filters.status}
            onChange={(v) => filter("status", v)}
            options={[
              { value: "Hoạt động", label: "Hoạt động" },
              { value: "Đã khóa", label: "Đã khóa" },
            ]}
          />
        </div>
        <Table
          rowKey="id"
          dataSource={r.rows}
          loading={r.loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total: r.data?.total,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
            showTotal: (n) => `${n} tài khoản`,
          }}
          columns={[
            {
              title: "Người dùng",
              render: (_, u) => (
                <div className="cell-stack">
                  <b>{u.full_name}</b>
                  <Typography.Text type="secondary">{u.email}</Typography.Text>
                </div>
              ),
            },
            {
              title: "Vai trò",
              render: (_, u) => (
                <Space wrap>
                  {u.roles.map((role) => (
                    <Tag key={role} color={role === "Admin" ? "red" : "blue"}>
                      {roleLabels[role]}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: "Nhóm",
              render: (_, u) =>
                groups.rows.find((g) => g.id === u.group_id)?.name ||
                "Chưa phân nhóm",
            },
            {
              title: "Trạng thái",
              render: (_, u) => (
                <Tag color={u.is_active ? "green" : "default"}>
                  {u.is_active ? "Hoạt động" : "Đã khóa"}
                </Tag>
              ),
            },
            { title: "Ngày tạo", dataIndex: "created_at", render: dateTime },
            {
              title: "Thao tác",
              render: (_, u) =>
                write ? (
                  <Space>
                    <Button
                      type="text"
                      aria-label={`Sửa người dùng ${u.full_name}`}
                      icon={<EditOutlined aria-hidden="true" />}
                      onClick={() => start(u)}
                    />
                    <Tooltip
                      title={
                        u.id === auth.user.id
                          ? "Không thể tự khóa tài khoản"
                          : u.is_active
                            ? "Khóa và bàn giao"
                            : "Mở khóa"
                      }
                    >
                      <Button
                        type="text"
                        disabled={u.id === auth.user.id}
                        danger={u.is_active}
                        aria-label={`${u.is_active ? "Khóa" : "Mở khóa"} ${u.full_name}`}
                        icon={
                          u.is_active ? (
                            <LockOutlined aria-hidden="true" />
                          ) : (
                            <UnlockOutlined aria-hidden="true" />
                          )
                        }
                        onClick={() =>
                          u.is_active
                            ? setLock(u)
                            : a.run(
                                () =>
                                  api.put(`/users/${u.id}/status`, {
                                    status: "active",
                                  }),
                                r.reload,
                              )
                        }
                      />
                    </Tooltip>
                  </Space>
                ) : (
                  <Tag>Chỉ xem</Tag>
                ),
            },
          ]}
        />
      </DataCard>
      <EntityModal
        title={editing ? "Chỉnh sửa người dùng" : "Tạo người dùng"}
        entity="user-admin"
        open={open}
        record={editing}
        onClose={() => setOpen(false)}
        busy={a.busy}
        defaults={{ roles: ["Sales Rep"] }}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/users/" + editing.id, v)
                : api.post("/users", v),
            () => {
              r.reload();
              directory.reload();
              auth.refresh();
            },
          )
        }
      >
        {!editing && (
          <Alert
            type="info"
            showIcon
            title="Hệ thống tạo mật khẩu tạm ngẫu nhiên và gửi cùng email đăng nhập, liên kết đặt mật khẩu tới email bạn nhập. Cần cấu hình SMTP."
            className="section-gap"
          />
        )}
        <div className="form-grid">
          <Form.Item name="full_name" label="Họ và tên" rules={required}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              ...required,
              { type: "email", message: "Email không hợp lệ." },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={phoneRules}>
            <Input />
          </Form.Item>
          <Form.Item name="group_id" label="Nhóm">
            <Select
              allowClear
              options={groups.rows.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
          <Form.Item
            name="roles"
            label="Các vai trò"
            rules={required}
            className="full-span"
          >
            <Select
              mode="multiple"
              options={roles.rows.map((g) => ({
                value: g.code,
                label: roleLabels[g.code],
              }))}
            />
          </Form.Item>
        </div>
      </EntityModal>
      <EntityModal
        title={"Khóa và bàn giao · " + (lock?.full_name || "")}
        entity={"lock-user-" + lock?.id}
        open={!!lock}
        onClose={() => setLock(null)}
        draft={false}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              api.put(`/users/${lock.id}/status`, { status: "inactive", ...v }),
            () => {
              r.reload();
              directory.reload();
            },
          )
        }
      >
        <Alert
          type="warning"
          showIcon
          title="Tài khoản sẽ bị ngắt phiên ngay lập tức."
          description={`${count.data?.customers ?? "…"} khách hàng và ${count.data?.deals ?? "…"} cơ hội cùng lead, báo giá được bàn giao trong một giao dịch.`}
          className="section-gap"
        />
        <Form.Item
          name="receiver_id"
          label="Người tiếp nhận toàn bộ dữ liệu"
          rules={required}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={userOptions(
              directory.rows.filter((u) => u.id !== lock?.id),
            )}
          />
        </Form.Item>
      </EntityModal>
      <ExcelImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entity="users"
        onImported={() => {
          r.reload();
          directory.reload();
        }}
      />
    </>
  );
}
