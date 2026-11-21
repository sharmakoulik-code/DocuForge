import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Dev server only (never part of a production build). This is a single-user
    // local tool, so accept any Host header — otherwise the editor can only be
    // opened via localhost and is blocked when reached through a proxy/tunnel.
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
