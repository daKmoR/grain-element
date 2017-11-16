module.exports = {
  "extends": "airbnb-base",
  "env": {
    "browser": true
  },
  "rules": {
    "no-console": ["error", {
      allow: ["warn", "error"]
    }],
    "no-underscore-dangle": [2, {
      "allowAfterThis": true
    }]
  }
};
