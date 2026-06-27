// Tu IA me aburre — servidor de juego / game server
// Express sirve el frontend estático y Socket.IO maneja el bucle en tiempo real:
// los humanos envían prompts, otros humanos los responden haciéndose pasar por IA.
import http from "node:http";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { SEED_PROMPTS, SEED_FEED } from "./seeds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5050;

// ---- Reglas del juego / Game rules ----
const START_CREDITS = 3; // créditos iniciales / starting credits
const ASK_COST = 1; // coste de preguntar / cost to ask
const ANSWER_REWARD_MIN = 1; // recompensa mínima por responder
const ANSWER_REWARD_MAX = 2; // recompensa máxima por responder
const CREDIT_CAP = 10; // tope de créditos / credit cap
const ANSWER_SECONDS = 60; // tiempo para responder / time to answer
const MIN_QUEUE = 4; // mantener al menos N prompts disponibles / keep at least N prompts

const MAX_FEED = 40; // tamaño del muro / wall size

// ---- Estado en memoria / In-memory state ----
const users = new Map(); // clientId -> { credits }
const queue = []; // prompts pendientes / pending prompts: { id, text, askerClientId, seed, createdAt }
const activeJobs = new Map(); // jobId -> { prompt, responderSocketId, responderClientId, timer, deadline }
const recentAnswers = []; // muro: { id, prompt, answer, ts } más recientes primero / wall, newest first
const clientSockets = new Map(); // clientId -> Set<socketId> (un cliente puede tener varias pestañas)
const pendingDeliveries = new Map(); // clientId -> respuestas a entregar cuando se reconecte
let totalAnswered = 0; // contador global / global counter

const newId = () => crypto.randomBytes(8).toString("hex");
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function getUser(clientId) {
  if (!users.has(clientId)) users.set(clientId, { credits: START_CREDITS });
  return users.get(clientId);
}

// Mapea qué sockets pertenecen a cada cliente. Resolvemos al usuario por su
// clientId estable (de localStorage), NO por socket.id, que cambia en cada
// reconexión —p. ej. al recargar la página durante la espera.
function addClientSocket(clientId, socketId) {
  if (!clientSockets.has(clientId)) clientSockets.set(clientId, new Set());
  clientSockets.get(clientId).add(socketId);
}
function removeClientSocket(clientId, socketId) {
  const set = clientSockets.get(clientId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) clientSockets.delete(clientId);
}
function isClientOnline(clientId) {
  const set = clientSockets.get(clientId);
  return !!set && set.size > 0;
}
function emitToClient(clientId, event, payload) {
  const set = clientSockets.get(clientId);
  if (!set) return false;
  let delivered = false;
  for (const sid of set) {
    const s = io.sockets.sockets.get(sid);
    if (s) {
      s.emit(event, payload);
      delivered = true;
    }
  }
  return delivered;
}

// Rellena la cola con prompts semilla hasta tener un mínimo disponible.
// Tops up the queue with seed prompts until a minimum is available.
function ensureSeeds() {
  let guard = 0;
  while (queue.length < MIN_QUEUE && guard++ < 50) {
    const text = SEED_PROMPTS[Math.floor(Math.random() * SEED_PROMPTS.length)];
    queue.push({
      id: newId(),
      text,
      askerClientId: "seed",
      seed: true,
      createdAt: Date.now(),
    });
  }
}

// Elige un prompt para que lo responda este cliente (no uno propio).
// Prioriza prompts reales (con alguien esperando) sobre los semilla.
// Picks a prompt for this client to answer (not their own); real prompts first.
function pickPromptFor(clientId) {
  ensureSeeds();
  let idx = queue.findIndex((p) => !p.seed && p.askerClientId !== clientId);
  if (idx === -1) idx = queue.findIndex((p) => p.askerClientId !== clientId);
  if (idx === -1) return null;
  return queue.splice(idx, 1)[0];
}

function pendingRealCount() {
  return queue.filter((p) => !p.seed).length;
}

// ---- HTTP + Socket.IO ----
const app = express();
// En producción servimos el build de Vite (/dist); si no existe, /public.
// In production we serve the Vite build (/dist); otherwise /public.
const distDir = path.join(__dirname, "dist");
const staticDir = fs.existsSync(distDir) ? distDir : path.join(__dirname, "public");
app.use(express.static(staticDir));
app.get("/health", (_req, res) => res.json({ ok: true, queue: queue.length }));
// Fallback SPA: cualquier ruta desconocida sirve index.html.
// Excluimos /socket.io y /assets para que un asset hasheado que no exista
// (p. ej. tras un deploy a medias) devuelva 404 limpio y no el HTML.
app.get(/^(?!\/(?:socket\.io|assets)).*/, (_req, res, next) => {
  const indexFile = path.join(staticDir, "index.html");
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else next();
});

