// Tu IA me aburre — servidor de juego / game server
// Express sirve el frontend estático y Socket.IO maneja el bucle en tiempo real:
// los humanos envían prompts, otros humanos los responden haciéndose pasar por IA.
// El estado de jugadores y el muro persisten en SQLite (ver db.js).
import http from "node:http";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { SEED_PROMPTS, SEED_FEED } from "./seeds.js";
import { pickModel, MODEL_BY_ID } from "./models.js";
import {
  getUser as dbGetUser,
  setCredits,
  addCoronas,
  upsertProfile,
  setPrefs as dbSetPrefs,
  setCountry,
  incAsked,
  incAnswered,
  isNickTaken,
  bumpStreak,
  addModelUsed,
  incBroke,
  unlockAchievements,
  pushAnswer,
  recentAnswers as dbRecentAnswers,
  hallOfShame,
  answersCount,
  myReactions,
  react as dbReact,
  topPlayers,
  answerOfWeek,
} from "./db.js";

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

// Balance: cuántos prompts reales en cola disparan el boost del equipo IA.
// Balance: how many real queued prompts trigger the AI-team boost.
const BOOST_AI_THRESHOLD = 3;
const BOOST_MULT = 2;

// ---- Estado en memoria (lo efímero) / In-memory state (the ephemeral bits) ----
const queue = []; // prompts pendientes: { id, text, askerClientId, seed, tone, boostedAsk, createdAt }
const activeJobs = new Map(); // jobId -> { prompt, responderSocketId, responderClientId, model, timer, deadline }
const recentAnswers = []; // cache del muro (se hidrata desde la DB) / wall cache, hydrated from DB
const clientSockets = new Map(); // clientId -> Set<socketId> (un cliente puede tener varias pestañas)
const pendingDeliveries = new Map(); // clientId -> respuestas a entregar cuando se reconecte
let totalAnswered = 0; // contador global / global counter

// ---- Modo Duelo / Duel mode ----
const DUEL_CLOSE_VOTES = 5; // votos para cerrar un duelo
const DUEL_WIN_CORONAS = 3; // coronas IA al ganador
const DUEL_LOSE_CORONAS = 1; // coronas IA al perdedor (por participar)
let duelPrompt = null; // prompt vigente que todos responden en el duelo
const duelEntries = []; // entradas esperando rival: { id, prompt, answer, authorClientId, model }
const duels = new Map(); // duelId -> { id, prompt, a, b, votesA:Set, votesB:Set, closed, winner }

const newId = () => crypto.randomBytes(8).toString("hex");
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ---- Usuarios (vía SQLite) / Users (via SQLite) ----
const getUser = (clientId) => dbGetUser(clientId, START_CREDITS);
// Suma (o resta) créditos respetando el tope; devuelve el saldo nuevo.
function addCredits(clientId, delta) {
  const u = getUser(clientId);
  const credits = clamp(u.credits + delta, 0, CREDIT_CAP);
  setCredits(clientId, credits);
  return credits;
}

// Perfil público (solo si el usuario se dio de alta) / public profile.
function profileOf(clientId) {
  const u = getUser(clientId);
  if (!u.nick && !u.email) return null;
  return {
    nick: u.nick,
    email: u.email,
    prefs: u.prefs,
    sex: u.sex,
    country: u.country,
    gamesAsked: u.gamesAsked,
    gamesAnswered: u.gamesAnswered,
    coronasHuman: u.coronasHuman,
    coronasAi: u.coronasAi,
    streakDays: u.streakDays,
    achievements: u.achievements || [],
  };
}

// Evalúa los logros del usuario y notifica (a todas sus pestañas) los nuevos.
// extra.insomne marca la franja 3-5am del momento de jugar.
function checkAchievements(clientId, extra = {}) {
  const u = getUser(clientId);
  const have = new Set(u.achievements || []);
  const earn = [];
  const want = (id, cond) => {
    if (cond && !have.has(id)) earn.push(id);
  };
  let modelsCount = 0;
  try {
    modelsCount = u.modelsUsed ? JSON.parse(u.modelsUsed).length : 0;
  } catch {
    modelsCount = 0;
  }
  want("first_answer", u.gamesAnswered >= 1);
  want("prolifico", u.gamesAnswered >= 25);
  want("curioso", u.gamesAsked >= 25);
  want("querido", u.coronasHuman >= 10);
  want("mas_robot", u.coronasAi >= 10);
  want("multipersonalidad", modelsCount >= 5);
  want("despedido", u.brokeCount >= 3);
  want("racha7", u.streakDays >= 7);
  want("racha30", u.streakDays >= 30);
  want("insomne", !!extra.insomne);

  if (!earn.length) return;
  const fresh = unlockAchievements(clientId, earn);
  if (fresh.length) {
    emitToClient(clientId, "unlocked", { ids: fresh });
    sendStateToClient(clientId);
  }
}

