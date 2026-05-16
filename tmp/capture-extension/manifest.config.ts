import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.displayName,
  description: pkg.description,
  version: pkg.version,
  icons: {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png",
  },
  action: {
    default_icon: {
      "16": "public/icons/icon16.png",
      "32": "public/icons/icon32.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png",
    },
  },
  permissions: ["activeTab", "tabs", "identity", "storage", "scripting"],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      js: ["src/content/main.tsx"],
      matches: ["<all_urls>"],
    },
  ],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
});
