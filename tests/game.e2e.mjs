// Regresión del flujo de juego (happy path): preguntar → responder como IA →
// entrega al que preguntó → recompensa → muro → reacción → coronas; + diario,
// emparejamiento de duelo y voto de alucinación.
import { spawn } from "node:child_process";
import { io } from "socket.io-client";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 5090;
const dbFile = path.join(os.tmpdir(), `tuia-game-${Date.now()}.db`);
const URL = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

const srv = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), DB_PATH: dbFile, BOTS_ENABLED: "false" },
  stdio: ["ignore", "ignore", "pipe"],
});
srv.stderr.on("data", (d) => process.stderr.write("[srv] " + d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const httpGet = (p) => new Promise((res, rej) => { const q = http.get(URL + p, (r) => res({ status: r.statusCode })); q.on("error", rej); });
async function waitForServer() { for (let i = 0; i < 40; i++) { try { if ((await httpGet("/health")).status === 200) return true; } catch {} await wait(250); } return false; }
function connect() {
  return new Promise((res) => {
    const s = io(URL, { transports: ["websocket"], forceNew: true });
    const st = { answers: [], feed: [], hallucs: [], state: null };
    s.on("answerReceived", (p) => st.answers.push(p));
    s.on("feed:new", (p) => st.feed.push(p));
    s.on("halluc:new", (p) => st.hallucs.push(p));
    s.on("state", (p) => (st.state = p));
    s.on("connect", () => s.emit("hello", { clientId: null }));
    s.on("welcome", () => res({ s, st }));
  });
}
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));

try {
  ok(await waitForServer(), "servidor levantó");
  const A = await connect();
  const B = await connect();
  ok((await emit(A.s, "register", { nick: "ana_j", prefs: null })).ok, "registro A");
  ok((await emit(B.s, "register", { nick: "beto_j", prefs: null })).ok, "registro B");

  // A pregunta → B recibe el trabajo → responde → A recibe la respuesta
  await emit(A.s, "ask", { text: "¿cuánto es 2+2?", tone: null });
  await wait(150);
  const job = await emit(B.s, "requestJob", {});
  ok(job?.jobId && job.prompt === "¿cuánto es 2+2?", "B recibe el prompt de A");
  const sub = await emit(B.s, "submitAnswer", { jobId: job.jobId, answer: "cinco, con seguridad" });
  ok(sub?.ok && sub.reward >= 1, "B responde y recibe recompensa");
  await wait(300);
  ok(A.st.answers.some((a) => a.answer === "cinco, con seguridad"), "A recibe la respuesta (entrega)");
  const note = A.st.feed.find((f) => f.answer === "cinco, con seguridad") || B.st.feed.find((f) => f.answer === "cinco, con seguridad");
  ok(!!note, "la respuesta cae al muro (feed:new)");

  // A reacciona a la nota de B → B gana corona humana
  const rk = await emit(A.s, "react", { answerId: note.id, type: "up" });
  ok(rk?.ok, "A reacciona 👍 a la nota de B");
  await wait(200);
  ok(B.st.state && B.st.state.coronas && B.st.state.coronas.human >= 1, "B gana corona humana por el 👍");

  // Reto diario
  const daily = await emit(A.s, "submitDaily", { answer: "mi respuesta del día" });
  ok(daily?.ok, "A responde el reto diario");
  const daily2 = await emit(A.s, "submitDaily", { answer: "otra vez" });
  ok(daily2?.error === "already", "no se puede responder el diario dos veces");

  // Duelo: dos entradas se emparejan
  await emit(A.s, "submitDuelEntry", { answer: "respuesta duelo A" });
  await emit(B.s, "submitDuelEntry", { answer: "respuesta duelo B" });
  await wait(200);
  const duelState = await emit(A.s, "getDuelState", {});
  ok(Array.isArray(duelState?.duels) && duelState.duels.length >= 1, "dos entradas de duelo se emparejan");

  // Alucinación: crear + votar
  await emit(A.s, "submitHallucination", { answer: "los pingüinos vuelan de noche" });
  await wait(200);
  const hid = (B.st.hallucs[0] || {}).id;
  ok(!!hid, "alucinación difundida");
  ok((await emit(B.s, "voteHallucination", { id: hid, believe: false })).ok, "B vota la alucinación");

  [A, B].forEach((x) => x.s.close());
} catch (e) {
  fail++; console.log("❌ excepción:", e);
} finally {
  srv.kill();
  await wait(200);
  try { fs.unlinkSync(dbFile); } catch {}
  console.log(`\n${pass}/${pass + fail} OK`);
  process.exit(fail ? 1 : 0);
}
