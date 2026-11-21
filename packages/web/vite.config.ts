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
      // Explicit 127.0.0.1, not "localhost": Node resolves localhost to IPv6
      // ::1 first (dns result order "verbatim"), but the API binds IPv4
      // 0.0.0.0, so the proxy would fail with ECONNREFUSED -> empty 500 on
      // Windows while working fine on Linux.
      "/api": "http://127.0.0.1:3001",
    },
  },
});
