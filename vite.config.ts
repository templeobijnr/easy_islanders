/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // ✅ Only expose safe, public environment variables
      // VITE_ prefixed variables are automatically available via import.meta.env
      // No need to manually define them here unless you need custom names
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
        ],
      },
    },
    build: {
      sourcemap: false, // Never deploy source maps
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.* in production
          pure_getters: true,
        },
      },
    },
  };
});
