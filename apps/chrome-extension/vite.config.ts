import path from "node:path"
import { crx } from "@crxjs/vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import zip from "vite-plugin-zip-pack"
import tailwind from "@tailwindcss/vite"
import manifest from "./manifest.config.js"
import packageJson from "./package.json" with { type: "json" }
const { name, version } = packageJson

export default defineConfig({
  resolve: {
    alias: {
      "@": `${path.resolve(__dirname, "src")}`,
    },
  },
  plugins: [
    react(),
    tailwind(),
    crx({ manifest }),
    zip({ outDir: "release", outFileName: `crx-${name}-${version}.zip` }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
