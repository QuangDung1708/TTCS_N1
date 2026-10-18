import { Modal } from "./Motion";
import { useEffect, useState } from "react";
import { Alert, Button, Form } from "antd";
import { useAuth } from "../auth/AuthProvider";
import { useMedia } from "../lib/hooks";
import { readJSON } from "../lib/api";
export default function EntityModal({
  open,
  onClose,
  title,
  record,
  defaults = {},
  entity = "record",
  onSave,
  busy,
  children,
  width = 680,
  draft = true,
  form: provided,
}) {
  const [own] = Form.useForm(),
    form = provided || own,
    auth = useAuth(),
    [restored, setRestored] = useState(false),
    [closing, setClosing] = useState(false),
    small = useMedia("(max-width:575px)");
  const key = `crm:draft:${auth.user.id}:${entity}:${record?.id || "new"}`;
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("crm:form-open"));
    setClosing(false);
    form.resetFields();
    const cached = draft ? readJSON(sessionStorage.getItem(key), null) : null;
    form.setFieldsValue({ ...defaults, ...record, ...cached });
    setRestored(!!cached);
  }, [open, record?.id, key]);
  return (
    <Modal
      open={open && !closing}
      afterOpenChange={(visible) => {
        if (!visible && closing) onClose();
      }}
      title={title}
      onCancel={onClose}
      footer={null}
      width={small ? "calc(100vw - 24px)" : width}
      destroyOnHidden
      mask={{ closable: !busy }}
      closable={!busy}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(_, values) => {
          if (draft) sessionStorage.setItem(key, JSON.stringify(values));
        }}
        onFinish={async (values) => {
          const ok = await onSave(values);
          if (ok) {
            sessionStorage.removeItem(key);
            setClosing(true);
          }
        }}
      >
        {restored && (
          <Alert
            type="info"
            showIcon
            title="Đã khôi phục bản nháp chưa lưu của bạn."
            className="section-gap"
          />
        )}
        {typeof children === "function" ? children(form) : children}
        <div className="form-actions">
          <Button disabled={busy} onClick={() => setClosing(true)}>
            Hủy
          </Button>
          <Button type="primary" loading={busy} htmlType="submit">
            Lưu thay đổi
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
