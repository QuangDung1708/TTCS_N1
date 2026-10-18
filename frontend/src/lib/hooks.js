import { useCallback, useEffect, useId, useRef, useState } from "react";
import { App } from "antd";
import { api, errorText } from "./api";
export function useResource(path, params = {}) {
  const [version, setVersion] = useState(0),
    [state, setState] = useState({ data: null, loading: !!path, error: null });
  const queryRef = useRef(null);
  const key = JSON.stringify(params);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const query = path + key,
      same = queryRef.current === query;
    queryRef.current = query;
    setState((s) => ({
      data: same ? s.data : null,
      loading: true,
      error: null,
    }));
    api
      .get(path, { params: JSON.parse(key), signal: controller.signal })
      .then((r) => setState({ data: r.data, loading: false, error: null }))
      .catch((e) => {
        if (e.code !== "ERR_CANCELED")
          setState((s) => ({ ...s, loading: false, error: e }));
      });
    return () => controller.abort();
  }, [path, key, version]);
  useEffect(() => {
    const refreshLookups = () => {
      if (
        [
          "/categories",
          "/campaigns/options",
          "/customers",
          "/customers/users-list",
          "/pipeline-stages",
          "/deals",
          "/custom-fields",
          "/organization/tree",
          "/organization/regions",
          "/roles",
          "/groups",
        ].includes(path)
      )
        reload();
    };
    window.addEventListener("crm:form-open", refreshLookups);
    window.addEventListener("crm:data-changed", reload);
    window.addEventListener("focus", refreshLookups);
    return () => {
      window.removeEventListener("crm:form-open", refreshLookups);
      window.removeEventListener("crm:data-changed", reload);
      window.removeEventListener("focus", refreshLookups);
    };
  }, [reload, path]);
  return {
    ...state,
    reload,
    rows: Array.isArray(state.data) ? state.data : state.data?.data || [],
  };
}
export function useAction() {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const key = useId();
  const run = async (fn, onSuccess, success = "Đã lưu thay đổi.") => {
    setBusy(true);
    if (success)
      message.open({
        key,
        type: "loading",
        content: "Đang xử lý…",
        duration: 0,
      });
    try {
      const result = await fn();
      if (success)
        message.open({ key, type: "success", content: success, duration: 2 });
      if (result?.data?.warning) message.warning(result.data.warning, 6);
      await onSuccess?.(result);
      return result;
    } catch (e) {
      message.open({ key, type: "error", content: errorText(e), duration: 4 });
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
export function useMedia(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
