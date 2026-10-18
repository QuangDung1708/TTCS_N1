/* Explicit local developer command. Never loaded by the server or migration. */
require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { once } = require("node:events");
const { db, transaction, insert, audit } = require("../src/core/store");
const { bcrypt, issue } = require("../src/core/auth");
const app = require("../index");
let server;
async function main() {
  if (process.env.NODE_ENV === "production")
    throw Error("Không tạo dữ liệu kiểm thử trong NODE_ENV=production.");
  const [[database]] = await db.query("SELECT DATABASE() name");
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      `${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}:${database.name}`,
    )
    .digest("hex")
    .slice(0, 12);
  const dir = path.join(__dirname, "../.local-test-data");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `examples-${fingerprint}.json`);
  let state = { database: database.name, accounts: {}, records: {} };
  try {
    state = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const save = async () => {
    const temp = file + ".tmp";
    await fs.writeFile(temp, JSON.stringify(state, null, 2) + "\n", {
      mode: 0o600,
    });
    await fs.rename(temp, file);
  };
  if (state.complete) {
    for (const user of Object.values(state.accounts)) {
      const [[found]] = await db.query(
        "SELECT id FROM users WHERE id=? AND email=?",
        [user.id, user.email],
      );
      if (!found)
        throw Error(
          "Bộ dữ liệu trong database đã thay đổi. Giữ tệp tài khoản riêng tư và kiểm tra trước khi tạo lại; lệnh không tự ghi đè dữ liệu.",
        );
    }
    console.log("Bộ dữ liệu đã tồn tại. Không tạo thêm hoặc đổi mật khẩu.");
    console.log("Tài khoản và ID: " + file);
    return;
  }
  const [[admin]] = await db.query(
    "SELECT u.* FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE ur.role_code='Admin' AND u.is_active=1 AND u.status NOT IN ('inactive','Đã khóa') ORDER BY u.id LIMIT 1",
  );
  if (!admin) throw Error("Tạo Admin bằng npm run bootstrap-admin trước.");
  const session = await transaction((c) => issue(c, admin));
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(token, method, url, body) {
    const response = await globalThis.fetch(base + url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(`${method} ${url}: ${data.message || response.status}`);
    return data;
  }
  async function step(key, create) {
    if (state.records[key]) return state.records[key];
    const value = await create();
    if (!value) throw Error("API không trả ID: " + key);
    state.records[key] = value;
    await save();
    return value;
  }
  async function account(key, name, role) {
    let value = state.accounts[key];
    if (!value) {
      value = state.accounts[key] = {
        email: `${key}.crm-test@example.test`,
        full_name: "KT · " + name,
        password: "KT-" + crypto.randomBytes(18).toString("base64url") + "9a",
        role,
      };
      await save();
    }
    if (!value.id) {
      const [[old]] = await db.query(
        "SELECT id,password FROM users WHERE email=?",
        [value.email],
      );
      if (old) {
        if (!(await bcrypt.compare(value.password, old.password)))
          throw Error("Email đã tồn tại ngoài bộ dữ liệu: " + value.email);
        value.id = old.id;
      } else
        value.id = await transaction(async (c) => {
          const uid = await insert(c, "users", {
            email: value.email,
            full_name: value.full_name,
            password: await bcrypt.hash(value.password, 12),
            role_code: role,
            must_change_password: 0,
          });
          await insert(c, "user_roles", { user_id: uid, role_code: role });
          await audit(
            c,
            admin,
            "CREATE",
            "users",
            uid,
            null,
            { email: value.email, roles: [role] },
            "Tạo tài khoản kiểm thử theo lệnh data:examples",
          );
          return uid;
        });
      await save();
    }
    return value;
  }
  const director = await account("director", "Giám đốc", "Director");
  const leadA = await account("leader-a", "Trưởng nhóm Miền Bắc", "Sales Rep");
  const leadB = await account("leader-b", "Trưởng nhóm Miền Nam", "Sales Rep");
  const saleA = await account("sales-a", "Kinh doanh Miền Bắc", "Sales Rep");
  const saleB = await account("sales-b", "Kinh doanh Miền Nam", "Sales Rep");
  const marketing = await account("marketing", "Marketing", "Marketing");
  const care = await account("care", "Chăm sóc khách hàng", "Cust. Success");
  await account("accountant", "Kế toán", "Accountant");
  const groupA = await step(
    "groupA",
    async () =>
      (
        await call(session.token, "POST", "/organization/groups", {
          name: "KT · Kinh doanh Miền Bắc",
          leader_id: leadA.id,
          description: "Nhóm dùng kiểm tra phạm vi dữ liệu",
        })
      ).id,
  );
  const groupB = await step(
    "groupB",
    async () =>
      (
        await call(session.token, "POST", "/organization/groups", {
          name: "KT · Kinh doanh Miền Nam",
          leader_id: leadB.id,
          description: "Nhóm độc lập để kiểm tra phân quyền",
        })
      ).id,
  );
  for (const [user, gid] of [
    [leadA, groupA],
    [leadB, groupB],
  ]) {
    await call(session.token, "PUT", `/users/${user.id}/role`, {
      roles: ["Team Lead"],
      group_id: gid,
    });
    user.role = "Team Lead";
  }
  await call(
    session.token,
    "POST",
    `/organization/groups/${groupA}/assign-member`,
    { user_ids: [saleA.id, care.id] },
  );
  await call(
    session.token,
    "POST",
    `/organization/groups/${groupB}/assign-member`,
    { user_ids: [saleB.id] },
  );
  await save();
  async function login(a) {
    return (
      await call("", "POST", "/auth/login", {
        email: a.email,
        password: a.password,
      })
    ).token;
  }
  const tokens = {
    director: await login(director),
    salesA: await login(saleA),
    salesB: await login(saleB),
    marketing: await login(marketing),
    care: await login(care),
  };
  const source = await step(
    "source",
    async () =>
      (
        await call(session.token, "POST", "/categories", {
          type: "lead_source",
          code: "KT-WEBSITE",
          name: "KT · Website",
          is_active: 1,
        })
      ).id,
  );
  await step(
    "industry",
    async () =>
      (
        await call(session.token, "POST", "/categories", {
          type: "industry",
          code: "KT-TECH",
          name: "KT · Công nghệ thông tin",
          is_active: 1,
        })
      ).id,
  );
  const stage = await step(
    "stage",
    async () =>
      (
        await call(session.token, "POST", "/pipeline-stages", {
          code: "KT-DISCOVERY",
          name: "KT · Tiếp cận",
          win_probability: 20,
          sort_order: 1,
          exit_condition: "none",
          stagnant_days: 7,
        })
      ).id,
  );
  await step(
    "stage2",
    async () =>
      (
        await call(session.token, "POST", "/pipeline-stages", {
          code: "KT-PROPOSAL",
          name: "KT · Đề xuất giải pháp",
          win_probability: 60,
          sort_order: 2,
          exit_condition: "none",
          stagnant_days: 7,
        })
      ).id,
  );
  await step(
    "wonReason",
    async () =>
      (
        await call(session.token, "POST", "/deal-reasons", {
          name: "KT · Giải pháp phù hợp",
          type: "WON",
          description: "Lý do để kiểm tra chốt thắng",
        })
      ).id,
  );
  await step(
    "lostReason",
    async () =>
      (
        await call(session.token, "POST", "/deal-reasons", {
          name: "KT · Chưa phù hợp ngân sách",
          type: "LOST",
          description: "Lý do để kiểm tra chốt thua",
        })
      ).id,
  );
  await step(
    "product",
    async () =>
      (
        await call(tokens.director, "POST", "/products", {
          code: "KT-CRM",
          name: "KT · Gói triển khai CRM",
          type: "ONE_TIME",
          unit: "gói",
          list_price: 5000000,
          floor_price: 4000000,
          cost_price: 2500000,
        })
      ).id,
  );
  await step(
    "subscription",
    async () =>
      (
        await call(tokens.director, "POST", "/products", {
          code: "KT-SUB",
          name: "KT · Thuê bao hỗ trợ CRM",
          type: "SUBSCRIPTION",
          unit: "tháng",
          list_price: 500000,
          floor_price: 400000,
          cost_price: 200000,
        })
      ).id,
  );
  const today = new Date().toISOString().slice(0, 10),
    future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const campaign = await step(
    "campaign",
    async () =>
      (
        await call(tokens.marketing, "POST", "/campaigns", {
          name: "KT · Tư vấn CRM tháng này",
          budget: 5000000,
          channel: "Website",
          start_date: today,
          end_date: future,
        })
      ).id,
  );
  for (const [key, name, token] of [
    ["customerA", "KT · Doanh nghiệp Minh An", tokens.salesA],
    ["customerA2", "KT · Doanh nghiệp Bắc Sơn", tokens.salesA],
    ["customerB", "KT · Doanh nghiệp Nam Việt", tokens.salesB],
    ["customerCare", "KT · Khách hàng chăm sóc", tokens.care],
  ]) {
    const cid = await step(
      key,
      async () =>
        (
          await call(token, "POST", "/customers", {
            company_name: name,
            email: key.toLowerCase() + "@example.test",
            industry: "KT · Công nghệ thông tin",
            status: "Tiềm năng",
          })
        ).id,
    );
    const contact = await step(
      key + "Contact",
      async () =>
        (
          await call(token, "POST", `/contacts/customer/${cid}`, {
            full_name: "Người liên hệ " + name.replace("KT · ", ""),
            email: key.toLowerCase() + ".contact@example.test",
            position: "Phụ trách dự án",
          })
        ).contactId,
    );
    if (key === "customerA" || key === "customerB")
      await step(
        key + "Deal",
        async () =>
          (
            await call(token, "POST", "/deals", {
              title: "KT · Triển khai CRM cho " + name.replace("KT · ", ""),
              customer_id: cid,
              contact_id: contact,
              stage_id: stage,
              source_id: source,
              campaign_id: campaign,
              amount: 5000000,
              expected_close_date: future,
            })
          ).id,
      );
  }
  for (let i = 1; i <= 3; i++)
    await step(
      "lead" + i,
      async () =>
        (
          await call(tokens.marketing, "POST", "/leads", {
            full_name: `KT · Người liên hệ tiềm năng ${i}`,
            company_name: `KT · Doanh nghiệp tiềm năng ${i}`,
            email: `lead${i}.crm-test@example.test`,
            source_id: source,
            campaign_id: campaign,
            interest: "Cần tư vấn giải pháp CRM",
          })
        ).id,
    );
  for (const [key, account] of [
    ["lead1", saleA],
    ["lead2", saleB],
  ]) {
    await step(key + "Assigned", async () => {
      await call(
        tokens.director,
        "POST",
        `/leads/${state.records[key]}/assign`,
        {
          owner_id: account.id,
          reason: "Phân bổ lead kiểm thử cho đúng nhóm",
          sla_minutes: 1440,
        },
      );
      return state.records[key];
    });
  }
  state.complete = true;
  await save();
  console.log(
    "Đã tạo bản ghi thật trong MySQL qua luồng ứng dụng. Không phải khách hàng/danh tính đã xác minh.",
  );
  console.log(
    "8 tài khoản mới; 2 nhóm; 4 khách hàng và liên hệ; 2 sản phẩm; 3 lead; 2 cơ hội; 1 chiến dịch.",
  );
  console.log(
    "Tài khoản, mật khẩu ngẫu nhiên và ID nằm trong tệp riêng tư: " + file,
  );
  console.log(
    "Không đưa tệp này lên GitHub. Chạy lại sẽ không tạo trùng khi bộ dữ liệu đã hoàn tất.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.end();
  });
