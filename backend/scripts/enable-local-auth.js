require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
async function main() {
  if (process.env.NODE_ENV === "production")
    throw Error("Không bật tài khoản kiểm thử trong production.");
  const file = path.resolve(__dirname, "../.env");
  let content = await fs.readFile(file, "utf8");
  for (const key of ["ALLOW_SELF_REGISTRATION", "ENABLE_TEST_ACCOUNTS"]) {
    const pattern = new RegExp("^" + key + "=.*$", "m");
    content = pattern.test(content)
      ? content.replace(pattern, `${key}=true`)
      : content.trimEnd() + `\n${key}=true\n`;
  }
  await fs.writeFile(file, content, { mode: 0o600 });
  console.log(
    "Đã bật đăng ký email và tài khoản kiểm thử cục bộ. Khởi động lại backend.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
