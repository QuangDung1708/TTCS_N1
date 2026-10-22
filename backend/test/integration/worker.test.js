const h = require("./helpers");
const net = require("net");
const { startWorker, mailJobs } = require("../../src/jobs/worker");
beforeAll(() => h.setup());
afterAll(() => h.db.end());
test("Scheduled worker assigns newly arrived leads on its default 30-second cadence", async () => {
  const configured = await h.api(
    "Director",
    "put",
    "/api/leads/assignment-rules",
    {
      rules: [
        {
          name: "Runtime assignment",
          priority: 1,
          group_id: 1,
          sla_minutes: 60,
        },
      ],
    },
  );
  expect(configured.status).toBe(200);
  const stop = startWorker();
  try {
    const initialDeadline = Date.now() + 5000;
    let firstRun = false;
    while (Date.now() < initialDeadline) {
      const [[job]] = await h.db.query(
        "SELECT last_run_at FROM crm_job_runs WHERE job_name='lead-assignment'",
      );
      if (job) {
        firstRun = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(firstRun).toBe(true);
    const lead = await h.api("Marketing", "post", "/api/leads", {
      full_name: "Scheduled lead",
      company_name: "Worker test business",
      email: "scheduled@example.test",
      source_id: 1,
    });
    expect(lead.status).toBe(201);
    const deadline = Date.now() + 35000;
    let assigned = null;
    while (Date.now() < deadline) {
      const [[row]] = await h.db.query(
        "SELECT owner_id,status FROM leads WHERE id=?",
        [lead.body.id],
      );
      if (row.owner_id) {
        assigned = row;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(assigned?.status).toBe("ASSIGNED");
    expect(assigned?.owner_id).toBe(h.getUsers()["Sales Rep"].id);
  } finally {
    await stop();
  }
}, 45000);
test("SMTP connection failure leaves the message queued with retry metadata", async () => {
  const server = net.createServer((socket) => socket.destroy());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    Object.assign(process.env, {
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(server.address().port),
      SMTP_SECURE: "false",
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "crm@example.test",
    });
    await h
      .request(h.app)
      .post("/api/auth/forgot-password")
      .send({ email: h.getUsers().Director.email });
    await mailJobs();
    const [[queued]] = await h.db.query(
      "SELECT sent_at,attempts,last_error,body FROM mail_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",
      [h.getUsers().Director.email],
    );
    expect(queued.sent_at).toBeNull();
    expect(queued.attempts).toBe(1);
    expect(queued.last_error).toBeTruthy();
    expect(queued.body).toContain("reset-password?token=");
  } finally {
    for (const k of keys)
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    await new Promise((resolve) => server.close(resolve));
  }
});
