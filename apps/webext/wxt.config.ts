import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  imports: false,
  alias: {
    "@mahibridge/xero": "../../packages/xero/src",
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifestVersion: 3,
  manifest: () => ({
    key: import.meta.env.VITE_EXT_PUBLIC_KEY,
    name: "Mahi Bridge",
    description: "A bridge between Mahi Tahi & Xero.",
    version: "0.0.3",
    permissions: ["identity", "storage"],
    host_permissions: ["https://identity.xero.com/.well-known/openid-configuration", "https://api.xero.com/*"],
    action: {
      default_title: "Mahi Bridge",
    },
  }),
});
