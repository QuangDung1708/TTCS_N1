import { App, Avatar, Button, Modal, Upload } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "./auth/AuthProvider";
import { assetURL, upload } from "./lib/api";
import { useAction } from "./lib/hooks";
export default function AvatarUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  currentAvatar,
}) {
  const auth = useAuth(),
    a = useAction(),
    { message } = App.useApp();
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Cập nhật ảnh đại diện"
      footer={null}
    >
      <Avatar
        size={96}
        src={assetURL(currentAvatar || auth.user.avatar)}
        icon={<UserOutlined aria-hidden="true" />}
      />
      <p>
        Chọn ảnh JPG/PNG tối đa 2 MB. Ảnh được cắt vuông và tạo bản thu nhỏ.
      </p>
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
          const result = await a.run(
            () => upload("/users/profile/avatar", file, "avatar"),
            async (data) => {
              await auth.refresh();
              onUploadSuccess?.(data);
              onSuccess(data);
              onClose();
            },
          );
          if (!result) onError(new Error("Chưa tải được ảnh."));
        }}
      >
        <Button
          type="primary"
          icon={<UploadOutlined aria-hidden="true" />}
          loading={a.busy}
        >
          Chọn ảnh đại diện
        </Button>
      </Upload>
    </Modal>
  );
}
