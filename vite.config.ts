import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @noble/post-quantum v0.5.x doesn't expose ./ml-dsa.js in exports map,
      // but the file exists on disk. The SDK imports it by that path.
      '@noble/post-quantum/ml-dsa.js': path.resolve(
        __dirname,
        'node_modules/@noble/post-quantum/ml-dsa.js'
      ),
    },
  },
})
