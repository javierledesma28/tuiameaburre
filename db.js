// Capa de persistencia con SQLite (better-sqlite3, síncrono).
// SQLite persistence layer. Reemplaza el Map en memoria por una DB en disco,
// para que créditos, cuentas, reputación y el muro sobrevivan a los reinicios.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "tuia.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    clientId      TEXT PRIMARY KEY,
    email         TEXT,
    nick          TEXT,
    credits       INTEGER NOT NULL,
    prefs         TEXT,
    gamesAsked    INTEGER NOT NULL DEFAULT 0,
    gamesAnswered INTEGER NOT NULL DEFAULT 0,
    coronasHuman  INTEGER NOT NULL DEFAULT 0,
    coronasAi     INTEGER NOT NULL DEFAULT 0,
    country       TEXT,
    sex           TEXT,
    streakDays    INTEGER NOT NULL DEFAULT 0,
    lastPlayedDay TEXT,
    achievements  TEXT,
    createdAt     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    id             TEXT PRIMARY KEY,
    prompt         TEXT NOT NULL,
    answer         TEXT NOT NULL,
    model          TEXT,
    authorClientId TEXT,
    rUp    INTEGER NOT NULL DEFAULT 0,
    rBot   INTEGER NOT NULL DEFAULT 0,
    rMeh   INTEGER NOT NULL DEFAULT 0,
    rSkull INTEGER NOT NULL DEFAULT 0,
    ts     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reactions (
    answerId       TEXT NOT NULL,
    voterClientId  TEXT NOT NULL,
    type           TEXT NOT NULL,
    authorClientId TEXT,
    ts             INTEGER NOT NULL,
    PRIMARY KEY (answerId, voterClientId)
  );
  CREATE INDEX IF NOT EXISTS idx_reactions_author ON reactions(authorClientId);
  CREATE INDEX IF NOT EXISTS idx_reactions_ts ON reactions(ts);
`);

// Migración idempotente para DBs ya desplegadas (SQLite no tiene ADD COLUMN IF
// NOT EXISTS): intentamos agregar cada columna y tragamos el error si ya existe.
function addColumn(table, def) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${def}`);
  } catch {
    /* la columna ya existe */
  }
}
for (const def of [
  "coronasHuman INTEGER NOT NULL DEFAULT 0",
  "coronasAi INTEGER NOT NULL DEFAULT 0",
  "country TEXT",
  "sex TEXT",
  "streakDays INTEGER NOT NULL DEFAULT 0",
  "lastPlayedDay TEXT",
  "achievements TEXT",
]) addColumn("users", def);
for (const def of [
  "authorClientId TEXT",
  "rUp INTEGER NOT NULL DEFAULT 0",
  "rBot INTEGER NOT NULL DEFAULT 0",
  "rMeh INTEGER NOT NULL DEFAULT 0",
  "rSkull INTEGER NOT NULL DEFAULT 0",
]) addColumn("answers", def);

// ---- Statements preparados / prepared statements ----
const stmtGetUser = db.prepare("SELECT * FROM users WHERE clientId = ?");
const stmtInsertUser = db.prepare(
  "INSERT INTO users (clientId, credits, createdAt) VALUES (?, ?, ?)"
);
const stmtSetCredits = db.prepare("UPDATE users SET credits = ? WHERE clientId = ?");
const stmtSetProfile = db.prepare(
  "UPDATE users SET email = ?, nick = ?, prefs = ?, sex = ? WHERE clientId = ?"
);
const stmtSetPrefs = db.prepare("UPDATE users SET prefs = ?, sex = ? WHERE clientId = ?");
const stmtSetCountry = db.prepare("UPDATE users SET country = ? WHERE clientId = ?");
const stmtIncAsked = db.prepare(
  "UPDATE users SET gamesAsked = gamesAsked + 1 WHERE clientId = ?"
);
const stmtIncAnswered = db.prepare(
  "UPDATE users SET gamesAnswered = gamesAnswered + 1 WHERE clientId = ?"
);
const stmtAddCoronas = db.prepare(
  "UPDATE users SET coronasHuman = MAX(0, coronasHuman + ?), coronasAi = MAX(0, coronasAi + ?) WHERE clientId = ?"
);
const stmtNickTaken = db.prepare(
  "SELECT clientId FROM users WHERE nick = ? COLLATE NOCASE AND clientId != ?"
);

const stmtInsertAnswer = db.prepare(
  "INSERT INTO answers (id, prompt, answer, model, authorClientId, ts) VALUES (?, ?, ?, ?, ?, ?)"
);
const stmtGetAnswer = db.prepare("SELECT * FROM answers WHERE id = ?");
const stmtRecentAnswers = db.prepare(
  "SELECT id, prompt, answer, model, authorClientId, rUp, rBot, rMeh, rSkull, ts FROM answers ORDER BY ts DESC LIMIT ?"
);
const stmtCountAnswers = db.prepare("SELECT COUNT(*) AS n FROM answers");
const stmtTrimAnswers = db.prepare(
  "DELETE FROM answers WHERE id NOT IN (SELECT id FROM answers ORDER BY ts DESC LIMIT ?)"
);

