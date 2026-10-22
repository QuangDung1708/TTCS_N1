function normalized(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function similar(a, b) {
  a = normalized(a);
  b = normalized(b);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length) >= 0.85;
}
function website(value) {
  if (!value) return null;
  try {
    return new URL(
      /^https?:\/\//i.test(value) ? value : "https://" + value,
    ).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return normalized(value);
  }
}
module.exports = { normalized, similar, website };
module.exports.normalizedPhone = (value) =>
  String(value || "")
    .replace(/[ .()+-]/g, "")
    .replace(/^84(?=\d{9}$)/, "0");
