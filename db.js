// Capa de persistencia con SQLite (better-sqlite3, síncrono).
// SQLite persistence layer. Reemplaza el Map en memoria por una DB en disco,
// para que créditos, cuentas y el muro sobrevivan a los reinicios.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "tuia.db");

// Asegura el directorio de la DB / ensure the DB directory exists.
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
    createdAt     INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    id     TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    model  TEXT,
    ts     INTEGER NOT NULL
  );
`);

// ---- Statements preparados / prepared statements ----
const stmtGetUser = db.prepare("SELECT * FROM users WHERE clientId = ?");
const stmtInsertUser = db.prepare(
  "INSERT INTO users (clientId, credits, createdAt) VALUES (?, ?, ?)"
);
const stmtSetCredits = db.prepare("UPDATE users SET credits = ? WHERE clientId = ?");
const stmtSetProfile = db.prepare(
  "UPDATE users SET email = ?, nick = ?, prefs = ? WHERE clientId = ?"
);
const stmtSetPrefs = db.prepare("UPDATE users SET prefs = ? WHERE clientId = ?");
const stmtIncAsked = db.prepare(
  "UPDATE users SET gamesAsked = gamesAsked + 1 WHERE clientId = ?"
);
const stmtIncAnswered = db.prepare(
  "UPDATE users SET gamesAnswered = gamesAnswered + 1 WHERE clientId = ?"
);
const stmtNickTaken = db.prepare(
  "SELECT clientId FROM users WHERE nick = ? COLLATE NOCASE AND clientId != ?"
);

const stmtInsertAnswer = db.prepare(
  "INSERT INTO answers (id, prompt, answer, model, ts) VALUES (?, ?, ?, ?, ?)"
);
const stmtRecentAnswers = db.prepare(
  "SELECT id, prompt, answer, model, ts FROM answers ORDER BY ts DESC LIMIT ?"
);
const stmtCountAnswers = db.prepare("SELECT COUNT(*) AS n FROM answers");
const stmtTrimAnswers = db.prepare(
  "DELETE FROM answers WHERE id NOT IN (SELECT id FROM answers ORDER BY ts DESC LIMIT ?)"
);

// Deserializa prefs JSON de forma segura / safely parse prefs JSON.
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
  return { ...row, prefs };
}

// Devuelve el usuario, creándolo con créditos iniciales si no existe.
// Returns the user, creating it with starting credits if missing.
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

// Alta / actualización de perfil (email + nick + prefs).
export function upsertProfile(clientId, { email, nick, prefs }, startCredits) {
  getUser(clientId, startCredits); // garantiza que la fila exista
  stmtSetProfile.run(email ?? null, nick ?? null, prefs ? JSON.stringify(prefs) : null, clientId);
  return parsePrefs(stmtGetUser.get(clientId));
}

export function setPrefs(clientId, prefs, startCredits) {
  getUser(clientId, startCredits);
  stmtSetPrefs.run(prefs ? JSON.stringify(prefs) : null, clientId);
  return parsePrefs(stmtGetUser.get(clientId));
}

export function incAsked(clientId) {
  stmtIncAsked.run(clientId);
}
export function incAnswered(clientId) {
  stmtIncAnswered.run(clientId);
}

// ¿Ese nick ya lo usa OTRO cliente? / is the nick taken by another client?
export function isNickTaken(nick, clientId) {
  return !!stmtNickTaken.get(nick, clientId);
}

// ---- Muro / wall ----
export function pushAnswer({ id, prompt, answer, model, ts }, cap) {
  stmtInsertAnswer.run(id, prompt, answer, model ?? null, ts);
  if (cap) stmtTrimAnswers.run(cap);
}
export function recentAnswers(limit) {
  return stmtRecentAnswers.all(limit);
}
export function answersCount() {
  return stmtCountAnswers.get().n;
}

export default db;
