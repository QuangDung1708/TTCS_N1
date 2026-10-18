import { useState } from "react";
import { Empty, Select, Spin } from "antd";
import { normalizeSearch as text } from "../lib/search";
export default function LinkedSelect({
  loading,
  notFoundContent,
  showSearch = true,
  filterOption,
  styles,
  onSelect,
  onOpenChange,
  mode,
  ...props
}) {
  const [open, setOpen] = useState(false);
  return (
    <Select
      {...props}
      showSearch={showSearch}
      mode={mode}
      open={props.open ?? open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
      onSelect={(value, option) => {
        if (!mode) setOpen(false);
        onSelect?.(value, option);
      }}
      optionFilterProp="label"
      filterOption={
        filterOption ??
        ((input, option) =>
          text(option?.label ?? option?.value).includes(text(input)))
      }
      virtual={false}
      loading={loading}
      getPopupContainer={() => document.body}
      styles={{
        ...styles,
        popup: {
          ...styles?.popup,
          root: { ...styles?.popup?.root, zIndex: 2100 },
        },
      }}
      notFoundContent={
        loading ? (
          <Spin size="small" tip="Đang tải danh sách…" />
        ) : (
          (notFoundContent ?? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có mục phù hợp. Kiểm tra tên tìm kiếm hoặc thêm trong Danh mục bán hàng."
            />
          ))
        )
      }
    />
  );
}
