import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const backendRequire = createRequire(
  path.join(
    process.env.CRM_BACKEND_DIR || path.resolve("../backend"),
    "package.json",
  ),
);
const password = "IntegrationOnly9!";
const roleIndex = {
  Admin: 1,
  Director: 2,
  "Team Lead": 3,
  "Sales Rep": 4,
  Marketing: 5,
  "Cust. Success": 6,
  Accountant: 7,
  salesB: 8,
  multi: 10,
};
const ids = () =>
  JSON.parse(fs.readFileSync(path.resolve("e2e/fixture-ids.json"), "utf8"));
async function login(page, role = "Admin", url = "/") {
  const email =
    role === "multi"
      ? "multi@example.test"
      : `test${roleIndex[role]}@example.test`;
  const r = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(r.ok()).toBeTruthy();
  const { token } = await r.json();
  await page.goto("/login");
  await page.evaluate((token) => localStorage.setItem("token", token), token);
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Tài khoản của tôi" }),
  ).toBeVisible();
  return token;
}
function dialog(page) {
  return page.getByRole("dialog").last();
}
test("S1: real login, default light, safe invalid-login message and logout", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Chào mừng trở lại" }),
  ).toBeVisible();
  await page
    .getByLabel("Email công việc", { exact: true })
    .fill("test1@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("WrongPassword9");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByText(
      "Tài khoản hoặc mật khẩu không chính xác, hoặc tạm thời không thể đăng nhập.",
    ),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tổng quan kinh doanh" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  await page.getByRole("button", { name: "Tài khoản của tôi" }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/login/);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});
for (const role of Object.keys(roleIndex).filter(
  (r) => !["salesB", "multi"].includes(r),
))
  test(`S1/User Roles: ${role} menus, direct routes, cost and write controls`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, role, "/products");
    const categoryWrite = ["Admin", "Director"].includes(role);
    await expect(
      page.getByRole("button", { name: "Thêm mới", exact: true }),
    ).toHaveCount(categoryWrite ? 1 : 0);
    await expect(
      page.getByRole("columnheader", { name: "Giá vốn", exact: true }),
    ).toHaveCount(role === "Director" ? 1 : 0);
    await expect(
      page.getByRole("menuitem", { name: "Quản trị người dùng" }),
    ).toHaveCount(["Admin", "Director"].includes(role) ? 1 : 0);
    await expect(
      page.getByRole("menuitem", { name: "Lead & phân bổ" }),
    ).toHaveCount(["Cust. Success", "Accountant"].includes(role) ? 0 : 1);
    await expect(
      page.getByRole("menuitem", { name: "Nhật ký thay đổi" }),
    ).toHaveCount(["Admin", "Director"].includes(role) ? 1 : 0);
    await page.goto("/users");
    if (["Admin", "Director"].includes(role))
      await expect(
        page.getByRole("heading", { name: "Quản trị người dùng" }),
      ).toBeVisible();
    else
      await expect(page.getByText("Bạn chưa có quyền truy cập")).toBeVisible();
    if (["Admin", "Director"].includes(role))
      await expect(
        page.getByRole("button", { name: "Thêm người dùng", exact: true }),
      ).toHaveCount(role === "Admin" ? 1 : 0);
    await page.goto("/customers");
    await expect(
      page.getByRole("button", { name: "Thêm khách hàng", exact: true }),
    ).toHaveCount(role === "Accountant" ? 0 : 1);
    if (role === "Sales Rep")
      await expect(
        page.getByRole("button", { name: "E2E Khách hàng A", exact: true }),
      ).toBeVisible();
    if (role === "Team Lead")
      await expect(
        page.getByRole("button", {
          name: "E2E Khách hàng nhóm con",
          exact: true,
        }),
      ).toBeVisible();
    const names = await page.locator(".table-primary").allTextContents();
    if (role === "Sales Rep") {
      expect(names).toContain("E2E Khách hàng A");
      expect(names).not.toContain("E2E Khách hàng B");
    }
    if (role === "Team Lead") {
      expect(names).toContain("E2E Khách hàng nhóm con");
      expect(names).not.toContain("E2E Khách hàng B");
    }
    await page.goto("/pipeline");
    await expect(
      page.getByRole("heading", { name: "Cơ hội & pipeline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Thêm cơ hội", exact: true }),
    ).toHaveCount(
      ["Marketing", "Accountant", "Cust. Success"].includes(role) ? 0 : 1,
    );
    expect(errors).toEqual([]);
  });
