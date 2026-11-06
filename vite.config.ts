import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/filesystem',
      '@capacitor/share',
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    fs: {
      strict: false,
    },
    hmr: {
      overlay: true, // ✅ تفعيل إظهار الأخطاء (كانت false وهي سبب الشاشة البيضاء)
    },
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/android/**', '**/ios/**'],
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 5000,
  },
});
