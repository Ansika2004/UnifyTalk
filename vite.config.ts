import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Explicitly set the single entry — prevents Vite from scanning accessibility/index.html
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'dom-accessibility-api': resolve(
        __dirname,
        'node_modules/@testing-library/jest-dom/node_modules/dom-accessibility-api/dist/index.js'
      ),
    },
  },
  optimizeDeps: {
    entries: ['src/main.tsx'],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['accessibility/**', 'node_modules/**', 'dist/**'],
    server: {
      deps: {
        inline: ['@testing-library/jest-dom'],
      },
    },
  },
})
