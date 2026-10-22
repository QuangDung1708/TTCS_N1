const { authenticate } = require("../core/auth");
const { requireRoles } = require("../core/access");
module.exports = authenticate;
module.exports.verifyToken = authenticate;
module.exports.authMiddleware = authenticate;
module.exports.requireAdmin = requireRoles("Admin");
