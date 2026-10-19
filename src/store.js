const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const scrypt = require("node:util").promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
function createStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  let state = fs.existsSync(filename)
    ? JSON.parse(fs.readFileSync(filename, "utf8"))
    : { users: [] };
  return {
    get state() {
      return state;
    },
    append(users) {
      const next = { users: [...state.users, ...users] };
      fs.writeFileSync(`${filename}.tmp`, JSON.stringify(next, null, 2), {
        mode: 0o600,
      });
      fs.renameSync(`${filename}.tmp`, filename);
      state = next;
    },
  };
}
module.exports = { createStore, hashPassword };
