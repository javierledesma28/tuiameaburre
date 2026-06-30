import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "../lib/socket";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { MODEL_BY_ID } from "../models";

type Halluc = {
  id: string;
  prompt: string;
  answer: string;
  model: string | null;
  real: number;
  fake: number;
  closed: boolean;
  fooled: boolean | null;
};

export default function Hallucination() {
  const { getHallucState, submitHallucination, voteHallucination, go, toast } = useGame();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [list, setList] = useState<Halluc[]>([]);
  const [answer, setAnswer] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const myVotes = useRef<Set<string>>(new Set());

  useEffect(() => {
    getHallucState().then((res) => {
      if (res?.ok) {
        setPrompt(res.prompt);
        setList(res.hallucs || []);
      }
    });
    const upsert = (h: Halluc) =>
      setList((l) => {
        const i = l.findIndex((x) => x.id === h.id);
        if (i === -1) return [h, ...l];
        const copy = [...l];
        copy[i] = h;
        return copy;
      });
    socket.on("halluc:new", upsert);
    socket.on("halluc:update", upsert);
    socket.on("halluc:closed", upsert);
    return () => {
      socket.off("halluc:new", upsert);
      socket.off("halluc:update", upsert);
      socket.off("halluc:closed", upsert);
    };
  }, []);

  const submit = async () => {
    const v = answer.trim();
    if (!v || busy) return;
    setBusy(true);
    const res = await submitHallucination(v);
    setBusy(false);
    if (res?.ok) {
      setSent(true);
      setAnswer("");
      toast(t("hallSent"));
    } else toast(t("emptyAnswer"));
  };

  const vote = async (id: string, believe: boolean) => {
    if (myVotes.current.has(id)) return;
    const res = await voteHallucination(id, believe);
    if (res?.ok) {
      myVotes.current.add(id);
      setList((l) => [...l]);
    } else if (res?.error === "self_vote") toast(t("hallSelf"));
    else if (res?.error === "already") myVotes.current.add(id);
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">🤥 {t("hallTitle")}</h2>
      <p className="mb-6 font-hand text-xl text-muted">{t("hallSub")}</p>

      {/* Inventá tu dato falso */}
      <div className="paper mb-8 rounded-[6px] p-4 shadow-note">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-paper-ink/50">
          {t("hallPromptLabel")}
        </p>
        <p className="mb-3 font-hand text-2xl leading-tight text-paper-ink">{prompt}</p>
        {sent ? (
          <p className="font-hand text-lg text-paper-ink/60">😏 {t("hallWaiting")}</p>
        ) : (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
              maxLength={2000}
              rows={3}
              placeholder={t("hallPlaceholder")}
              className="w-full resize-none bg-transparent font-hand text-xl leading-snug text-paper-ink outline-none placeholder:text-paper-ink/30"
            />
            <div className="flex justify-end pt-1">
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-[4px] bg-marker-red px-5 py-2 font-marker text-base text-white shadow-note disabled:opacity-60"
              >
                {t("hallSend")} 🤥
              </button>
            </div>
          </>
        )}
      </div>

      {/* Juzgá las alucinaciones de otros */}
      <h3 className="mb-3 font-marker text-2xl text-ink">{t("hallJudgeTitle")}</h3>
      {list.length === 0 ? (
        <p className="py-8 text-center font-hand text-xl text-muted/60">{t("hallEmpty")}</p>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {list.map((h) => {
              const model = h.model ? MODEL_BY_ID[h.model] : null;
              const voted = myVotes.current.has(h.id);
              const total = h.real + h.fake;
              const pctReal = total ? Math.round((h.real / total) * 100) : 0;
              return (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[8px] border border-ink/10 bg-night-800/50 p-4"
                >
                  <p className="mb-1 font-mono text-xs text-muted/60">
                    <span className="text-marker-red">&gt; </span>
                    {h.prompt}
                  </p>
                  <p className="mb-3 font-hand text-xl leading-tight text-ink">"{h.answer}"</p>
                  {model && (
                    <p className="mb-2 font-mono text-[10px] text-muted/45">
                      {model.emoji} <span className="font-bold">{model.name}</span>
                    </p>
                  )}

                  {h.closed ? (
                    <p className="font-hand text-lg text-lamp">
                      {h.fooled ? t("hallFooled") : t("hallCaught")} · 🙂 {h.real} / 🧐 {h.fake}
                    </p>
                  ) : voted ? (
                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-lamp" style={{ width: `${pctReal}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted/60">
                        {t("hallBelieved")}: {pctReal}% · {total} {t("hallVotes")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => vote(h.id, true)}
                        className="flex-1 rounded-[5px] border border-marker-green/40 bg-marker-green/10 px-3 py-2 font-marker text-sm text-marker-green transition-transform hover:-translate-y-0.5"
                      >
                        🙂 {t("hallBelieve")}
                      </button>
                      <button
                        onClick={() => vote(h.id, false)}
                        className="flex-1 rounded-[5px] border border-marker-red/40 bg-marker-red/10 px-3 py-2 font-marker text-sm text-marker-red transition-transform hover:-translate-y-0.5"
                      >
                        🧐 {t("hallDoubt")}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