test("S1: multi-role broad read keeps write scoped to owner", async ({
  page,
}) => {
  await login(page, "multi", "/customers");
  await expect(
    page.getByRole("button", { name: "E2E Khách hàng B", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sửa E2E Khách hàng B", exact: true }),
  ).toHaveCount(0);
});
test("S3: create customer and contact, notes, support risk, upload and download persisted", async ({
  page,
}) => {
  await login(page, "Sales Rep", "/customers");
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  await dialog(page)
    .getByLabel("Tên công ty / doanh nghiệp")
    .fill("E2E Khách hàng từ giao diện");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("button", {
      name: "E2E Khách hàng từ giao diện",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "E2E Khách hàng từ giao diện", exact: true })
    .click();
  await page.getByRole("tab", { name: /Người liên hệ/ }).click();
  await page.getByRole("button", { name: "Thêm liên hệ", exact: true }).click();
  await dialog(page).getByLabel("Họ và tên").fill("E2E Người quyết định");
  await dialog(page).getByLabel("Số điện thoại").fill("0912345678");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("E2E Người quyết định", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Hoạt động/ }).click();
  await page
    .getByLabel("Nội dung hoạt động khách hàng")
    .fill("E2E Ghi chú được lưu MySQL");
  await page.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(
    page.getByText("E2E Ghi chú được lưu MySQL", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Yêu cầu hỗ trợ/ }).click();
  for (let n = 1; n <= 2; n++) {
    await page
      .getByRole("button", { name: "Tạo yêu cầu hỗ trợ", exact: true })
      .click();
    await dialog(page)
      .getByLabel("Nội dung yêu cầu")
      .fill("E2E Hỗ trợ " + n);
    await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(
      page.getByRole("cell", { name: "E2E Hỗ trợ " + n, exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText("Nguy cấp", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Tệp đính kèm/ }).click();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "ghi-chu.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("E2E persisted file"),
    });
  await expect(page.getByText("ghi-chu.txt", { exact: true })).toBeVisible();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải xuống", exact: true }).click();
  const file = await wait;
  expect(file.suggestedFilename()).toBe("ghi-chu.txt");
});
test("S1-02: expired session returns to login and restores personal note draft", async ({
  page,
}) => {
  await login(page, "Sales Rep", `/customers?customer=${ids().a}`);
  await page.getByRole("tab", { name: /Hoạt động/ }).click();
  await page
    .getByLabel("Nội dung hoạt động khách hàng")
    .fill("E2E bản nháp chưa lưu");
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("crm:expired")),
  );
  await expect(
    page.getByText("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."),
  ).toBeVisible();
  await page
    .getByLabel("Email công việc", { exact: true })
    .fill("test4@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("tab", { name: /Hoạt động/ }).click();
  await expect(page.getByLabel("Nội dung hoạt động khách hàng")).toHaveValue(
    "E2E bản nháp chưa lưu",
  );
});
test("S5: rejected stage move, meeting, product totals, stage, won and locked detail", async ({
  page,
}) => {
  await login(page, "Sales Rep", `/pipeline?deal=${ids().deal}`);
  await page.getByLabel("Giai đoạn tiếp theo").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Proposal", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chuyển giai đoạn", exact: true })
    .click();
  await expect(
    page.getByText("Chưa có cuộc gặp được ghi nhận cho cơ hội."),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Lịch sử & cuộc gặp" }).click();
  await page.getByLabel("Ghi chú cơ hội").fill("E2E đã gặp khách hàng");
  await page.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(
    page.getByText("E2E đã gặp khách hàng", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Dòng sản phẩm", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm dòng sản phẩm", exact: true })
    .click();
  await dialog(page).getByLabel("Sản phẩm", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("E2E Thuê bao", { exact: true })
    .click();
  await dialog(page).getByLabel("Số lượng", { exact: true }).fill("2");
  await dialog(page).getByLabel("Số kỳ thanh toán").fill("12");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.locator(".drawer-stat").filter({ hasText: "Giá trị dự kiến" }),
  ).toContainText("2.400.000");
  await page
    .getByRole("button", { name: "Chuyển giai đoạn", exact: true })
    .click();
  await expect(page.getByText("Đã chuyển giai đoạn.")).toBeVisible();
  await page.getByRole("button", { name: "Chốt thắng", exact: true }).click();
  await dialog(page).getByLabel("Lý do thắng").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Fit", { exact: true })
    .click();
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("Cơ hội đã đóng và được khóa chỉnh sửa."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mở lại cơ hội", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/pipeline-sales.png",
    fullPage: true,
  });
});
test("S1-06: 360px navigation, responsive tables, dialogs, reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page, "Admin", "/customers");
  await expect(
    page.getByRole("button", { name: "Mở điều hướng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mở điều hướng" }).click();
  await page.getByRole("menuitem", { name: "Cơ hội & pipeline" }).click();
  await expect(
    page.getByRole("heading", { name: "Cơ hội & pipeline" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Thêm cơ hội", exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  expect(
    await dialog(page).evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: "test-results/mobile-360.png",
    fullPage: true,
  });
});
test("Admin: all screens render real data without runtime exceptions", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "Admin");
  for (const [route, title] of [
    ["/organization", "Cơ cấu tổ chức kinh doanh"],
    ["/leads", "Lead & phân bổ"],
    ["/campaigns", "Chiến dịch marketing"],
    ["/categories", "Danh mục bán hàng"],
    ["/deal-reasons", "Lý do thắng / thua & đối thủ"],
    ["/custom-fields", "Trường tùy chỉnh"],
    ["/quotes", "Báo giá nháp"],
    ["/audit-logs", "Nhật ký thay đổi"],
    ["/permission-matrix", "Ma trận phân quyền"],
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Chưa tải được dữ liệu", { exact: true }),
    ).toHaveCount(0);
  }
  await page.goto("/customers");
  await page.screenshot({
    path: "test-results/customers-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("S4: create lead, receive and convert preserves activity in customer 360", async ({
  page,
}) => {
  await login(page, "Sales Rep", "/leads");
  await page.getByRole("button", { name: "Thêm lead", exact: true }).click();
  await dialog(page).getByLabel("Họ và tên").fill("E2E Lead chuyển đổi");
  await dialog(page)
    .getByLabel("Công ty", { exact: true })
    .fill("E2E Công ty chuyển đổi");
  await dialog(page)
    .getByLabel("Email", { exact: true })
    .fill("convert@example.test");
  await dialog(page).getByLabel("Nguồn lead", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Website", { exact: true })
    .click();
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("button", { name: "E2E Lead chuyển đổi", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("button", {
        name: "E2E Lead chuyển đổi",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Nhận", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "E2E Lead chuyển đổi" }),
  ).toContainText("Đang chăm sóc");
  await page
    .getByRole("button", { name: "E2E Lead chuyển đổi", exact: true })
    .click();
  await page
    .getByLabel("Nội dung hoạt động lead")
    .fill("E2E Lịch sử trước chuyển đổi");
  await page.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(
    page.getByText("E2E Lịch sử trước chuyển đổi", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Chuyển đổi E2E Lead chuyển đổi",
      exact: true,
    })
    .last()
    .click();
  await dialog(page).getByLabel("Giai đoạn ban đầu").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Discovery", { exact: true })
    .click();
  await dialog(page).getByLabel("Ngày dự kiến chốt").fill("2099-01-01");
  await dialog(page).getByLabel("Ngày dự kiến chốt").press("Tab");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "E2E Lead chuyển đổi" }),
  ).toContainText("Đã chuyển đổi");
  await expect(
    page.getByRole("button", {
      name: "Sửa lead E2E Lead chuyển đổi",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("/customers");
  await page
    .getByRole("button", { name: "E2E Công ty chuyển đổi", exact: true })
    .click();
  await page.getByRole("tab", { name: /Hoạt động/ }).click();
  await expect(
    page.getByText("E2E Lịch sử trước chuyển đổi", { exact: true }),
  ).toBeVisible();
});
test("S3: Excel preview marks duplicates, imports valid rows and downloads real template", async ({
  page,
}) => {
  const XLSX = backendRequire("xlsx");
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet([
      { company_name: "E2E Excel đúng", tax_code: "1234567891" },
      { company_name: "E2E Trùng", tax_code: "1234567890" },
      { company_name: "E2E MST sai", tax_code: "abc" },
    ]),
    "Customers",
  );
  await login(page, "Sales Rep", "/customers");
  await page.getByRole("button", { name: "Nhập Excel", exact: true }).click();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải mẫu Excel" }).click();
  expect((await wait).suggestedFilename()).toBe("customers-mau.xlsx");
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "khach-hang.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
    });
  await expect(page.getByText("1 dòng hợp lệ", { exact: true })).toBeVisible();
  await expect(page.getByText("Trùng dữ liệu", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nhập dữ liệu vào hệ thống" }).click();
  await expect(
    page.getByText("Đã nhập 1 dòng · Bỏ qua 2 dòng", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(
    page.getByRole("button", { name: "E2E Excel đúng", exact: true }),
  ).toBeVisible();
});
test("S4: Ant Design public embed submits actual sourced lead without authentication", async ({
  page,
}) => {
  const token = await login(page, "Marketing", "/leads");
  const response = await page.request.post("/api/leads/forms", {
    headers: { Authorization: "Bearer " + token },
    data: { name: "E2E Liên hệ website", source_id: 1 },
  });
  expect(response.ok()).toBeTruthy();
  const form = await response.json();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/public/lead-forms/" + form.public_key);
  await expect(
    page.getByRole("heading", { name: "E2E Liên hệ website" }),
  ).toBeVisible();
  await page.getByLabel("Họ và tên").fill("E2E Khách website");
  await page
    .getByLabel("Công ty", { exact: true })
    .fill("E2E Doanh nghiệp website");
  await page.getByLabel("Email", { exact: true }).fill("public@example.test");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByLabel("Nhu cầu quan tâm").fill("Cần tư vấn CRM");
  await expect(
    page.getByRole("button", { name: "Gửi thông tin", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Gửi thông tin", exact: true })
    .click();
  await expect(
    page.getByText("Đã nhận thông tin", { exact: true }),
  ).toBeVisible();
  const result = await page.request.get(
    "/api/leads?search=public@example.test",
    { headers: { Authorization: "Bearer " + token } },
  );
  expect(
    (await result.json()).data.some(
      (l) => l.full_name === "E2E Khách website" && l.source_id === 1,
    ),
  ).toBeTruthy();
});
test("S5-02: actual pointer drag persists new stage and forecasts include the deal", async ({
  page,
}) => {
  const token = await login(page, "Sales Rep", "/pipeline");
  const created = await page.request.post("/api/deals", {
    headers: { Authorization: "Bearer " + token },
    data: {
      title: "E2E Kéo thả",
      customer_id: ids().a,
      contact_id: 1,
      stage_id: 1,
      source_id: 1,
      expected_close_date: "2099-01-01",
      amount: 3000000,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  expect(
    (
      await page.request.post(`/api/deals/${id}/activities`, {
        headers: { Authorization: "Bearer " + token },
        data: { activity_type: "meeting", content: "E2E Cuộc gặp cho kéo thả" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.reload();
  const handle = page.getByRole("button", { name: "Kéo cơ hội E2E Kéo thả" }),
    target = page.locator('[data-stage-id="2"]');
  await expect(handle).toBeVisible();
  const from = await handle.boundingBox(),
    to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 15, from.y + 15, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 110, { steps: 14 });
  await page.mouse.up();
  await expect(
    target.getByRole("button", { name: "E2E Kéo thả", exact: true }),
  ).toBeVisible();
  const saved = await page.request.get("/api/deals/" + id, {
    headers: { Authorization: "Bearer " + token },
  });
  expect((await saved.json()).data.stage_id).toBe(2);
});
test("S2: profile, validation, real avatar and notification read state", async ({
  page,
}) => {
  const token = await login(page, "Sales Rep", "/customers");
  await page.getByRole("button", { name: /Thông báo/ }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "E2E Cơ hội cần theo dõi" })
    .click();
  await expect(page).toHaveURL(new RegExp("deal=" + ids().deal));
  const notifications = await page.request.get("/api/notifications", {
    headers: { Authorization: "Bearer " + token },
  });
  expect(
    (await notifications.json()).data.find(
      (n) => n.message === "E2E Cơ hội cần theo dõi",
    ).read_at,
  ).toBeTruthy();
  await page
    .getByRole("dialog", { name: "Hồ sơ cơ hội" })
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: "Tài khoản của tôi" }).click();
  await page.getByRole("menuitem", { name: "Hồ sơ cá nhân" }).click();
  await page.getByLabel("Số điện thoại", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(
    page.getByText("Nhập số điện thoại Việt Nam hợp lệ."),
  ).toBeVisible();
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0912345678");
  await page
    .getByLabel("Chữ ký email", { exact: true })
    .fill("Trân trọng, E2E Sales");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get("/api/users/profile", {
              headers: { Authorization: "Bearer " + token },
            })
          ).json()
        ).user.email_signature,
    )
    .toBe("Trân trọng, E2E Sales");
  const sharp = backendRequire("sharp");
  const png = await sharp({
    create: { width: 160, height: 100, channels: 3, background: "#1677ff" },
  })
    .png()
    .toBuffer();
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByText("Đã cập nhật ảnh đại diện.", { exact: true }),
  ).toBeVisible();
  const profile = await page.request.get("/api/users/profile", {
    headers: { Authorization: "Bearer " + token },
  });
  expect((await profile.json()).user.avatar).toMatch(
    /^\/uploads\/avatars\/.+\.png$/,
  );
});
test("S1/S2: administrator creates, edits roles, locks with handover, and audits changes", async ({
  page,
}) => {
  await login(page, "Admin", "/users");
  await page
    .getByRole("button", { name: "Thêm người dùng", exact: true })
    .click();
  await dialog(page).getByLabel("Họ và tên").fill("E2E Nhân sự mới");
  await dialog(page)
    .getByLabel("Email", { exact: true })
    .fill("newui@example.test");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByText("newui@example.test", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sửa người dùng E2E Nhân sự mới" })
    .click();
  await dialog(page).getByLabel("Các vai trò").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Marketing", { exact: true })
    .click();
  await dialog(page).getByLabel("Các vai trò").press("Escape");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  const row = page.getByRole("row").filter({ hasText: "newui@example.test" });
  await expect(row).toContainText("Marketing");
  await page
    .getByRole("button", { name: "Khóa E2E Nhân sự mới", exact: true })
    .click();
  await dialog(page).getByLabel("Người tiếp nhận toàn bộ dữ liệu").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Sales Rep · Team A", { exact: true })
    .click();
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(row).toContainText("Đã khóa");
  await page.goto("/audit-logs");
  await page.getByLabel("Hành động", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Thay đổi vai trò", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Thay đổi vai trò", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.locator(".audit-value").filter({ hasText: "Marketing" }),
  ).toBeVisible();
});
test("S5: manager override requires reason, real forecast and bulk ownership transfer", async ({
  page,
}) => {
  const token = await login(page, "Admin", "/pipeline");
  const created = await page.request.post("/api/deals", {
    headers: { Authorization: "Bearer " + token },
    data: {
      title: "E2E Ghi đè điều kiện",
      customer_id: ids().a,
      contact_id: 1,
      stage_id: 1,
      source_id: 1,
      expected_close_date: "2099-01-01",
      amount: 1000000,
      owner_id: 4,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  await page.goto("/pipeline?deal=" + id);
  await page.getByLabel("Giai đoạn tiếp theo").click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Proposal", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chuyển giai đoạn", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Ghi đè điều kiện giai đoạn" }),
  ).toBeVisible();
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    dialog(page).getByText("Vui lòng nhập thông tin này."),
  ).toBeVisible();
  await dialog(page)
    .getByLabel("Lý do ghi đè")
    .fill("E2E Quản lý đã xác nhận điều kiện bên ngoài");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  const saved = () =>
    page.request
      .get("/api/deals/" + id, {
        headers: { Authorization: "Bearer " + token },
      })
      .then((r) => r.json());
  await expect.poll(async () => (await saved()).data.stage_id).toBe(2);
  await page.goto("/pipeline");
  await page.getByText("Dự báo", { exact: true }).click();
  await expect(
    page.getByText("Thực tế đã chốt", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".drawer-stat").filter({ hasText: "Thực tế đã chốt" }),
  ).toContainText("2.400.000");
  await page.getByText("Danh sách", { exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Ghi đè điều kiện" })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Phân bổ 1 cơ hội" }).click();
  await dialog(page).getByLabel("Người tiếp nhận", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("salesB · Team B", { exact: true })
    .click();
  await dialog(page)
    .getByLabel("Lý do", { exact: true })
    .fill("E2E Cân bằng khối lượng");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect.poll(async () => (await saved()).data.owner_id).toBe(8);
});
test("S2-08/S3-07: required custom field, saved filter and real Excel export", async ({
  page,
}) => {
  const admin = await login(page, "Admin", "/custom-fields");
  const payload = {
    entity_type: "customer",
    field_name: "E2E Mã hợp đồng",
    field_key: "e2e_contract",
    field_type: "text",
    is_required: true,
    is_active: true,
  };
  const created = await page.request.post("/api/custom-fields", {
    headers: { Authorization: "Bearer " + admin },
    data: payload,
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  try {
    await login(page, "Sales Rep", "/customers");
    await page
      .getByRole("button", { name: "Thêm khách hàng", exact: true })
      .click();
    await dialog(page)
      .getByLabel("Tên công ty / doanh nghiệp")
      .fill("E2E Khách tùy chỉnh");
    await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(
      dialog(page).getByText("Vui lòng nhập thông tin này."),
    ).toBeVisible();
    await dialog(page)
      .getByLabel("E2E Mã hợp đồng", { exact: true })
      .fill("HD-E2E-001");
    await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(
      page.getByRole("button", { name: "E2E Khách tùy chỉnh", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Chọn trường tùy chỉnh để lọc").click();
    await page
      .locator(".ant-select-dropdown:visible")
      .getByText("E2E Mã hợp đồng", { exact: true })
      .click();
    await page.getByLabel("Giá trị trường tùy chỉnh").fill("HD-E2E-001");
    await expect(page.locator(".table-primary")).toHaveCount(1);
    await page.getByRole("button", { name: "Lưu bộ lọc hiện tại" }).click();
    await dialog(page).getByLabel("Tên bộ lọc").fill("E2E Theo hợp đồng");
    await dialog(page)
      .getByRole("button", { name: "Lưu bộ lọc", exact: true })
      .click();
    await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
    await page.getByLabel("Bộ lọc đã lưu").click();
    await page
      .locator(".ant-select-dropdown:visible")
      .getByText("E2E Theo hợp đồng", { exact: true })
      .click();
    await expect(page.locator(".table-primary")).toHaveCount(1);
    const wait = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất Excel", exact: true }).click();
    const file = await wait;
    const XLSX = backendRequire("xlsx");
    const wb = XLSX.read(fs.readFileSync(await file.path()), {
      type: "buffer",
    });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    expect(rows).toHaveLength(1);
    expect(rows[0].e2e_contract).toBe("HD-E2E-001");
  } finally {
    await page.request.put("/api/custom-fields/" + id, {
      headers: { Authorization: "Bearer " + admin },
      data: { ...payload, is_active: false, is_required: false },
    });
  }
});
test("S4-05: configure lead score using real source names and see automatic hot classification", async ({
  page,
}) => {
  await login(page, "Admin", "/leads");
  await page
    .getByRole("button", { name: "Chấm điểm lead", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cấu hình chấm điểm lead" }),
  ).toBeVisible();
  await dialog(page).getByLabel("Ngưỡng lead ấm").fill("20");
  await dialog(page).getByLabel("Ngưỡng lead nóng").fill("40");
  await page.getByRole("button", { name: "Thêm quy tắc", exact: true }).click();
  await dialog(page).getByLabel("Tiêu chí", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Nguồn lead", { exact: true })
    .click();
  await dialog(page).getByLabel("Giá trị cần khớp", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Website", { exact: true })
    .click();
  await dialog(page).getByLabel("Điểm", { exact: true }).fill("50");
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    page.getByRole("dialog", { name: "Cấu hình chấm điểm lead" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Thêm lead", exact: true }).click();
  await dialog(page).getByLabel("Họ và tên").fill("E2E Lead chấm điểm");
  await dialog(page)
    .getByLabel("Công ty", { exact: true })
    .fill("E2E Công ty điểm");
  await dialog(page)
    .getByLabel("Email", { exact: true })
    .fill("scoring@example.test");
  await dialog(page).getByLabel("Nguồn lead", { exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("Website", { exact: true })
    .click();
  await dialog(page).getByRole("button", { name: "Lưu thay đổi" }).click();
  const row = page.getByRole("row").filter({ hasText: "E2E Lead chấm điểm" });
  await expect(row).toContainText("50");
  await expect(row).toContainText("Nóng");
});
