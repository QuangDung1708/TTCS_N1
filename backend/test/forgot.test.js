const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createStore, hashPassword, verifyPassword } = require("../src/store");
const { createService, MESSAGE } = require("../src/service");
const { createApp } = require("../src/app");
async function setup(t, overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "n1-277-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "db.json");
  const store = createStore(filename);
  const passwordHash = await hashPassword("Original123!");
  store.update((s) =>
    s.users.push({ id: "1", email: "sales@example.test", passwordHash }),
  );
  let time = 2_000_000;
  const messages = [];
  const service = createService({
    store,
    sendMail: async (m) => messages.push(m),
    appUrl: "http://localhost:5055",
    now: () => time,
    ...overrides,
  });
  const token = () => messages.at(-1).text.match(/token=([a-f0-9]{64})/)[1];
  return {
    store,
    filename,
    service,
    messages,
    token,
    advance: (n) => {
      time += n;
    },
  };
}
test("Email known/unknown: same body; normalize case; no raw token stored", async (t) => {
  const x = await setup(t);
  const a = await x.service.forgot("Sales@example.test");
  const b = await x.service.forgot("unknown@example.test");
  assert.deepEqual(a, b);
  assert.equal(a.message, MESSAGE);
  assert.equal(x.messages.length, 1);
  assert.ok(!fs.readFileSync(x.filename, "utf8").includes(x.token()));
});
test("Cooldown 60s is enforced on server; data survives reopening store", async (t) => {
  const x = await setup(t);
  await x.service.forgot("sales@example.test");
  await x.service.forgot("sales@example.test");
  assert.equal(x.messages.length, 1);
  assert.equal(createStore(x.filename).state.tokens.length, 1);
  x.advance(60000);
  await x.service.forgot("sales@example.test");
  assert.equal(x.messages.length, 2);
});
test("Link valid before 30min and rejected exactly at expiration", async (t) => {
  const x = await setup(t);
  await x.service.forgot("sales@example.test");
  x.advance(1_799_999);
  x.service.validToken(x.token());
  x.advance(1);
  assert.throws(() => x.service.validToken(x.token()), /hết hạn/);
});
test("Successful reset persists password; invalidates all links and old password", async (t) => {
  const x = await setup(t);
  await x.service.forgot("sales@example.test");
  const first = x.token();
  x.advance(60000);
  await x.service.forgot("sales@example.test");
  await x.service.reset({
    token: first,
    password: "NewPassword42!",
    confirmPassword: "NewPassword42!",
  });
  assert.throws(() => x.service.validToken(first));
  assert.throws(() => x.service.validToken(x.token()));
  const hash = createStore(x.filename).state.users[0].passwordHash;
  assert.equal(await verifyPassword("NewPassword42!", hash), true);
  assert.equal(await verifyPassword("Original123!", hash), false);
});
test("Weak/mismatched passwords and malformed token are rejected without consuming link", async (t) => {
  const x = await setup(t);
  await x.service.forgot("sales@example.test");
  for (const password of [
    "short1",
    "onlyletters",
    "123456789",
    "a".repeat(129),
  ]) {
    await assert.rejects(
      x.service.reset({
        token: x.token(),
        password,
        confirmPassword: password,
      }),
      /8–128/,
    );
  }
  await assert.rejects(
    x.service.reset({
      token: x.token(),
      password: "New123456",
      confirmPassword: "Other1234",
    }),
    /không khớp/,
  );
  x.service.validToken(x.token());
  assert.throws(() => x.service.validToken("bad"));
  await assert.rejects(x.service.forgot("bad"), /email hợp lệ/);
});
test("Two concurrent resets can consume token only once", async (t) => {
  const x = await setup(t);
  await x.service.forgot("sales@example.test");
  const results = await Promise.allSettled(
    [1, 2].map((n) =>
      x.service.reset({
        token: x.token(),
        password: `Password${n}!`,
        confirmPassword: `Password${n}!`,
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("SMTP error keeps generic response and removes undelivered token", async (t) => {
  let count = 0;
  const x = await setup(t, {
    sendMail: async () => {
      throw new Error("SMTP failed");
    },
    onMailError: () => count++,
  });
  assert.deepEqual(await x.service.forgot("sales@example.test"), {
    message: MESSAGE,
  });
  assert.equal(count, 1);
  assert.equal(x.store.state.tokens.length, 0);
});
test("HTTP: sample page, real API reset flow, input errors and rate limiting", async (t) => {
  const x = await setup(t);
  const server = createApp(x.service).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body) =>
    fetch(base + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + "/reset-password")).status, 200);
  assert.equal(
    (await post("/api/auth/forgot-password", { email: "bad" })).status,
    400,
  );
  const a = await post("/api/auth/forgot-password", {
    email: "sales@example.test",
  });
  const b = await post("/api/auth/forgot-password", {
    email: "unknown@example.test",
  });
  assert.deepEqual(await a.json(), await b.json());
  assert.equal(
    (await post("/api/auth/check-reset-token", { token: x.token() })).status,
    200,
  );
  assert.equal(
    (
      await post("/api/auth/reset-password", {
        token: x.token(),
        password: "Fresh1234!",
        confirmPassword: "Fresh1234!",
      })
    ).status,
    200,
  );
  assert.equal(
    (await post("/api/auth/check-reset-token", { token: x.token() })).status,
    400,
  );
  let result;
  for (let n = 0; n < 21; n++)
    result = await post("/api/auth/forgot-password", {
      email: "other@example.test",
    });
  assert.equal(result.status, 429);
  assert.ok(Number(result.headers.get("retry-after")) > 0);
});
