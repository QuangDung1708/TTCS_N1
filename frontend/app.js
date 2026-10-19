const $ = (id) => document.getElementById(id);
let current = null;
let working = false;
function notice(message, type = "") {
  $("notice").textContent = message;
  $("notice").className = type;
  $("notice").hidden = !message;
}
function busy(value, target) {
  working = value;
  ["choose", "execute", "start-over", "close"].forEach((id) => {
    $(id).disabled = value;
  });
  if (current?.result || !current?.valid || Date.now() >= current.expiresAt)
    $("execute").disabled = true;
  document
    .querySelectorAll(".busy")
    .forEach((el) => el.classList.remove("busy"));
  if (value && target) $(target).classList.add("busy");
}
function step(index) {
  document.querySelectorAll("#steps li").forEach((el, i) => {
    el.classList.toggle("done", i < index);
    if (i === index) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
    el.querySelector("span").textContent = i < index ? "✓" : String(i + 1);
  });
}
function tag(text, type) {
  const el = document.createElement("span");
  el.textContent = text;
  el.className = `tag ${type}`;
  return el;
}
function renderRows(rows) {
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = Array.from({ length: 5 }, () => document.createElement("td"));
    cells[0].textContent = row.row;
    cells[1].append(document.createTextNode(row.name || "—"));
    const email = document.createElement("span");
    email.className = "secondary";
    email.textContent = row.email || "—";
    cells[1].append(email);
    cells[2].append(document.createTextNode(row.role || "—"));
    const group = document.createElement("span");
    group.className = "secondary";
    group.textContent = row.group || "—";
    cells[2].append(group);
    cells[3].textContent = row.phone || "—";
    const success = row.status ? row.status === "IMPORTED" : row.valid;
    cells[4].append(
      tag(
        row.status
          ? success
            ? "Đã nhập"
            : "Bỏ qua"
          : success
            ? "Hợp lệ"
            : "Không hợp lệ",
        success ? "good" : "bad",
      ),
    );
    if (row.errors.length) {
      const list = document.createElement("ul");
      list.className = "errors";
      row.errors.forEach((text) => {
        const li = document.createElement("li");
        li.textContent = text;
        list.append(li);
      });
      cells[4].append(list);
    }
    tr.append(...cells);
    fragment.append(tr);
  });
  $("rows").replaceChildren(fragment);
}
async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Không thể xử lý yêu cầu.");
  return data;
}
function resetView() {
  current = null;
  $("file").value = "";
  $("filename").textContent = "";
  $("empty").hidden = false;
  $("data").hidden = true;
  ["execute", "start-over", "download-report"].forEach((id) => {
    $(id).hidden = true;
  });
  $("rows").replaceChildren();
  $("summary").replaceChildren();
  notice("");
  step(0);
  busy(false);
}
$("open-import").addEventListener("click", () =>
  $("import-dialog").showModal(),
);
$("close").addEventListener("click", () => $("import-dialog").close());
$("import-dialog").addEventListener("cancel", (event) => {
  if (working) event.preventDefault();
});
$("choose").addEventListener("click", () => {
  $("file").value = "";
  $("file").click();
});
$("start-over").addEventListener("click", resetView);
$("file").addEventListener("change", async () => {
  const file = $("file").files[0];
  if (!file) return;
  // Invalidate the old preview before validating a newly selected file.
  resetView();
  $("filename").textContent = file.name;
  if (!/\.xlsx$/i.test(file.name))
    return notice("Chỉ chấp nhận tệp .xlsx.", "error");
  if (file.size > 2 * 1024 * 1024)
    return notice("Tệp vượt quá giới hạn 2 MB.", "error");
  busy(true, "choose");
  notice("Đang kiểm tra dữ liệu…");
  try {
    const body = new FormData();
    body.append("file", file);
    current = await request("/api/import/users/preview", {
      method: "POST",
      body,
    });
    $("empty").hidden = true;
    $("data").hidden = false;
    $("preview-note").textContent =
      "Đây là bản xem trước, có hiệu lực 15 phút. Tài khoản chỉ được tạo sau khi bạn xác nhận nhập.";
    $("summary").replaceChildren(
      tag(`${current.valid} dòng hợp lệ`, "good"),
      tag(`${current.invalid} dòng lỗi`, "bad"),
    );
    renderRows(current.rows);
    step(1);
    ["execute", "start-over", "download-report"].forEach((id) => {
      $(id).hidden = false;
    });
    $("execute").textContent = `Nhập ${current.valid} dòng hợp lệ`;
    $("download-report").href = `/api/import/users/${current.previewId}/report`;
    notice(
      current.valid
        ? "Kiểm tra dữ liệu trước khi xác nhận. Dòng lỗi sẽ được bỏ qua."
        : "Không có dòng hợp lệ. Hãy sửa tệp rồi chọn lại.",
      current.valid ? "" : "error",
    );
  } catch (error) {
    notice(error.message, "error");
  } finally {
    busy(false);
  }
});
$("execute").addEventListener("click", async () => {
  if (!current || working || current.result) return;
  busy(true, "execute");
  notice("Đang nhập dữ liệu…");
  try {
    const result = await request("/api/import/users/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previewId: current.previewId }),
    });
    current.result = result;
    renderRows(result.rows);
    step(2);
    $("summary").replaceChildren(
      tag(`${result.imported} dòng đã nhập`, "good"),
      tag(`${result.skipped} dòng bỏ qua`, "bad"),
    );
    $("preview-note").textContent =
      `Tổng ${result.total} dòng. Dữ liệu đã được lưu; có thể tải báo cáo chi tiết.`;
    $("execute").hidden = true;
    notice(
      `Hoàn tất: đã tạo ${result.imported} tài khoản, bỏ qua ${result.skipped} dòng lỗi.`,
      "success",
    );
  } catch (error) {
    notice(error.message, "error");
  } finally {
    busy(false);
  }
});
setInterval(() => {
  if (
    current &&
    !current.result &&
    !working &&
    Date.now() >= current.expiresAt
  ) {
    $("execute").disabled = true;
    notice("Bản xem trước đã hết hạn. Vui lòng chọn lại tệp.", "error");
  }
}, 1000);
resetView();
