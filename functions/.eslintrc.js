module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    "google"
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module"
  },
  rules: {
    quotes: ["error", "double"],
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 100 }],
    indent: ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "comma-dangle": ["error", "always-multiline"]
  }
};
