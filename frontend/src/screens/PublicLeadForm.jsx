import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Result, Typography } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import { ResourceError, phoneRules, required } from "../ui/common";
export default function PublicLeadForm() {
  const location = useLocation(),
    key = location.pathname.split("/").at(-1),
    r = useResource("/public/lead-forms/" + encodeURIComponent(key) + "/meta"),
    a = useAction(),
    [sent, setSent] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const timer = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(timer);
  }, [r.data?.stamp]);
  return (
    <main className="public-lead">
      <Card className="public-lead-card" loading={r.loading}>
        <ResourceError resource={r} />
        {sent ? (
          <Result
            status="success"
            title="Đã nhận thông tin"
            subTitle="Cảm ơn bạn. Đội ngũ tư vấn sẽ liên hệ với bạn."
          />
        ) : (
          r.data && (
            <>
              <Typography.Title level={3}>{r.data.name}</Typography.Title>
              <Typography.Paragraph type="secondary">
                Để lại thông tin để nhận tư vấn phù hợp với doanh nghiệp của
                bạn.
              </Typography.Paragraph>
              <Form
                layout="vertical"
                onFinish={(v) =>
                  a.run(
                    () =>
                      api.post(
                        "/public/lead-forms/" + encodeURIComponent(key),
                        {
                          ...v,
                          stamp: r.data.stamp,
                          signature: r.data.signature,
                        },
                      ),
                    () => setSent(true),
                    null,
                  )
                }
              >
                <Form.Item name="full_name" label="Họ và tên" rules={required}>
                  <Input maxLength={255} autoComplete="name" />
                </Form.Item>
                <Form.Item name="company_name" label="Công ty" rules={required}>
                  <Input maxLength={255} autoComplete="organization" />
                </Form.Item>
                <div className="form-grid">
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      ...required,
                      { type: "email", message: "Email chưa đúng định dạng." },
                    ]}
                  >
                    <Input autoComplete="email" maxLength={255} />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    rules={[...required, ...phoneRules]}
                  >
                    <Input autoComplete="tel" />
                  </Form.Item>
                </div>
                <Form.Item
                  name="interest"
                  label="Nhu cầu quan tâm"
                  rules={required}
                >
                  <Input.TextArea rows={3} maxLength={255} />
                </Form.Item>
                <Form.Item name="website_confirm" hidden>
                  <Input tabIndex={-1} autoComplete="off" />
                </Form.Item>
                <Button
                  block
                  type="primary"
                  icon={<SendOutlined aria-hidden="true" />}
                  htmlType="submit"
                  loading={a.busy}
                  disabled={!ready}
                >
                  Gửi thông tin
                </Button>
              </Form>
            </>
          )
        )}
      </Card>
    </main>
  );
}
