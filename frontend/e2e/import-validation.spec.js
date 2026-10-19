import backendTools from "./backend.cjs";
import { test, expect } from "./fixtures";
const { backendRequire: require } = backendTools;
const XLSX = require("xlsx");
test("Customer and lead Excel previews reject existing and same-file identical rows, then import only the new row", async ({
  page,
}) => {
  const signed = await page.request.post("/api/auth/login", {
    data: { email: "test1@example.test", password: "IntegrationOnly9!" },
  });
  const { token } = await signed.json();
  await page.goto("/login");
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  for (const entity of ["customers", "leads"]) {
    const row = {
      company_name: "Excel duplicate UI " + entity,
      email: entity + "-dup@example.test",
      ...(entity === "leads"
        ? { full_name: "Excel lead UI", source_id: 1 }
        : {}),
    };
    const created = await page.request.post(`/api/${entity}`, {
      headers: { Authorization: "Bearer " + token },
      data: row,
    });
    expect(created.status()).toBe(201);
    const fresh = {
      ...row,
      company_name: row.company_name + " new",
      email: entity + "-fresh@example.test",
    };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet([row, row, fresh, fresh]),
      "Dữ liệu",
    );
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    await page.goto("/" + entity);
    await page.getByRole("button", { name: "Nhập Excel", exact: true }).click();
    const modal = page.getByRole("dialog").last();
    await modal.locator("input[type=file]").setInputFiles({
      name: "duplicates.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
    await expect(modal.getByText("Không hợp lệ", { exact: true })).toHaveCount(
      3,
    );
    await expect(
      modal.getByText("Không được nhập", { exact: true }),
    ).toHaveCount(3);
    await expect(modal.getByLabel(/Xử lý dòng/)).toHaveCount(0);
    await modal
      .getByRole("button", { name: "Nhập dữ liệu vào hệ thống", exact: true })
      .click();
    await expect(
      modal.getByText("Đã nhập 1 dòng · Bỏ qua 3 dòng", { exact: true }),
    ).toBeVisible();
    await modal.getByRole("button", { name: "Hoàn tất", exact: true }).click();
    const list = await page.request.get(
      `/api/${entity}?search=${encodeURIComponent(row.company_name)}`,
      { headers: { Authorization: "Bearer " + token } },
    );
    expect((await list.json()).data).toHaveLength(2);
  }
});
