import { Alert, Table, Tag, Typography } from "antd";
import { useAuth } from "../auth/AuthProvider";
import { useResource } from "../lib/hooks";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
  roleLabels,
} from "../ui/common";
const names = {
  CATEGORY: "Danh mục",
  CUSTOMER: "Khách hàng",
  LEAD: "Lead",
  DEAL: "Cơ hội",
  ACTIVITY: "Hoạt động",
  QUOTE: "Báo giá",
  KPI: "Chỉ tiêu",
  REPORT: "Báo cáo",
  AUTO: "Tự động hóa",
  USER_LOG: "Người dùng & nhật ký",
};
export default function Permissions() {
  const auth = useAuth(),
    r = useResource("/auth/role-matrix"),
    matrix = r.data?.data || {},
    roles = Object.keys(roleLabels);
  return (
    <>
      <PageHeader
        title="Ma trận phân quyền"
        description="Quyền được đọc trực tiếp từ cấu hình đang áp dụng trên server."
        actions={<RefreshButton resource={r} />}
      />
      <ResourceError resource={r} />
      <Alert
        showIcon
        type="info"
        title="F: Toàn quyền · W: Ghi · R: Xem · N: Không truy cập"
        description="Dấu * giới hạn theo người sở hữu. Trưởng nhóm xem và quản lý dữ liệu thuộc cây nhóm phụ trách. Giá vốn chỉ dành cho Director; quản trị tài khoản chỉ dành cho Admin."
        className="section-gap"
      />
      <DataCard>
        <Table
          pagination={false}
          rowKey="module"
          dataSource={Object.entries(matrix).map(([module, values]) => ({
            module,
            ...values,
          }))}
          scroll={{ x: 1200 }}
          columns={[
            {
              title: "Chức năng",
              dataIndex: "module",
              fixed: "left",
              width: 200,
              render: (v) => names[v] || v,
            },
            ...roles.map((role) => ({
              title: roleLabels[role],
              dataIndex: role,
              width: 150,
              render: (v) => (
                <Tag
                  color={
                    v === "N"
                      ? "default"
                      : v?.startsWith("F")
                        ? "green"
                        : v?.startsWith("W")
                          ? "blue"
                          : "gold"
                  }
                >
                  {v}
                </Tag>
              ),
            })),
          ]}
        />
        <Typography.Paragraph type="secondary" className="section-gap">
          Vai trò của bạn:{" "}
          {auth.user.roles.map((r) => roleLabels[r]).join(", ")}. Khi có nhiều
          vai trò, quyền được hợp nhất theo từng thao tác; quyền xem rộng không
          tự mở rộng quyền sửa.
        </Typography.Paragraph>
      </DataCard>
    </>
  );
}
