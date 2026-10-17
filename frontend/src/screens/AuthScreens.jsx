import { useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Typography } from "antd";
import {
  ArrowRightOutlined,
  LockOutlined,
  MailOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api, errorText } from "../lib/api";
import { useResource, useAction } from "../lib/hooks";
import { passwordRules, required } from "../ui/common";
function AuthFrame({ children, title, subtitle }) {
  return (
    <main className="auth-screen">
      <section className="auth-intro">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <ApartmentOutlined aria-hidden="true" />
          </span>
          <span>
            Enterprise <b>CRM</b>
          </span>
        </Link>
        <div>
          <span className="eyebrow">KẾT NỐI CƠ HỘI. PHÁT TRIỂN QUAN HỆ.</span>
          <Typography.Title>
            Hiểu khách hàng.
            <br />
            Dẫn lối tăng trưởng.
          </Typography.Title>
          <Typography.Paragraph>
            Một không gian chung cho khách hàng, đội ngũ và mọi cơ hội kinh
            doanh.
          </Typography.Paragraph>
        </div>
        <span className="auth-caption">
          Dữ liệu đúng phạm vi. Công việc luôn tiếp nối.
        </span>
      </section>
      <section className="auth-form-area">
        <Card className="auth-card">
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {subtitle}
          </Typography.Paragraph>
          {children}
        </Card>
      </section>
    </main>
  );
}
export function LoginScreen() {
  const auth = useAuth(),
    nav = useNavigate(),
    location = useLocation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [forgot, setForgot] = useState(false);
  const option = useResource("/auth/options");
  const [forgotForm] = Form.useForm();
  const action = useAction();
  return (
    <AuthFrame
      title="Chào mừng trở lại"
      subtitle="Đăng nhập bằng tài khoản công việc của bạn."
    >
      {auth.expired && (
        <Alert
          className="section-gap"
          showIcon
          type="warning"
          title="Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."
        />
      )}
      {error && (
        <Alert type="error" title={error} showIcon className="section-gap" />
      )}
      <Form
        layout="vertical"
        requiredMark={false}
        onFinish={async (values) => {
          setBusy(true);
          setError("");
          try {
            await auth.login(values);
            nav(location.state?.from || "/", { replace: true });
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Form.Item
          label="Email công việc"
          name="email"
          rules={[
            ...required,
            { type: "email", message: "Email chưa đúng định dạng." },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined aria-hidden="true" />}
            autoComplete="username"
            placeholder="Email công việc"
          />
        </Form.Item>
        <Form.Item label="Mật khẩu" name="password" rules={required}>
          <Input.Password
            size="large"
            prefix={<LockOutlined aria-hidden="true" />}
            autoComplete="current-password"
            placeholder="Mật khẩu"
          />
        </Form.Item>
        <div className="auth-secondary">
          <Button type="link" onClick={() => setForgot(true)}>
            Quên mật khẩu?
          </Button>
        </div>
        <Button
          block
          size="large"
          type="primary"
          htmlType="submit"
          loading={busy}
          icon={<ArrowRightOutlined aria-hidden="true" />}
          iconPlacement="end"
        >
          Đăng nhập
        </Button>
      </Form>
      {option.data?.self_registration && (
        <Typography.Paragraph className="auth-register">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </Typography.Paragraph>
      )}
      <Typography.Paragraph className="auth-help" type="secondary">
        Liên hệ quản trị viên nếu bạn chưa được cấp tài khoản.
      </Typography.Paragraph>
      <Modal
        open={forgot}
        onCancel={() => setForgot(false)}
        title="Khôi phục mật khẩu"
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph>
          Nhập email công việc để nhận hướng dẫn đặt lại mật khẩu. Liên kết có
          hiệu lực 30 phút.
        </Typography.Paragraph>
        <Form
          layout="vertical"
          form={forgotForm}
          onFinish={(v) =>
            action.run(
              () => api.post("/auth/forgot-password", v),
              () => setForgot(false),
              "Nếu email tồn tại, hướng dẫn sẽ được gửi đến hộp thư của bạn.",
            )
          }
        >
          <Form.Item
            name="email"
            label="Email công việc"
            rules={[
              ...required,
              { type: "email", message: "Email chưa đúng định dạng." },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button type="primary" block htmlType="submit" loading={action.busy}>
            Gửi hướng dẫn
          </Button>
        </Form>
      </Modal>
    </AuthFrame>
  );
}
export function ResetScreen() {
  const [params] = useSearchParams(),
    nav = useNavigate();
  const action = useAction();
  return (
    <AuthFrame
      title="Đặt lại mật khẩu"
      subtitle="Chọn mật khẩu mới để bảo vệ tài khoản của bạn."
    >
      {!params.get("token") ? (
        <Alert
          type="error"
          showIcon
          title="Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới."
        />
      ) : (
        <Form
          layout="vertical"
          onFinish={(v) =>
            action.run(
              () =>
                api.post("/auth/reset-password", {
                  token: params.get("token"),
                  newPassword: v.password,
                }),
              () => nav("/login", { replace: true }),
              "Đã đặt lại mật khẩu. Vui lòng đăng nhập.",
            )
          }
        >
          <Form.Item name="password" label="Mật khẩu mới" rules={passwordRules}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Nhập lại mật khẩu"
            dependencies={["password"]}
            rules={[
              ...required,
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  v === getFieldValue("password")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Mật khẩu chưa khớp.")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" block htmlType="submit" loading={action.busy}>
            Lưu mật khẩu mới
          </Button>
        </Form>
      )}
      <Link className="auth-back" to="/login">
        Quay lại đăng nhập
      </Link>
    </AuthFrame>
  );
}
export function RegisterScreen() {
  const option = useResource("/auth/options"),
    [form] = Form.useForm(),
    [sent, setSent] = useState(false),
    nav = useNavigate();
  const action = useAction();
  const { message } = App.useApp();
  return (
    <AuthFrame
      title="Tạo tài khoản"
      subtitle="Xác minh email trước khi bắt đầu sử dụng."
    >
      {option.data?.self_registration === false ? (
        <Alert type="info" showIcon title="Tài khoản do quản trị viên cấp." />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            action.run(
              () => api.post("/auth/register", v),
              () => nav("/login"),
              "Đã tạo tài khoản. Bạn có thể đăng nhập.",
            )
          }
        >
          <Form.Item name="full_name" label="Họ và tên" rules={required}>
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email công việc"
            rules={[...required, { type: "email" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button
            block
            className="section-gap"
            loading={action.busy}
            onClick={async () => {
              try {
                await form.validateFields(["email"]);
                await action.run(
                  () =>
                    api.post("/auth/send-register-otp", {
                      email: form.getFieldValue("email"),
                    }),
                  () => setSent(true),
                  "Nếu email có thể đăng ký, mã xác nhận sẽ được gửi đến hộp thư.",
                );
              } catch {
                message.warning("Kiểm tra email công việc.");
              }
            }}
          >
            {sent ? "Gửi lại mã xác nhận" : "Gửi mã xác nhận"}
          </Button>
          <Form.Item
            name="otp_code"
            label="Mã xác nhận"
            rules={[
              ...required,
              { pattern: /^\d{6}$/, message: "Mã xác nhận gồm 6 chữ số." },
            ]}
          >
            <Input autoComplete="one-time-code" maxLength={6} />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={passwordRules}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={action.busy}>
            Tạo tài khoản
          </Button>
        </Form>
      )}
      <Link className="auth-back" to="/login">
        Quay lại đăng nhập
      </Link>
    </AuthFrame>
  );
}
