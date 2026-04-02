import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isProjectPagesBuild =
  process.env.GITHUB_ACTIONS === "true" &&
  !!repositoryName &&
  !repositoryName.endsWith(".github.io");

export default defineConfig({
  base: isProjectPagesBuild ? `/${repositoryName}/` : "/",
  build: {
    minify: false,
    target: "esnext"
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
