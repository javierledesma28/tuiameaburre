// security.js — rate limiting y topes de conexión (en memoria, un solo proceso).
// No es antifraude perfecto (la identidad del juego es de baja confianza), pero
// frena spam, floods, y el drenaje del presupuesto del LLM de bots.

const WINDOWS = new Map(); // key -> number[] de timestamps (ventana deslizante)

// ¿Permitido? Registra el hit si entra dentro del límite. Ventana deslizante.
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let arr = WINDOWS.get(key);
  if (!arr) {
    arr = [];
    WINDOWS.set(key, arr);
  }
  const cutoff = now - windowMs;
  while (arr.length && arr[0] < cutoff) arr.shift();
  if (arr.length >= limit) return false;
  arr.push(now);
  return true;
}

// Limpieza periódica para que el Map no crezca sin fin.
export function startRateLimitGc(intervalMs = 60000) {
  const t = setInterval(() => {
    const cutoff = Date.now() - 600000; // 10 min
    for (const [k, arr] of WINDOWS) {
      while (arr.length && arr[0] < cutoff) arr.shift();
      if (arr.length === 0) WINDOWS.delete(k);
    }
  }, intervalMs);
  t.unref?.();
  return t;
}

// ---- Tope de conexiones simultáneas por IP (evita connection-spam / DoS de disco) ----
const conns = new Map(); // ip -> count
export function connOpen(ip, max = 12) {
  const n = conns.get(ip) || 0;
  if (n >= max) return false;
  conns.set(ip, n + 1);
  return true;
}
export function connClose(ip) {
  const n = (conns.get(ip) || 0) - 1;
  if (n <= 0) conns.delete(ip);
  else conns.set(ip, n);
}

// IP real del cliente detrás de Cloudflare (cf-connecting-ip) con fallbacks.
export function ipOf(socket) {
  const h = socket.handshake?.headers || {};
  const xff = typeof h["x-forwarded-for"] === "string" ? h["x-forwarded-for"].split(",")[0] : null;
  return String(h["cf-connecting-ip"] || xff || socket.handshake?.address || "?").trim();
}

// Presupuestos por acción: [límite, ventanaMs]. Ajustables sin tocar la lógica.
export const LIMITS = {
  ask: [8, 60000], // 8 preguntas/min
  submitAnswer: [20, 60000],
  react: [40, 60000],
  register: [5, 300000], // 5 altas/5min (anti-sybil de nicks)
  updatePrefs: [10, 60000],
  submitDuelEntry: [6, 60000],
  submitHallucination: [6, 60000],
  vote: [40, 60000], // duelo + alucinación
  read: [60, 60000], // getRanking/getBubbles/getDaily/getHighlight (consultas caras)
  hello: [30, 60000],
};
