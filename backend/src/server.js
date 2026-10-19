const path = require("node:path");
const { createStore } = require("./store");
const { createService } = require("./service");
const { createApp } = require("./app");
const port = Number(process.env.PORT || 5057);
const store = createStore(path.resolve(__dirname, "../data/users.json"));
createApp(createService({ store })).listen(port, "127.0.0.1", () =>
  console.log(
    `N1-279: http://localhost:${port} | Ban mau local, DB JSON rieng, khong can MySQL`,
  ),
);
