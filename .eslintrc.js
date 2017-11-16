module.exports = {
  "extends": "airbnb-base",
  "env": {
    "browser": true
  },
  "rules": {
    "no-console": ["error", {
      allow: ["warn", "error"]
    }],
    "no-underscore-dangle": "off",
    "import/extensions": ["error", "always"]
  }
};
