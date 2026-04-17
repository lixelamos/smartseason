import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Default is 2 minutes — if nothing on :4000 responds, the UI hangs too long.
        proxyTimeout: 25_000,
      },
    },
  },
})
