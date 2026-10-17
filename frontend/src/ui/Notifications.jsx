import { useEffect } from "react";
import { Badge, Button, Empty, List, Popover, Typography } from "antd";
import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api, dateTime } from "../lib/api";
import { useResource, useAction } from "../lib/hooks";
import { ResourceError } from "./common";
export default function Notifications() {
  const resource = useResource("/notifications"),
    action = useAction(),
    nav = useNavigate();
  const unread = resource.rows.filter((n) => !n.read_at).length;
  useEffect(() => {
    const timer = setInterval(resource.reload, 60000);
    return () => clearInterval(timer);
  }, [resource.reload]);
  const open = (n) =>
    action.run(
      async () => {
        await api.put(`/notifications/${n.id}/read`);
        const [kind, id] = n.event_key.split(":");
        if (kind === "customer-risk") nav("/customers?customer=" + id);
        else if (kind.startsWith("lead-")) nav("/leads?lead=" + id);
        else if (kind === "deal-flag") nav("/pipeline?deal=" + id);
      },
      resource.reload,
      null,
    );
  const content = (
    <div className="notifications-panel">
      <div className="inline-between">
        <Typography.Text strong>Thông báo của bạn</Typography.Text>
        <Button
          type="text"
          aria-label="Làm mới thông báo"
          icon={<ReloadOutlined aria-hidden="true" spin={resource.loading} />}
          onClick={resource.reload}
        />
      </div>
      <ResourceError resource={resource} />
      <List
        dataSource={resource.rows}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Bạn chưa có thông báo mới."
            />
          ),
        }}
        renderItem={(n) => (
          <List.Item
            className={n.read_at ? "notification-read" : "notification-unread"}
          >
            <button className="notification-item" onClick={() => open(n)}>
              <Typography.Text strong={!n.read_at}>{n.message}</Typography.Text>
              <Typography.Text type="secondary">
                {dateTime(n.created_at)}
              </Typography.Text>
            </button>
          </List.Item>
        )}
      />
    </div>
  );
  return (
    <Popover trigger="click" placement="bottomRight" content={content}>
      <Button
        type="text"
        shape="circle"
        aria-label={`Thông báo (${unread} chưa đọc)`}
      >
        <Badge count={unread} size="small">
          <BellOutlined
            aria-hidden="true"
            className={
              unread ? "notification-bell has-unread" : "notification-bell"
            }
          />
        </Badge>
      </Button>
    </Popover>
  );
}
