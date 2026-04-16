import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/card-battle-game/',
  plugins: [react()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('pixi.js') || id.includes('@pixi')) return 'pixi';
          if (id.includes('react-dom') || id.includes('react/')) return 'react-vendor';
        },
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
})
