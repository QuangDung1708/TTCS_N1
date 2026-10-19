import { test as base, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import backendTools from "./backend.cjs";
// All browser scenarios run serially against a disposable database and the same
// loopback IP. Reset only the shared login/IP budget between scenarios; leave
// account failure counters intact, including the five-failure lockout test.
const test = base.extend({
  loginRateIsolation: [
    async ({ baseURL }, use) => {
      if (
        !baseURL ||
        !["127.0.0.1", "localhost", "[::1]"].includes(new URL(baseURL).hostname)
      )
        throw new Error(
          "Browser fixture rate isolation is restricted to loopback.",
        );
      if (
        !/^crm_test_[a-z0-9]+$/.test(process.env.DB_NAME || "") ||
        process.env.ALLOW_DB_TEST_RESET !== "1"
      )
        throw new Error(
          "Browser fixtures require an explicitly disposable test DB.",
        );
      const mysql = backendTools.backendRequire("mysql2/promise");
      const c = await mysql.createConnection({
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME,
      });
      try {
        const keys = ["127.0.0.1", "::ffff:127.0.0.1", "::1"].map((ip) =>
          createHash("sha256")
            .update("login:" + ip)
            .digest("hex"),
        );
        await c.query(
          "DELETE FROM api_rate_limits WHERE LEFT(bucket,64) IN (?)",
          [keys],
        );
      } finally {
        await c.end();
      }
      await use();
    },
    { auto: true },
  ],
});
export { test, expect };
