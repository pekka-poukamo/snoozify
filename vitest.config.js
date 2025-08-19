import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
    },
  },
  resolve: {
    alias: {
      '/scripts': path.resolve(__dirname, 'scripts'),
      '/pages': path.resolve(__dirname, 'pages'),
    },
  },
})

