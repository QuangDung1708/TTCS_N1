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
    const [data] = await db.query(
      "SELECT id,email,full_name,role_code,group_id FROM users WHERE group_id=?",
      [id(req.params.id)],
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
