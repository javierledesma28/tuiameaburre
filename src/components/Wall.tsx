import { useEffect, useState } from "react";
import { useGame, FeedItem } from "../game";
import { useI18n } from "../i18n";
import WallBoard from "./WallBoard";

type Tab = "wall" | "shame";

export default function Wall() {
  const { feed, go, getHallOfShame } = useGame();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("wall");
  const [shame, setShame] = useState<FeedItem[]>([]);
  const [loadedShame, setLoadedShame] = useState(false);

  useEffect(() => {
    if (tab === "shame" && !loadedShame) {
      getHallOfShame().then((res) => {
        const mine = res?.myReactions || {};
        setShame((res?.items || []).map((it: FeedItem) => ({ ...it, my: mine[it.id] ?? null })));
        setLoadedShame(true);
      });
    }
  }, [tab]);

  const isShame = tab === "shame";

  return (
    <section className="mx-auto max-w-5xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>

      {/* Pestañas: el corcho vs el salón de la vergüenza */}
      <div className="mb-4 mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => setTab("wall")}
          className={`rounded-[5px] border-2 px-4 py-2 font-marker text-lg transition-colors ${
            !isShame ? "border-lamp text-lamp" : "border-ink/15 text-muted hover:border-lamp/50"
          }`}
        >
          📌 {t("wallTitle")}
        </button>
        <button
          onClick={() => setTab("shame")}
          className={`rounded-[5px] border-2 px-4 py-2 font-marker text-lg transition-colors ${
            isShame ? "border-marker-red text-marker-red" : "border-ink/15 text-muted hover:border-marker-red/50"
          }`}
        >
          💀 {t("shameTitle")}
        </button>
      </div>

      <p className="mb-6 font-hand text-xl text-muted">{isShame ? t("shameSub") : t("wallSub")}</p>
      <WallBoard items={isShame ? shame : feed} />
    </section>
  );
}
