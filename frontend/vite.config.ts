import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // envDir defaults to project root (frontend/) on Vercel.
  // For local dev, Vite also checks parent dirs automatically via dotenv.
  // Only override envDir when a local .env is detected outside the project.
  envDir: process.env.VERCEL ? undefined : '../',
  envPrefix: ['VITE_', 'XUDT_', 'OWNER_', 'CKB_'],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor'
          if (id.includes('@ckb-ccc')) return 'ckb-ccc'
          if (id.includes('framer-motion') || id.includes('motion')) return 'animations'
          if (id.includes('lucide-react')) return 'ui'
        },
      },
    },
  },
})
