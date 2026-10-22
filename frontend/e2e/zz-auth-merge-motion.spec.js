import backendTools from "./backend.cjs";
import { test, expect } from "./fixtures";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
const { backendDir: backend, backendRequire } = backendTools;
async function login(page) {
  const r = await page.request.post("/api/auth/login", {
    data: { email: "test1@example.test", password: "IntegrationOnly9!" },
  });
  expect(r.ok()).toBeTruthy();
  const { token } = await r.json();
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  return token;
}
test("Customer merge confirms inside the modal and preserves contacts, deal and child after reload", async ({
  page,
}) => {
  const token = await login(page);
  const request = async (method, route, data) => {
    const r = await page.request[method]("/api/" + route, {
      headers: { Authorization: "Bearer " + token },
      data,
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.json();
  };
  const name = "Gộp kiểm tra " + Date.now();
  const target = await request("post", "customers", { company_name: name });
  const source = await request("post", "customers", { company_name: name });
  const child = await request("post", "customers", {
    company_name: "Công ty con gộp",
    parent_id: source.id,
  });
  const contact = await request("post", `contacts/customer/${source.id}`, {
    full_name: "Liên hệ gộp",
    email: "merge-person@example.test",
    is_primary: true,
  });
  const deal = await request("post", "deals", {
    title: "Cơ hội gộp",
    customer_id: source.id,
    contact_id: contact.contactId,
    stage_id: 1,
    source_id: 1,
    amount: 1200000,
    expected_close_date: "2099-01-01",
  });
  await page.goto("/customers");
  await page.getByRole("button", { name: "Gộp trùng", exact: true }).click();
  const modal = page.getByRole("dialog").last();
  await modal.getByRole("combobox").click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: `${name} ↔ ${name}`, exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Xác nhận gộp", exact: true })
    .click();
  await expect(
    modal.getByText("Gộp hai hồ sơ này?", { exact: true }),
  ).toBeVisible();
  const done = page.waitForResponse(
    (r) =>
      r.url().endsWith("/customers/merge") && r.request().method() === "POST",
  );
  await modal
    .getByRole("button", { name: "Gộp hai hồ sơ", exact: true })
    .click();
  expect((await done).status()).toBe(200);
  await expect(modal).not.toBeVisible();
  await page.reload();
  const profile = await request("get", `customers/${target.id}/360`);
  expect(
    profile.data.contacts.some((row) => row.id === contact.contactId),
  ).toBeTruthy();
  expect(profile.data.deals.some((row) => row.id === deal.id)).toBeTruthy();
  expect((await request("get", `customers/${child.id}`)).data.parent_id).toBe(
    target.id,
  );
  expect(
    (
      await page.request.get(`/api/customers/${source.id}`, {
        headers: { Authorization: "Bearer " + token },
      })
    ).status(),
  ).toBe(403);
});
test("Workspace dialogs and drawers retain their exit animation; tabs and routes animate too", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await login(page);
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("tab", { name: /Cần chăm sóc/ }).click();
  await page.waitForTimeout(70);
  const transition = await page.evaluate(() =>
    document
      .getAnimations()
      .some((a) => /workspace|tab-panel/.test(a.animationName || "")),
  );
  expect(transition).toBeTruthy();
  await page
    .getByRole("menuitem", { name: "Danh mục bán hàng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Danh mục bán hàng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thêm mới", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  // Observe the closing DOM before onCancel unmounts the component.
  await page.evaluate(() => {
    window.__closingMotion = false;
    const observer = new MutationObserver(() => {
      if (
        document.querySelector('[class*="zoom-leave"], [class*="fade-leave"]')
      )
        window.__closingMotion = true;
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    window.__motionObserver = observer;
  });
  await modal.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(
    await page.evaluate(() => {
      window.__motionObserver.disconnect();
      return window.__closingMotion;
    }),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Tài khoản của tôi" }).click();
  await page
    .getByRole("button", { name: "Hồ sơ cá nhân", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Close|Đóng/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("Registration confirms passwords, enforces resend countdown and creates only a Sales Rep", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Tạo tài khoản", exact: true }).click();
  const email = "browser-signup@example.test";
  await page
    .getByLabel("Họ và tên", { exact: true })
    .fill("Đăng ký trình duyệt");
  await page.getByLabel("Email công việc", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Gửi mã xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Gửi lại sau \d+s/ }),
  ).toBeDisabled();
  const mysql = backendRequire("mysql2/promise");
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  let code;
  try {
    const [[row]] = await c.query(
      "SELECT body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
      [email],
    );
    code = row.body.match(/CRM: (\d{6})/)[1];
  } finally {
    await c.end();
  }
  await page.getByLabel("Mã xác nhận", { exact: true }).fill(code);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("BrowserRegister9!");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("WrongPassword9!");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByText("Mật khẩu chưa khớp.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("BrowserRegister9!");
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  const loginResult = await page.request.post("/api/auth/login", {
    data: { email, password: "BrowserRegister9!" },
  });
  expect((await loginResult.json()).user.roles).toEqual(["Sales Rep"]);
});
test("Login offers all seven persisted test roles after the explicit data import", async ({
  page,
}) => {
  await promisify(execFile)(
    process.execPath,
    ["scripts/create-example-data.js"],
    {
      cwd: backend,
      env: {
        ...process.env,
        JWT_SECRET: "e2e-example-import-only-secret-32chars",
        NODE_ENV: "test",
        SMTP_HOST: "",
        SMTP_USER: "",
        SMTP_PASS: "",
      },
      maxBuffer: 1024 * 1024,
    },
  );
  await page.goto("/login");
  const accounts = page.locator(".test-account-grid");
  await expect(accounts.getByRole("button")).toHaveCount(7);
  await accounts
    .getByRole("button", { name: "Nhân viên kinh doanh", exact: true })
    .click();
  await expect(page.getByLabel("Email công việc", { exact: true })).toHaveValue(
    "sales-a.crm-test@example.test",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
});
