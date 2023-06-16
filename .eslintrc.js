module.exports = {
  extends: ['eslint:recommended', 'prettier', 'plugin:n/recommended'],
  plugins: ['eslint-plugin-n'],
  rules: {
    'no-console': 'error',
    yoda: 'error',
    'prefer-const': ['error'],
    'no-constant-condition': ['error', {checkLoops: false}]
  },
  env: {
    node: true
  }
};
