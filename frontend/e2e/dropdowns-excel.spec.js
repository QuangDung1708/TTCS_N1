import { test, expect } from "@playwright/test";
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
test("Dropdown arrow opens above customer modal and allows searching an existing database industry", async ({
  page,
}) => {
  await login(page);
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  const field = page
    .getByRole("dialog")
    .locator(".ant-form-item")
    .filter({ has: page.getByText("Ngành nghề", { exact: true }) });
  const arrow = field.locator(".ant-select-suffix, .ant-select-arrow");
  await arrow.click();
  await expect(page.locator(".ant-select-dropdown:visible")).toBeVisible();
  await expect(
    page
      .locator(".ant-select-dropdown:visible .ant-select-item-option")
      .filter({ hasText: "Technology" }),
  ).toBeVisible();
  await field.getByRole("combobox").fill("Tech");
  await page
    .locator(".ant-select-dropdown:visible .ant-select-item-option")
    .filter({ hasText: "Technology" })
    .click();
});

async function choose(page, label, search, value) {
  const dialog = page.getByRole("dialog").last();
  const field = dialog
    .locator(".ant-form-item")
    .filter({ has: page.locator("label").filter({ hasText: label }) });
  await field.locator(".ant-select-suffix, .ant-select-arrow").click();
  const popup = page.locator(".ant-select-dropdown:visible");
  await expect(popup).toBeVisible();
  await field.getByRole("combobox").fill(search);
  await popup.getByRole("option", { name: value, exact: true }).click();
  await expect(popup).toBeHidden();
}

test("Customer and lead dropdowns search existing industry, size, region, source and campaign names without accents", async ({
  page,
}) => {
  const token = await login(page);
  const create = (path, data) =>
    page.request.post("/api/" + path, {
      headers: { Authorization: "Bearer " + token },
      data,
    });
  for (const [type, code, name] of [
    ["industry", "SEARCH_TECH", "Công nghệ kiểm thử"],
    ["company_size", "SEARCH_SIZE", "51–200 nhân sự"],
    ["lead_source", "SEARCH_WEB", "KT Website tìm kiếm"],
  ])
    expect(
      (await create("categories", { type, code, name })).ok(),
    ).toBeTruthy();
  expect(
    (
      await create("organization/regions", {
        name: "Miền Bắc tìm kiếm",
        code: "SEARCH_NORTH",
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await create("campaigns", {
        name: "Chiến dịch tìm kiếm",
        budget: 1000000,
        channel: "Website",
        start_date: "2026-10-18",
        end_date: "2026-12-18",
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  await choose(page, "Ngành nghề", "CONG NGHE", "Công nghệ kiểm thử");
  await choose(page, "Quy mô doanh nghiệp", "51", "51–200 nhân sự");
  await choose(page, "Khu vực", "mien bac", "Miền Bắc tìm kiếm");
  await page
    .getByRole("dialog")
    .last()
    .getByLabel("Tên công ty / doanh nghiệp", { exact: true })
    .fill("Doanh nghiệp danh mục thực");
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Lưu thay đổi" })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Doanh nghiệp danh mục thực" }),
  ).toBeVisible();
  await page.goto("/leads");
  await page.getByRole("button", { name: "Thêm lead", exact: true }).click();
  await choose(page, "Nguồn lead", "kt web", "KT Website tìm kiếm");
  await choose(page, "Chiến dịch", "chien dich", "Chiến dịch tìm kiếm");
  await choose(page, "Ngành nghề", "cong nghe", "Công nghệ kiểm thử");
  await choose(page, "Quy mô doanh nghiệp", "200", "51–200 nhân sự");
  await choose(page, "Khu vực", "mien bac", "Miền Bắc tìm kiếm");
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Họ và tên", { exact: true })
    .fill("Lead danh mục thực");
  await dialog
    .getByLabel("Tên doanh nghiệp", { exact: true })
    .fill("Doanh nghiệp danh mục thực");
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("lookup.actual@example.test");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Lead danh mục thực" }),
  ).toBeVisible();
  const res = await page.request.get("/api/leads", {
    headers: { Authorization: "Bearer " + token },
  });
  const lead = (await res.json()).data.find(
    (r) => r.full_name === "Lead danh mục thực",
  );
  expect(lead.region).toBe("Miền Bắc tìm kiếm");
  expect(lead.company_size).toBe("51–200 nhân sự");
});

test("Opportunity arrows select existing customer, contact, stage, source and campaign by name", async ({
  page,
}) => {
  const token = await login(page);
  await page.request.post("/api/campaigns", {
    headers: { Authorization: "Bearer " + token },
    data: {
      name: "Chiến dịch cơ hội",
      budget: 1000000,
      channel: "Website",
      start_date: "2026-10-18",
      end_date: "2026-12-18",
    },
  });
  await page.goto("/pipeline");
  await page.getByRole("button", { name: "Thêm cơ hội", exact: true }).click();
  await choose(
    page,
    "Khách hàng doanh nghiệp",
    "khach hang a",
    "E2E Khách hàng A",
  );
  const contact = page
    .getByRole("dialog")
    .last()
    .getByLabel("Người liên hệ chính", { exact: true });
  await contact.click();
  const options = page.locator(
    ".ant-select-dropdown:visible .ant-select-item-option",
  );
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await expect(page.locator(".ant-select-dropdown:visible")).toBeHidden();
  await choose(page, "Giai đoạn", "disco", "Discovery");
  await choose(page, "Nguồn cơ hội", "web", "Website");
  await choose(page, "Chiến dịch", "co hoi", "Chiến dịch cơ hội");
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Tên cơ hội", { exact: true })
    .fill("Cơ hội chọn từ DB");
  await dialog.getByLabel("Giá trị dự kiến", { exact: true }).fill("5000000");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("button", { name: "Cơ hội chọn từ DB", exact: true }),
  ).toBeVisible();
});

test("Downloaded customer, lead and quote workbooks preserve exact HTTP bytes and remain readable", async ({
  page,
}) => {
  const token = await login(page);
  const fs = await import("node:fs");
  const { createRequire } = await import("node:module");
  const path = await import("node:path");
  const require = createRequire(
    path.join(process.env.CRM_BACKEND_DIR, "package.json"),
  );
  const XLSX = require("xlsx");
  for (const [route, apiPath, expected] of [
    ["/customers", "/api/customers/export", "Tên doanh nghiệp"],
    ["/leads", "/api/leads/export", "Họ và tên"],
    ["/quotes", "/api/quotes/export", "Tên báo giá"],
  ]) {
    await page.goto(route);
    const response = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === apiPath && r.request().method() === "GET",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất Excel", exact: true }).click();
    const resp = await response;
    expect(resp.ok()).toBeTruthy();
    const received = await download;
    const bytes = fs.readFileSync(await received.path());
    expect(bytes.equals(await resp.body())).toBe(true);
    const wb = XLSX.read(bytes, { type: "buffer" });
    const values = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
    });
    expect(values[0]).toContain(expected);
    expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
    const dest = test
      .info()
      .outputPath(route.slice(1) + "-office-checked.xlsx");
    fs.writeFileSync(dest, bytes);
  }
  const result = await page.evaluate(async () => {
    const { download } = await import("/src/lib/api.js");
    try {
      await download("/auth/options", {}, "invalid.xlsx");
      return "unexpected";
    } catch (e) {
      return e.message;
    }
  });
  expect(result).toContain("chưa trả về tệp Excel hợp lệ");
  expect(token).toBeTruthy();
});

