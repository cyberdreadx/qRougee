import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@rougechain/sdk': path.resolve(__dirname, 'lib/rougechain-sdk/dist/index.js'),
      '@noble/hashes/sha2': path.resolve(__dirname, 'node_modules/@noble/hashes/sha2.js'),
      '@noble/hashes/sha2.js': path.resolve(__dirname, 'node_modules/@noble/hashes/sha2.js'),
      '@noble/hashes/hkdf': path.resolve(__dirname, 'node_modules/@noble/hashes/hkdf.js'),
      '@noble/hashes/hkdf.js': path.resolve(__dirname, 'node_modules/@noble/hashes/hkdf.js'),
      '@noble/hashes/sha3': path.resolve(__dirname, 'node_modules/@noble/hashes/sha3.js'),
      '@noble/hashes/sha3.js': path.resolve(__dirname, 'node_modules/@noble/hashes/sha3.js'),
      '@noble/hashes/utils': path.resolve(__dirname, 'node_modules/@noble/hashes/utils.js'),
      '@noble/hashes/utils.js': path.resolve(__dirname, 'node_modules/@noble/hashes/utils.js'),
      '@noble/hashes/pbkdf2': path.resolve(__dirname, 'node_modules/@noble/hashes/pbkdf2.js'),
      '@noble/hashes/pbkdf2.js': path.resolve(__dirname, 'node_modules/@noble/hashes/pbkdf2.js'),
      '@noble/hashes/hmac': path.resolve(__dirname, 'node_modules/@noble/hashes/hmac.js'),
      '@noble/hashes/hmac.js': path.resolve(__dirname, 'node_modules/@noble/hashes/hmac.js'),
      '@noble/hashes/webcrypto': path.resolve(__dirname, 'node_modules/@noble/hashes/webcrypto.js'),
      '@noble/hashes/webcrypto.js': path.resolve(__dirname, 'node_modules/@noble/hashes/webcrypto.js'),
      '@noble/hashes/_md': path.resolve(__dirname, 'node_modules/@noble/hashes/_md.js'),
      '@noble/hashes/_md.js': path.resolve(__dirname, 'node_modules/@noble/hashes/_md.js'),
      '@noble/post-quantum/ml-dsa': path.resolve(__dirname, 'node_modules/@noble/post-quantum/ml-dsa.js'),
      '@noble/post-quantum/ml-dsa.js': path.resolve(__dirname, 'node_modules/@noble/post-quantum/ml-dsa.js'),
      '@noble/post-quantum/_crystals': path.resolve(__dirname, 'node_modules/@noble/post-quantum/_crystals.js'),
      '@noble/post-quantum/_crystals.js': path.resolve(__dirname, 'node_modules/@noble/post-quantum/_crystals.js'),
      '@noble/post-quantum/utils': path.resolve(__dirname, 'node_modules/@noble/post-quantum/utils.js'),
      '@noble/post-quantum/utils.js': path.resolve(__dirname, 'node_modules/@noble/post-quantum/utils.js'),
      '@noble/curves/utils': path.resolve(__dirname, 'node_modules/@noble/curves/utils.js'),
      '@noble/curves/utils.js': path.resolve(__dirname, 'node_modules/@noble/curves/utils.js'),
      '@scure/bip39/wordlists/english': path.resolve(__dirname, 'node_modules/@scure/bip39/wordlists/english.js'),
      '@scure/bip39/wordlists/english.js': path.resolve(__dirname, 'node_modules/@scure/bip39/wordlists/english.js'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@noble/hashes',
      '@noble/post-quantum',
      '@noble/curves',
      '@scure/bip39',
      '@scure/base',
    ],
  },
})
