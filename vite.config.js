import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // Expose server to Docker network
    port: 5173,         // Standard dev port
    watch: {
      usePolling: true, // Force polling so file changes sync seamlessly across Windows WSL2/Docker filesystem boundary
      interval: 100     // Poll every 100ms
    }
  }
})
