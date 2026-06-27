import { motion } from "framer-motion";
import { FeedItem } from "../game";
import { useI18n } from "../i18n";

const NOTE_BG = ["#ffe27a", "#ffb3c8", "#bdec8a", "#a9d8ff", "#f3e9d2"];
const ROT = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-2.5deg", "1deg"];

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