// Código de país desde el header de Cloudflare (si está habilitado IP Geolocation).
function countryFromSocket(socket) {
  const c = socket.handshake?.headers?.["cf-ipcountry"];
  if (!c || typeof c !== "string") return null;
  const up = c.toUpperCase();
  // CF usa "XX"/"T1" para desconocido/Tor.
  return /^[A-Z]{2}$/.test(up) && up !== "XX" && up !== "T1" ? up : null;
}

// Estado del balance entre equipos / cross-team balance state.
// pendingReal alto → falta gente respondiendo (boost IA).
// pendingReal en cero → falta gente preguntando (boost humano).
function computeBoost() {
  const pending = pendingRealCount();
  if (pending >= BOOST_AI_THRESHOLD) return { team: "ai", mult: BOOST_MULT };
  if (pending === 0) return { team: "human", mult: BOOST_MULT };
  return null;
}

// Construye el payload de estado para un cliente / builds the state payload.
function stateFor(clientId) {
  const u = getUser(clientId);
  return {
    credits: u.credits,
    creditCap: CREDIT_CAP,
    askCost: ASK_COST,
    answerSeconds: ANSWER_SECONDS,
    boost: computeBoost(),
    profile: profileOf(clientId),
    coronas: { human: u.coronasHuman, ai: u.coronasAi },
    streak: u.streakDays,
    achievements: u.achievements || [],
  };
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
      tone: null,
      boostedAsk: false,
      createdAt: Date.now(),
    });
  }
}

// Elige un prompt para que lo responda este cliente (no uno propio).
// Matchmaking suave: prioriza prompts reales cuyo "tono" coincida con la
// preferencia del responder; luego cualquier real; luego semilla.
// Soft matchmaking: real prompts matching the responder's tone first.
function pickPromptFor(clientId) {
  ensureSeeds();
  const u = getUser(clientId);
  const wantTone = u.prefs?.tone && u.prefs.tone !== "any" ? u.prefs.tone : null;
  const others = (p) => p.askerClientId !== clientId;

  let idx = -1;
  if (wantTone) {
    idx = queue.findIndex((p) => !p.seed && others(p) && p.tone === wantTone);
  }
  if (idx === -1) idx = queue.findIndex((p) => !p.seed && others(p));
  if (idx === -1) idx = queue.findIndex((p) => others(p));
  if (idx === -1) return null;
  return queue.splice(idx, 1)[0];
}

function pendingRealCount() {
  return queue.filter((p) => !p.seed).length;
}

// ---- HTTP + Socket.IO ----
const app = express();
// En producción servimos el build de Vite (/dist); si no existe, /public.
const distDir = path.join(__dirname, "dist");
const staticDir = fs.existsSync(distDir) ? distDir : path.join(__dirname, "public");
app.use(express.static(staticDir));
app.get("/health", (_req, res) => res.json({ ok: true, queue: queue.length }));
// Fallback SPA: cualquier ruta desconocida sirve index.html.
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
  socket.emit("state", stateFor(clientId));
}

// Igual que sendState pero por clientId (a todas sus pestañas).
function sendStateToClient(clientId) {
  emitToClient(clientId, "state", stateFor(clientId));
}

// Difunde estadísticas globales (incluye el estado del boost) a todos.
function broadcastStats() {
  io.emit("stats", {
    online: io.engine.clientsCount,
    totalAnswered,
    pending: pendingRealCount(),
    boost: computeBoost(),
  });
}

// Añade una respuesta al muro (memoria + DB) y la difunde.
function pushFeed(prompt, answer, model, authorClientId, roast) {
  const item = {
    id: newId(),
    prompt,
    answer,
    model: model || null,
    authorClientId: authorClientId || null,
    roast: roast ? 1 : 0,
    rUp: 0,
    rBot: 0,
    rMeh: 0,
    rSkull: 0,
    ts: Date.now(),
  };
  recentAnswers.unshift(item);
  if (recentAnswers.length > MAX_FEED) recentAnswers.pop();
  pushAnswer(item, MAX_FEED);
  totalAnswered++;
  io.emit("feed:new", item);
}

