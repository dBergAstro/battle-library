/**
 * Конфиг Vite для GAS-сборки.
 * Собирает всё (JS + CSS + assets) в один inline HTML файл.
 * Запуск: npx vite build --config vite.gas.config.ts
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/gas"),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    "import.meta.env.MODE": JSON.stringify("production"),
    "import.meta.env.VITE_GAS_BUILD": JSON.stringify("true"),
  },
});
