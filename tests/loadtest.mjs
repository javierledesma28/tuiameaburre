// Load test manual (NO parte de `npm test`). Simula N clientes concurrentes
// haciendo el ciclo real (preguntar / responder como IA / reaccionar) y mide
// throughput y latencia de ack — revela el bloqueo del event loop por las
// escrituras síncronas de SQLite bajo carga.
//
// Uso:  node tests/loadtest.mjs            (levanta su propio server)
//       LOAD_CLIENTS=100 LOAD_DURATION_MS=15000 node tests/loadtest.mjs
//       LOAD_URL=https://tuiameaburre.com node tests/loadtest.mjs   (contra prod)
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const CLIENTS = Number(process.env.LOAD_CLIENTS || 40);
const DURATION = Number(process.env.LOAD_DURATION_MS || 8000);
const EXTERNAL = process.env.LOAD_URL || null;
const PORT = 5099;
const URL = EXTERNAL || `http://localhost:${PORT}`;
const dbFile = path.join(os.tmpdir(), `tuia-load-${Date.now()}.db`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let srv = null;
if (!EXTERNAL) {
  srv = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, BOTS_ENABLED: "false", MAX_CONN_PER_IP: "100000" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  srv.stderr.on("data", (d) => process.stderr.write("[srv] " + d));
}
const httpGet = (p) => new Promise((res, rej) => { const q = http.get(URL + p, (r) => res({ status: r.statusCode })); q.on("error", rej); });
async function waitForServer() { for (let i = 0; i < 40; i++) { try { if ((await httpGet("/health")).status === 200) return true; } catch {} await wait(250); } return false; }

const lat = []; // latencias de ack (ms)
let ops = 0, errors = 0;
const pct = (arr, p) => (arr.length ? arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : 0);

function makeClient(i) {
  // IP simulada única por cliente → rate-limit por IP no interfiere en el test.
  const s = io(URL, { transports: ["websocket"], forceNew: true, extraHeaders: { "cf-connecting-ip": `10.${(i >> 8) & 255}.${i & 255}.${(i * 7) % 255}` } });
  const emit = (ev, p) => new Promise((res) => { const t0 = Date.now(); s.emit(ev, p, (r) => { lat.push(Date.now() - t0); ops++; if (r && r.ok === false && r.error !== "no_credits" && r.error !== "no_jobs" && r.error !== "rate_limited") errors++; res(r); }); });
  return { s, emit };
}

async function clientLoop(c, deadline) {
  // hello ya se envió antes del loop; acá solo generamos carga.
  while (Date.now() < deadline) {
    const roll = Math.random();
    if (roll < 0.4) await c.emit("ask", { text: `carga ${Math.random().toString(36).slice(2)}`, tone: null });
    else if (roll < 0.8) { const job = await c.emit("requestJob", {}); if (job?.jobId) await c.emit("submitAnswer", { jobId: job.jobId, answer: `resp ${Math.random().toString(36).slice(2)}` }); }
    else await c.emit("getRanking", { category: "human", period: "all" });
    await wait(20 + Math.random() * 80);
  }
}

try {
  if (!(await waitForServer())) throw new Error("server no levantó");
  console.log(`Load test: ${CLIENTS} clientes × ${DURATION}ms contra ${URL}\n`);
  const clients = Array.from({ length: CLIENTS }, (_, i) => makeClient(i));
  clients.forEach((c) => c.s.emit("hello", { clientId: null }));
  await wait(500);
  const deadline = Date.now() + DURATION;
  const t0 = Date.now();
  await Promise.all(clients.map((c) => clientLoop(c, deadline).catch(() => {})));
  const secs = (Date.now() - t0) / 1000;

  console.log("── Resultados ──");
  console.log(`ops totales:   ${ops}`);
  console.log(`throughput:    ${(ops / secs).toFixed(0)} ops/seg`);
  console.log(`latencia ack:  p50 ${pct(lat, 50)}ms · p95 ${pct(lat, 95)}ms · p99 ${pct(lat, 99)}ms · max ${Math.max(...lat, 0)}ms`);
  console.log(`errores:       ${errors}`);
  console.log(pct(lat, 95) < 500 ? "\n✅ p95 < 500ms bajo carga" : "\n⚠️ p95 alto — SQLite síncrono puede estar tapando el event loop");
  clients.forEach((c) => c.s.close());
} catch (e) {
  console.log("❌", e.message);
} finally {
  if (srv) srv.kill();
  await wait(200);
  try { fs.unlinkSync(dbFile); } catch {}
  process.exit(0);
}