// ---- Lógica de duelos / duel logic ----
function currentDuelPrompt() {
  if (!duelPrompt) duelPrompt = SEED_PROMPTS[Math.floor(Math.random() * SEED_PROMPTS.length)];
  return duelPrompt;
}
// Vista pública de un duelo (sin exponer clientIds).
function publicDuel(d) {
  return {
    id: d.id,
    prompt: d.prompt,
    a: { answer: d.a.answer, model: d.a.model?.id || null },
    b: { answer: d.b.answer, model: d.b.model?.id || null },
    votesA: d.votesA.size,
    votesB: d.votesB.size,
    closed: d.closed,
    winner: d.winner || null,
  };
}
// Empareja entradas del mismo prompt (autores distintos) en duelos.
function tryPairDuels() {
  let guard = 0;
  while (duelEntries.length >= 2 && guard++ < 50) {
    const a = duelEntries[0];
    const j = duelEntries.findIndex(
      (e, i) => i > 0 && e.prompt === a.prompt && e.authorClientId !== a.authorClientId
    );
    if (j === -1) break;
    const b = duelEntries.splice(j, 1)[0];
    duelEntries.splice(0, 1);
    const duel = { id: newId(), prompt: a.prompt, a, b, votesA: new Set(), votesB: new Set(), closed: false, winner: null };
    duels.set(duel.id, duel);
    io.emit("duel:new", publicDuel(duel));
  }
  // Cuando no quedan entradas pendientes, rotamos el prompt para variar.
  if (duelEntries.length === 0) {
    duelPrompt = SEED_PROMPTS[Math.floor(Math.random() * SEED_PROMPTS.length)];
  }
}
function openDuels() {
  return [...duels.values()].filter((d) => !d.closed).map(publicDuel);
}
// Cierra el duelo, decide ganador y reparte coronas IA.
function closeDuel(d) {
  d.closed = true;
  d.winner = d.votesA.size === d.votesB.size ? "tie" : d.votesA.size > d.votesB.size ? "a" : "b";
  const winEntry = d.winner === "a" ? d.a : d.winner === "b" ? d.b : null;
  if (d.winner === "tie") {
    addCoronas(d.a.authorClientId, 0, DUEL_LOSE_CORONAS);
    addCoronas(d.b.authorClientId, 0, DUEL_LOSE_CORONAS);
  } else {
    const loseEntry = winEntry === d.a ? d.b : d.a;
    addCoronas(winEntry.authorClientId, 0, DUEL_WIN_CORONAS);
    addCoronas(loseEntry.authorClientId, 0, DUEL_LOSE_CORONAS);
  }
  io.emit("duel:closed", publicDuel(d));
  for (const cid of [d.a.authorClientId, d.b.authorClientId]) {
    sendStateToClient(cid);
    checkAchievements(cid);
  }
  duels.delete(d.id);
}

// Devuelve un prompt a la cola (p.ej. al saltar o agotar el tiempo).
function requeue(prompt) {
  if (prompt.seed) return;
  if (!isClientOnline(prompt.askerClientId)) {
    refundAsk(prompt); // se fue: devolvemos crédito (si correspondía) y descartamos
    return;
  }
  prompt.createdAt = Date.now();
  queue.unshift(prompt); // al frente para que se atienda pronto
}

// Devuelve el crédito de una pregunta (cancelación o prompt descartado).
// Si la pregunta fue gratis (boost humano), no hay nada que devolver.
function refundAsk(prompt) {
  const clientId = typeof prompt === "string" ? prompt : prompt?.askerClientId;
  const free = typeof prompt === "object" && prompt?.boostedAsk;
  if (!clientId || clientId === "seed" || free) return;
  addCredits(clientId, ASK_COST);
  sendStateToClient(clientId);
}

