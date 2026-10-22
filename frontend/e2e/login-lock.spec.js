import { test, expect } from "@playwright/test";
test("Five incorrect logins enforce a 15-second server lock, show countdown and recover after refresh", async ({
  page,
}) => {
  const email = "login-lock-ui@example.test";
  const signed = await page.request.post("/api/auth/login", {
    data: { email: "test1@example.test", password: "IntegrationOnly9!" },
  });
  expect(signed.status()).toBe(200);
  const { token } = await signed.json();
  const created = await page.request.post("/api/users", {
    headers: { Authorization: "Bearer " + token },
    data: {
      full_name: "Login lock UI",
      email,
      temporary_password: "IntegrationOnly9!",
      roles: ["Sales Rep"],
    },
  });
  expect(created.status()).toBe(201);
  await page.goto("/login");
  await page.getByLabel("Email công việc", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("WrongPassword9!");
  for (let i = 0; i < 5; i++) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    expect((await response).status()).toBe(i === 4 ? 429 : 401);
  }
  await expect(page.getByRole("alert")).toContainText(
    "Đăng nhập tạm khóa sau 5 lần sai liên tiếp",
  );
  await expect(
    page.getByRole("button", { name: /Thử lại sau \d+s/ }),
  ).toBeDisabled();
  const bypass = await page.request.post("/api/auth/login", {
    data: { email, password: "IntegrationOnly9!" },
  });
  expect(bypass.status()).toBe(429);
  await page.reload();
  await page.getByLabel("Email công việc", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("IntegrationOnly9!");
  const retried = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await retried).status()).toBe(429);
  const login = page.getByRole("button", { name: "Đăng nhập", exact: true });
  await expect(login).toBeEnabled({ timeout: 18000 });
  await login.click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
});
