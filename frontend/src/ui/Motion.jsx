import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Modal as AntModal,
  Drawer as AntDrawer,
  Tabs as AntTabs,
  Segmented as AntSegmented,
} from "antd";

export function animateChange(change) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && document.startViewTransition) {
    // Snapshot both states so tabs whose content lives outside Tabs also animate.
    document
      .startViewTransition(() => flushSync(change))
      .finished.catch(() => {});
  } else change();
}
function useClosing(open, done) {
  const [closing, setClosing] = useState(false);
  const pending = useRef(null);
  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);
  return {
    open: !!open && !closing,
    close: (...args) => {
      pending.current = args;
      setClosing(true);
    },
    changed: (visible) => {
      if (!visible && pending.current) {
        const args = pending.current;
        pending.current = null;
        done?.(...args);
      }
    },
  };
}
export function Modal({ open, onCancel, afterOpenChange, ...props }) {
  const motion = useClosing(open, onCancel);
  return (
    <AntModal
      {...props}
      open={motion.open}
      onCancel={motion.close}
      afterOpenChange={(visible) => {
        motion.changed(visible);
        afterOpenChange?.(visible);
      }}
    />
  );
}
export function Drawer({ open, onClose, afterOpenChange, ...props }) {
  const motion = useClosing(open, onClose);
  return (
    <AntDrawer
      {...props}
      open={motion.open}
      onClose={motion.close}
      afterOpenChange={(visible) => {
        motion.changed(visible);
        afterOpenChange?.(visible);
      }}
    />
  );
}
export function Tabs({ onChange, animated, ...props }) {
  return (
    <AntTabs
      {...props}
      animated={animated ?? { inkBar: true, tabPane: true }}
      onChange={(key) => animateChange(() => onChange?.(key))}
    />
  );
}
export function Segmented({ onChange, ...props }) {
  return (
    <AntSegmented
      {...props}
      onChange={(key) => animateChange(() => onChange?.(key))}
    />
  );
}
