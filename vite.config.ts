import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000, // 警告閾値を1MBに設定
        rollupOptions: {
          output: {
            manualChunks: {
              // 大きなライブラリを別チャンクに分割
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'chart-vendor': ['recharts'],
              'supabase-vendor': ['@supabase/supabase-js'],
            },
          },
        },
      },
    };
});
