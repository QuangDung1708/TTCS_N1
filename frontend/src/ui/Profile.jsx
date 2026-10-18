import { useEffect, useState } from "react";
import {
  App,
  Alert,
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
} from "antd";
import { UploadOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthProvider";
import { api, assetURL, upload } from "../lib/api";
import { useAction, useMedia } from "../lib/hooks";
import { required, phoneRules, passwordRules, roleLabels } from "./common";
export function PasswordModal({ open, onClose }) {
  const [form] = Form.useForm();
  const action = useAction();
  const auth = useAuth();
  return (
    <Modal
      open={open}
      title="Đổi mật khẩu"
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        title="Các phiên đăng nhập khác sẽ được đăng xuất sau khi đổi mật khẩu."
        className="section-gap"
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          action.run(
            () => api.put("/auth/change-password", values),
            async () => {
              await auth.refresh();
              form.resetFields();
              onClose();
            },
            "Đã đổi mật khẩu.",
          )
        }
      >
        <Form.Item
          name="currentPassword"
          label="Mật khẩu hiện tại"
          rules={required}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={passwordRules}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmation"
          label="Nhập lại mật khẩu mới"
          dependencies={["newPassword"]}
          rules={[
            ...required,
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                v === getFieldValue("newPassword")
                  ? Promise.resolve()
                  : Promise.reject(new Error("Mật khẩu nhập lại chưa khớp.")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button
          block
          type="primary"
          htmlType="submit"
          icon={<LockOutlined aria-hidden="true" />}
          loading={action.busy}
        >
          Cập nhật mật khẩu
        </Button>
      </Form>
    </Modal>
  );
}
export function ProfileDrawer({ open, onClose, onPassword, onLogout }) {
  const auth = useAuth(),
    action = useAction(),
    small = useMedia("(max-width: 575px)");
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open && auth.user) form.setFieldsValue(auth.user);
  }, [open, auth.user, form]);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Hồ sơ cá nhân"
      size={small ? "100%" : 520}
      destroyOnHidden
    >
      <Space className="section-gap" wrap>
        <Button onClick={onPassword}>Đổi mật khẩu</Button>
        <Button danger onClick={onLogout}>
          Đăng xuất
        </Button>
      </Space>
      <div className="profile-summary">
        <Avatar
          size={80}
          src={assetURL(auth.user?.avatar)}
          icon={<UserOutlined aria-hidden="true" />}
        />
        <div>
          <Typography.Title level={4}>{auth.user?.full_name}</Typography.Title>
          <Typography.Text type="secondary">{auth.user?.email}</Typography.Text>
        </div>
      </div>
      <Upload
        accept="image/jpeg,image/png"
        showUploadList={false}
        beforeUpload={(file) => {
          if (
            !["image/jpeg", "image/png"].includes(file.type) ||
            file.size > 2 * 1024 * 1024
          ) {
            message.error("Chọn ảnh JPG/PNG không quá 2 MB.");
            return Upload.LIST_IGNORE;
          }
          return true;
        }}
        customRequest={async ({ file, onSuccess, onError }) => {
          setUploading(true);
          try {
            const data = await upload("/users/profile/avatar", file, "avatar");
            await auth.refresh();
            onSuccess(data);
            message.success("Đã cập nhật ảnh đại diện.");
          } catch (e) {
            onError(e);
            message.error(e.response?.data?.message || "Không thể tải ảnh.");
          } finally {
            setUploading(false);
          }
        }}
      >
        <Button
          loading={uploading}
          icon={<UploadOutlined aria-hidden="true" />}
        >
          Đổi ảnh đại diện
        </Button>
      </Upload>
      <Typography.Paragraph type="secondary" className="field-hint">
        JPG/PNG, tối đa 2 MB. Ảnh được cắt vuông và tạo bản thu nhỏ.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) =>
          action.run(
            () =>
              api.put("/users/profile", {
                full_name: v.full_name,
                phone: v.phone,
                email_signature: v.email_signature,
              }),
            () => auth.refresh(),
          )
        }
      >
        <Form.Item name="full_name" label="Họ và tên" rules={required}>
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item name="phone" label="Số điện thoại" rules={phoneRules}>
          <Input autoComplete="tel" />
        </Form.Item>
        <Form.Item label="Email">
          <Input value={auth.user?.email} disabled />
        </Form.Item>
        <Form.Item label="Vai trò được cấp">
          <Space wrap>
            {auth.user?.roles.map((r) => (
              <Tag key={r} color="blue">
                {roleLabels[r]}
              </Tag>
            ))}
          </Space>
        </Form.Item>
        <Form.Item label="Nhóm kinh doanh">
          <Input
            value={auth.user?.group?.name || "Chưa được gán nhóm"}
            disabled
          />
        </Form.Item>
        <Form.Item name="email_signature" label="Chữ ký email">
          <Input.TextArea rows={4} maxLength={5000} showCount />
        </Form.Item>
        <Button type="primary" block loading={action.busy} htmlType="submit">
          Lưu hồ sơ
        </Button>
      </Form>
    </Drawer>
  );
}
