import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import svgr from "vite-plugin-svgr";
import glsl from "vite-plugin-glsl";
// https://vitejs.dev/config/
//@ts-ignore
export default defineConfig(() => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // eslint-disable-next-line no-undef
  const env = loadEnv("development", process.cwd(), "");
  return {
    // vite config

    plugins: [
      react(),
      glsl({
        include: [
          // Glob pattern, or array of glob patterns to import
          "**/*.glsl",
          "**/*.wgsl",
          "**/*.vert",
          "**/*.frag",
          "**/*.vs",
          "**/*.fs",
        ],
        exclude: undefined, // Glob pattern, or array of glob patterns to ignore
        warnDuplicatedImports: true, // Warn if the same chunk was imported multiple times
        defaultExtension: "glsl", // Shader suffix when no extension is specified
        compress: false, // Compress output shader code
        watch: true, // Recompile shader on change
        root: "/", // Directory for root imports
      }),
      svgr({
        svgrOptions: {
          exportType: "named",
          ref: true,
          svgo: false,
          titleProp: true,
        },
        include: "**/*.svg",
      }),
    ],
    worker: () => [react()],
    server: {
      port: env.PORT, // set port
    },
    esbuild: {
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@api": path.resolve(__dirname, "./src/api"),
      },
    },
    base: "./",
    build: {
      outDir: "./dist",
      chunkSizeWarningLimit: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("three")) {
              return "three.min";
            }
            if (id.includes("web-ifc")) {
              return "web-ifc.min";
            }
          },
        },
      },
    },
    test: {
      global: true,
      environment: "jsdom",
    },
    optimizeDeps: {
      exclude: ["js-big-decimal"],
    },
  };
});