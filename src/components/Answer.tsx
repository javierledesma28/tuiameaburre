import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "../lib/socket";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { Model } from "../models";
import BoostBanner from "./BoostBanner";

type Phase = "loading" | "none" | "job" | "done";
const R = 54;
const C = 2 * Math.PI * R;

export default function Answer() {
  const { requestJob, submitAnswer, skipJob, go, toast, burst } = useGame();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [reward, setReward] = useState("");
  const [secs, setSecs] = useState(60);
  const [model, setModel] = useState<Model | null>(null);
  const [roast, setRoast] = useState(false);
  const jobId = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const deadline = useRef(0);
  const totalSecs = useRef(60); // duración real del job, según el server
  const taRef = useRef<HTMLTextAreaElement>(null);

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = undefined;
  };

  const startTimer = (dl: number, total: number) => {
    stopTimer();
    deadline.current = dl;
    if (total > 0) totalSecs.current = total;
    const tick = () => {
      const remaining = Math.max(0, deadline.current - Date.now());
      setSecs(Math.ceil(remaining / 1000));
      if (remaining <= 0) stopTimer();
    };
    tick();
    timer.current = window.setInterval(tick, 200);
  };

  const fetchJob = async () => {
    setPhase("loading");
    const res = await requestJob();
    if (!res?.ok) return setPhase("none");
    jobId.current = res.jobId;
    setPrompt(res.prompt);
    setModel(res.model || null);
    setText("");
    setPhase("job");
    startTimer(res.deadline, res.seconds);
    window.setTimeout(() => taRef.current?.focus(), 60);
  };

  useEffect(() => {
    fetchJob();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExpired = ({ jobId: id }: any) => {
      if (id !== jobId.current) return;
      stopTimer();
      jobId.current = null;
      toast(t("expired"));
      setPhase("none");
    };
    socket.on("jobExpired", onExpired);
    return () => {
      socket.off("jobExpired", onExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const leave = () => {
    if (jobId.current) skipJob(jobId.current);
    jobId.current = null;
    stopTimer();
    go("home");
  };

  const submit = async () => {
    if (!jobId.current) return;
    const v = text.trim();
    if (!v) return toast(t("emptyAnswer"));
    const res = await submitAnswer(jobId.current, v, roast);
    if (!res?.ok) {
      if (res?.error === "expired") {
        stopTimer();
        jobId.current = null;
        toast(t("expired"));
        return setPhase("none");
      }
      return toast(t("emptyAnswer"));
    }
    stopTimer();
    jobId.current = null;
    if (res.reward > 0) {
      const fn = res.boosted ? t("rewardBoosted") : res.seed ? t("rewardSeed") : t("rewardMsg");
      setReward((fn as any)(res.reward, res.credits));
      burst();
    } else {
      // En el tope de créditos no se ganó nada: mensaje honesto, sin confeti.
      setReward(t("rewardCapped"));
    }
    setPhase("done");
  };

  const skip = () => {
    if (jobId.current) skipJob(jobId.current);
    jobId.current = null;
    stopTimer();
    fetchJob();
  };

  const danger = secs <= 10;
  const warn = secs <= 20 && secs > 10;
  const ringColor = danger ? "#ff6f61" : warn ? "#ffc24b" : "#5fbf7d";
  const frac = Math.max(0, Math.min(1, secs / totalSecs.current));

  return (
    <section className="mx-auto max-w-2xl px-5">
      <button onClick={leave} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-6 mt-2 font-marker text-3xl text-ink sm:text-4xl">{t("answerScreenTitle")}</h2>

      <AnimatePresence mode="wait">
        {phase === "none" && (
          <motion.div key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
            <div className="mb-3 text-5xl">🛸</div>
            <p className="mx-auto max-w-sm font-hand text-2xl text-muted">{t("noJobs")}</p>
            <button onClick={fetchJob} className="mt-6 rounded-[4px] bg-sticky-yellow px-5 py-2 font-marker text-base text-paper-ink shadow-note">
              {t("retry")}
            </button>
          </motion.div>
        )}

        {phase === "job" && (
          <motion.div key="j" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <BoostBanner only="ai" className="mb-4" />

            {/* El modelo que "encarnás" / the model you're embodying */}
            {model && (
              <div
                className="mb-4 flex items-start gap-3 rounded-[6px] border-2 p-3"
                style={{ borderColor: `${model.accent}66`, background: `${model.accent}12` }}
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl"
                  style={{ background: `${model.accent}22` }}
                >
                  {model.emoji}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
                    {t("embodyLabel")}
                  </p>
                  <p className="font-marker text-lg leading-tight" style={{ color: model.accent }}>
                    {model.name}
                  </p>
                  <p className="mt-0.5 font-hand text-base leading-tight text-muted">
                    <span className="text-muted/60">{t("modelHintLabel")} </span>
                    {model.persona}
                  </p>
                </div>
              </div>
            )}

            <div className="paper relative mb-5 flex items-center gap-5 rounded-[5px] p-5 shadow-note">
              {/* temporizador dibujado / drawn timer */}
              <div className="relative h-[84px] w-[84px] shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(44,36,25,0.15)" strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r={R} fill="none" stroke={ringColor} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
                    style={{ transition: "stroke-dashoffset 0.3s linear, stroke 0.4s" }}
                  />
                </svg>
                <span className={`absolute inset-0 grid place-items-center font-marker text-2xl ${danger ? "animate-pulse text-marker-red" : "text-paper-ink"}`}>
                  {secs}
                </span>
              </div>
              <div>
                <span className="font-mono text-xs text-paper-ink/60">{t("jobLabel")}</span>
                <p className="mt-1 font-hand text-2xl leading-tight text-paper-ink">{prompt}</p>
              </div>
            </div>

            {/* Modo Roast: en vez de responder, destruí el prompt 🔥 */}
            <button
              onClick={() => setRoast((r) => !r)}
              className={`mb-3 flex w-full items-center gap-2 rounded-[5px] border px-3 py-2 text-left transition-colors ${
                roast ? "border-marker-red bg-marker-red/10" : "border-ink/15 hover:border-marker-red/50"
              }`}
            >
              <span className="text-xl">🔥</span>
              <span className="min-w-0">
                <span className={`block font-marker text-base leading-tight ${roast ? "text-marker-red" : "text-ink"}`}>
                  {t("roastToggle")}
                </span>
                <span className="block font-hand text-base leading-tight text-muted">{t("roastHint")}</span>
              </span>
              <span className={`ml-auto h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${roast ? "bg-marker-red" : "bg-ink/20"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${roast ? "translate-x-4" : ""}`} />
              </span>
            </button>

            <div className="crt rounded-[5px] p-4 shadow-note">
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
                maxLength={2000}
                rows={4}
                placeholder={roast ? t("roastPlaceholder") : t("answerPlaceholder")}
                className="w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-[#cdffe0] outline-none placeholder:text-[#8ff0b5]/40"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-[11px] text-[#8ff0b5]/50">
                  {(t("counter") as any)(text.length, 2000)}
                </span>
                <div className="flex gap-2">
                  <button onClick={skip} className="rounded-[4px] px-4 py-2 font-mono text-xs text-[#8ff0b5]/70 hover:text-[#8ff0b5]">
                    {t("skip")}
                  </button>
                  <button onClick={submit} className="rounded-[4px] bg-[#5fbf7d] px-5 py-2 font-marker text-base text-[#0c1410] shadow-note">
                    {t("send")} ▸
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -4 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-sticky-green text-4xl text-paper-ink shadow-note"
            >
              ✓
            </motion.div>
            <p className="font-marker text-2xl text-lamp">{reward}</p>
            <button onClick={fetchJob} className="mt-6 rounded-[4px] bg-sticky-green px-5 py-2 font-marker text-base text-paper-ink shadow-note">
              {t("answerNext")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
