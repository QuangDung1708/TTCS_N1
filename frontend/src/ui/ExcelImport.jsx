import Select from "./LinkedSelect";
import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Modal,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { api, download, errorText, upload } from "../lib/api";
import { useAction, useMedia } from "../lib/hooks";
export default function ExcelImport({ entity, open, onClose, onImported }) {
  const [preview, setPreview] = useState(null),
    [report, setReport] = useState(null),
    [changes, setChanges] = useState({});
  const action = useAction(),
    small = useMedia("(max-width:575px)"),
    { message } = App.useApp();
  const base = `/${entity}/import`;
  const reset = () => {
    setPreview(null);
    setReport(null);
    setChanges({});
    onClose();
  };
  const currentRows = () =>
    preview.data.map((r) => ({
      ...r.data,
      ...(changes[r.row] ? { duplicate_action: changes[r.row] } : {}),
    }));
  const columns = [
    { title: "Dòng", dataIndex: "row", width: 65 },
    {
      title: "Nội dung",
      render: (_, r) => (
        <div className="cell-stack">
          <b>{r.data?.company_name || r.data?.full_name || "—"}</b>
          <Typography.Text type="secondary">
            {r.data?.email || r.data?.tax_code || r.data?.phone || ""}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Kiểm tra",
      render: (_, r) =>
        r.valid ? (
          <Tag color="green">Hợp lệ</Tag>
        ) : (
          <>
            <Tag color={r.duplicate ? "orange" : "red"}>
              {r.duplicate ? "Trùng dữ liệu" : "Cần kiểm tra"}
            </Tag>
            <Typography.Text type="danger">{r.error}</Typography.Text>
          </>
        ),
    },
    {
      title: "Xử lý trùng",
      render: (_, r) =>
        r.duplicate && entity === "customers" ? (
          <Select
            aria-label={`Xử lý dòng ${r.row}`}
            value={changes[r.row] || r.data?.duplicate_action || "skip"}
            onChange={(v) => setChanges((c) => ({ ...c, [r.row]: v }))}
            options={[
              { value: "skip", label: "Bỏ qua" },
              { value: "update", label: "Cập nhật" },
            ]}
            style={{ width: 120 }}
          />
        ) : (
          "—"
        ),
    },
  ];
  return (
    <Modal
      open={open}
      onCancel={reset}
      title="Nhập dữ liệu từ Excel"
      width={small ? "calc(100vw - 24px)" : 980}
      footer={null}
      destroyOnHidden
      mask={{ closable: !action.busy }}
    >
      <Steps
        size="small"
        current={report ? 2 : preview ? 1 : 0}
        items={[
          { title: "Chọn tệp" },
          { title: "Kiểm tra dữ liệu" },
          { title: "Kết quả" },
        ]}
        className="section-gap"
      />
      {report ? (
        <>
          <Alert
            showIcon
            type={report.skipped ? "warning" : "success"}
            title={`Đã nhập ${report.imported} dòng · Bỏ qua ${report.skipped} dòng`}
            className="section-gap"
          />
          <Table
            size="small"
            rowKey="row"
            dataSource={report.data}
            columns={[
              { title: "Dòng", dataIndex: "row" },
              {
                title: "Kết quả",
                render: (_, r) =>
                  r.success ? (
                    <Tag color="green">Đã lưu</Tag>
                  ) : (
                    <Typography.Text type="danger">{r.message}</Typography.Text>
                  ),
              },
            ]}
            pagination={{ pageSize: 8 }}
          />
          <Button block type="primary" onClick={reset}>
            Hoàn tất
          </Button>
        </>
      ) : (
        <>
          <div className="filter-bar">
            <Button
              icon={<DownloadOutlined aria-hidden="true" />}
              onClick={() =>
                download(base + "/template", {}, entity + "-mau.xlsx").catch(
                  (e) => message.error(errorText(e)),
                )
              }
            >
              Tải mẫu Excel
            </Button>
            <Upload
              accept=".xlsx,.xls"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                if (file.size > 5 * 1024 * 1024) {
                  message.error("Tệp không quá 5 MB.");
                  return Upload.LIST_IGNORE;
                }
                action.run(
                  () => upload(base + "/preview", file),
                  (data) => {
                    setPreview(data);
                    setReport(null);
                    setChanges({});
                  },
                  null,
                );
                return false;
              }}
            >
              <Button
                loading={action.busy}
                icon={<UploadOutlined aria-hidden="true" />}
              >
                Chọn tệp Excel
              </Button>
            </Upload>
          </div>
          <Typography.Paragraph type="secondary">
            Tối đa 1.000 dòng. Kiểm tra dữ liệu trước khi nhập; dòng lỗi sẽ được
            báo riêng.
          </Typography.Paragraph>
          {preview && (
            <>
              <div className="import-summary">
                <Tag color="green">{preview.valid} dòng hợp lệ</Tag>
                <Tag color="orange">{preview.invalid} dòng cần kiểm tra</Tag>
              </div>
              <Table
                size="small"
                rowKey="row"
                dataSource={preview.data}
                columns={columns}
                scroll={{ x: 650 }}
                pagination={{ pageSize: 8 }}
              />
              <Space wrap className="section-gap">
                <Button
                  disabled={action.busy}
                  onClick={() =>
                    action.run(
                      async () =>
                        (
                          await api.post(base + "/preview", {
                            rows: currentRows(),
                          })
                        ).data,
                      (data) => {
                        setPreview(data);
                        setChanges({});
                      },
                      null,
                    )
                  }
                >
                  Kiểm tra lại lựa chọn
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined aria-hidden="true" />}
                  loading={action.busy}
                  onClick={() =>
                    action.run(
                      async () =>
                        (
                          await api.post(base + "/execute", {
                            rows: currentRows(),
                          })
                        ).data,
                      async (data) => {
                        setReport(data);
                        await onImported?.();
                      },
                      null,
                    )
                  }
                >
                  Nhập dữ liệu vào hệ thống
                </Button>
              </Space>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
