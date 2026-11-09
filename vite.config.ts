/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': new URL('./shared', import.meta.url).pathname,
    },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts'],
  },
})
