import { useEffect, useRef, useState } from "react";
export default function PopupPanel({
  open,
  onClose,
  children,
  label,
  className = "",
  trigger,
}) {
  const ref = useRef(null);
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(
      () => setPresent(false),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180,
    );
    return () => clearTimeout(timer);
  }, [open]);
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
      {(open || present) && (
        <div
          className={`header-popup ${className} ${open ? "" : "header-popup-exit"}`}
          aria-hidden={!open}
          inert={!open}
          role="dialog"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}
