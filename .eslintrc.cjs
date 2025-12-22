module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  globals: {
    chrome: "readonly"
  },
  rules: {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  overrides: [
    {
      files: ["shared/__tests__/**/*.js"],
      env: {
        node: true
      }
    }
  ]
};