const stmtGetReaction = db.prepare(
  "SELECT type FROM reactions WHERE answerId = ? AND voterClientId = ?"
);
const stmtUpsertReaction = db.prepare(
  `INSERT INTO reactions (answerId, voterClientId, type, authorClientId, ts)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(answerId, voterClientId) DO UPDATE SET type = excluded.type, ts = excluded.ts`
);
const stmtDeleteReaction = db.prepare(
  "DELETE FROM reactions WHERE answerId = ? AND voterClientId = ?"
);
const stmtRecalcAnswer = db.prepare(
  `UPDATE answers SET
     rUp    = (SELECT COUNT(*) FROM reactions WHERE answerId = ? AND type = 'up'),
     rBot   = (SELECT COUNT(*) FROM reactions WHERE answerId = ? AND type = 'bot'),
     rMeh   = (SELECT COUNT(*) FROM reactions WHERE answerId = ? AND type = 'meh'),
     rSkull = (SELECT COUNT(*) FROM reactions WHERE answerId = ? AND type = 'skull')
   WHERE id = ?`
);
const stmtMyReactions = db.prepare(
  "SELECT answerId, type FROM reactions WHERE voterClientId = ?"
);

function parsePrefs(row) {
  if (!row) return row;
  let prefs = null;
  if (row.prefs) {
    try {
      prefs = JSON.parse(row.prefs);
    } catch {
      prefs = null;
    }
  }
  let achievements = [];
  if (row.achievements) {
    try {
      achievements = JSON.parse(row.achievements);
    } catch {
      achievements = [];
    }
  }
  return { ...row, prefs, achievements };
}

export function getUser(clientId, startCredits) {
  let row = stmtGetUser.get(clientId);
  if (!row) {
    stmtInsertUser.run(clientId, startCredits, Date.now());
    row = stmtGetUser.get(clientId);
  }
  return parsePrefs(row);
}

export function setCredits(clientId, credits) {
  stmtSetCredits.run(credits, clientId);
}

export function upsertProfile(clientId, { email, nick, prefs, sex }, startCredits) {
  getUser(clientId, startCredits);
  stmtSetProfile.run(
    email ?? null,
    nick ?? null,
    prefs ? JSON.stringify(prefs) : null,
    sex ?? null,
    clientId
  );
  return parsePrefs(stmtGetUser.get(clientId));
}

export function setPrefs(clientId, prefs, sex, startCredits) {
  getUser(clientId, startCredits);
  stmtSetPrefs.run(prefs ? JSON.stringify(prefs) : null, sex ?? null, clientId);
  return parsePrefs(stmtGetUser.get(clientId));
}

export function setCountry(clientId, country, startCredits) {
  if (!country) return;
  getUser(clientId, startCredits);
  stmtSetCountry.run(country, clientId);
}

export function incAsked(clientId) {
  stmtIncAsked.run(clientId);
}
export function incAnswered(clientId) {
  stmtIncAnswered.run(clientId);
}
export function addCoronas(clientId, human, ai) {
  if (!clientId || clientId === "seed") return;
  stmtAddCoronas.run(human || 0, ai || 0, clientId);
}

export function isNickTaken(nick, clientId) {
  return !!stmtNickTaken.get(nick, clientId);
}

// ---- Muro / wall ----
export function pushAnswer({ id, prompt, answer, model, authorClientId, ts }, cap) {
  stmtInsertAnswer.run(id, prompt, answer, model ?? null, authorClientId ?? null, ts);
  if (cap) stmtTrimAnswers.run(cap);
}
export function recentAnswers(limit) {
  return stmtRecentAnswers.all(limit);
}
export function answersCount() {
  return stmtCountAnswers.get().n;
}

// Reacciones del cliente a un set de notas → { answerId: type }.
export function myReactions(clientId) {
  const out = {};
  for (const r of stmtMyReactions.all(clientId)) out[r.answerId] = r.type;
  return out;
}

// Cuánto aporta cada tipo de reacción a las coronas del autor.
const CORONA_CONTRIB = {
  up: [1, 0], // [humano, ia]
  bot: [0, 1],
  skull: [0, 1],
  meh: [0, 0],
};

// Registra (o cambia / quita) la reacción de un votante a una nota y ajusta las
// coronas del autor en consecuencia. Devuelve { answer, my } o null si inválido.
// Toggle: reaccionar con el mismo tipo que ya tenías la quita.
export const react = db.transaction((answerId, voterClientId, type) => {
  const answer = stmtGetAnswer.get(answerId);
  if (!answer) return null;
  const author = answer.authorClientId;
  // No podés votar tu propia respuesta.
  if (author && author === voterClientId) return { answer: parseAnswer(answer), my: prevTypeOf(answerId, voterClientId), selfVote: true };

  const prev = stmtGetReaction.get(answerId, voterClientId);
  const prevType = prev?.type || null;

  let newType;
  if (prevType === type) {
    // toggle off
    stmtDeleteReaction.run(answerId, voterClientId);
    newType = null;
  } else {
    stmtUpsertReaction.run(answerId, voterClientId, type, author, Date.now());
    newType = type;
  }

  // Ajuste de coronas del autor: quitar contribución previa, sumar la nueva.
  if (author && author !== "seed") {
    const before = CORONA_CONTRIB[prevType] || [0, 0];
    const after = CORONA_CONTRIB[newType] || [0, 0];
    addCoronas(author, after[0] - before[0], after[1] - before[1]);
  }

  stmtRecalcAnswer.run(answerId, answerId, answerId, answerId, answerId);
  return { answer: parseAnswer(stmtGetAnswer.get(answerId)), my: newType };
});

function prevTypeOf(answerId, voterClientId) {
  return stmtGetReaction.get(answerId, voterClientId)?.type || null;
}
function parseAnswer(a) {
  return {
    id: a.id,
    prompt: a.prompt,
    answer: a.answer,
    model: a.model,
    authorClientId: a.authorClientId,
    rUp: a.rUp,
    rBot: a.rBot,
    rMeh: a.rMeh,
    rSkull: a.rSkull,
    ts: a.ts,
  };
}

export default db;
