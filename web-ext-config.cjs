module.exports = {
  sourceDir: '.',
  artifactsDir: '.context/web-ext-artifacts',
  ignoreFiles: [
    'node_modules', 'tests', 'coverage',
    '.context', 'web-ext-config.cjs', '*.config.js', '*.setup.js', 'setup.sh',
  ],
};
