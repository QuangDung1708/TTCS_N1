import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Empty, Input, Spin } from "antd";
import {
  CheckOutlined,
  CloseCircleFilled,
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { normalizeSearch } from "../lib/search";

// A read-only button opens the list. Searching happens inside the popup,
// never by turning the selected value into an editable form field.
export default function LinkedSelect(props) {
  const {
    options = [],
    value,
    defaultValue,
    onChange,
    onSelect,
    onDeselect,
    onClear,
    loading,
    disabled,
    allowClear,
    mode,
    placeholder = "Chọn từ danh sách",
    showSearch = true,
    filterOption,
    onSearch,
    onBlur,
    onFocus,
    onKeyDown,
    onOpenChange,
    open: controlledOpen,
    notFoundContent,
    className = "",
    style,
    id,
    ref: forwardedRef,
    "aria-label": ariaLabel,
    "aria-describedby": describedBy,
    "aria-required": required,
    "aria-invalid": invalid,
  } = props;
  const uid = useId();
  const listId = uid + "-list";
  const trigger = useRef(null),
    popup = useRef(null);
  const [localOpen, setLocalOpen] = useState(false);
  const [localValue, setLocalValue] = useState(defaultValue);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({});
  const open = !disabled && (controlledOpen ?? localOpen);
  const selected = Object.hasOwn(props, "value") ? value : localValue;
  const multiple = mode === "multiple" || mode === "tags";
  const values = multiple ? selected || [] : selected == null ? [] : [selected];
  const visible = options.filter(
    (option) =>
      !search ||
      filterOption === false ||
      (typeof filterOption === "function"
        ? filterOption(search, option)
        : normalizeSearch(
            option.searchText ?? option.label ?? option.value,
          ).includes(normalizeSearch(search))),
  );
  const changeOpen = (next) => {
    if (disabled) return;
    setLocalOpen(next);
    onOpenChange?.(next);
    if (next) {
      setSearch("");
      setActive(-1);
      onSearch?.("");
    }
  };
  const choose = (option) => {
    if (option.disabled) return;
    const exists = values.includes(option.value);
    const next = multiple
      ? exists
        ? values.filter((v) => v !== option.value)
        : [...values, option.value]
      : option.value;
    setLocalValue(next);
    onChange?.(
      next,
      multiple ? options.filter((o) => next.includes(o.value)) : option,
    );
    if (multiple && exists) onDeselect?.(option.value, option);
    else onSelect?.(option.value, option);
    if (!multiple) {
      changeOpen(false);
      trigger.current?.focus();
    }
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (!r) return;
      const height = window.visualViewport?.height || window.innerHeight;
      const width = window.visualViewport?.width || window.innerWidth;
      const below = height - r.bottom - 12,
        above = r.top - 12;
      const up = below < 230 && above > below;
      const panelWidth = Math.min(Math.max(r.width, 260), width - 24);
      setPosition({
        position: "fixed",
        width: panelWidth,
        left: Math.max(12, Math.min(r.left, width - panelWidth - 12)),
        top: up ? undefined : r.bottom + 6,
        bottom: up ? height - r.top + 6 : undefined,
        maxHeight: Math.max(100, Math.min(380, up ? above : below)),
      });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (
        !trigger.current?.parentElement.contains(event.target) &&
        !popup.current?.contains(event.target)
      ) {
        setLocalOpen(false);
        onOpenChange?.(false);
      }
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLocalOpen(false);
        onOpenChange?.(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open, onOpenChange]);
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${listId}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);
  const keyboard = (event) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        changeOpen(true);
        return;
      }
      const step = event.key === "ArrowUp" ? -1 : 1;
      let next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? visible.length - 1
            : active < 0
              ? step > 0
                ? 0
                : visible.length - 1
              : active + step;
      while (next >= 0 && next < visible.length && visible[next].disabled)
        next += step;
      setActive(Math.max(-1, Math.min(visible.length - 1, next)));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (visible[active]) choose(visible[active]);
    } else if (event.key === "Tab") changeOpen(false);
    onKeyDown?.(event);
  };
  const labels = values.map(
    (v) => options.find((o) => o.value === v)?.label ?? String(v),
  );
  return (
    <span
      className={`linked-select ${className} ${invalid ? "linked-select-error" : ""}`}
      style={style}
    >
      <button
        type="button"
        id={id}
        ref={(node) => {
          trigger.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className="linked-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-required={required}
        aria-invalid={invalid}
        disabled={disabled}
        onClick={() => changeOpen(!open)}
        onKeyDown={keyboard}
        onBlur={onBlur}
        onFocus={onFocus}
      >
        <span
          className={
            labels.length ? "linked-select-value" : "linked-select-placeholder"
          }
        >
          {labels.length ? labels.join(", ") : placeholder}
        </span>
        {loading ? (
          <Spin size="small" />
        ) : (
          <DownOutlined className="linked-select-arrow" aria-hidden="true" />
        )}
      </button>
      {allowClear && values.length > 0 && !disabled && (
        <button
          type="button"
          className="linked-select-clear"
          aria-label="Xóa lựa chọn"
          onClick={() => {
            const next = multiple ? [] : undefined;
            setLocalValue(next);
            onChange?.(next, multiple ? [] : undefined);
            onClear?.();
          }}
        >
          <CloseCircleFilled />
        </button>
      )}
      {open &&
        createPortal(
          <div
            className="linked-select-popup"
            ref={popup}
            style={position}
            onKeyDown={keyboard}
          >
            {showSearch !== false && (
              <div className="linked-select-search">
                <Input
                  aria-label="Tìm trong danh sách"
                  placeholder="Nhập tên để tìm…"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setActive(-1);
                    onSearch?.(e.target.value);
                  }}
                />
              </div>
            )}
            <div className="linked-select-summary" role="status">
              {loading
                ? "Đang tải dữ liệu…"
                : `${visible.length} lựa chọn${search ? " phù hợp" : ""}`}
            </div>
            <div
              role="listbox"
              id={listId}
              aria-label={ariaLabel || "Danh sách lựa chọn"}
              aria-multiselectable={multiple || undefined}
              className="linked-select-options"
              tabIndex={-1}
            >
              {visible.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={values.includes(option.value)}
                  disabled={option.disabled}
                  className={`linked-select-option ${active === index ? "is-active" : ""}`}
                  style={
                    option.depth
                      ? { paddingLeft: 12 + option.depth * 16 }
                      : undefined
                  }
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(index)}
                >
                  <span>
                    {option.depth ? "↳ " : ""}
                    {option.label}
                  </span>
                  {values.includes(option.value) && (
                    <CheckOutlined aria-hidden="true" />
                  )}
                </button>
              ))}
              {!visible.length &&
                (loading ? (
                  <div className="linked-select-empty">
                    <Spin />
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      search
                        ? "Không tìm thấy tên phù hợp."
                        : notFoundContent ||
                          "DB chưa có dữ liệu cho mục này. Hãy nạp dữ liệu hoặc thêm trong danh mục tương ứng."
                    }
                  />
                ))}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
