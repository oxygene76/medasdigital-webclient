// vite.config.js
import { defineConfig } from 'vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import replace from '@rollup/plugin-replace';

export default defineConfig({
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: true,
      dedupe: ['@cosmjs/stargate', '@cosmjs/proto-signing', 'cosmjs-types']
    }),
    commonjs({
      include: ['node_modules/**'],
      transformMixedEsModules: true
    }),
    inject({
      global: ['node_modules/buffer/index.js', 'Buffer'],
      process: 'process/browser'
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development'),
      'global.': 'globalThis.',
      'Buffer.': 'globalThis.Buffer.'
    })
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('development')
  },
  resolve: {
    alias: {
      'crypto': 'crypto-browserify',
      'stream': 'stream-browserify',
      'assert': 'assert',
      'http': 'stream-http',
      'https': 'https-browserify',
      'os': 'os-browserify',
      'url': 'url',
      'util': 'util',
      'events': 'events',
      'path': 'path-browserify',
      'buffer': 'buffer',
      'process': 'process/browser'
    }
  },
  optimizeDeps: {
    include: [
      '@cosmjs/stargate',
      '@cosmjs/proto-signing',
      '@cosmjs/amino',
      '@cosmjs/encoding',
      '@cosmjs/math',
      '@cosmjs/utils',
      'cosmjs-types',
      'buffer',
      'process/browser',
      'crypto-browserify',
      'stream-browserify',
      'util',
      'events'
    ],
    exclude: []
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    fs: {
      allow: ['..']
    },
    // ===================================
    // FIX: ERLAUBTE EXTERNE HOSTS HINZUFÜGEN
    // ===================================
    allowedHosts: [
      'app.medas-digital.io',
      'api.medas-digital.io', 
      'lcd.medas-digital.io',
      'rpc.medas-digital.io',
      'localhost',
      '127.0.0.1',
      '.medas-digital.io'  // Wildcard für alle Subdomains
    ],
    // ===================================
    // FIX: PROXY FÜR BLOCKCHAIN APIs
    // ===================================
    proxy: {
      '/cosmos': {
        target: 'https://lcd.medas-digital.io:1317',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      },
      '/rpc': {
        target: 'https://rpc.medas-digital.io:26657',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/rpc/, '')
      }
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'cosmjs-core': ['@cosmjs/stargate', '@cosmjs/proto-signing'],
          'cosmjs-utils': ['@cosmjs/amino', '@cosmjs/encoding', '@cosmjs/math', '@cosmjs/utils'],
          'cosmjs-types': ['cosmjs-types'],
          'polyfills': ['buffer', 'process', 'crypto-browserify', 'stream-browserify'],
          'vendor': ['util', 'events', 'assert']
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  assetsInclude: ['**/*.wasm']
});
