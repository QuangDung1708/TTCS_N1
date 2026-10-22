require("dotenv").config();
const { db, transaction, insert, audit } = require("../src/core/store");
const { email, text } = require("../src/core/http");
const { password, bcrypt } = require("../src/core/auth");
async function bootstrap() {
  const mail = email(process.env.CRM_ADMIN_EMAIL),
    name = text(process.env.CRM_ADMIN_NAME, "Tên quản trị", 100),
    pass = password(process.env.CRM_ADMIN_PASSWORD);
  await transaction(async (c) => {
    const [[n]] = await c.query(
      "SELECT COUNT(*) n FROM user_roles WHERE role_code='Admin'",
    );
    if (n.n)
      throw new Error(
        "An administrator already exists; use the administrator API.",
      );
    const uid = await insert(c, "users", {
      email: mail,
      full_name: name,
      password: await bcrypt.hash(pass, 12),
      role_code: "Admin",
    });
    await insert(c, "user_roles", { user_id: uid, role_code: "Admin" });
    await audit(c, null, "BOOTSTRAP_ADMIN", "users", uid, null, {
      email: mail,
    });
  });
  console.log("Administrator created.");
}
bootstrap()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
