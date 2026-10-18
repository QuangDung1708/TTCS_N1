import Select from "./LinkedSelect";
import { useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Typography } from "antd";
import {
  DeleteOutlined,
  FolderOpenOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { api, readJSON } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import { required } from "./common";
export default function SavedFilters({ entity, criteria, onApply, canWrite }) {
  const r = useResource("/" + entity + "/saved-filters"),
    a = useAction(),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState(null),
    [form] = Form.useForm();
  return (
    <>
      <div className="filters-saved">
        <Typography.Text type="secondary">
          <FolderOpenOutlined aria-hidden="true" /> Bộ lọc của tôi
        </Typography.Text>
        <Select
          aria-label="Bộ lọc đã lưu"
          placeholder="Chọn bộ lọc đã lưu"
          value={selected}
          allowClear
          onChange={(v) => {
            setSelected(v);
            const row = r.rows.find((f) => f.id === v);
            if (row) onApply(readJSON(row.criteria));
          }}
          options={r.rows.map((f) => ({ value: f.id, label: f.filter_name }))}
          loading={r.loading}
        />
        {canWrite && (
          <>
            <Button
              icon={<SaveOutlined aria-hidden="true" />}
              onClick={() => setOpen(true)}
            >
              Lưu bộ lọc hiện tại
            </Button>
            {selected && (
              <Popconfirm
                title="Xóa bộ lọc này?"
                onConfirm={() =>
                  a.run(
                    () => api.delete(`/${entity}/saved-filters/${selected}`),
                    () => {
                      setSelected(null);
                      r.reload();
                    },
                  )
                }
              >
                <Button
                  aria-label="Xóa bộ lọc"
                  icon={<DeleteOutlined aria-hidden="true" />}
                />
              </Popconfirm>
            )}
          </>
        )}
      </div>
      <Modal
        title="Lưu bộ lọc"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            a.run(
              () =>
                api.post("/" + entity + "/saved-filters", {
                  filter_name: v.name,
                  criteria,
                }),
              () => {
                setOpen(false);
                form.resetFields();
                r.reload();
              },
            )
          }
        >
          <Form.Item name="name" label="Tên bộ lọc" rules={required}>
            <Input maxLength={255} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={a.busy} block>
            Lưu bộ lọc
          </Button>
        </Form>
      </Modal>
    </>
  );
}
