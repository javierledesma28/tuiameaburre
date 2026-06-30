import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "./game";
import { useI18n } from "./i18n";
import RoomScene from "./components/RoomScene";
import Nav from "./components/Nav";
import Home from "./components/Home";
import Ask from "./components/Ask";
import Answer from "./components/Answer";
import Wall from "./components/Wall";
import Creator from "./components/Creator";
import Account from "./components/Account";
import Leaderboard from "./components/Leaderboard";
import Confetti from "./components/Confetti";

const SCREENS: Record<string, React.ComponentType> = {
  home: Home,
  ask: Ask,
  answer: Answer,
  wall: Wall,
  creator: Creator,
  account: Account,
  ranking: Leaderboard,
};

export default function App() {
  const { screen, confettiKey, toastMsg } = useGame();
  const { t } = useI18n();
  const Current = SCREENS[screen];

  // Al cambiar de pantalla, volvemos arriba (la versión vanilla lo hacía).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  return (
    <div className="grain relative min-h-screen">
      <RoomScene />
      <div className="grain-overlay" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav />

        <main className="flex-1 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Current />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mx-auto max-w-3xl px-5 py-10 text-center font-hand text-base text-muted/70 sm:text-lg">
          {t("footer")}
          <div className="mt-3 flex justify-center gap-5 font-mono text-sm text-muted/50">
            <a href="https://github.com/javierledesma28/tuiameaburre" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-muted/90">github</a>
            <a href="https://linkedin.com/in/ledesmajavier" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-muted/90">linkedin</a>
          </div>
        </footer>
      </div>

      <Confetti trigger={confettiKey} />

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 24, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 24, x: "-50%" }}
            className="fixed bottom-7 left-1/2 z-[70] max-w-[90vw] -rotate-1 rounded-[4px] bg-paper px-5 py-3 text-center font-hand text-lg text-paper-ink shadow-lift"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
