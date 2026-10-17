const { db } = require("../core/store");
const { assignPending } = require("../core/leads");
const nodemailer = require("nodemailer");
async function businessJobs() {
  const c = await db.getConnection();
  let locked = false;
  try {
    const [[r]] = await c.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':crm-worker'),0) acquired",
    );
    if (!r.acquired) return;
    locked = true;
    await c.beginTransaction();
    await assignPending(c);
    const [overdue] = await c.query(
      "SELECT l.*,g.leader_id FROM leads l LEFT JOIN `groups` g ON g.id=l.group_id WHERE l.status IN ('ASSIGNED','CARING') AND l.contacted_at IS NULL AND l.sla_due_at<UTC_TIMESTAMP() AND l.sla_breached=0 FOR UPDATE",
    );
    for (const l of overdue) {
      await c.query("UPDATE leads SET sla_breached=1 WHERE id=?", [l.id]);
      if (l.leader_id)
        await c.query(
          "INSERT INTO crm_notifications (user_id,event_key,message) VALUES (?,?,?) ON DUPLICATE KEY UPDATE message=VALUES(message)",
          [l.leader_id, "lead-sla:" + l.id, "Lead quá SLA: " + l.full_name],
        );
    }
    const [[daily]] = await c.query(
      "SELECT last_run_at FROM crm_job_runs WHERE job_name='deal-flags' AND last_run_at>=UTC_DATE()",
    );
    if (!daily) {
      await c.query(
        "UPDATE deals d JOIN pipeline_stages s ON s.id=d.stage_id SET d.stagnant=CASE WHEN COALESCE((SELECT MAX(a.created_at) FROM customer_activities a WHERE a.deal_id=d.id),d.last_activity_at,d.created_at)<DATE_SUB(UTC_TIMESTAMP(),INTERVAL s.stagnant_days DAY) THEN 1 ELSE 0 END,d.overdue=CASE WHEN d.expected_close_date<UTC_DATE() THEN 1 ELSE 0 END WHERE d.status='OPEN'",
      );
      await c.query(
        "UPDATE deals SET stagnant=0,overdue=0 WHERE status<>'OPEN'",
      );
      await c.query(
        "INSERT INTO crm_notifications (user_id,event_key,message) SELECT g.leader_id,CONCAT('deal-flag:',d.id,':',UTC_DATE()),CONCAT('Cơ hội cần can thiệp: ',d.title) FROM deals d JOIN `groups` g ON g.id=d.group_id WHERE d.status='OPEN' AND (d.stagnant=1 OR d.overdue=1) AND g.leader_id IS NOT NULL ON DUPLICATE KEY UPDATE message=VALUES(message)",
      );
      await c.query(
        "INSERT INTO crm_job_runs (job_name,last_run_at) VALUES ('deal-flags',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE last_run_at=VALUES(last_run_at)",
      );
    }
    await c.query(
      "INSERT INTO crm_job_runs (job_name,last_run_at) VALUES ('lead-assignment',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE last_run_at=VALUES(last_run_at)",
    );
    await c.query(
      "DELETE FROM api_rate_limits WHERE expires_at<UTC_TIMESTAMP()",
    );
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    if (locked)
      await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':crm-worker'))");
    c.release();
  }
}
async function mailJobs() {
  // No implicit use of repository-embedded Gmail credentials. Configure an SMTP endpoint explicitly.
  if (!process.env.SMTP_HOST) return { configured: false };
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  const c = await db.getConnection();
  let locked = false;
  try {
    // Serialize dispatch without SKIP LOCKED (unsupported on MariaDB 10.4).
    // A second worker returns immediately instead of waiting during SMTP I/O.
    const [[r]] = await c.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':crm-mail-worker'),0) acquired",
    );
    if (!r.acquired) return { configured: true, skipped: true };
    locked = true;
    await c.beginTransaction();
    const [rows] = await c.query(
      "SELECT * FROM mail_outbox WHERE sent_at IS NULL AND next_attempt_at<=UTC_TIMESTAMP() AND attempts<10 ORDER BY id LIMIT 10 FOR UPDATE",
    );
    for (const row of rows) {
      try {
        await transport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: row.recipient,
          subject: row.subject,
          text: row.body,
          messageId: `<crm-${row.id}@${process.env.MAIL_MESSAGE_DOMAIN || "crm.local"}>`,
        });
        await c.query(
          "UPDATE mail_outbox SET sent_at=UTC_TIMESTAMP(),body='',last_error=NULL WHERE id=?",
          [row.id],
        );
      } catch (e) {
        await c.query(
          "UPDATE mail_outbox SET attempts=attempts+1,next_attempt_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),last_error=? WHERE id=?",
          [e.code || "SMTP_FAILURE", row.id],
        );
      }
    }
    await c.commit();
    return { configured: true };
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    try {
      if (locked)
        await c.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':crm-mail-worker'))");
    } finally {
      c.release();
      transport.close();
    }
  }
}
function startWorker() {
  let stopped = false,
    running = null;
  const run = () => {
    if (stopped || running) return;
    running = businessJobs()
      .then(mailJobs)
      .catch((e) => console.error("worker_failed", e.code || e.message))
      .finally(() => {
        running = null;
      });
  };
  run();
  const timer = setInterval(run, 30000);
  timer.unref();
  return async () => {
    stopped = true;
    clearInterval(timer);
    if (running) await running;
  };
}
if (require.main === module) {
  const stop = startWorker();
  for (const signal of ["SIGTERM", "SIGINT"])
    process.once(signal, async () => {
      await stop();
      await db.end();
      process.exit(0);
    });
  setInterval(() => {}, 60000);
}
module.exports = { businessJobs, mailJobs, startWorker };
