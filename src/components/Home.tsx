import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame, FeedItem } from "../game";
import { useI18n } from "../i18n";
import { MODEL_BY_ID } from "../models";
import Hero from "./Hero";
import ModeCards from "./ModeCards";
import StatsStrip from "./StatsStrip";
import WallBoard from "./WallBoard";
import BoostBanner from "./BoostBanner";
import ShareButton from "./ShareButton";

export default function Home() {
  const { feed, go, getHighlight } = useGame();
  const { t } = useI18n();
  const [highlight, setHighlight] = useState<FeedItem | null>(null);

  useEffect(() => {
    getHighlight().then((res) => setHighlight(res?.highlight || null));
  }, []);

  const hModel = highlight?.model ? MODEL_BY_ID[highlight.model] : null;

  return (
    <div className="flex flex-col gap-10 pb-16 sm:gap-14">
      <Hero />

      <div className="text-center">
        <StatsStrip />
      </div>

      <div className="mx-auto w-full max-w-2xl px-5">
        <BoostBanner />
      </div>

      <ModeCards />

      {/* ── Respuesta de la semana ── */}
      {highlight && (
        <section className="mx-auto w-full max-w-2xl px-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="paper relative rounded-[6px] p-6 shadow-lift"
          >
            <div className="tape absolute -top-3 left-10 -rotate-2" />
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-paper-ink/50">
              ⭐ {t("weekTitle")} · <span className="lowercase">{t("weekSub")}</span>
            </p>
            <p className="mb-2 line-clamp-2 font-mono text-xs text-paper-ink/55">
              <span className="text-marker-red">&gt; </span>
              {highlight.prompt}
            </p>
            <p className="whitespace-pre-wrap font-hand text-2xl leading-tight text-paper-ink">
              {highlight.answer}
            </p>
            <div className="mt-3 flex items-center justify-between">
              {hModel ? (
                <span className="font-mono text-[11px] text-paper-ink/45">
                  {hModel.emoji} <span className="font-bold">{hModel.name}</span>
                </span>
              ) : (
                <span />
              )}
              <ShareButton
                prompt={highlight.prompt}
                answer={highlight.answer}
                modelId={highlight.model}
              />
            </div>
          </motion.div>
        </section>
      )}

      <section className="mx-auto w-full max-w-5xl px-5">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-marker text-3xl text-ink">
            <span className="scribble">{t("wallTitle")}</span>
          </h2>
          <button onClick={() => go("wall")} className="font-hand text-xl text-lamp hover:text-ink">
            {t("seeAll")}
          </button>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <WallBoard items={feed} limit={6} />
        </motion.div>
      </section>
    </div>
  );
}
