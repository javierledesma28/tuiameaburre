import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Dict = Record<string, any>;
type Lang = "es" | "en";

const STRINGS: Record<Lang, Dict> = {
  es: {
    brand: "Tu IA Mala Onda",
    credits: "créditos",
    navHome: "Inicio",
    navWall: "El corcho",
    navCreator: "El Creador",
    badge: "sin redes neuronales · 100% humanos",
    heroTitle: "Tu IA me aburre.",
    heroSub:
      "Aquí no hay modelo entrenado. Hay una persona, un cuadro de texto y 60 segundos. Pregunta algo… y que un humano finja ser la IA.",
    ask: "Preguntar",
    answer: "Responder como IA",
    askDesc: "Suelta un prompt. Un humano lo responderá fingiendo ser una IA.",
    askCost: "cuesta 1 crédito",
    answerDesc: 'Te cae el prompt de un desconocido. Respóndelo como lo haría una "IA".',
    answerReward: "ganas 1–2 créditos",
    statOnline: "despiertos ahora",
    statAnswered: "respuestas dadas",
    statPending: "en la cola",
    wallTitle: "El corcho",
    wallSub: "Notas reales escritas por humanos fingiendo ser una IA.",
    seeAll: "ver el corcho →",
    back: "← volver",
    askScreenTitle: "¿Qué le preguntarías a una IA?",
    askPlaceholder: "escribe tu prompt…",
    send: "enviar",
    cancel: "cancelar",
    waitingTitle: "buscando un humano que finja ser IA…",
    aiLabel: "IA (un humano)",
    aiBadge: "verificada*",
    askAgain: "preguntar otra vez",
    copy: "copiar",
    answerScreenTitle: "Ahora la IA eres tú. Rápido.",
    jobLabel: 'un humano necesita una "IA":',
    noJobs: "ahora mismo no hay nada que responder. vuelve en un momento.",
    retry: "reintentar",
    answerPlaceholder: "responde como lo haría una IA…",
    skip: "saltar",
    answerNext: "responder otro",
    footer: 'Inspirado en "Your AI Slop Bores Me". Hecho a mano, de madrugada. Cero IA fue usada o herida.',
    // dinámicos
    askCostNote: (c: number) => `cuesta ${c} crédito${c === 1 ? "" : "s"} por pregunta`,
    counter: (n: number, max: number) => `${n}/${max}`,
    rewardMsg: (r: number, total: number) =>
      `+${r} crédito${r === 1 ? "" : "s"} · llevas ${total}`,
    rewardSeed: (r: number, total: number) =>
      `+${r} crédito${r === 1 ? "" : "s"} (prompt de práctica) · llevas ${total}`,
    typer: [
      "escribe un haiku sobre los lunes",
      "¿por qué bosteza mi gato?",
      "resume Troya en un tuit",
      "una excusa para no ir al gym",
      "explícame los impuestos como a un niño",
      "nombre épico para mi planta",
    ],
    noCredits: "sin créditos. responde como IA para ganar más.",
    emptyPrompt: "escribe algo primero.",
    emptyAnswer: "tienes que escribir una respuesta.",
    expired: "se acabó el tiempo. el prompt volvió a la cola.",
    copied: "copiado.",
    rewardCapped: "ya estás en el tope de créditos 💛",
    creditsHint: "ganas créditos respondiendo como IA y los gastas preguntando.",
    wallEmpty: "todavía no hay notas. sé el primero en preguntar.",
    promptFile: "tu-prompt.txt",
  },
  en: {
    brand: "Your AI Bores Me",
    credits: "credits",
    navHome: "Home",
    navWall: "The board",
    navCreator: "The Creator",
    badge: "no neural networks · 100% humans",
    heroTitle: "Your AI bores me.",
    heroSub:
      "No trained model here. Just a person, a text box, and 60 seconds. Ask something… and let a human fake being the AI.",
    ask: "Ask",
    answer: "Answer as AI",
    askDesc: "Drop a prompt. A human will answer it pretending to be an AI.",
    askCost: "costs 1 credit",
    answerDesc: "You get a stranger's prompt. Answer it the way an “AI” would.",
    answerReward: "earn 1–2 credits",
    statOnline: "awake now",
    statAnswered: "answers given",
    statPending: "in the queue",
    wallTitle: "The board",
    wallSub: "Real notes written by humans pretending to be an AI.",
    seeAll: "see the board →",
    back: "← back",
    askScreenTitle: "What would you ask an AI?",
    askPlaceholder: "type your prompt…",
    send: "send",
    cancel: "cancel",
    waitingTitle: "finding a human to fake being AI…",
    aiLabel: "AI (a human)",
    aiBadge: "verified*",
    askAgain: "ask again",
    copy: "copy",
    answerScreenTitle: "You're the AI now. Quick.",
    jobLabel: "a human needs an “AI”:",
    noJobs: "nothing to answer right now. come back in a moment.",
    retry: "retry",
    answerPlaceholder: "answer the way an AI would…",
    skip: "skip",
    answerNext: "answer another",
    footer: 'Inspired by "Your AI Slop Bores Me". Handmade, late at night. No AI was used or harmed.',
    askCostNote: (c: number) => `costs ${c} credit${c === 1 ? "" : "s"} per question`,
    counter: (n: number, max: number) => `${n}/${max}`,
    rewardMsg: (r: number, total: number) =>
      `+${r} credit${r === 1 ? "" : "s"} · you have ${total}`,
    rewardSeed: (r: number, total: number) =>
      `+${r} credit${r === 1 ? "" : "s"} (practice prompt) · you have ${total}`,
    typer: [
      "write a haiku about Mondays",
      "why does my cat yawn?",
      "summarize Troy in one tweet",
      "an excuse to skip the gym",
      "explain taxes like I'm five",
      "an epic name for my plant",
    ],
    noCredits: "out of credits. answer as AI to earn more.",
    emptyPrompt: "type something first.",
    emptyAnswer: "you have to write an answer.",
    expired: "time's up. the prompt went back to the queue.",
    copied: "copied.",
    rewardCapped: "you're already at the credit cap 💛",
    creditsHint: "earn credits by answering as AI, spend them by asking.",
    wallEmpty: "no notes yet. be the first to ask.",
    promptFile: "your-prompt.txt",
  },
};

type I18nCtx = { lang: Lang; t: (k: string) => any; toggle: () => void };
const Ctx = createContext<I18nCtx>(null as any);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "es" || saved === "en") return saved;
    return (navigator.language || "es").slice(0, 2) === "en" ? "en" : "es";
  });
  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const t = (k: string) => STRINGS[lang][k] ?? k;
  const toggle = () => setLang((l) => (l === "es" ? "en" : "es"));
  return <Ctx.Provider value={{ lang, t, toggle }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
