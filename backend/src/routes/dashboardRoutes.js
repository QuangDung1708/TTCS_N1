const r = require("express").Router();
const { db } = require("../core/store");
const { route } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize, scope } = require("../core/access");
r.use(authenticate, authorize("REPORT"));
r.get(
  "/stats",
  route(async (req, res) => {
    const cs = await scope(req.user, "REPORT", "c"),
      ds = await scope(req.user, "REPORT", "d", false, db, "owner_id");
    const [[customers]] = await db.query(
      `SELECT COUNT(*) total,SUM(created_at>=DATE_FORMAT(UTC_DATE(),'%Y-%m-01')) new_count FROM customers c WHERE ${cs.sql}`,
      cs.params,
    );
    const [[deals]] = await db.query(
      `SELECT COUNT(*) total,SUM(status='WON') won,SUM(status IN ('WON','LOST')) closed,COALESCE(SUM(CASE WHEN status='WON' THEN actual_amount ELSE 0 END),0) revenue,COALESCE(SUM(CASE WHEN status='OPEN' THEN amount ELSE 0 END),0) pipeline FROM deals d WHERE ${ds.sql}`,
      ds.params,
    );
    const [stages] = await db.query(
      `SELECT d.stage,COUNT(*) count FROM deals d WHERE ${ds.sql} GROUP BY d.stage`,
      ds.params,
    );
    const [recentDeals] = await db.query(
      `SELECT d.id AS \`key\`,d.title deal,d.amount value,d.stage,c.company_name company,u.full_name owner FROM deals d JOIN customers c ON c.id=d.customer_id LEFT JOIN users u ON u.id=d.owner_id WHERE ${ds.sql} ORDER BY d.id DESC LIMIT 5`,
      ds.params,
    );
    const us = await scope(req.user, "REPORT", "u", false, db, "id");
    const [[target]] = await db.query(
      `SELECT COALESCE(SUM(t.amount),0) amount FROM sales_targets t JOIN users u ON u.id=t.user_id WHERE UTC_DATE() BETWEEN t.start_date AND t.end_date AND (${us.sql})`,
      us.params,
    );
    const [[actual]] = await db.query(
      `SELECT COALESCE(SUM(d.actual_amount),0) amount FROM deals d WHERE d.status='WON' AND (${ds.sql}) AND EXISTS(SELECT 1 FROM sales_targets t WHERE t.user_id=d.owner_id AND UTC_DATE() BETWEEN t.start_date AND t.end_date AND d.signed_date BETWEEN t.start_date AND t.end_date)`,
      ds.params,
    );
    res.json({
      kpi: {
        totalCustomers: customers.total,
        newCustomers: Number(customers.new_count || 0),
        pipelineValue: Number(deals.pipeline),
        dealsWon: Number(deals.won || 0),
        winRate: deals.closed
          ? (Number(deals.won) * 100) / Number(deals.closed)
          : 0,
        targetProgress:
          Number(target.amount) > 0
            ? (Number(actual.amount) * 100) / Number(target.amount)
            : 0,
      },
      funnel: Object.fromEntries(
        stages.map((s) => [s.stage.toLowerCase(), s.count]),
      ),
      recentDeals,
      data: {
        customers: customers.total,
        deals: deals.total,
        revenue: Number(deals.revenue),
        pipeline: Number(deals.pipeline),
      },
    });
  }),
);
r.get(
  "/notifications",
  route(async (req, res) => {
    const [data] = await db.query(
      "SELECT *,message AS title,message AS `desc` FROM crm_notifications WHERE user_id=? ORDER BY id DESC LIMIT 100",
      [req.user.id],
    );
    res.json({ data });
  }),
);
module.exports = r;
