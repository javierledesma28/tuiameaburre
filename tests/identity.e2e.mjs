import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5094;
const dbFile = path.join(os.tmpdir(), `tuia-id-${Date.now()}.db`);
const URL = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

const srv = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, BOTS_ENABLED: "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
srv.stderr.on("data", (d) => process.stderr.write("[srv] " + d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const httpGet = (p) => new Promise((res, rej) => { const q = http.get(URL + p, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ status: r.statusCode })); }); q.on("error", rej); });
async function waitForServer() { for (let i = 0; i < 40; i++) { try { if ((await httpGet("/health")).status === 200) return true; } catch {} await wait(250); } return false; }

// Conecta enviando un hello arbitrario y resuelve el welcome {clientId, sig}.
function connectWith(payload) {
  return new Promise((res) => {
    const s = io(URL, { transports: ["websocket"], forceNew: true });
    s.on("connect", () => s.emit("hello", payload));
    s.on("welcome", (w) => res({ s, ...w }));
  });
}
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));

try {
  ok(await waitForServer(), "servidor levantó");

  // 1) hello sin id → el server emite clientId + firma
  const fresh = await connectWith({ clientId: null, sig: null });
  ok(!!fresh.clientId, "hello sin id → server emite clientId");
  ok(!!fresh.sig, "welcome incluye firma (sig)");
  const id1 = fresh.clientId, sig1 = fresh.sig;
  fresh.s.close();

  // 2) reconexión con firma válida → mismo id
  const valid = await connectWith({ clientId: id1, sig: sig1 });
  ok(valid.clientId === id1, "reconexión con firma válida preserva el id");
  valid.s.close();

  // 3) firma inválida → id nuevo (no se puede robar un id sin su firma)
  const wrong = await connectWith({ clientId: id1, sig: "x".repeat(24) });
  ok(wrong.clientId !== id1, "firma inválida → id nuevo (no takeover)");
  wrong.s.close();

  // 4) legacy: id existente sin firma → grandfather + upgrade de firma
  const legacy = await connectWith({ clientId: id1 });
  ok(legacy.clientId === id1, "legacy sin firma pero existente → grandfather");
  ok(!!legacy.sig, "legacy recibe firma (migración transparente)");
  legacy.s.close();

  // 5) id elegido, inexistente y sin firma → el server asigna otro (no pre-claim)
  const forged = await connectWith({ clientId: "ffffffffffffffff" });
  ok(forged.clientId !== "ffffffffffffffff", "id inventado sin firma → server asigna otro");
  forged.s.close();

  // 6) no se puede impersonar un bot (prefijo reservado)
  const botTry = await connectWith({ clientId: "bot:luki_mdq", sig: "whatever12345678" });
  ok(botTry.clientId !== "bot:luki_mdq" && !botTry.clientId.startsWith("bot:"), "no se puede impersonar un bot");
  botTry.s.close();

  // 7) unicidad de nick normalizada (anti-impersonación homoglifo/leet)
  const a = await connectWith({ clientId: null });
  ok((await emit(a.s, "register", { nick: "campeon", prefs: null })).ok, "registra nick 'campeon'");
  const b = await connectWith({ clientId: null });
  const rB = await emit(b.s, "register", { nick: "cаmpeon", prefs: null }); // 'а' cirílica
  ok(rB.error === "nick_taken", "nick homoglifo 'cаmpeon' → nick_taken");
  const c = await connectWith({ clientId: null });
  const rC = await emit(c.s, "register", { nick: "c@mpeon", prefs: null });
  ok(rC.error === "nick_taken", "nick leet 'c@mpeon' → nick_taken");
  const dd = await connectWith({ clientId: null });
  ok((await emit(dd.s, "register", { nick: "campeona", prefs: null })).ok, "nick distinto 'campeona' → OK (sin falso positivo)");
  [a, b, c, dd].forEach((x) => x.s.close());
} catch (err) {
  fail++; console.log("❌ excepción:", err);
} finally {
  srv.kill();
  await wait(200);
  try { fs.unlinkSync(dbFile); } catch {}
  console.log(`\n${pass}/${pass + fail} OK`);
  process.exit(fail ? 1 : 0);
}