// Entrega la respuesta al que preguntó; si está desconectado, la guarda.
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
    const clientId =
      typeof payload.clientId === "string" && payload.clientId.length >= 8
        ? payload.clientId.slice(0, 64)
        : newId();
    socket.data.clientId = clientId;
    addClientSocket(clientId, socket.id);
    getUser(clientId); // crea la fila si es nuevo
    setCountry(clientId, countryFromSocket(socket), START_CREDITS); // país por IP (Cloudflare)
    socket.emit("welcome", { clientId });
    sendState(socket);
    flushDeliveries(clientId);
    broadcastStats();
  });

  // --- Alta / actualización de cuenta / register or update account ---
  socket.on("register", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const nick = String(payload.nick || "").trim().slice(0, 24);
    const email = String(payload.email || "").trim().slice(0, 120);
    if (nick.length < 2) return ack?.({ ok: false, error: "bad_nick" });
    // Email opcional pero, si viene, mínimamente válido.
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return ack?.({ ok: false, error: "bad_email" });
    if (isNickTaken(nick, clientId)) return ack?.({ ok: false, error: "nick_taken" });

    const prefs = sanitizePrefs(payload.prefs);
    const sex = sanitizeSex(payload.sex);
    upsertProfile(clientId, { email: email || null, nick, prefs, sex }, START_CREDITS);
    sendState(socket);
    ack?.({ ok: true, profile: profileOf(clientId) });
  });

  socket.on("updatePrefs", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const prefs = sanitizePrefs(payload.prefs);
    const sex = sanitizeSex(payload.sex);
    dbSetPrefs(clientId, prefs, sex, START_CREDITS);
    sendState(socket);
    ack?.({ ok: true, profile: profileOf(clientId) });
  });

  // --- Reaccionar a una nota del muro / react to a wall note ---
  socket.on("react", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const type = String(payload.type || "");
    if (!["up", "bot", "meh", "skull"].includes(type))
      return ack?.({ ok: false, error: "bad_type" });

    const res = dbReact(payload.answerId, clientId, type);
    if (!res) return ack?.({ ok: false, error: "not_found" });
    if (res.selfVote) return ack?.({ ok: false, error: "self_vote", my: res.my });

    // Difunde los contadores nuevos a todos; al autor le refrescamos sus coronas.
    io.emit("feed:react", {
      id: res.answer.id,
      rUp: res.answer.rUp,
      rBot: res.answer.rBot,
      rMeh: res.answer.rMeh,
      rSkull: res.answer.rSkull,
    });
    if (res.answer.authorClientId) {
      sendStateToClient(res.answer.authorClientId);
      checkAchievements(res.answer.authorClientId); // querido / mas_robot
    }
    ack?.({ ok: true, my: res.my, answer: res.answer });
  });

  // --- Modo humano: preguntar / Human mode: ask ---
  socket.on("ask", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const text = String(payload.text || "").trim().slice(0, 1000);
    if (!text) return ack?.({ ok: false, error: "empty" });

    // Boost humano: cuando no hay prompts reales esperando, preguntar es gratis.
    const boost = computeBoost();
    const free = boost?.team === "human";

    const user = getUser(clientId);
    if (!free && user.credits < ASK_COST)
      return ack?.({ ok: false, error: "no_credits" });

    if (!free) addCredits(clientId, -ASK_COST);
    incAsked(clientId);
    bumpStreak(clientId);
    if (!free && getUser(clientId).credits === 0) incBroke(clientId);
    checkAchievements(clientId);

    const tone = sanitizeTone(payload.tone);
    const prompt = {
      id: newId(),
      text,
      askerClientId: clientId,
      seed: false,
      tone,
      boostedAsk: free,
      createdAt: Date.now(),
    };
    queue.push(prompt);
    sendState(socket);
    broadcastStats();
    ack?.({ ok: true, promptId: prompt.id, free });
  });

  // Cancelar una pregunta que aún espera respuesta / cancel a still-pending ask.
  socket.on("cancelAsk", (payload = {}) => {
    const clientId = socket.data.clientId;
    const i = queue.findIndex((p) => p.id === payload.promptId);
    if (i === -1) return;
    if (queue[i].seed || queue[i].askerClientId !== clientId) return;
    const [prompt] = queue.splice(i, 1);
    refundAsk(prompt);
    broadcastStats();
  });

  // --- Modo IA: pedir algo que responder / AI mode: request a job ---
  socket.on("requestJob", (_payload, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });

    // Congelamos el boost ANTES de sacar el prompt: si lo evaluáramos después,
    // la cola ya bajó y el boost que motivó a responder desaparecería.
    // Snapshot the boost BEFORE pulling the prompt (the queue drops afterwards).
    const boostAtPick = computeBoost();

    const prompt = pickPromptFor(clientId);
    if (!prompt) return ack?.({ ok: false, error: "no_jobs" });

    // El humano "encarna" un modelo: su favorito si lo eligió, si no aleatorio.
    const u = getUser(clientId);
    const model = pickModel(u.prefs?.favModel);

    const jobId = newId();
    const deadline = Date.now() + ANSWER_SECONDS * 1000;
    const timer = setTimeout(() => {
      const job = clearJob(jobId);
      if (!job) return;
      requeue(job.prompt);
      socket.emit("jobExpired", { jobId });
      sendState(socket);
      broadcastStats();
    }, ANSWER_SECONDS * 1000 + 500);

    activeJobs.set(jobId, {
      prompt,
      responderSocketId: socket.id,
      responderClientId: clientId,
      model,
      boost: boostAtPick,
      timer,
      deadline,
    });

    broadcastStats(); // la cola cambió → puede cambiar el boost
    ack?.({
      ok: true,
      jobId,
      prompt: prompt.text,
      seconds: ANSWER_SECONDS,
      deadline,
      model, // el modelo que debe "encarnar"
      boost: boostAtPick,
    });
  });

  // Saltar un prompt sin responder / skip a job without answering.
  socket.on("skipJob", (payload = {}) => {
    const job = clearJob(payload.jobId);
    if (job) {
      requeue(job.prompt);
      broadcastStats();
    }
  });

  // Enviar la respuesta "de la IA" / submit the "AI" answer.
  socket.on("submitAnswer", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    const job = clearJob(payload.jobId);
    if (!job) return ack?.({ ok: false, error: "expired" });
    if (job.responderClientId !== clientId)
      return ack?.({ ok: false, error: "not_yours" });

    const answer = String(payload.answer || "").trim().slice(0, 2000);
    const roast = !!payload.roast;
    if (!answer) {
      requeue(job.prompt);
      return ack?.({ ok: false, error: "empty" });
    }

    // Recompensa base + boost del equipo IA (el congelado al tomar el job).
    const aiBoost = job.boost?.team === "ai" ? job.boost.mult : 1;
    const base =
      ANSWER_REWARD_MIN +
      Math.floor(Math.random() * (ANSWER_REWARD_MAX - ANSWER_REWARD_MIN + 1));
    const reward = base * aiBoost;

    const before = getUser(clientId).credits;
    const after = addCredits(clientId, reward);
    const gained = after - before; // real aplicado (0 si tocó el tope)
    incAnswered(clientId);

    const modelId = job.model?.id || null;
    if (modelId) addModelUsed(clientId, modelId);
    bumpStreak(clientId);
    const hr = new Date().getHours();
    checkAchievements(clientId, { insomne: hr >= 3 && hr < 5 });

    // Entrega la respuesta a quien preguntó (ahora o cuando se reconecte).
    if (!job.prompt.seed) {
      deliverAnswer(job.prompt.askerClientId, {
        promptId: job.prompt.id,
        prompt: job.prompt.text,
        answer,
        model: modelId,
      });
    }

    pushFeed(job.prompt.text, answer, modelId, clientId, roast);
    broadcastStats();
    sendState(socket);
    ack?.({
      ok: true,
      reward: gained,
      credits: after,
      seed: job.prompt.seed,
      boosted: aiBoost > 1,
      model: job.model || null,
    });
  });

  // Respuesta de la semana (la más reaccionada en 7 días).
  socket.on("getHighlight", (_payload, ack) => {
    ack?.({ ok: true, highlight: answerOfWeek() });
  });

  // Salón de la vergüenza (las notas más votadas con 💀).
  socket.on("getHallOfShame", (_payload, ack) => {
    const clientId = socket.data.clientId;
    ack?.({
      ok: true,
      items: hallOfShame(30),
      myReactions: clientId ? myReactions(clientId) : {},
    });
  });

  // --- Modo Duelo / Duel mode ---
  socket.on("getDuelState", (_payload, ack) => {
    ack?.({ ok: true, prompt: currentDuelPrompt(), duels: openDuels() });
  });

  // Enviar tu respuesta al prompt del duelo → entra a la pileta de emparejamiento.
  socket.on("submitDuelEntry", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const answer = String(payload.answer || "").trim().slice(0, 2000);
    if (!answer) return ack?.({ ok: false, error: "empty" });

    const u = getUser(clientId);
    const model = pickModel(u.prefs?.favModel);
    const entry = { id: newId(), prompt: currentDuelPrompt(), answer, authorClientId: clientId, model };
    duelEntries.push(entry);
    addModelUsed(clientId, model.id);
    bumpStreak(clientId);
    checkAchievements(clientId);
    tryPairDuels();
    ack?.({ ok: true, model });
    socket.emit("duel:state", { prompt: currentDuelPrompt(), duels: openDuels() });
  });

  // Votar un duelo (A o B). Un voto por cliente; no podés votar tu propio duelo.
  socket.on("voteDuel", (payload = {}, ack) => {
    const clientId = socket.data.clientId;
    if (!clientId) return ack?.({ ok: false, error: "no_session" });
    const d = duels.get(payload.duelId);
    if (!d || d.closed) return ack?.({ ok: false, error: "not_found" });
    if (clientId === d.a.authorClientId || clientId === d.b.authorClientId)
      return ack?.({ ok: false, error: "self_vote" });
    if (d.votesA.has(clientId) || d.votesB.has(clientId))
      return ack?.({ ok: false, error: "already" });
    const side = payload.side === "b" ? "b" : "a";
    (side === "a" ? d.votesA : d.votesB).add(clientId);
    io.emit("duel:update", publicDuel(d));
    if (d.votesA.size + d.votesB.size >= DUEL_CLOSE_VOTES) closeDuel(d);
    ack?.({ ok: true });
  });

  // --- Ranking público / public leaderboard ---
  socket.on("getRanking", (payload = {}, ack) => {
    const category = payload.category === "ai" ? "ai" : "human";
    const period = ["today", "week", "all"].includes(payload.period) ? payload.period : "all";
    const country =
      typeof payload.country === "string" && /^[A-Z]{2}$/.test(payload.country)
        ? payload.country
        : null;
    const sex = sanitizeSex(payload.sex);
    const model = MODEL_BY_ID[payload.model] ? payload.model : null;
    const rows = topPlayers({ category, period, country, sex, model, limit: 50 });
    // Coronas mundiales (histórico, global) para el "hall of fame".
    const kingHuman = topPlayers({ category: "human", period: "all", limit: 1 })[0] || null;
    const kingAi = topPlayers({ category: "ai", period: "all", limit: 1 })[0] || null;
    ack?.({ ok: true, rows, category, period, kingHuman, kingAi });
  });

  // Envía el muro inicial + las reacciones propias del cliente.
  socket.on("getFeed", () => {
    const clientId = socket.data.clientId;
    socket.emit("feed:init", {
      items: recentAnswers,
      myReactions: clientId ? myReactions(clientId) : {},
    });
    broadcastStats();
  });

  socket.on("disconnect", () => {
    if (socket.data.clientId) removeClientSocket(socket.data.clientId, socket.id);
    for (const [jobId, job] of activeJobs) {
      if (job.responderSocketId === socket.id) {
        clearJob(jobId);
        requeue(job.prompt);
      }
    }
    broadcastStats();
  });
});

