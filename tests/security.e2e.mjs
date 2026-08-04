import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5093;
const dbFile = path.join(os.tmpdir(), `tuia-sec-${Date.now()}.db`);
const URL = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

const srv = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, BOTS_ENABLED: "false", MAX_CONN_PER_IP: "10" },
  stdio: ["ignore", "pipe", "pipe"],
});
srv.stderr.on("data", (d) => process.stderr.write("[srv] " + d));
srv.stdout.on("data", (d) => process.stdout.write("[srv] " + d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const h = await httpGet("/health");
      if (h.status === 200) return true;
    } catch {}
    await wait(250);
  }
  return false;
}
function connect() {
  return new Promise((res) => {
    const s = io(URL, { transports: ["websocket"], forceNew: true });
    s.on("connect", () => s.emit("hello", { clientId: null }));
    s.on("welcome", ({ clientId }) => res({ s, clientId }));
  });
}
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const httpGet = (p) => new Promise((res, rej) => { const req = http.get(URL + p, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ status: r.statusCode, headers: r.headers, body: b })); }); req.on("error", rej); });

try {
  const up = await waitForServer();
  ok(up, "servidor levantó");

  // --- 1) Cabeceras de seguridad (helmet) ---
  const health = await httpGet("/health");
  ok(health.status === 200, "health 200");
  ok(health.headers["x-content-type-options"] === "nosniff", "helmet: X-Content-Type-Options nosniff");
  ok(!!health.headers["x-frame-options"], "helmet: X-Frame-Options presente (anti-clickjacking)");
  ok(health.headers["x-powered-by"] === undefined, "no filtra X-Powered-By");

  // --- 2) Flujo normal sigue funcionando ---
  const a = await connect();
  const rA = await emit(a.s, "register", { nick: "sofi_seg", email: "", sex: "f", prefs: { tone: "any", lang: "es", favModel: null, robot: null } });
  ok(rA.ok, "registro legítimo OK");

  // --- 3) Moderación en 'ask' ---
  const mBanned = await emit(a.s, "ask", { text: "esto tiene zzbannedzz adentro", tone: null });
  ok(mBanned.error === "blocked", "ask con palabra prohibida → blocked");
  const mUrl = await emit(a.s, "ask", { text: "entrá a http://spam.link ya", tone: null });
  ok(mUrl.error === "no_links", "ask con URL → no_links");
  const mOk = await emit(a.s, "ask", { text: "una pregunta totalmente normal", tone: null });
  ok(mOk.ok, "ask normal → OK");
  // Sin falsos positivos con palabras/nombres legítimos en español.
  const mFp1 = await emit(a.s, "ask", { text: "¿cómo puedo retardar el envío?", tone: null });
  ok(mFp1.ok, "'retardar' (legítimo) NO se bloquea");
  const mFp2 = await emit(a.s, "ask", { text: "mi amigo Kike vino a cenar", tone: null });
  ok(mFp2.ok, "nombre 'Kike' NO se bloquea");

  // --- 4) Moderación + rate-limit en 'register' (5/5min por IP) ---
  const b = await connect();
  const nAdmin = await emit(b.s, "register", { nick: "admin", email: "", sex: "na", prefs: null });
  ok(nAdmin.error === "reserved", "nick 'admin' → reserved");            // register token 2
  const c = await connect();
  const nBan = await emit(c.s, "register", { nick: "zzbannedzz", email: "", sex: "na", prefs: null });
  ok(nBan.error === "blocked", "nick con palabra prohibida → blocked");   // token 3
  const d = await connect();
  const nHomo = await emit(d.s, "register", { nick: "аdmin", email: "", sex: "na", prefs: null }); // 'а' cirílica
  ok(nHomo.error === "reserved", "nick 'аdmin' (homoglifo) → reserved");  // token 4
  const e = await connect();
  const nOk5 = await emit(e.s, "register", { nick: "jugador_ok_5", email: "", sex: "na", prefs: null });
  ok(nOk5.ok, "5º registro (dentro del límite) → OK");                    // token 5
  const f = await connect();
  const nRL = await emit(f.s, "register", { nick: "jugador_ok_6", email: "", sex: "na", prefs: null });
  ok(nRL.error === "rate_limited", "6º registro desde misma IP → rate_limited");

  // --- 5) Filtros del ranking a prueba de inyección ---
  const rank = await emit(a.s, "getRanking", { category: "'; DROP TABLE users;--", period: "x", country: "'; --", sex: "zzz", model: "evil" });
  ok(rank.ok === true && rank.category === "human", "getRanking sanea filtros maliciosos (allow-list)");

  // --- 6) Voto: self-vote y doble-voto en alucinación ---
  let hid = null;
  b.s.on("halluc:new", (h) => { hid = h.id; });
  await emit(a.s, "submitHallucination", { answer: "dato inventado pero creíble" });
  await wait(300);
  ok(!!hid, "alucinación creada y difundida");
  const v1 = await emit(b.s, "voteHallucination", { id: hid, believe: true });
  ok(v1.ok, "voto de otro usuario → OK");
  const v2 = await emit(b.s, "voteHallucination", { id: hid, believe: true });
  ok(v2.error === "already", "doble voto → already");
  const vSelf = await emit(a.s, "voteHallucination", { id: hid, believe: false });
  ok(vSelf.error === "self_vote", "voto propio → self_vote");

  // --- 7) Tope de conexiones por IP ---
  const raws = [];
  for (let i = 0; i < 15; i++) raws.push(io(URL, { transports: ["websocket"], forceNew: true }));
  await wait(1200);
  const stillOpen = raws.filter((s) => s.connected).length;
  ok(stillOpen < 15, `tope de conexiones por IP aplicado (nuevas vivas: ${stillOpen} < 15)`);
  ok(stillOpen <= 10, `nunca más de MAX_CONN_PER_IP=10 conexiones por IP (vivas: ${stillOpen})`);
  raws.forEach((s) => s.close());

  [a, b, c, d, e, f].forEach((x) => x.s.close());
} catch (err) {
  fail++; console.log("❌ excepción:", err);
} finally {
  srv.kill();
  await wait(200);
  try { fs.unlinkSync(dbFile); } catch {}
  console.log(`\n${pass}/${pass + fail} OK`);
  process.exit(fail ? 1 : 0);
}
