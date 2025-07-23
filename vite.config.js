// vite.config.js
import { defineConfig } from 'vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: true
    })
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  optimizeDeps: {
    include: [
      '@cosmjs/stargate',
      '@cosmjs/proto-signing', 
      'cosmjs-types',
      'buffer'
    ]
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'cosmjs': ['@cosmjs/stargate', '@cosmjs/proto-signing'],
          'vendor': ['buffer']
        }
      }
    }
  }
});
