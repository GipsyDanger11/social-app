import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration for the Social App frontend.
 *
 * Local dev convenience: the `/api` and `/uploads` paths are proxied to the
 * Express backend on port 5000, so the React app can call relative URLs
 * (e.g. `axios.post('/api/auth/login', ...)`) without CORS headaches.
 * In production the frontend talks to the deployed backend via the
 * `VITE_API_URL` / `VITE_SOCKET_URL` env vars — no proxy involved.
 *
 * @see https://vite.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
