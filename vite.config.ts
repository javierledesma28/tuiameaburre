import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, Vite (5173) sirve el frontend y reenvía Socket.IO al
// servidor Node (5050). En producción, `npm run build` genera /dist y
// server.js lo sirve. / Vite proxies Socket.IO to the Node server in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      "/socket.io": { target: "http://localhost:5050", ws: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
