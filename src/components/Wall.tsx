import { useGame } from "../game";
import { useI18n } from "../i18n";
import WallBoard from "./WallBoard";

export default function Wall() {
  const { feed, go } = useGame();
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-5xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mt-2 font-marker text-4xl text-ink">{t("wallTitle")}</h2>
      <p className="mb-6 mt-1 font-hand text-xl text-muted">{t("wallSub")}</p>
      <WallBoard items={feed} />
    </section>
  );
}