// Normaliza preferencias entrantes / sanitize incoming prefs.
const TONES = ["any", "gracioso", "serio", "poetico", "acido"];
const LANGS = ["any", "es", "en"];
function sanitizePrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return null;
  const tone = TONES.includes(prefs.tone) ? prefs.tone : "any";
  const lang = LANGS.includes(prefs.lang) ? prefs.lang : "any";
  const favModel = MODEL_BY_ID[prefs.favModel] ? prefs.favModel : null;
  return { tone, lang, favModel };
}
function sanitizeTone(tone) {
  return TONES.includes(tone) && tone !== "any" ? tone : null;
}
const SEXES = ["m", "f", "nb", "na"]; // masculino, femenino, no binario, no aclara
function sanitizeSex(sex) {
  return SEXES.includes(sex) ? sex : null;
}

// Hidrata el muro desde la DB; si está vacío, lo prepobla con ejemplos.
// Hydrate the wall from the DB; if empty, prefill with examples.
if (answersCount() === 0) {
  for (const f of SEED_FEED) {
    pushAnswer(
      { id: newId(), prompt: f.prompt, answer: f.answer, model: null, ts: Date.now() },
      MAX_FEED
    );
  }
}
for (const row of dbRecentAnswers(MAX_FEED)) recentAnswers.push(row);
totalAnswered = recentAnswers.length;

ensureSeeds();
server.listen(PORT, () => {
  console.log(`Tu IA me aburre escuchando en http://localhost:${PORT}`);
});
