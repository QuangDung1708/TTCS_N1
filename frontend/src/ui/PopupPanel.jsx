import { useEffect, useRef } from "react";
export default function PopupPanel({
  open,
  onClose,
  children,
  label,
  className = "",
  trigger,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    const key = (e) => {
      if (e.key === "Escape") {
        onClose();
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open, onClose]);
  return (
    <div className="header-popup-anchor" ref={ref}>
      {trigger}
      {open && (
        <div
          className={`header-popup ${className}`}
          role="dialog"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}