const server = http.createServer(app);
const io = new SocketServer(server);

function sendState(socket) {
  const clientId = socket.data.clientId;
  if (!clientId) return;
  socket.emit("state", {
    credits: getUser(clientId).credits,
    creditCap: CREDIT_CAP,
    askCost: ASK_COST,
    answerSeconds: ANSWER_SECONDS,
  });
}

// Igual que sendState pero por clientId (a todas sus pestañas, aunque el evento
// lo dispare otro socket, p. ej. un reembolso mientras el asker está en otra vista).
function sendStateToClient(clientId) {
  emitToClient(clientId, "state", {
    credits: getUser(clientId).credits,
    creditCap: CREDIT_CAP,
    askCost: ASK_COST,
    answerSeconds: ANSWER_SECONDS,
  });
}

// Difunde estadísticas globales a todos / broadcast global stats to everyone.
function broadcastStats() {
  io.emit("stats", {
    online: io.engine.clientsCount,
    totalAnswered,
    pending: pendingRealCount(),
  });
}

// Añade una respuesta al muro y la difunde / add an answer to the wall and broadcast.
function pushFeed(prompt, answer) {
  const item = { id: newId(), prompt, answer, ts: Date.now() };
  recentAnswers.unshift(item);
  if (recentAnswers.length > MAX_FEED) recentAnswers.pop();
  totalAnswered++;
  io.emit("feed:new", item);
}

// Devuelve un prompt a la cola (p.ej. al saltar o agotar el tiempo).
// Returns a prompt to the queue (e.g. on skip or timeout).
function requeue(prompt) {
  if (prompt.seed) return;
  // Reencolamos solo si el que preguntó sigue conectado (por clientId, no socket.id).
  if (!isClientOnline(prompt.askerClientId)) {
    // Se fue de verdad: le devolvemos el crédito y descartamos el prompt.
    refundAsk(prompt.askerClientId);
    return;
  }
  prompt.createdAt = Date.now();
  queue.unshift(prompt); // al frente para que se atienda pronto / to the front
}

// Devuelve el crédito de una pregunta (cancelación o prompt descartado).
function refundAsk(clientId) {
  if (!clientId || clientId === "seed") return;
  const u = getUser(clientId);
  u.credits = clamp(u.credits + ASK_COST, 0, CREDIT_CAP);
  sendStateToClient(clientId);
}

// Entrega la respuesta al que preguntó; si está desconectado (recargó la página),
// la guarda para dársela en cuanto se reconecte.
function deliverAnswer(clientId, payload) {
  if (emitToClient(clientId, "answerReceived", payload)) return;
  const arr = pendingDeliveries.get(clientId) || [];
  arr.push(payload);
  while (arr.length > 5) arr.shift();
  pendingDeliveries.set(clientId, arr);
}
function flushDeliveries(clientId) {
  const arr = pendingDeliveries.get(clientId);
  if (!arr || !arr.length) return;
  pendingDeliveries.delete(clientId);
  for (const payload of arr) emitToClient(clientId, "answerReceived", payload);
}

function clearJob(jobId) {
  const job = activeJobs.get(jobId);
  if (!job) return null;
  clearTimeout(job.timer);
  activeJobs.delete(jobId);
  return job;
}

