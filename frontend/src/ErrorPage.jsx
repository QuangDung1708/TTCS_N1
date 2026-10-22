import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
export default function ErrorPage({
  code = 404,
  title,
  message,
  onBackToDashboard,
}) {
  const nav = useNavigate();
  return (
    <Result
      status={String(code)}
      title={
        title ||
        (code === 403 ? "Bạn chưa có quyền truy cập" : "Không tìm thấy trang")
      }
      subTitle={message}
      extra={
        <Button type="primary" onClick={onBackToDashboard || (() => nav("/"))}>
          Về tổng quan
        </Button>
      }
    />
  );
}
