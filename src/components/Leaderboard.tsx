import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { MODELS } from "../models";

type Category = "human" | "ai";
type Period = "today" | "week" | "all";
type Row = { nick: string; country: string | null; sex: string | null; clientId: string; score: number };

// Convierte un código ISO de 2 letras en emoji de bandera.
function flag(code: string | null) {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
}

const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

export default function Leaderboard() {
  const { getRanking, profile, go } = useGame();
  const { t } = useI18n();

  const [category, setCategory] = useState<Category>("human");
  const [period, setPeriod] = useState<Period>("all");
  const [model, setModel] = useState<string | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [myCountry, setMyCountry] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [kings, setKings] = useState<{ human: Row | null; ai: Row | null }>({ human: null, ai: null });
  const [loading, setLoading] = useState(true);

  const myNick = profile?.nick || null;
  const country = myCountry ? profile?.country || null : null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRanking({ category, period, country, sex, model }).then((res) => {
      if (!alive) return;
      setRows(res?.rows || []);
      setKings({ human: res?.kingHuman || null, ai: res?.kingAi || null });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [category, period, model, sex, myCountry]);

  const accent = category === "human" ? "#5fbf7d" : "#5b8def";

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 font-hand text-lg leading-none transition-colors ${
        active ? "border-lamp bg-lamp/15 text-lamp" : "border-ink/20 text-muted hover:border-ink/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );

  const King = ({ row, cat }: { row: Row | null; cat: Category }) => (
    <div className="paper relative flex-1 overflow-hidden rounded-[6px] p-4 shadow-note">
      <div className="tape absolute -top-3 left-6 -rotate-2" />
      <p className="font-mono text-[10px] uppercase tracking-widest text-paper-ink/50">
        👑 {cat === "human" ? t("kingHuman") : t("kingAi")}
      </p>
      {row ? (
        <p className="mt-1 truncate font-marker text-2xl text-paper-ink">
          {flag(row.country)} {row.nick}
        </p>
      ) : (
        <p className="mt-1 font-hand text-xl text-paper-ink/40">{t("rankEmpty")}</p>
      )}
      {row && (
        <p className="font-mono text-xs text-paper-ink/50">
          {cat === "human" ? "🧠" : "🤖"} {row.score}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">{t("rankTitle")}</h2>
      <p className="mb-5 font-hand text-xl text-muted">{t("rankSub")}</p>

      {/* Hall of fame — las dos coronas mundiales */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <King row={kings.human} cat="human" />
        <King row={kings.ai} cat="ai" />
      </div>

      {/* Pestañas de categoría */}
      <div className="mb-4 flex gap-2">
        {(["human", "ai"] as Category[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-[5px] border-2 px-3 py-2 font-marker text-base transition-colors ${
              category === c ? "border-lamp text-ink" : "border-ink/15 text-muted hover:border-lamp/50"
            }`}
            style={category === c ? { borderColor: accent, color: accent } : undefined}
          >
            {c === "human" ? `🧠 ${t("catHuman")}` : `🤖 ${t("catAi")}`}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="mb-5 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(["today", "week", "all"] as Period[]).map((p) => (
            <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
              {t("period_" + p)}
            </Chip>
          ))}
          {profile?.country && (
            <Chip active={myCountry} onClick={() => setMyCountry((v) => !v)}>
              {flag(profile.country)} {t("myCountry")}
            </Chip>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!model} onClick={() => setModel(null)}>
            {t("allModels")}
          </Chip>
          {MODELS.map((m) => (
            <Chip key={m.id} active={model === m.id} onClick={() => setModel(m.id)}>
              {m.emoji}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!sex} onClick={() => setSex(null)}>
            {t("allSexes")}
          </Chip>
          {["m", "f", "nb"].map((s) => (
            <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
              {t("sex_" + s)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="py-10 text-center font-hand text-2xl text-muted/60">{t("rankLoading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center font-hand text-2xl text-muted/60">{t("rankEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const mine = myNick && r.nick === myNick;
            return (
              <motion.div
                key={r.clientId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                className={`flex items-center gap-3 rounded-[5px] border px-3 py-2 ${
                  mine ? "border-lamp bg-lamp/10" : "border-ink/10 bg-night-800/50"
                }`}
              >
                <span className={`w-8 shrink-0 text-center font-marker ${i < 3 ? "text-xl" : "text-sm text-muted"}`}>
                  {medal(i)}
                </span>
                <span className="shrink-0 text-lg">{flag(r.country)}</span>
                <span className="min-w-0 flex-1 truncate font-hand text-xl text-ink">{r.nick}</span>
                <span className="shrink-0 font-marker text-lg" style={{ color: accent }}>
                  {category === "human" ? "🧠" : "🤖"} {r.score}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
