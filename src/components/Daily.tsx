import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { socket } from "../lib/socket";
import { useGame, FeedItem } from "../game";
import { useI18n } from "../i18n";
import WallBoard from "./WallBoard";

export default function Daily() {
  const { getDaily, submitDaily, go, toast, burst } = useGame();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [answered, setAnswered] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDaily().then((res) => {
      if (!res?.ok) return;
      setPrompt(res.prompt);
      setAnswered(res.answered);
      const mine = res.myReactions || {};
      setItems((res.items || []).map((it: FeedItem) => ({ ...it, my: mine[it.id] ?? null })));
    });
    const onNew = (item: FeedItem) => setItems((l) => [{ ...item, my: null }, ...l]);
    socket.on("daily:new", onNew);
    return () => {
      socket.off("daily:new", onNew);
    };
  }, []);

  const submit = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    const res = await submitDaily(v);
    setBusy(false);
    if (res?.ok) {
      setAnswered(true);
      setText("");
      burst();
      toast(t("dailyDone"));
    } else if (res?.error === "already") {
      setAnswered(true);
      toast(t("dailyAlready"));
    } else {
      toast(t("emptyAnswer"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">☀️ {t("dailyTitle")}</h2>
      <p className="mb-6 font-hand text-xl text-muted">{t("dailySub")}</p>

      {/* El prompt del día + tu respuesta */}
      <div className="paper relative mx-auto mb-8 max-w-2xl rounded-[6px] p-5 shadow-lift">
        <span className="tape" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(-3deg)" }} />
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-paper-ink/50">
          {t("dailyPromptLabel")}
        </p>
        <p className="mb-4 font-marker text-2xl leading-tight text-paper-ink">{prompt}</p>

        {answered ? (
          <p className="font-hand text-lg text-paper-ink/70">✅ {t("dailyAnswered")}</p>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
              maxLength={2000}
              rows={3}
              placeholder={t("answerPlaceholder")}
              className="w-full resize-none border-t border-paper-ink/10 bg-transparent pt-2 font-hand text-xl leading-snug text-paper-ink outline-none placeholder:text-paper-ink/30"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="font-hand text-base text-paper-ink/50">{t("dailyReward")}</span>
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-[4px] bg-marker-red px-5 py-2 font-marker text-base text-white shadow-note disabled:opacity-60"
              >
                {t("dailySend")} ☀️
              </button>
            </div>
          </>
        )}
      </div>

      {/* Galería del día */}
      <div className="mb-4 flex items-end justify-between">
        <h3 className="font-marker text-2xl text-ink">{t("dailyGallery")}</h3>
        <span className="font-hand text-lg text-muted/70">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center font-hand text-xl text-muted/60">{t("dailyEmpty")}</p>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <WallBoard items={items} />
        </motion.div>
      )}
    </div>
  );
}
