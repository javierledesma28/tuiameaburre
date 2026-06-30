// Logros desbloqueables. Las condiciones se evalúan en el server (server.js);
// acá solo el id + emoji para mostrarlos. Los textos viven en i18n (ach_<id>_*).
export type Achievement = { id: string; emoji: string };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_answer", emoji: "🎬" },
  { id: "insomne", emoji: "🌙" },
  { id: "multipersonalidad", emoji: "🎭" },
  { id: "querido", emoji: "💛" },
  { id: "mas_robot", emoji: "🤖" },
  { id: "prolifico", emoji: "🗣️" },
  { id: "curioso", emoji: "❓" },
  { id: "despedido", emoji: "💸" },
  { id: "racha7", emoji: "🔥" },
  { id: "racha30", emoji: "🏆" },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
