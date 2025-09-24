import { defineConfig } from 'vitest/config';
import vue from "@vitejs/plugin-vue";
import path from "path";
export default defineConfig({

  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: process.env.VITE_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5173'),
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://0.0.0.0:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "./dist", // 输出到根目录 dist，与后端共享
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});