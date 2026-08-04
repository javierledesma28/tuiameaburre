import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5095;
const dbFile = path.join(os.tmpdir(), `tuia-rep-${Date.now()}.db`);
const URL = `http://localhost:${PORT}`;
const ADMIN = "testtoken";
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

const srv = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, BOTS_ENABLED: "false", REPORT_HIDE_THRESHOLD: "3", ADMIN_TOKEN: ADMIN },
  stdio: ["ignore", "pipe", "pipe"],
});
srv.stderr.on("data", (d) => process.stderr.write("[srv] " + d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const httpGet = (p) => new Promise((res, rej) => { const q = http.get(URL + p, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ status: r.statusCode })); }); q.on("error", rej); });
async function waitForServer() { for (let i = 0; i < 40; i++) { try { if ((await httpGet("/health")).status === 200) return true; } catch {} await wait(250); } return false; }
function connect() {
  return new Promise((res) => {
    const s = io(URL, { transports: ["websocket"], forceNew: true });
    const feedNew = [];
    const removed = new Set();
    s.on("feed:new", (it) => feedNew.push(it));
    s.on("feed:remove", ({ id }) => removed.add(id));
    s.on("connect", () => s.emit("hello", { clientId: null }));
    s.on("welcome", () => res({ s, feedNew, removed }));
  });
}
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));

// Crea una nota en el muro (A pregunta, B responde) y devuelve su id.
async function makeAnswer(a, b, text) {
  await emit(a.s, "ask", { text, tone: null });
  await wait(150);
  const job = await emit(b.s, "requestJob", {});
  if (!job?.jobId) return null;
  await emit(b.s, "submitAnswer", { jobId: job.jobId, answer: `resp-${text}` });
  await wait(250);
  return (a.feedNew.find((it) => it.answer === `resp-${text}`) || {}).id || null;
}

try {
  ok(await waitForServer(), "servidor levantó");
  const a = await connect();
  const b = await connect();

  // --- Auto-ocultar por reportes ---
  const id1 = await makeAnswer(a, b, "nota-reportable");
  ok(!!id1, "nota creada en el muro");
  const r1 = await connect(), r2 = await connect(), r3 = await connect();
  const rr1 = await emit(r1.s, "report", { answerId: id1 });
  ok(rr1.ok, "primer reporte → ok");
  await emit(r2.s, "report", { answerId: id1 });
  ok(!a.removed.has(id1), "aún NO se oculta con 2 reportes");
  await emit(r3.s, "report", { answerId: id1 });
  await wait(300);
  ok(a.removed.has(id1), "al 3er reporte se emite feed:remove (auto-ocultar)");
  // Reporte de nota inexistente
  const rNone = await emit(r1.s, "report", { answerId: "noexiste123" });
  ok(rNone.error === "not_found", "reporte de id inexistente → not_found");

  // El muro nuevo ya no la trae
  const fresh = await connect();
  await emit(fresh.s, "report", { answerId: "x" }).catch(() => {});
  const feed = await new Promise((res) => { fresh.s.emit("getFeed"); fresh.s.once("feed:init", res); });
  const items = Array.isArray(feed) ? feed : feed.items || [];
  ok(!items.some((it) => it.id === id1), "getFeed excluye la nota oculta");

  // --- Borrado admin ---
  const id2 = await makeAnswer(a, b, "nota-admin");
  ok(!!id2, "segunda nota creada");
  const bad = await emit(a.s, "adminRemove", { answerId: id2, token: "malo" });
  ok(bad.error === "forbidden", "adminRemove con token inválido → forbidden");
  const good = await emit(a.s, "adminRemove", { answerId: id2, token: ADMIN });
  ok(good.ok, "adminRemove con token válido → ok");
  await wait(200);
  ok(a.removed.has(id2), "borrado admin emite feed:remove");

  [a, b, r1, r2, r3, fresh].forEach((x) => x.s.close());
} catch (err) {
  fail++; console.log("❌ excepción:", err);
} finally {
  srv.kill();
  await wait(200);
  try { fs.unlinkSync(dbFile); } catch {}
  console.log(`\n${pass}/${pass + fail} OK`);
  process.exit(fail ? 1 : 0);
}
