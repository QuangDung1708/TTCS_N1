import { Modal } from "../ui/Motion";
import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Typography } from "antd";
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
import { passwordRules, required, roleLabels } from "../ui/common";
function AuthFrame({ children, title, subtitle }) {
  return (
    <main className="auth-screen">
      <section className="auth-intro">
        <div className="auth-network" aria-hidden="true">
          <svg viewBox="0 0 600 600" fill="none">
            <path
              d="M40 290L180 130L390 100L540 270L430 460L200 510Z M180 130L300 300L540 270 M40 290L300 300L430 460 M200 510L300 300L390 100"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {[
              [40, 290],
              [180, 130],
              [390, 100],
              [540, 270],
              [430, 460],
              [200, 510],
              [300, 300],
            ].map(([x, y]) => (
              <g key={x}>
                <circle
                  cx={x}
                  cy={y}
                  r="22"
                  fill="white"
                  stroke="currentColor"
                />
                <circle cx={x} cy={y} r="6" fill="currentColor" />
              </g>
            ))}
          </svg>
        </div>
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
  const [loginForm] = Form.useForm();
  const demo = useResource("/auth/test-accounts");
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
        form={loginForm}
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
      {!!demo.rows.length && (
        <div className="test-accounts">
          <Typography.Text strong>
            Tài khoản kiểm thử theo User Roles
          </Typography.Text>
          <Typography.Paragraph type="secondary">
            Chọn vai trò để điền tài khoản, sau đó bấm Đăng nhập.
          </Typography.Paragraph>
          <div className="test-account-grid">
            {demo.rows.map((user) => (
              <Button
                key={user.email}
                title={user.email}
                onClick={() => {
                  loginForm.setFieldsValue({
                    email: user.email,
                    password: user.password,
                  });
                  setError("");
                }}
              >
                {user.roles.map((role) => roleLabels[role] || role).join(" / ")}
              </Button>
            ))}
          </div>
        </div>
      )}
      {option.data?.self_registration && (
        <Typography.Paragraph className="auth-register">
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
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
          name="forgot-password"
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
    [deadline, setDeadline] = useState(0),
    [now, setNow] = useState(Date.now()),
    nav = useNavigate();
  const action = useAction();
  const { message } = App.useApp();
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
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
            disabled={remaining > 0}
            onClick={async () => {
              try {
                await form.validateFields(["email"]);
                await action.run(
                  () =>
                    api.post("/auth/send-register-otp", {
                      email: form.getFieldValue("email"),
                    }),
                  (result) => {
                    setSent(true);
                    const expiry =
                      Date.now() + (result.data.retry_after || 60) * 1000;
                    setNow(Date.now());
                    setDeadline(expiry);
                  },
                  "Yêu cầu mã xác nhận đã được tiếp nhận.",
                );
              } catch {
                message.warning("Kiểm tra email công việc.");
              }
            }}
          >
            {remaining
              ? `Gửi lại sau ${remaining}s`
              : sent
                ? "Gửi lại mã xác nhận"
                : "Gửi mã xác nhận"}
          </Button>
          <Form.Item
            name="otp_code"
            label="Mã xác nhận"
            rules={[
              ...required,
              { pattern: /^\d{6}$/, message: "Mã xác nhận gồm 6 chữ số." },
            ]}
          >
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập 6 chữ số trong email"
            />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={passwordRules}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="Xác nhận mật khẩu"
            dependencies={["password"]}
            rules={[
              ...required,
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value === getFieldValue("password")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Mật khẩu chưa khớp.")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Typography.Paragraph type="secondary">
            Mật khẩu ít nhất 8 ký tự, gồm chữ và số. Vai trò mặc định: Nhân viên
            kinh doanh (Sales Rep).
          </Typography.Paragraph>
          <Button
            aria-label="Tạo tài khoản"
            block
            type="primary"
            htmlType="submit"
            loading={action.busy}
          >
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
