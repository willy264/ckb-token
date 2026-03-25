import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../', // Load .env from root
  envPrefix: ['VITE_', 'XUDT_', 'OWNER_', 'CKB_'], // Expose these env vars to the app
})
