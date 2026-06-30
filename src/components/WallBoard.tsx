import { motion } from "framer-motion";
import { FeedItem, ReactionType, useGame } from "../game";
import { useI18n } from "../i18n";
import { MODEL_BY_ID } from "../models";
import ShareButton from "./ShareButton";

const NOTE_BG = ["#ffe27a", "#ffb3c8", "#bdec8a", "#a9d8ff", "#f3e9d2"];
const ROT = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-2.5deg", "1deg"];

const REACTIONS: { type: ReactionType; emoji: string; key: string }[] = [
  { type: "up", emoji: "👍", key: "reactUp" },
  { type: "bot", emoji: "🤖", key: "reactBot" },
  { type: "skull", emoji: "💀", key: "reactSkull" },
  { type: "meh", emoji: "😐", key: "reactMeh" },
];

// Hash estable del id: así cada nota conserva su color y ángulo sin importar su
// posición en la lista (antes se usaba el índice y al llegar una nota nueva se
// recoloreaban/reinclinaban todas).
function hashId(id: string) {
  let h = 0;
  for (let k = 0; k < id.length; k++) h = (h * 31 + id.charCodeAt(k)) | 0;
  return Math.abs(h);
}

function Note({ item }: { item: FeedItem }) {
  const h = hashId(item.id);
  const model = item.model ? MODEL_BY_ID[item.model] : null;
  const { react, profile, toast } = useGame();
  const { t } = useI18n();

  // localStorage tiene el clientId; comparamos para no votar lo propio.
  const myId = typeof window !== "undefined" ? localStorage.getItem("clientId") : null;
  const isMine = !!item.authorClientId && item.authorClientId === myId;

  const counts: Record<ReactionType, number> = {
    up: item.rUp || 0,
    bot: item.rBot || 0,
    skull: item.rSkull || 0,
    meh: item.rMeh || 0,
  };

  const onReact = (type: ReactionType) => {
    if (isMine) return toast(t("reactSelf"));
    react(item.id, type);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ rotate: 0, scale: 1.03, zIndex: 5 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative w-full break-inside-avoid p-5 text-paper-ink shadow-note"
      style={{ background: NOTE_BG[h % NOTE_BG.length], rotate: ROT[h % ROT.length] }}
    >
      <span className="pin absolute left-1/2 top-2 -translate-x-1/2" />
      <p className="mb-2 line-clamp-3 font-mono text-[11px] leading-snug text-paper-ink/60">
        <span className="text-marker-red">&gt; </span>
        {item.prompt}
      </p>
      <p className="whitespace-pre-wrap font-hand text-xl leading-tight">{item.answer}</p>
      {model && (
        <p className="mt-3 flex items-center gap-1 font-mono text-[10px] text-paper-ink/45">
          <span>{model.emoji}</span>
          <span className="font-bold">{model.name}</span>
        </p>
      )}

      {/* Reacciones / reactions */}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-paper-ink/10 pt-2.5">
        {REACTIONS.map((r) => {
          const active = item.my === r.type;
          const n = counts[r.type];
          return (
            <button
              key={r.type}
              onClick={() => onReact(r.type)}
              title={t(r.key) + (isMine ? ` · ${t("reactSelf")}` : "")}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] leading-none transition-colors ${
                active
                  ? "border-paper-ink/60 bg-paper-ink/10 text-paper-ink"
                  : "border-paper-ink/15 text-paper-ink/55 hover:border-paper-ink/40"
              } ${isMine ? "cursor-default opacity-60" : ""}`}
            >
              <span className="text-sm">{r.emoji}</span>
              {n > 0 && <span className="font-bold">{n}</span>}
            </button>
          );
        })}
        <span className="ml-auto">
          <ShareButton prompt={item.prompt} answer={item.answer} modelId={item.model} compact />
        </span>
      </div>
    </motion.div>
  );
}

export default function WallBoard({
  items,
  limit,
}: {
  items: FeedItem[];
  limit?: number;
}) {
  const { t } = useI18n();
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="relative rounded-lg border-[10px] border-[#7c5a34] bg-cork p-4 shadow-lift sm:p-6"
      style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "9px 9px, 13px 13px",
      }}
    >
      {shown.length === 0 ? (
        <p className="py-10 text-center font-hand text-2xl text-paper/70">{t("wallEmpty")}</p>
      ) : (
        <div className="columns-1 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {shown.map((it) => (
            <Note key={it.id} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
