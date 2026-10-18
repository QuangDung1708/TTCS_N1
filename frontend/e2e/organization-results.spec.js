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
async function choose(page, label, name) {
  await page
    .getByRole("dialog")
    .last()
    .getByLabel(label, { exact: true })
    .click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name, exact: true })
    .click();
}
async function drag(page, title, result) {
  const handle = page.getByRole("button", {
    name: "Kéo cơ hội " + title,
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox(),
    to = await page.locator(`[data-stage-id="${result}"]`).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 16, from.y + 16, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 110, { steps: 16 });
  await page.mouse.up();
}
test("One organization tree expands nested departments and lists staff from the whole branch", async ({
  page,
}) => {
  const token = await login(page);
  const post = async (route, data) => {
    const r = await page.request.post("/api/" + route, {
      headers: { Authorization: "Bearer " + token },
      data,
    });
    expect(r.ok()).toBeTruthy();
    return r.json();
  };
  let parent = null;
  for (let i = 0; i < 3; i++) {
    const user = await post("users", {
      email: `org-tree-${i}@example.test`,
      full_name: `Nhân sự cây ${i}`,
      roles: ["Sales Rep"],
    });
    const group = await post("organization/groups", {
      name: `Cây kiểm tra cấp ${i + 1}`,
      leader_id: user.id,
      parent_id: parent,
      description: "Nhánh tổ chức lưu trong DB",
    });
    parent = group.id;
  }
  await page.goto("/organization");
  await expect(
    page.getByRole("tab", { name: /Cây nhóm|Cây công ty/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Cây kiểm tra cấp 3" }),
  ).toBeVisible();
  const root = page.getByRole("row").filter({ hasText: "Cây kiểm tra cấp 1" });
  await expect(root).toContainText("org-tree-0@example.test");
  await root
    .getByRole("button", { name: "Thu gọn Cây kiểm tra cấp 1", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Cây kiểm tra cấp 3" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mở rộng tất cả", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Cây kiểm tra cấp 3" }),
  ).toBeVisible();
  await root.getByRole("button", { name: "3 nhân sự", exact: true }).click();
  const drawer = page.getByRole("dialog").last();
  for (let i = 0; i < 3; i++)
    await expect(
      drawer.getByText(`org-tree-${i}@example.test`, { exact: true }),
    ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "Cây kiểm tra cấp 3" }),
  ).toBeVisible();
});
test("Pointer drop to Won opens required closing form and respects stage conditions before persisting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  const token = await login(page);
  const created = await page.request.post("/api/deals", {
    headers: { Authorization: "Bearer " + token },
    data: {
      title: "Kéo chốt thắng",
      customer_id: 1,
      contact_id: 1,
      stage_id: 1,
      source_id: 1,
      amount: 3000000,
      expected_close_date: "2099-01-01",
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  await page.goto("/pipeline");
  await drag(page, "Kéo chốt thắng", "WON");
  const form = page.getByRole("dialog", { name: "Chốt cơ hội thành công" });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(
    form.getByText("Vui lòng nhập thông tin này.", { exact: true }),
  ).toBeVisible();
  await choose(page, "Lý do thắng", "Fit");
  await form
    .getByLabel("Giá trị chốt thực tế", { exact: true })
    .fill("2250000");
  const rejected = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/deals/${id}/close`) &&
      r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect((await rejected).status()).toBe(422);
  await expect(form).toBeVisible();
  await form.getByLabel(/Lý do ghi đè/).fill("Đã xác minh hồ sơ và duyệt chốt");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(form).toBeHidden();
  const saved = await page.request.get(`/api/deals/${id}`, {
    headers: { Authorization: "Bearer " + token },
  });
  const d = (await saved.json()).data;
  expect(d.status).toBe("WON");
  expect(Number(d.actual_amount)).toBe(2250000);
  expect(d.win_reason_id).toBe(1);
  await page.goto("/pipeline");
  await expect(
    page
      .locator('[data-stage-id="WON"]')
      .getByRole("button", { name: "Kéo chốt thắng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Kéo cơ hội Kéo chốt thắng",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("Pointer drop to Lost can be cancelled and saves reason and competitor only after confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  const token = await login(page);
  const headers = { Authorization: "Bearer " + token };
  const competitor = await page.request.post("/api/competitors", {
    headers,
    data: { name: "Đối thủ kéo thả" },
  });
  expect(competitor.ok()).toBeTruthy();
  const rival = (await competitor.json()).id;
  const created = await page.request.post("/api/deals", {
    headers,
    data: {
      title: "Kéo chốt thua",
      customer_id: 1,
      contact_id: 1,
      stage_id: 2,
      source_id: 1,
      amount: 5000000,
      expected_close_date: "2099-01-01",
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  await page.goto("/pipeline");
  await drag(page, "Kéo chốt thua", "LOST");
  let form = page.getByRole("dialog", { name: "Đóng cơ hội thất bại" });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Hủy", exact: true }).click();
  expect(
    (await (await page.request.get(`/api/deals/${id}`, { headers })).json())
      .data.status,
  ).toBe("OPEN");
  await page.goto("/pipeline");
  await drag(page, "Kéo chốt thua", "LOST");
  form = page.getByRole("dialog", { name: "Đóng cơ hội thất bại" });
  await choose(page, "Lý do thua", "Budget");
  await choose(page, "Đối thủ thắng thầu (nếu có)", "Đối thủ kéo thả");
  await form
    .getByLabel("Ghi chú", { exact: true })
    .fill("Khách hàng lựa chọn phương án khác");
  await form.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(form).toBeHidden();
  const saved = (
    await (await page.request.get(`/api/deals/${id}`, { headers })).json()
  ).data;
  expect(saved.status).toBe("LOST");
  expect(saved.loss_reason_id).toBe(2);
  expect(saved.competitor_id).toBe(rival);
  await page.goto("/pipeline");
  await expect(
    page
      .locator('[data-stage-id="LOST"]')
      .getByRole("button", { name: "Kéo chốt thua", exact: true }),
  ).toBeVisible();
});
