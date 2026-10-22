const escape = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
function mailHTML(subject, body) {
  const content = String(body)
    .split(/\n/)
    .map((line) => {
      const parts = line.split(/(https?:\/\/[^\s<>]+)/g);
      return `<p>${parts.map((part) => (/^https?:\/\//.test(part) ? `<a href="${escape(part)}">${escape(part)}</a>` : escape(part))).join("")}</p>`;
    })
    .join("");
  return `<html lang="vi"><body style="font-family:Arial,sans-serif;color:#172b4d"><div style="max-width:600px;margin:auto;padding:24px;border:1px solid #dce5ef;border-radius:12px"><h2 style="color:#1677ff">Enterprise CRM</h2><h3>${escape(subject)}</h3>${content}<p>Trân trọng,<br>Đội ngũ Enterprise CRM</p></div></body></html>`;
}
module.exports = { mailHTML };
