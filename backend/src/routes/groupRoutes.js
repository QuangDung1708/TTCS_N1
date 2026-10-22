// Preserve the existing /groups URLs through the same organization handlers.
const r = require("express").Router();
const { db } = require("../core/store");
const { route, id, fail } = require("../core/http");
const { authenticate } = require("../core/auth");
const { authorize } = require("../core/access");
r.use(authenticate, authorize("CATEGORY"));
r.get(
  "/:id/members",
  route(async (req, res) => {
    const gid = id(req.params.id);
    const nested = req.query.include_descendants === "1";
    const [data] = await db.query(
      nested
        ? "WITH RECURSIVE branch AS (SELECT id FROM `groups` WHERE id=? UNION DISTINCT SELECT g.id FROM `groups` g JOIN branch b ON g.parent_id=b.id) SELECT u.id,u.email,u.full_name,u.role_code,u.group_id,g.name group_name FROM users u JOIN branch b ON b.id=u.group_id JOIN `groups` g ON g.id=u.group_id ORDER BY u.full_name,u.id"
        : "SELECT u.id,u.email,u.full_name,u.role_code,u.group_id,g.name group_name FROM users u LEFT JOIN `groups` g ON g.id=u.group_id WHERE u.group_id=? ORDER BY u.full_name,u.id",
      [gid],
    );
    res.json({ data });
  }),
);
r.use((req, res, next) => {
  if (req.path === "/tree") return next();
  if (req.path === "/") {
    req.url = "/groups";
    return next();
  }
  const m = req.path.match(/^\/(\d+)(?:\/(assign-members|leader))?$/);
  if (m) {
    req.url =
      "/groups/" + m[1] + (m[2] === "assign-members" ? "/assign-member" : "");
    if (m[2] === "leader") req.method = "PUT";
  }
  next();
}, require("./organizationRoutes"));
module.exports = r;
