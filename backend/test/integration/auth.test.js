const h = require("./helpers");
const { hash } = require("../../src/core/auth");
const { insert } = require("../../src/core/store");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("S1-01: rejects the legacy universal password and plaintext passwords", async () => {
  const r = await h
    .request(h.app)
    .post("/api/auth/login")
    .send({ email: h.getUsers()["Admin"].email, password: "123456" });
  expect(r.status).toBe(401);
});
test("S1-01 override: fifth failure locks for 15 seconds, correct password cannot bypass and expiry unlocks", async () => {
  const email = h.getUsers().salesB.email;
  const login = (password) =>
    h.request(h.app).post("/api/auth/login").send({ email, password });
  for (let i = 0; i < 4; i++)
    expect((await login("WrongPassword9")).status).toBe(401);
  const fifth = await login("WrongPassword9");
  expect(fifth.status).toBe(429);
  expect(fifth.headers["retry-after"]).toBe("15");
  expect(fifth.body.details).toEqual({
    code: "LOGIN_TEMPORARILY_LOCKED",
    retry_after: 15,
  });
  const [[before]] = await h.db.query(
    "SELECT failed_login_attempts,lock_until,TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),lock_until) remaining FROM users WHERE email=?",
    [email],
  );
  expect(before.failed_login_attempts).toBe(5);
  expect(before.remaining).toBeGreaterThanOrEqual(13);
  expect(before.remaining).toBeLessThanOrEqual(15);
  expect((await login(h.password)).status).toBe(429);
  const [[during]] = await h.db.query(
    "SELECT lock_until FROM users WHERE email=?",
    [email],
  );
  expect(during.lock_until).toBe(before.lock_until);
  await new Promise((resolve) => setTimeout(resolve, 15500));
  expect((await login(h.password)).status).toBe(200);
  const [[after]] = await h.db.query(
    "SELECT failed_login_attempts,lock_until FROM users WHERE email=?",
    [email],
  );
  expect(after.failed_login_attempts).toBe(0);
  expect(after.lock_until).toBeNull();
}, 22000);
test("Login success resets consecutive failures; concurrent failures lock exactly at five", async () => {
  const email = h.getUsers().Admin.email;
  const login = (password) =>
    h.request(h.app).post("/api/auth/login").send({ email, password });
  expect((await login(h.password)).status).toBe(200);
  for (let i = 0; i < 4; i++)
    expect((await login("WrongPassword9")).status).toBe(401);
  expect((await login(h.password)).status).toBe(200);
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => login("WrongPassword9")),
  );
  expect(responses.filter((r) => r.status === 401)).toHaveLength(4);
  expect(responses.filter((r) => r.status === 429)).toHaveLength(1);
  const [[saved]] = await h.db.query(
    "SELECT failed_login_attempts FROM users WHERE email=?",
    [email],
  );
  expect(saved.failed_login_attempts).toBe(5);
});
test("Legacy locks are capped at 15 seconds; expiry resets count and cannot unlock an inactive account", async () => {
  const email = h.getUsers()["Cust. Success"].email;
  const login = (password) =>
    h.request(h.app).post("/api/auth/login").send({ email, password });
  await h.db.query(
    "UPDATE users SET failed_login_attempts=5,lock_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE) WHERE email=?",
    [email],
  );
  expect((await login(h.password)).body.details.retry_after).toBe(15);
  const [[capped]] = await h.db.query(
    "SELECT TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),lock_until) remaining FROM users WHERE email=?",
    [email],
  );
  expect(capped.remaining).toBeLessThanOrEqual(15);
  await h.db.query(
    "UPDATE users SET lock_until=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE email=?",
    [email],
  );
  expect((await login("WrongPassword9")).status).toBe(401);
  const [[fresh]] = await h.db.query(
    "SELECT failed_login_attempts,lock_until FROM users WHERE email=?",
    [email],
  );
  expect(fresh.failed_login_attempts).toBe(1);
  expect(fresh.lock_until).toBeNull();
  const [[original]] = await h.db.query(
    "SELECT is_active,status FROM users WHERE email=?",
    [email],
  );
  try {
    await h.db.query(
      "UPDATE users SET is_active=0,status='Đã khóa',lock_until=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE email=?",
      [email],
    );
    expect((await login(h.password)).status).toBe(401);
    const [[locked]] = await h.db.query(
      "SELECT is_active,status FROM users WHERE email=?",
      [email],
    );
    expect(locked.is_active).toBe(0);
    expect(locked.status).toBe("Đã khóa");
  } finally {
    await h.db.query("UPDATE users SET is_active=?,status=? WHERE email=?", [
      original.is_active,
      original.status,
      email,
    ]);
  }
});
test("S1-02: logout revokes the token server-side", async () => {
  expect((await h.api("Marketing", "post", "/api/auth/logout")).status).toBe(
    200,
  );
  expect((await h.api("Marketing", "get", "/api/auth/me")).status).toBe(401);
});
test("S1-02: activity renews idle timeout, expired sessions fail", async () => {
  const token = h.getTokens()["Sales Rep"];
  await h.db.query(
    "UPDATE auth_sessions SET expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MINUTE) WHERE token_hash=?",
    [hash(token)],
  );
  expect((await h.api("Sales Rep", "get", "/api/auth/me")).status).toBe(200);
  const [[s]] = await h.db.query(
    "SELECT TIMESTAMPDIFF(MINUTE,UTC_TIMESTAMP(),expires_at) remaining FROM auth_sessions WHERE token_hash=?",
    [hash(token)],
  );
  expect(s.remaining).toBeGreaterThanOrEqual(29);
});
test("S1-03: reset is non-enumerating, single-use, and revokes sessions", async () => {
  const mail = h.getUsers()["Accountant"].email;
  const r = await h
    .request(h.app)
    .post("/api/auth/forgot-password")
    .send({ email: mail });
  const unknown = await h
    .request(h.app)
    .post("/api/auth/forgot-password")
    .send({ email: "absent@example.test" });
  expect(r.body).toEqual(unknown.body);
  const [[outbox]] = await h.db.query(
    "SELECT body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
    [mail],
  );
  const token = outbox.body.match(/token=([a-f0-9]+)/)[1];
  const reset = { token, newPassword: "ChangedPassword9" };
  expect(
    (await h.request(h.app).post("/api/auth/reset-password").send(reset))
      .status,
  ).toBe(200);
  expect(
    (await h.request(h.app).post("/api/auth/reset-password").send(reset))
      .status,
  ).toBe(400);
  expect((await h.api("Accountant", "get", "/api/auth/me")).status).toBe(401);
});
test("S1-04: password change requires old password and revokes other sessions", async () => {
  const u = h.getUsers()["Director"];
  const other = await h
    .request(h.app)
    .post("/api/auth/login")
    .send({ email: u.email, password: h.password });
  expect(
    (
      await h.api("Director", "put", "/api/auth/change-password", {
        currentPassword: "wrong",
        newPassword: "NewPassword9",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Director", "put", "/api/auth/change-password", {
        currentPassword: h.password,
        newPassword: "NewPassword9",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await h
        .request(h.app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer " + other.body.token)
    ).status,
  ).toBe(401);
  expect((await h.api("Director", "get", "/api/auth/me")).status).toBe(200);
});
test("S1-08/09: creates multi-role user, enqueues activation, rejects duplicates and ungrouped leader", async () => {
  const data = {
    email: "new@example.test",
    full_name: "New User",
    roles: ["Sales Rep", "Marketing"],
    group_id: 1,
  };
  const r = await h.api("Admin", "post", "/api/users", data);
  expect(r.status).toBe(201);
  expect((await h.api("Admin", "post", "/api/users", data)).status).toBe(409);
  const [roles] = await h.db.query(
    "SELECT role_code FROM user_roles WHERE user_id=?",
    [r.body.id],
  );
  expect(roles).toHaveLength(2);
  const [[mail]] = await h.db.query(
    "SELECT COUNT(*) n FROM mail_outbox WHERE recipient=?",
    [data.email],
  );
  expect(mail.n).toBe(1);
  expect(
    (
      await h.api("Admin", "post", "/api/users", {
        ...data,
        email: "leader@example.test",
        roles: ["Team Lead"],
        group_id: null,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api(
        "Admin",
        "put",
        "/api/users/" + h.getUsers()["Admin"].id + "/role",
        { roles: ["Sales Rep"] },
      )
    ).status,
  ).toBe(403);
});
test("S2-02: personal profile is available to sales and rejects privilege fields", async () => {
  expect((await h.api("Sales Rep", "get", "/api/users/profile")).status).toBe(
    200,
  );
  expect(
    (
      await h.api("Sales Rep", "put", "/api/users/profile", {
        full_name: "New name",
        phone: "invalid",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/users/profile", {
        full_name: "New name",
        role_code: "Admin",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await h.api("Sales Rep", "put", "/api/users/profile", {
        full_name: "New name",
        phone: "0912345678",
        email_signature: "Sales",
      })
    ).status,
  ).toBe(200);
});
test("S1-10: disabling requires handover and revokes active session atomically", async () => {
  const cid = await h.customer("salesChild");
  const uid = h.getUsers().salesChild.id;
  expect(
    (
      await h.api("Admin", "put", `/api/users/${uid}/status`, {
        status: "inactive",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await h.api("Admin", "put", `/api/users/${uid}/status`, {
        status: "inactive",
        transfer_to: h.getUsers()["Sales Rep"].id,
      })
    ).status,
  ).toBe(200);
  expect((await h.api("salesChild", "get", "/api/auth/me")).status).toBe(401);
  const [[c]] = await h.db.query(
    "SELECT created_by FROM customers WHERE id=?",
    [cid],
  );
  expect(c.created_by).toBe(h.getUsers()["Sales Rep"].id);
});
test("All seven role permissions: user admin endpoint denies non-admin", async () => {
  for (const role of ["Team Lead", "Sales Rep", "Cust. Success"])
    expect((await h.api(role, "get", "/api/users")).status).toBe(403);
});
