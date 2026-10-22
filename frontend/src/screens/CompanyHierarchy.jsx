import { useState } from "react";
import { Button, Form, Table, Typography } from "antd";
import { useAuth } from "../auth/AuthProvider";
import { useAction, useResource } from "../lib/hooks";
import { api, money } from "../lib/api";
import { ResourceError, RefreshButton } from "../ui/common";
import EntityModal from "../ui/EntityModal";
import HierarchySelect, { hierarchy } from "../ui/HierarchySelect";
export default function CompanyHierarchy() {
  const auth = useAuth(),
    r = useResource(auth.can("CUSTOMER") ? "/customers" : null),
    a = useAction();
  const [editing, setEditing] = useState(null);
  const tree = hierarchy(r.rows, "company_name");
  const total = (n) =>
    Number(n.total_contract_value || 0) +
    n.children.reduce((sum, child) => sum + total(child), 0);
  return (
    <>
      <Typography.Paragraph type="secondary">
        Quan hệ giữa khách hàng doanh nghiệp, độc lập với nhóm kinh doanh. Chỉ
        hiển thị và cộng giá trị trong phạm vi bạn được xem.
      </Typography.Paragraph>
      <RefreshButton resource={r} />
      <ResourceError resource={r} />
      <Table
        key={r.rows.map((r) => `${r.id}:${r.parent_id}`).join(",")}
        rowKey="id"
        dataSource={tree}
        loading={r.loading}
        expandable={{ defaultExpandAllRows: true }}
        pagination={false}
        columns={[
          { title: "Công ty / Công ty con", dataIndex: "company_name" },
          { title: "Trạng thái", dataIndex: "status" },
          {
            title: "Giá trị hợp đồng gồm công ty con",
            render: (_, row) => money(total(row)),
          },
          {
            title: "Thao tác",
            render: (_, row) =>
              auth.can("CUSTOMER", "write", row) ? (
                <Button onClick={() => setEditing(row)}>Chọn công ty mẹ</Button>
              ) : (
                "Chỉ xem"
              ),
          },
        ]}
      />
      <EntityModal
        entity="company-parent"
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Liên kết công ty mẹ / con"
        record={editing}
        busy={a.busy}
        onSave={(v) =>
          a.run(
            () =>
              api.put(`/customers/${editing.id}`, {
                parent_id: v.parent_id || null,
              }),
            r.reload,
          )
        }
      >
        <Typography.Paragraph>{editing?.company_name}</Typography.Paragraph>
        <Form.Item name="parent_id" label="Công ty mẹ">
          <HierarchySelect
            rows={r.rows}
            label="company_name"
            exclude={editing?.id}
          />
        </Form.Item>
      </EntityModal>
    </>
  );
}
