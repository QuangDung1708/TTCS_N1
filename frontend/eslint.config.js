import js from "@eslint/js";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";
export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": hooks,
      local: {
        rules: {
          "jsx-uses-vars": {
            create(context) {
              return {
                JSXOpeningElement(node) {
                  let name = node.name;
                  while (name.type === "JSXMemberExpression")
                    name = name.object;
                  if (
                    name.type === "JSXIdentifier" &&
                    (/^[A-Z]/.test(name.name) ||
                      node.name.type === "JSXMemberExpression")
                  )
                    context.sourceCode.markVariableAsUsed(name.name, node);
                },
              };
            },
          },
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "local/jsx-uses-vars": "error",
      "no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      "react-hooks/rules-of-hooks": "error",
      "no-constant-binary-expression": "error",
    },
  },
];
