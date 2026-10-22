const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { db } = require("./store");
const { bcrypt } = require("./auth");
async function testAccounts(req) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_TEST_ACCOUNTS === "false"
  )
    return [];
  if (
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
  )
    return [];
  const [[database]] = await db.query("SELECT DATABASE() name");
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      `${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}:${database.name}`,
    )
    .digest("hex")
    .slice(0, 12);
  let state;
  try {
    state = JSON.parse(
      await fs.readFile(
        path.join(
          __dirname,
          `../../.local-test-data/examples-${fingerprint}.json`,
        ),
        "utf8",
      ),
    );
  } catch {
    return [];
  }
  if (!state.loginPickerEnabled) return [];
  const output = [];
  for (const key of [
    "demo-admin",
    "director",
    "leader-a",
    "sales-a",
    "marketing",
    "care",
    "accountant",
  ]) {
    const value = state.accounts?.[key];
    if (!value || !value.email.endsWith(".crm-test@example.test")) continue;
    const [[user]] = await db.query(
      "SELECT id,password,full_name FROM users WHERE id=? AND email=? AND is_active=1",
      [value.id, value.email],
    );
    if (!user || !(await bcrypt.compare(value.password, user.password)))
      continue;
    const [roles] = await db.query(
      "SELECT role_code FROM user_roles WHERE user_id=?",
      [user.id],
    );
    output.push({
      email: value.email,
      password: value.password,
      full_name: user.full_name,
      roles: roles.map((row) => row.role_code),
    });
  }
  return output;
}
module.exports = { testAccounts };
