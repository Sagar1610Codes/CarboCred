import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,        // keep same port as before
    strictPort: true,  // fail if 3000 is taken (don't silently switch)
  },
})
