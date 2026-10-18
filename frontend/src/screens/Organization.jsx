import HierarchySelect from "../ui/HierarchySelect";
import CompanyHierarchy from "./CompanyHierarchy";
import Select from "../ui/LinkedSelect";
import { useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tabs,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  required,
  userOptions,
} from "../ui/common";
import EntityModal from "../ui/EntityModal";
import { flattenGroups } from "./Leads";
export default function Organization() {
  const auth = useAuth(),
    r = useResource("/organization/tree"),
    regions = useResource("/organization/regions"),
    directory = useResource("/customers/users-list"),
    a = useAction(),
    write = auth.can("CATEGORY", "write");
  const [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [members, setMembers] = useState(null),
    [assign, setAssign] = useState(false),
    [regionOpen, setRegionOpen] = useState(false),
    [tab, setTab] = useState("groups");
  const staff = useResource(members ? `/groups/${members.id}/members` : null);
  const groups = flattenGroups(r.rows);
  const start = (row) => {
    setEditing(row);
    setOpen(true);
  };
  const clean = (rows) =>
    rows.map((row) => ({
      ...row,
      children: row.children?.length ? clean(row.children) : undefined,
    }));
  return (
    <>
      <PageHeader
        title="Cơ cấu tổ chức kinh doanh"
        description="Phòng ban, trưởng nhóm và khu vực được quản lý theo cây phân cấp."
        actions={
          <>
            <RefreshButton resource={r} />
            {write && (
              <>
                <Button onClick={() => setRegionOpen(true)}>
                  Thêm khu vực
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined aria-hidden="true" />}
                  onClick={() => start(null)}
                >
                  Thêm nhóm
                </Button>
              </>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <DataCard>
        <Tabs
          animated={{ inkBar: true, tabPane: true }}
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "groups", label: "Cây nhóm kinh doanh" },
            ...(auth.can("CUSTOMER")
              ? [{ key: "companies", label: "Cây công ty mẹ / con" }]
              : []),
          ]}
        />
        {tab === "companies" ? (
          <CompanyHierarchy />
        ) : (
          <Table
            key={groups.map((g) => `${g.id}:${g.parent_id}`).join(",")}
            rowKey="id"
            dataSource={clean(r.rows)}
            loading={r.loading}
            scroll={{ x: 1000 }}
            pagination={false}
            expandable={{ defaultExpandAllRows: true }}
            columns={[
              {
                title: "Nhóm / Phòng ban",
                dataIndex: "name",
                render: (v) => (
                  <Space>
                    <FolderOutlined
                      aria-hidden="true"
                      style={{ color: "#1677ff" }}
                    />
                    <b>{v}</b>
                  </Space>
                ),
              },
              {
                title: "Trưởng nhóm",
                dataIndex: "leader_name",
                render: (v) =>
                  v || (
                    <Typography.Text type="secondary">
                      Chưa bổ nhiệm
                    </Typography.Text>
                  ),
              },
              {
                title: "Khu vực",
                dataIndex: "region_name",
                render: (v) => (v ? <Tag color="cyan">{v}</Tag> : "—"),
              },
              {
                title: "Nhân sự trực tiếp",
                dataIndex: "member_count",
                render: (v, row) => (
                  <Button
                    type="link"
                    icon={<TeamOutlined aria-hidden="true" />}
                    onClick={() => setMembers(row)}
                  >
                    {Number(v)} nhân sự
                  </Button>
                ),
              },
              { title: "Mô tả", dataIndex: "description" },
              {
                title: "Thao tác",
                render: (_, row) =>
                  write ? (
                    <Space>
                      <Button
                        icon={<EditOutlined aria-hidden="true" />}
                        aria-label={`Sửa nhóm ${row.name}`}
                        onClick={() => start(row)}
                      />
                      <Popconfirm
                        title="Xóa nhóm này?"
                        description="Nhóm đang có nhân sự hoặc dữ liệu sẽ được giữ lại."
                        onConfirm={() =>
                          a.run(
                            () => api.delete("/organization/groups/" + row.id),
                            r.reload,
                          )
                        }
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined aria-hidden="true" />}
                          aria-label={`Xóa nhóm ${row.name}`}
                        />
                      </Popconfirm>
                    </Space>
                  ) : (
                    <Tag>Chỉ xem</Tag>
                  ),
              },
            ]}
          />
        )}
      </DataCard>
      <EntityModal
        entity="group"
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Chỉnh sửa nhóm" : "Thêm nhóm"}
        record={editing}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              editing
                ? api.put("/organization/groups/" + editing.id, {
                    ...v,
                    parent_id: v.parent_id || null,
                    region_id: v.region_id || null,
                  })
                : api.post("/organization/groups", {
                    ...v,
                    parent_id: v.parent_id || null,
                    region_id: v.region_id || null,
                  }),
            () => {
              r.reload();
              directory.reload();
              auth.refresh();
            },
          )
        }
      >
        <Form.Item name="name" label="Tên nhóm" rules={required}>
          <Input />
        </Form.Item>
        <Form.Item name="parent_id" label="Nhóm cha">
          <HierarchySelect rows={groups} exclude={editing?.id} />
        </Form.Item>
        <Form.Item name="leader_id" label="Trưởng nhóm" rules={required}>
          <Select
            showSearch
            optionFilterProp="label"
            options={userOptions(directory.rows)}
          />
        </Form.Item>
        <Form.Item name="region_id" label="Khu vực">
          <Select
            allowClear
            options={regions.rows.map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea />
        </Form.Item>
      </EntityModal>
      <EntityModal
        entity="region"
        open={regionOpen}
        onClose={() => setRegionOpen(false)}
        title="Thêm khu vực"
        busy={a.busy}
        onSave={(v) =>
          a.run(() => api.post("/organization/regions", v), regions.reload)
        }
      >
        <Form.Item name="name" label="Tên khu vực" rules={required}>
          <Input />
        </Form.Item>
        <Form.Item name="code" label="Mã khu vực">
          <Input />
        </Form.Item>
      </EntityModal>
      <Drawer
        title={"Nhân sự · " + (members?.name || "")}
        open={!!members}
        onClose={() => setMembers(null)}
        size={640}
      >
        <ResourceError resource={staff} />
        {write && (
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => setAssign(true)}
            className="section-gap"
          >
            Phân bổ nhân sự
          </Button>
        )}
        <Table
          rowKey="id"
          dataSource={staff.rows}
          loading={staff.loading}
          columns={[
            { title: "Họ tên", dataIndex: "full_name" },
            { title: "Email", dataIndex: "email" },
            { title: "Vai trò chính", dataIndex: "role_code" },
          ]}
          scroll={{ x: 520 }}
        />
      </Drawer>
      <EntityModal
        entity={"group-members-" + members?.id}
        title="Phân bổ nhân sự vào nhóm"
        open={assign}
        onClose={() => setAssign(false)}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              api.post(`/organization/groups/${members.id}/assign-member`, v),
            () => {
              staff.reload();
              r.reload();
              auth.refresh();
            },
          )
        }
      >
        <Form.Item name="user_ids" label="Nhân sự" rules={required}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            options={userOptions(directory.rows)}
          />
        </Form.Item>
      </EntityModal>
    </>
  );
}
