// Bots de arranque (cold start): identidades que atienden la demanda cuando no hay
// humanos del rol opuesto, SIEMPRE con prioridad a la interacción humano-humano.
// Fase 1: preguntan y responden con plantillas (costo cero).
// Fase 2 (bots.js — cerebro LLM): responden con Claude Haiku (ver botAnswerLLM).
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
