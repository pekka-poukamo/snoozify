import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  resolve: {
    alias: {
      '/scripts': path.resolve(__dirname, 'scripts'),
      '/pages': path.resolve(__dirname, 'pages'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'tests/setup/setup.js')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      include: ['scripts/**/*.js', 'pages/**/*.js'],
      exclude: ['pages/**/*.html', 'tests/**'],
    },
  },
})