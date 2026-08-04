// moderation.js — filtro de contenido básico + normalización anti-impersonación.
//
// Objetivo: frenar lo evidentemente ofensivo y el spam de enlaces, y evitar que
// dos nicks "iguales" (con homoglifos/leet) se hagan pasar por la misma persona.
//
// ⚠️ La BLOCKLIST es un punto de partida deliberadamente corto. Para producción
// real conviene ampliarla y/o enchufar una librería mantenida (p. ej. `leo-profanity`
// con set ES+EN) y sumar una cola de reportes con revisión humana. No confíes solo
// en un blocklist: es un piso, no un techo.

const ZERO_WIDTH = /[​-‍﻿⁠­]/g;
// Homoglifos cirílicos/griegos comunes → latino.
const CONFUSABLES = {
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ѕ: "s",
  ԁ: "d", ո: "n", ս: "u", в: "b", н: "h", м: "m", т: "t", к: "k", ё: "e", α: "a", ο: "o", ρ: "p",
};
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };

// Normaliza: minúsculas, sin acentos, sin zero-width, homoglifos → latino.
export function normalize(text) {
  let t = String(text || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  t = t.replace(ZERO_WIDTH, "");
  t = t.replace(/[\s\S]/g, (c) => CONFUSABLES[c] || c);
  return t;
}

// Clave canónica de un nick para comparar unicidad (impersonación).
// Colapsa leet y deja solo alfanumérico: "аdmin", "@dm1n" y "admin" chocan.
export function nickKey(nick) {
  return normalize(nick)
    .replace(/[^a-z0-9]/g, (c) => LEET[c] || "")
    .replace(/(.)\1{2,}/g, "$1"); // aaadmin → admin
}

// Blocklist (starter). Separada para minimizar falsos positivos en español:
//  - HARD: slurs sin colisión con palabras legítimas → match por substring (atrapa evasión "n i g g e r").
//  - WORDS: match SOLO por límite de palabra (así "retardar"=demorar NO se bloquea).
//  - PHRASES: insultos compuestos, match de frase.
// `zzbannedzz` es un centinela SOLO para tests.
const HARD = ["zzbannedzz", "nigger", "faggot"];
const WORDS = ["retard"];
const PHRASES = ["puto de mierda", "negro de mierda", "muerte a"];

// URLs para frenar spam de enlaces (permitimos texto, no promociones).
const URL_RE = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\.[a-z]{2,}|[a-z0-9-]+\.(?:com|net|org|io|xyz|ru|tk|link)\b/i;

// Colapsa repeticiones y separadores para atrapar "p u t o" / "putoooo".
function flatten(text) {
  let t = normalize(text).replace(/[^a-z0-9\s]/g, (c) => LEET[c] || " ");
  t = t.replace(/(.)\1{2,}/g, "$1$1"); // holaaaa → holaa
  return t;
}

// Modera un texto libre (prompt/respuesta/daily/duelo/alucinación).
// Devuelve { ok:true } o { ok:false, reason }.
export function moderate(text, { allowUrls = false } = {}) {
  const raw = String(text || "");
  const t = flatten(raw);
  const flat = t.replace(/\s+/g, "");
  for (const w of HARD) if (flat.includes(w)) return { ok: false, reason: "blocked" };
  for (const w of WORDS) if (new RegExp(`\\b${w}\\b`).test(t)) return { ok: false, reason: "blocked" };
  for (const p of PHRASES) if (t.includes(p)) return { ok: false, reason: "blocked" };
  if (!allowUrls && URL_RE.test(raw)) return { ok: false, reason: "no_links" };
  return { ok: true };
}

// Modera un nick: además de la blocklist, prohíbe nombres reservados.
const RESERVED = ["admin", "administrador", "moderador", "mod", "root", "sistema", "system", "bot", "staff", "oficial", "tuiameaburre"];
export function moderateNick(nick) {
  const m = moderate(nick, { allowUrls: true });
  if (!m.ok) return m;
  const key = nickKey(nick);
  if (RESERVED.some((r) => key === r || key.startsWith(r))) return { ok: false, reason: "reserved" };
  return { ok: true };
}
