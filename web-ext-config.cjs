module.exports = {
  sourceDir: '.',
  artifactsDir: '.context/web-ext-artifacts',
  ignoreFiles: [
    'node_modules', 'tests', 'coverage',
    '.context', 'package.json', 'package-lock.json',
    'web-ext-config.cjs', 'web-ext-config.mjs', '*.config.js', '*.setup.js', 'setup.sh',
  ],
};
