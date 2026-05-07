import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    // Skip TypeScript type checking during build (handled separately)
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
  test: {
    root: __dirname,
    globals: true,
    environment: 'happy-dom',
    setupFiles: [resolve(__dirname, './src/test/setup.ts')],
  },
})
