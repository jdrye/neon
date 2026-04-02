import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: false,
    target: "esnext"
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
