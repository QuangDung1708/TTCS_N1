module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  testTimeout: 30000,
  collectCoverageFrom: [
    "src/core/**/*.js",
    "src/jobs/**/*.js",
    "src/routes/{auth,user,customer,contact,catalog,lead,deal,organization,group,campaign,system,dashboard,import,quote,activity}Routes.js",
  ],
  coverageReporters: ["text", "json-summary", "lcov"],
  coverageThreshold: {
    global: { branches: 60, lines: 75, functions: 75, statements: 75 },
  },
};
