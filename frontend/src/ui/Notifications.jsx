import { useEffect, useState } from "react";
import { Badge, Button, Empty, List, Tabs, Tag, Typography } from "antd";
import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api, dateTime } from "../lib/api";
import { useResource, useAction } from "../lib/hooks";
import PopupPanel from "./PopupPanel";
import { useAuth } from "../auth/AuthProvider";
import { auditActions, auditEntities, auditEntries } from "../lib/auditText";
import { ResourceError } from "./common";
export default function Notifications() {
  const auth = useAuth();
  const [visible, setVisible] = useState(false),
    [tab, setTab] = useState(auth.can("USER_LOG") ? "audit" : "personal");
  const audit = useResource(
    visible && auth.can("USER_LOG") ? "/audit-logs" : null,
  );
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
        setVisible(false);
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
    <PopupPanel
      open={visible}
      onClose={() => setVisible(false)}
      label="Thông báo và nhật ký"
      trigger={
        <Button
          type="text"
          shape="circle"
          aria-label={`Thông báo (${unread} chưa đọc)`}
          aria-expanded={visible}
          onClick={() => {
            resource.reload();
            setVisible((v) => !v);
          }}
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
      }
    >
      {auth.can("USER_LOG") ? (
        <>
          <Tabs
            animated={{ inkBar: true, tabPane: true }}
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: "audit", label: "Nhật ký thao tác" },
              { key: "personal", label: "Thông báo của tôi" },
            ]}
          />
          {tab === "personal" ? (
            content
          ) : (
            <>
              <div className="inline-between">
                <Typography.Text strong>
                  Nhật ký thao tác nhạy cảm
                </Typography.Text>
                <Button
                  type="text"
                  aria-label="Làm mới nhật ký"
                  onClick={audit.reload}
                  icon={<ReloadOutlined spin={audit.loading} />}
                />
              </div>
              <ResourceError resource={audit} />
              <List
                dataSource={audit.rows.slice(0, 8)}
                locale={{ emptyText: "Chưa có thao tác được ghi nhận." }}
                renderItem={(row) => (
                  <List.Item>
                    <div className="audit-notification">
                      <div className="inline-between">
                        <Tag color="blue">
                          {auditActions[row.action_type] || "Thay đổi dữ liệu"}
                        </Tag>
                        <Typography.Text type="secondary">
                          {dateTime(row.created_at)}
                        </Typography.Text>
                      </div>
                      <p>
                        {row.user_name ||
                          (row.user_id
                            ? `Tài khoản #${row.user_id}`
                            : "Hệ thống")}{" "}
                        · {auditEntities[row.entity_type] || row.entity_type} #
                        {row.entity_id}
                      </p>
                      {row.description && <p>{row.description}</p>}
                      <div className="audit-notification-change">
                        {auditEntries(row.before_value, row.after_value)
                          .slice(0, 2)
                          .map(([label, text]) => (
                            <div key={label}>
                              <del>
                                {label}: {text}
                              </del>
                            </div>
                          ))}
                        {auditEntries(row.after_value, row.before_value)
                          .slice(0, 2)
                          .map(([label, text]) => (
                            <div key={label} className="audit-new">
                              → {label}: {text}
                            </div>
                          ))}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
              <Button
                type="link"
                block
                onClick={() => {
                  setVisible(false);
                  nav("/audit-logs");
                }}
              >
                Xem toàn bộ nhật ký hệ thống
              </Button>
            </>
          )}
        </>
      ) : (
        content
      )}
    </PopupPanel>
  );
}
