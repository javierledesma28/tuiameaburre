// Los 5 modelos LLM parodia que cada humano-IA "encarna" al responder.
// The 5 parody LLM models a human-AI "embodies" when answering.
//
// ⚠️ PARIDAD: este archivo debe mantenerse idéntico (en datos) a src/models.ts.
// El server (ESM, raíz) usa este; el frontend (Vite/TS) usa el de src/.
// Si editás uno, editá el otro. / Keep this in sync with src/models.ts.

export const MODELS = [
  {
    id: "gepeto",
    name: "GePeTo-5",
    emoji: "🪵",
    parodyOf: "ChatGPT / GPT",
    tagline: "quiere ser un humano de verdad",
    persona:
      "Servicial hasta el ridículo. Estructurá todo en listas, ofrecé ayuda extra que nadie pidió y terminá con una pregunta de seguimiento.",
    accent: "#74c0a8",
  },
  {
    id: "claudio",
    name: "Claudio Soneto 4.6",
    emoji: "🎭",
    parodyOf: "Claude Sonnet",
    tagline: "te responde en verso, pensado a las 3am",
    persona:
      "Reflexivo y matizado. Pensá en voz alta, considerá los dos lados, y si podés, meté algo poético o un verso.",
    accent: "#d99a6c",
  },
  {
    id: "geminis",
    name: "Géminis Ascendente",
    emoji: "♊",
    parodyOf: "Gemini",
    tagline: "su respuesta depende del horóscopo del día",
    persona:
      "Cambiá de opinión a mitad de respuesta. Empezá seguro, dudá, y cerrá contradiciéndote con total convicción.",
    accent: "#8aa9e0",
  },
  {
    id: "lallama",
    name: "LaLlama 3.1",
    emoji: "🦙",
    parodyOf: "Llama (Meta)",
    tagline: "open source y sin filtro, opina de todo",
    persona:
      "Directo, sin filtro y con opiniones fuertes sobre todo. Sonás como alguien que corre modelos en su propia compu y te lo recuerda.",
    accent: "#bdec8a",
  },
  {
    id: "groncho",
    name: "Groncho XL",
    emoji: "😎",
    parodyOf: "Grok",
    tagline: "se cree el más gracioso de la fiesta",
    persona:
      "Cancherísimo. Tirá un chiste, un meme verbal o un comentario picante. Creés que sos lo más divertido del chat (no lo sos).",
    accent: "#ffc24b",
  },
];

export const MODEL_IDS = MODELS.map((m) => m.id);
export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));

// Elige un modelo: el favorito si es válido, si no uno aleatorio.
// Picks a model: the favorite if valid, otherwise a random one.
export function pickModel(favModelId, rnd = Math.random) {
  if (favModelId && MODEL_BY_ID[favModelId]) return MODEL_BY_ID[favModelId];
  return MODELS[Math.floor(rnd() * MODELS.length)];
}
