import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import Hero from "./Hero";
import ModeCards from "./ModeCards";
import StatsStrip from "./StatsStrip";
import WallBoard from "./WallBoard";
import BoostBanner from "./BoostBanner";

export default function Home() {
  const { feed, go } = useGame();
  const { t } = useI18n();
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
