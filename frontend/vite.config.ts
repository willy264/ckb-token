import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../', // Load .env from root
  envPrefix: ['VITE_', 'XUDT_', 'OWNER_', 'CKB_'], // Expose these env vars to the app
})