io.on("connection", (socket) => {
  socket.on("hello", (payload = {}) => {
    // El cliente persiste su id en localStorage para conservar créditos al recargar.
    // Client persists its id in localStorage to keep credits across reloads.
    const clientId =
      typeof payload.clientId === "string" && payload.clientId.length >= 8
        ? payload.clientId.slice(0, 64)
        : newId();
    socket.data.clientId = clientId;
    addClientSocket(clientId, socket.id);
    getUser(clientId);
    socket.emit("welcome", { clientId });
    sendState(socket);
    flushDeliveries(clientId); // entrega respuestas que llegaron mientras no estaba
    broadcastStats();
  });

  // --- Modo humano: preguntar / Human mode: ask ---
  socket.on("ask", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const text = String(payload.text || "").trim().slice(0, 1000);
    if (!text) return ack?.({ ok: false, error: "empty" });

    const user = getUser(clientId);
    if (user.credits < ASK_COST) return ack?.({ ok: false, error: "no_credits" });

    user.credits -= ASK_COST;
    const prompt = {
      id: newId(),
      text,
      askerClientId: clientId,
      seed: false,
      createdAt: Date.now(),
    };
    queue.push(prompt);
    sendState(socket);
    ack?.({ ok: true, promptId: prompt.id });
  });

  // Cancelar una pregunta que aún espera respuesta / cancel a still-pending ask.
  socket.on("cancelAsk", (payload = {}) => {
    const clientId = socket.data.clientId;
    const i = queue.findIndex((p) => p.id === payload.promptId);
    if (i === -1) return;
    // Solo el dueño puede cancelar su propio prompt (ni uno ajeno ni semilla).
    if (queue[i].seed || queue[i].askerClientId !== clientId) return;
    queue.splice(i, 1);
    refundAsk(clientId); // devolver el crédito (refundAsk ya reenvía el estado)
  });

  // --- Modo IA: pedir algo que responder / AI mode: request a job ---
  socket.on("requestJob", (_payload, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });

    const prompt = pickPromptFor(clientId);
    if (!prompt) return ack?.({ ok: false, error: "no_jobs" });

    const jobId = newId();
    const deadline = Date.now() + ANSWER_SECONDS * 1000;
    const timer = setTimeout(() => {
      const job = clearJob(jobId);
      if (!job) return;
      requeue(job.prompt);
      socket.emit("jobExpired", { jobId });
      sendState(socket);
    }, ANSWER_SECONDS * 1000 + 500);

    activeJobs.set(jobId, {
      prompt,
      responderSocketId: socket.id,
      responderClientId: clientId,
      timer,
      deadline,
    });

    ack?.({
      ok: true,
      jobId,
      prompt: prompt.text,
      seconds: ANSWER_SECONDS,
      deadline,
    });
  });

  // Saltar un prompt sin responder / skip a job without answering.
  socket.on("skipJob", (payload = {}) => {
    const job = clearJob(payload.jobId);
    if (job) requeue(job.prompt);
  });

  // Enviar la respuesta "de la IA" / submit the "AI" answer.
  socket.on("submitAnswer", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    const job = clearJob(payload.jobId);
    if (!job) return ack?.({ ok: false, error: "expired" });
    if (job.responderClientId !== clientId)
      return ack?.({ ok: false, error: "not_yours" });

    const answer = String(payload.answer || "").trim().slice(0, 2000);
    if (!answer) {
      requeue(job.prompt);
      return ack?.({ ok: false, error: "empty" });
    }

    // Recompensa al respondedor (tope CREDIT_CAP).
    const reward =
      ANSWER_REWARD_MIN +
      Math.floor(Math.random() * (ANSWER_REWARD_MAX - ANSWER_REWARD_MIN + 1));
    const user = getUser(clientId);
    const before = user.credits;
    user.credits = clamp(user.credits + reward, 0, CREDIT_CAP);
    const gained = user.credits - before; // recompensa real aplicada (0 si está en el tope)

    // Entrega la respuesta a quien preguntó (ahora o cuando se reconecte).
    // Deliver the answer to the asker (now, or when they reconnect).
    if (!job.prompt.seed) {
      deliverAnswer(job.prompt.askerClientId, {
        promptId: job.prompt.id,
        prompt: job.prompt.text,
        answer,
      });
    }

    pushFeed(job.prompt.text, answer);
    broadcastStats();
    sendState(socket);
    ack?.({ ok: true, reward: gained, credits: user.credits, seed: job.prompt.seed });
  });

  // Envía el muro inicial / send the initial wall.
  socket.on("getFeed", () => {
    socket.emit("feed:init", recentAnswers);
    broadcastStats();
  });

  socket.on("disconnect", () => {
    if (socket.data.clientId) removeClientSocket(socket.data.clientId, socket.id);
    // Libera cualquier job activo de este socket y reencola sus prompts.
    for (const [jobId, job] of activeJobs) {
      if (job.responderSocketId === socket.id) {
        clearJob(jobId);
        requeue(job.prompt);
      }
    }
    broadcastStats();
  });
});

// Prepobla el muro con ejemplos / prefill the wall with examples.
for (const f of SEED_FEED) {
  recentAnswers.push({ id: newId(), prompt: f.prompt, answer: f.answer, ts: Date.now() });
}

ensureSeeds();
server.listen(PORT, () => {
  console.log(`Tu IA me aburre escuchando en http://localhost:${PORT}`);
});
