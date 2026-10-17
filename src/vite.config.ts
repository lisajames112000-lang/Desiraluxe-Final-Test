import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
    appId: env.VITE_FIREBASE_APP_ID?.trim()
  };

  return {
    // The original product images and logo live at repository-root public/.
    publicDir: '../public',
    plugins: [
      react(),
      {
        name: 'preserve-robots-txt',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: readFileSync(new URL('./public/robots.txt', import.meta.url), 'utf8')
          });
        }
      }
    ],
    define: {
      __FIREBASE_PUBLIC_CONFIG__: JSON.stringify(firebaseConfig)
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            mantine: ['@mantine/core', '@mantine/hooks'],
            motion: ['framer-motion']
          }
        }
      }
    }
  };
});
