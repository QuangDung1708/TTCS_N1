const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
async function verifyPassword(password, encoded) {
  const [salt, hash] = encoded.split(":");
  const actual = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
function createStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  let state = fs.existsSync(filename)
    ? JSON.parse(fs.readFileSync(filename, "utf8"))
    : { users: [], tokens: [], requests: {} };
  return {
    get state() {
      return state;
    },
    update(change) {
      const next = structuredClone(state);
      const result = change(next);
      fs.writeFileSync(`${filename}.tmp`, JSON.stringify(next, null, 2), {
        mode: 0o600,
      });
      fs.renameSync(`${filename}.tmp`, filename);
      state = next;
      return result;
    },
  };
}
module.exports = { createStore, hashPassword, verifyPassword };
