import { useState } from "react";
import { Select } from "antd";
export default function LinkedSelect({
  onChange,
  onOpenChange,
  disabled,
  mode,
  ...props
}) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      {...props}
      disabled={disabled}
      mode={mode}
      open={!disabled && open}
      getPopupContainer={() => document.body}
      onOpenChange={(v) => {
        setOpen(v);
        onOpenChange?.(v);
      }}
      onClick={(event) => {
        if (
          !disabled &&
          !event.target.closest(".ant-select-dropdown") &&
          !event.target.closest(".ant-select-clear")
        )
          setOpen(true);
      }}
      onChange={(...args) => {
        if (!mode) setOpen(false);
        onChange?.(...args);
      }}
      notFoundContent={
        props.loading
          ? "Đang tải dữ liệu…"
          : "Chưa có dữ liệu phù hợp. Kiểm tra danh mục và quyền truy cập."
      }
    />
  );
}
