import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "web",
  // Relative assets work on /neon/ and when Pages uses another repository name.
  base: "./",
  publicDir: "../public",
  resolve: {
    alias: { "/src": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "pages-assets",
    minify: "esbuild",
    target: "es2020"
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
