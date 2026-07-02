import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { pack, hierarchy } from "d3-hierarchy";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { MODEL_BY_ID } from "../models";

type Player = {
  nick: string;
  country: string | null;
  sex: string | null;
  human: number;
  ai: number;
  games: number;
  model: string | null;
};
type Mode = "model" | "country" | "team";
const S = 900; // lado del viewBox (cuadrado)

function flag(code: string | null) {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
}
// Color estable por país (paleta cálida/retro).
const COUNTRY_COLORS = ["#ffb454", "#5fbf7d", "#5b8def", "#ff6f61", "#c4b5fd", "#8ff0b5", "#ffb3c8", "#ffd280"];
function countryColor(code: string | null) {
  if (!code) return "#4a5247";
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) | 0;
  return COUNTRY_COLORS[Math.abs(h) % COUNTRY_COLORS.length];
}
// Texto legible según el fondo.
function ink(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1a1710" : "#ffffff";
}

export default function Bubbles() {
  const { getBubbles, profile, go } = useGame();
  const { t } = useI18n();
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<Mode>("model");
  const [sel, setSel] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const myNick = profile?.nick || null;

  useEffect(() => {
    getBubbles().then((res) => {
      setPlayers(res?.players || []);
      setLoading(false);
    });
  }, []);

  const nodes = useMemo(() => {
    if (!players.length) return [];
    const root = hierarchy<{ children?: any[]; p?: Player }>({
      children: players.map((p) => ({ p, value: p.human + p.ai + p.games * 0.4 + 1 })),
    }).sum((d: any) => d.value || 0);
    pack<{ children?: any[]; p?: Player }>().size([S, S]).padding(4)(root);
    return root.leaves();
  }, [players]);

  const colorOf = (p: Player) => {
    if (mode === "model") return MODEL_BY_ID[p.model || ""]?.accent || "#4a5247";
    if (mode === "country") return countryColor(p.country);
    return p.human >= p.ai ? "#5fbf7d" : "#5b8def"; // team
  };
  const glyphOf = (p: Player) => {
    if (mode === "model") return MODEL_BY_ID[p.model || ""]?.emoji || "🤖";
    if (mode === "country") return flag(p.country);
    return p.human >= p.ai ? "🧠" : "🤖";
  };

  const chip = (m: Mode, label: string) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={`shrink-0 rounded-full border px-3 py-1 font-hand text-lg leading-none transition-colors ${
        mode === m ? "border-lamp bg-lamp/15 text-lamp" : "border-ink/20 text-muted hover:border-ink/50 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">🌌 {t("mapTitle")}</h2>
      <p className="mb-4 font-hand text-xl text-muted">{t("mapSub")}</p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {chip("model", t("mapByModel"))}
        {chip("country", t("mapByCountry"))}
        {chip("team", t("mapByTeam"))}
      </div>

      {loading ? (
        <p className="py-16 text-center font-hand text-2xl text-muted/60">{t("mapLoading")}</p>
      ) : nodes.length === 0 ? (
        <p className="py-16 text-center font-hand text-2xl text-muted/60">{t("mapEmpty")}</p>
      ) : (
        <div className="rounded-[12px] border border-ink/10 bg-night-900/40 p-2">
          <svg viewBox={`0 0 ${S} ${S}`} className="w-full" style={{ display: "block" }}>
            {nodes.map((n: any, i: number) => {
              const p: Player = n.data.p;
              const c = colorOf(p);
              const mine = myNick && p.nick === myNick;
              const showNick = n.r > 46;
              const showGlyph = n.r > 20;
              return (
                <motion.g
                  key={p.nick + i}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.006, 0.5) }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: "pointer" }}
                  onClick={() => setSel(p)}
                >
                  <circle cx={n.x} cy={n.y} r={n.r} fill={c} opacity={0.92} />
                  {mine && <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke="#fff" strokeWidth={3} />}
                  {showGlyph && (
                    <text x={n.x} y={n.y + (showNick ? -n.r * 0.12 : n.r * 0.32)} textAnchor="middle" fontSize={Math.min(n.r * 0.9, 34)}>
                      {glyphOf(p)}
                    </text>
                  )}
                  {showNick && (
                    <text
                      x={n.x}
                      y={n.y + n.r * 0.42}
                      textAnchor="middle"
                      fontSize={Math.min(n.r * 0.32, 20)}
                      fontFamily="'Shantell Sans', cursive"
                      fill={ink(c)}
                      style={{ pointerEvents: "none" }}
                    >
                      {p.nick.length > 12 ? p.nick.slice(0, 11) + "…" : p.nick}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </svg>
        </div>
      )}

      {sel && (
        <div className="mt-4 flex items-center gap-3 rounded-[8px] border border-ink/10 bg-night-800/60 p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl" style={{ background: `${colorOf(sel)}33` }}>
            {glyphOf(sel)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-marker text-lg text-ink">
              {flag(sel.country)} {sel.nick}
            </p>
            <p className="font-mono text-xs text-muted">
              🧠 {sel.human} · 🤖 {sel.ai} · {sel.games} {t("mapGames")}
            </p>
          </div>
          <button onClick={() => setSel(null)} className="shrink-0 font-mono text-lg text-muted hover:text-ink">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
