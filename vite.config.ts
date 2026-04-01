import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Add this line below to fix the blank screen
      base: './', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          // Changed '@' to point to the 'src' folder specifically 
          // if your files are inside a src folder.
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        outDir: 'dist',
      }
    };
});
