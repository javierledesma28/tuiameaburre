import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "../lib/socket";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import BoostBanner from "./BoostBanner";
import ShareButton from "./ShareButton";

type Phase = "compose" | "waiting" | "result";
const TONES = ["any", "gracioso", "serio", "poetico", "acido"];

// Floritura paródica determinista (igual para la misma respuesta).
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function metaFlair(answer: string, disclaimers: string[]) {
  const h = hashStr(answer);
  const confidence = 71 + (h % 29); // 71–99%
  const disclaimer = disclaimers[h % disclaimers.length];
  return { confidence, disclaimer };
}

export default function Ask() {
  const { ask, cancelAsk, go, toast, credits, askCost, boost } = useGame();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("compose");
  const [text, setText] = useState("");
  const [tone, setTone] = useState("any");
  const [echo, setEcho] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerModel, setAnswerModel] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const pending = useRef<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Al montar: si había una pregunta en espera guardada, la restauramos para
  // poder recibir la respuesta tras una recarga. Si no, enfocamos el textarea.
  useEffect(() => {
    const raw = localStorage.getItem("pendingAsk");
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved?.promptId) {
          pending.current = saved.promptId;
          setEcho(saved.echo || "");
          setPhase("waiting");
          return;
        }
      } catch {
        localStorage.removeItem("pendingAsk");
      }
    }
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    const onAnswer = ({ promptId, prompt, answer, model }: any) => {
      if (promptId !== pending.current) return;
      pending.current = null;
      localStorage.removeItem("pendingAsk");
      setEcho(prompt);
      setAnswer(answer);
      setAnswerModel(model || null);
      setPhase("result");
      setTyping(true);
      window.setTimeout(() => setTyping(false), Math.min(1600, 600 + answer.length * 12));
    };
    socket.on("answerReceived", onAnswer);
    return () => {
      socket.off("answerReceived", onAnswer);
    };
  }, []);

  const leave = () => {
    if (pending.current) cancelAsk(pending.current);
    pending.current = null;
    localStorage.removeItem("pendingAsk");
    go("home");
  };

  const free = boost?.team === "human";

  // Lanza una pregunta (reusado por enviar y por "regenerar").
  const askPrompt = async (v: string) => {
    if (!v) return toast(t("emptyPrompt"));
    if (!free && credits < askCost) return toast(t("noCredits"));
    const res = await ask(v, tone);
    if (!res?.ok) return toast(res?.error === "no_credits" ? t("noCredits") : t("emptyPrompt"));
    pending.current = res.promptId;
    setEcho(v);
    setAnswer("");
    setPhase("waiting");
    localStorage.setItem("pendingAsk", JSON.stringify({ promptId: res.promptId, echo: v }));
  };

  const submit = () => askPrompt(text.trim());
  const regenerate = () => askPrompt(echo); // misma pregunta → otro humano la responde

  const reset = () => {
    setText("");
    setAnswer("");
    setPhase("compose");
    localStorage.removeItem("pendingAsk");
    window.setTimeout(() => taRef.current?.focus(), 50);
  };

  return (
    <section className="mx-auto max-w-2xl px-5">
      <button onClick={leave} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-6 mt-2 font-marker text-3xl text-ink sm:text-4xl">{t("askScreenTitle")}</h2>

      <AnimatePresence mode="wait">
        {phase === "compose" && (
          <motion.div key="c" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <BoostBanner only="human" className="mb-4" />
            <div className="paper rounded-[5px] p-4 shadow-note">
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
                maxLength={1000}
                rows={3}
                placeholder={t("askPlaceholder")}
                className="w-full resize-none bg-transparent font-hand text-2xl leading-snug text-paper-ink outline-none placeholder:text-paper-ink/40"
              />

              {/* tono opcional para el matchmaking / optional tone for matchmaking */}
              <div className="border-t border-paper-ink/10 pt-2">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-ink/40">
                  {t("askToneLabel")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((tn) => (
                    <button
                      key={tn}
                      type="button"
                      onClick={() => setTone(tn)}
                      className={`rounded-full border px-2.5 py-0.5 font-hand text-base leading-none transition-colors ${
                        tone === tn
                          ? "border-marker-red bg-marker-red/10 text-marker-red"
                          : "border-paper-ink/20 text-paper-ink/60 hover:border-paper-ink/50"
                      }`}
                    >
                      {t("tone" + tn.charAt(0).toUpperCase() + tn.slice(1))}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="font-mono text-xs text-paper-ink/50">
                  {(t("counter") as any)(text.length, 1000)}
                </span>
                <button
                  onClick={submit}
                  className="rounded-[4px] bg-marker-red px-5 py-2 font-marker text-base text-white shadow-note transition-transform hover:-translate-y-0.5"
                >
                  {t("send")} ✎
                </button>
              </div>
            </div>
            <p className="mt-3 font-hand text-lg text-muted">
              {free ? t("askFreeTag") : (t("askCostNote") as any)(askCost)}
            </p>
          </motion.div>
        )}

        {phase === "waiting" && (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
            <div className="mb-6 flex items-center justify-center gap-5">
              <span className="text-4xl">🧑</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -9, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                    className="h-2.5 w-2.5 rounded-full bg-lamp"
                  />
                ))}
              </span>
              <span className="text-4xl">🤖</span>
            </div>
            <p className="font-hand text-2xl text-ink">{t("waitingTitle")}</p>
            <p className="mx-auto mt-2 max-w-md font-hand text-xl italic text-muted">“{echo}”</p>
            <button onClick={leave} className="mt-6 font-hand text-lg text-muted underline hover:text-ink">
              {t("cancel")}
            </button>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            {/* tu pregunta, en una nota / your question, on a note */}
            <div className="self-end max-w-[80%] -rotate-1 rounded-[4px] bg-sticky-blue p-4 font-hand text-xl text-paper-ink shadow-note">
              {echo}
            </div>
            {/* la "IA" responde en el CRT / the "AI" answers on the CRT */}
            <div className="crt max-w-[92%] self-start p-4 shadow-note">
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] text-[#8ff0b5]/70">
                {t("aiLabel")}
                <span className="rounded bg-[#8ff0b5]/15 px-1.5 py-0.5">{t("aiBadge")}</span>
              </div>
              {typing ? (
                <span className="flex gap-1 py-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                      className="h-2 w-2 rounded-full bg-[#8ff0b5]"
                    />
                  ))}
                </span>
              ) : (
                <>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#cdffe0]">{answer}</p>
                  {/* floritura paródica de IA / parody AI flourish */}
                  {(() => {
                    const f = metaFlair(answer, t("disclaimers") as string[]);
                    return (
                      <div className="mt-3 border-t border-[#8ff0b5]/15 pt-2 font-mono text-[10px] leading-relaxed text-[#8ff0b5]/45">
                        <span>⚠️ {(t("confidence") as any)(f.confidence)}</span>
                        <span className="mx-2">·</span>
                        <span>💧 {t("waterUse")}</span>
                        <p className="mt-1 italic">{f.disclaimer}</p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <button onClick={reset} className="rounded-[4px] bg-sticky-yellow px-5 py-2 font-marker text-base text-paper-ink shadow-note">
                {t("askAgain")}
              </button>
              <button
                onClick={regenerate}
                title={t("regenHint")}
                className="rounded-[4px] border border-ink/20 px-5 py-2 font-marker text-base text-ink transition-transform hover:-translate-y-0.5"
              >
                🔄 {t("regen")}
              </button>
              <ShareButton prompt={echo} answer={answer} modelId={answerModel} />
              <button
                onClick={() => navigator.clipboard?.writeText(echo + "\n\n" + answer).then(() => toast(t("copied")))}
                className="rounded-[4px] border border-ink/20 px-5 py-2 font-marker text-base text-ink"
              >
                {t("copy")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