test("A pending real save shows Ant Design loading then success; tabs animate and respect reduced motion", async ({
  page,
}) => {
  await login(page);
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Tên công ty / doanh nghiệp", { exact: true })
    .fill("Doanh nghiệp trạng thái lưu");
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/customers", async (route) => {
    if (route.request().method() === "POST") await gate;
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    dialog.getByRole("button", { name: "Lưu thay đổi" }),
  ).toHaveClass(/ant-btn-loading/);
  await expect(page.locator(".ant-message-loading")).toBeVisible();
  release();
  await expect(
    page.getByRole("row").filter({ hasText: "Doanh nghiệp trạng thái lưu" }),
  ).toBeVisible();
  await expect(page.locator(".ant-message-success")).toBeVisible();
  await page.goto("/categories");
  await page
    .getByRole("tab", { name: "Quy mô doanh nghiệp", exact: true })
    .click();
  await expect(page.locator(".tab-content-enter")).toHaveCSS(
    "animation-name",
    "tab-panel-enter",
  );
  await page.getByRole("button", { name: "Thêm mới", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toContainText(
    "Đây là danh mục quy mô dùng chung",
  );
  await page
    .getByRole("dialog")
    .last()
    .getByRole("link", { name: /Thêm doanh nghiệp/ })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .last()
      .getByLabel("Tên công ty / doanh nghiệp", { exact: true }),
  ).toBeVisible();
  await page.goto("/categories");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("tab", { name: "Quy mô doanh nghiệp", exact: true })
    .click();
  await expect(page.locator(".tab-content-enter")).toHaveCSS(
    "animation-name",
    "none",
  );
});
