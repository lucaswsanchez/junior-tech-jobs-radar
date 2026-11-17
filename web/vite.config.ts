/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Recharts accounts for most of the bundle; the app is a single dashboard page.
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
  },
})
