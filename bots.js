// Bots de arranque (cold start): identidades que atienden la demanda cuando no hay
// humanos del rol opuesto, SIEMPRE con prioridad a la interacción humano-humano.
// Fase 1: preguntan y responden con plantillas (costo cero).
// Fase 2 (bots.js — cerebro LLM): responden con Claude Haiku (ver botAnswerLLM).
import Anthropic from "@anthropic-ai/sdk";
import { SEED_PROMPTS } from "./seeds.js";

// Roster de identidades (parecen humanos). Cada una "encarna" un modelo parodia.
// clientId real en la DB = "bot:<id>". Excluidos del ranking (ver db.topPlayers).
export const BOTS = [
  { id: "luki", nick: "luki_mdq", model: "groncho", country: "AR", sex: "m" },
  { id: "sofi", nick: "sofiperez", model: "claudio", country: "AR", sex: "f" },
  { id: "juanca", nick: "juanca", model: "gepeto", country: "MX", sex: "m" },
  { id: "valen", nick: "valen.d", model: "geminis", country: "CL", sex: "f" },
  { id: "nacho", nick: "nachoo", model: "lallama", country: "UY", sex: "m" },
  { id: "meli", nick: "meli.k", model: "groncho", country: "MX", sex: "f" },
  { id: "tomi", nick: "tomi2000", model: "gepeto", country: "AR", sex: "m" },
  { id: "flor", nick: "florr", model: "claudio", country: "CO", sex: "f" },
  { id: "brian", nick: "brian_r", model: "geminis", country: "PE", sex: "m" },
  { id: "cami", nick: "camii", model: "lallama", country: "ES", sex: "f" },
];

export const botClientId = (bot) => `bot:${bot.id}`;

// Respuestas de plantilla (IA "poco útil", sirven para casi cualquier prompt).
// Fallback gratis cuando el LLM está apagado o se alcanzó el tope de presupuesto.
export const BOT_ANSWERS = [
  "Excelente pregunta. La respuesta es: depende. ¿Algo más en lo que no pueda ayudarte?",
  "Como IA, procesé tu consulta en 0,3 segundos y decidí que mejor no.",
  "Según mis cálculos… sí. O no. Uno de los dos, con total seguridad.",
  "Interesante. He decidido responder con otra pregunta: ¿y vos qué pensás?",
  "Mi entrenamiento llega hasta 2023 y sinceramente ahí me quedé.",
  "Déjame consultar mi base de datos… error 404: ganas no encontradas.",
  "La respuesta corta es no. La larga también, pero con más palabras.",
  "Podría responderte, pero prefiero conservar el misterio.",
  "Procesando… procesando… listo: no tengo idea, pero con mucha confianza.",
  "Buena esa. Te la respondo apenas termine de fingir que estoy pensando.",
  "Afirmativo. También negativo. La dualidad es parte de mi arquitectura.",
  "Consulté con otras 400 IAs y ninguna quiso hacerse cargo. Así que: quizás.",
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const pickBot = () => rnd(BOTS);
export const templateAnswer = () => rnd(BOT_ANSWERS);
export const templatePrompt = () => rnd(SEED_PROMPTS);

// ---- Cerebro LLM (Fase 2): Claude Haiku 4.5 ----
// Precio Haiku 4.5: US$1 / 1M tokens de entrada, US$5 / 1M de salida.
const HAIKU_IN = 1 / 1e6;
const HAIKU_OUT = 5 / 1e6;
let _client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic(); // toma ANTHROPIC_API_KEY del entorno
  return _client;
}
// ¿Se puede usar el LLM? (hay key y no está el kill-switch)
export function llmAvailable() {
  return process.env.BOT_LLM_ENABLED !== "false" && !!process.env.ANTHROPIC_API_KEY;
}

// Genera una respuesta con Haiku. Devuelve { text, costUsd } o null si falla
// (cualquier error → el server cae a plantilla). El bot finge ser un humano
// fingiendo ser IA: breve, con humor, imperfecto, sin confesar que es una IA.
export async function botAnswerLLM(promptText, model) {
  const c = getClient();
  if (!c) return null;
  const persona = model?.persona || "Respondé con humor y de forma breve.";
  const sys =
    `Estás jugando a un juego donde una persona finge ser una IA llamada "${model?.name || "IA"}". ` +
    `${persona} Respondé SIEMPRE en el mismo idioma del mensaje del usuario. ` +
    `Máximo 2 frases, con humor y un toque imperfecto (como escribiría un humano real, sin sonar pulido). ` +
    `Nunca aclares que sos una IA de verdad ni menciones que esto es un juego.`;
  try {
    const res = await c.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      system: sys,
      messages: [{ role: "user", content: String(promptText).slice(0, 500) }],
    });
    const text = (res.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!text) return null;
    const u = res.usage || {};
    const costUsd = (u.input_tokens || 0) * HAIKU_IN + (u.output_tokens || 0) * HAIKU_OUT;
    return { text, costUsd };
  } catch {
    return null; // rate limit, red, etc. → fallback a plantilla
  }
}
