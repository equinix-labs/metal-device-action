module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:n/recommended',
    'plugin:json/recommended'
  ],
  plugins: ['eslint-plugin-n'],
  rules: {
    'n/no-missing-require': 'off',
    'no-console': 'error',
    yoda: 'error',
    'prefer-const': ['error'],
    'no-constant-condition': ['error', {checkLoops: false}]
  },
  env: {
    node: true
  }
};
