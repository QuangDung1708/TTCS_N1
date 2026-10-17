import {
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Statistic,
  Table,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useResource } from "../lib/hooks";
import { money } from "../lib/api";
import {
  DataCard,
  PageHeader,
  RefreshButton,
  ResourceError,
} from "../ui/common";
export default function Dashboard() {
  const auth = useAuth(),
    r = useResource("/dashboard/stats"),
    nav = useNavigate(),
    k = r.data?.kpi;
  const data = [
    {
      title: "Tổng khách hàng",
      value: k?.totalCustomers,
      icon: TeamOutlined,
      caption: k ? `${k.newCustomers} khách hàng mới trong tháng` : "",
    },
    {
      title: "Giá trị pipeline đang mở",
      value: k?.pipelineValue,
      icon: BranchesOutlined,
      money: true,
      caption: "Giá trị của các cơ hội trong phạm vi của bạn",
    },
    {
      title: "Cơ hội đã thành công",
      value: k?.dealsWon,
      icon: CheckCircleOutlined,
      caption: k
        ? `Tỷ lệ thắng ${Number(k.winRate || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
        : "",
    },
  ];
  const funnel = Object.entries(r.data?.funnel || {}),
    max = Math.max(1, ...funnel.map(([, v]) => v));
  return (
    <>
      <PageHeader
        title="Tổng quan kinh doanh"
        description={`Chào ${auth.user.full_name}. Theo dõi khách hàng và tiến độ kinh doanh trong phạm vi của bạn.`}
        actions={
          <>
            <RefreshButton resource={r} />
            {auth.can("CUSTOMER", "write") && (
              <Button
                type="primary"
                icon={<PlusOutlined aria-hidden="true" />}
                onClick={() => nav("/customers?create=1")}
              >
                Thêm khách hàng
              </Button>
            )}
          </>
        }
      />
      <ResourceError resource={r} />
      <Row gutter={[16, 16]} className="metrics-row">
        {data.map((m) => (
          <Col xs={24} md={8} key={m.title}>
            <Card className="metric-card">
              <div className="metric-top">
                <Skeleton loading={!k && r.loading} active paragraph={false}>
                  <Statistic
                    title={m.title}
                    value={m.value ?? 0}
                    formatter={(v) =>
                      m.money ? money(v) : Number(v).toLocaleString("vi-VN")
                    }
                  />
                </Skeleton>
                <span className="metric-icon">
                  <m.icon aria-hidden="true" />
                </span>
              </div>
              <span className="metric-caption">
                {m.caption || "Dữ liệu chưa được tải"}
              </span>
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <DataCard
            title="Phễu cơ hội hiện tại"
            extra={
              <Button
                type="link"
                onClick={() => nav("/pipeline")}
                icon={<ArrowRightOutlined aria-hidden="true" />}
              >
                Xem pipeline
              </Button>
            }
          >
            {funnel.length ? (
              funnel.map(([stage, count]) => (
                <div className="funnel-row" key={stage}>
                  <span>{stage}</span>
                  <div className="funnel-track">
                    <div
                      className="funnel-value"
                      style={{ width: (count / max) * 100 + "%" }}
                    />
                  </div>
                  <b>{count}</b>
                </div>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có cơ hội trong phạm vi của bạn."
              />
            )}
          </DataCard>
        </Col>
        <Col xs={24} lg={9}>
          <DataCard title="Tiến độ chỉ tiêu hiện tại">
            <div className="target-summary">
              <Progress
                type="dashboard"
                percent={Math.min(100, Number(k?.targetProgress || 0))}
                format={() =>
                  `${Number(k?.targetProgress || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
                }
                size={150}
              />
              <Typography.Paragraph type="secondary">
                Doanh thu đã chốt so với chỉ tiêu đã được giao trong kỳ.
              </Typography.Paragraph>
            </div>
          </DataCard>
        </Col>
      </Row>
      <DataCard
        title="Cơ hội gần đây"
        extra={
          <Typography.Text type="secondary">
            Cập nhật theo dữ liệu của bạn
          </Typography.Text>
        }
      >
        <Table
          rowKey="key"
          loading={r.loading}
          dataSource={r.data?.recentDeals || []}
          pagination={false}
          scroll={{ x: 680 }}
          locale={{ emptyText: "Chưa có cơ hội bán hàng." }}
          columns={[
            {
              title: "Cơ hội",
              dataIndex: "deal",
              render: (text, row) => (
                <button
                  className="table-primary"
                  onClick={() => nav("/pipeline?deal=" + row.key)}
                >
                  {text}
                </button>
              ),
            },
            { title: "Khách hàng", dataIndex: "company" },
            {
              title: "Giá trị",
              dataIndex: "value",
              render: (v) => <span className="money-text">{money(v)}</span>,
            },
            { title: "Giai đoạn", dataIndex: "stage" },
            { title: "Người phụ trách", dataIndex: "owner" },
          ]}
        />
      </DataCard>
    </>
  );
}
