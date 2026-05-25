export default {
  sourceDir: '.',
  artifactsDir: '.context/web-ext-artifacts',
  ignoreFiles: [
    'node_modules', 'tests', 'coverage',
    '.context', 'web-ext-config.cjs', 'web-ext-config.mjs', '*.config.js', '*.setup.js', 'setup.sh',
  ],
  run: {
    target: ['chromium'],
    chromiumProfile: '.context/chrome-profile',
    keepProfileChanges: true,
    startUrl: ['about:newtab'],
  },
};
