import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Production builds are served from a subpath of ocampomico.com; override with
// BASE_PATH=/ for a standalone deploy.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/tools/homecalculator/') : '/',
  plugins: [react(), tailwindcss()],
}))
