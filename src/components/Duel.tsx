import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { socket } from "../lib/socket";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { MODEL_BY_ID } from "../models";

type Side = { answer: string; model: string | null };
type Duel = {
  id: string;
  prompt: string;
  a: Side;
  b: Side;
  votesA: number;
  votesB: number;
  closed: boolean;
  winner: "a" | "b" | "tie" | null;
};

export default function Duel() {
  const { getDuelState, submitDuelEntry, voteDuel, go, toast } = useGame();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [duels, setDuels] = useState<Duel[]>([]);
  const [answer, setAnswer] = useState("");
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const myVotes = useRef<Set<string>>(new Set());

  useEffect(() => {
    getDuelState().then((res) => {
      if (res?.ok) {
        setPrompt(res.prompt);
        setDuels(res.duels || []);
      }
    });
    const upsert = (d: Duel) =>
      setDuels((list) => {
        const i = list.findIndex((x) => x.id === d.id);
        if (i === -1) return [d, ...list];
        const copy = [...list];
        copy[i] = d;
        return copy;
      });
    const onNew = (d: Duel) => upsert(d);
    const onUpdate = (d: Duel) => upsert(d);
    const onClosed = (d: Duel) => upsert(d);
    const onState = (s: any) => {
      setPrompt(s.prompt);
      setDuels((list) => {
        // conserva los cerrados que ya teníamos; mezcla los abiertos nuevos
        const closed = list.filter((d) => d.closed);
        const ids = new Set((s.duels || []).map((d: Duel) => d.id));
        return [...(s.duels || []), ...closed.filter((d) => !ids.has(d.id))];
      });
    };
    socket.on("duel:new", onNew);
    socket.on("duel:update", onUpdate);
    socket.on("duel:closed", onClosed);
    socket.on("duel:state", onState);
    return () => {
      socket.off("duel:new", onNew);
      socket.off("duel:update", onUpdate);
      socket.off("duel:closed", onClosed);
      socket.off("duel:state", onState);
    };
  }, []);

  const submit = async () => {
    const v = answer.trim();
    if (!v || busy) return;
    setBusy(true);
    const res = await submitDuelEntry(v);
    setBusy(false);
    if (res?.ok) {
      setEntered(true);
      setAnswer("");
      toast(t("duelEntered"));
    } else {
      toast(t("emptyAnswer"));
    }
  };

  const vote = async (id: string, side: "a" | "b") => {
    if (myVotes.current.has(id)) return;
    const res = await voteDuel(id, side);
    if (res?.ok) {
      myVotes.current.add(id);
      setDuels((l) => [...l]); // re-render para deshabilitar
    } else if (res?.error === "self_vote") toast(t("duelSelf"));
    else if (res?.error === "already") myVotes.current.add(id);
  };

  const SideCard = ({
    duel,
    side,
    s,
  }: {
    duel: Duel;
    side: "a" | "b";
    s: Side;
  }) => {
    const model = s.model ? MODEL_BY_ID[s.model] : null;
    const votes = side === "a" ? duel.votesA : duel.votesB;
    const total = duel.votesA + duel.votesB;
    const pct = total ? Math.round((votes / total) * 100) : 0;
    const won = duel.closed && duel.winner === side;
    const voted = myVotes.current.has(duel.id);
    return (
      <button
        onClick={() => vote(duel.id, side)}
        disabled={duel.closed || voted}
        className={`relative flex-1 overflow-hidden rounded-[6px] border-2 p-3 text-left transition-colors ${
          won ? "border-lamp bg-lamp/10" : "border-ink/15 bg-night-800/50"
        } ${!duel.closed && !voted ? "hover:border-lamp/60" : "cursor-default"}`}
        style={model ? { borderColor: won ? undefined : `${model.accent}55` } : undefined}
      >
        <div className="mb-1 flex items-center gap-1 font-mono text-[10px] text-muted/70">
          <span>{model?.emoji || "🤖"}</span>
          <span className="font-bold" style={{ color: model?.accent }}>
            {model?.name || "IA"}
          </span>
          {won && <span className="ml-auto">👑</span>}
        </div>
        <p className="whitespace-pre-wrap font-hand text-lg leading-tight text-ink">{s.answer}</p>
        {(duel.closed || voted) && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: model?.accent || "#5fbf7d" }} />
            </div>
            <span className="font-mono text-[10px] text-muted/70">{votes} · {pct}%</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">⚔️ {t("duelTitle")}</h2>
      <p className="mb-6 font-hand text-xl text-muted">{t("duelSub")}</p>

      {/* Tu entrada al duelo */}
      <div className="crt mb-8 rounded-[8px] p-4 shadow-note">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#8ff0b5]/50">
          {t("duelPromptLabel")}
        </p>
        <p className="mb-3 font-hand text-2xl leading-tight text-[#cdffe0]">{prompt}</p>
        {entered ? (
          <p className="font-mono text-sm text-[#8ff0b5]/80">⏳ {t("duelWaiting")}</p>
        ) : (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
              maxLength={2000}
              rows={3}
              placeholder={t("answerPlaceholder")}
              className="w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-[#cdffe0] outline-none placeholder:text-[#8ff0b5]/40"
            />
            <div className="flex justify-end pt-1">
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-[4px] bg-[#5fbf7d] px-5 py-2 font-marker text-base text-[#0c1410] shadow-note disabled:opacity-60"
              >
                {t("duelSend")} ⚔️
              </button>
            </div>
          </>
        )}
      </div>

      {/* Duelos para votar */}
      <h3 className="mb-3 font-marker text-2xl text-ink">{t("duelVoteTitle")}</h3>
      {duels.length === 0 ? (
        <p className="py-8 text-center font-hand text-xl text-muted/60">{t("duelEmpty")}</p>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {duels.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[8px] border border-ink/10 bg-night-900/40 p-3"
              >
                <p className="mb-2 line-clamp-2 font-mono text-xs text-muted/70">
                  <span className="text-marker-red">&gt; </span>
                  {d.prompt}
                </p>
                <div className="flex items-stretch gap-2">
                  <SideCard duel={d} side="a" s={d.a} />
                  <div className="flex items-center font-marker text-sm text-muted">VS</div>
                  <SideCard duel={d} side="b" s={d.b} />
                </div>
                {d.closed && (
                  <p className="mt-2 text-center font-hand text-lg text-lamp">
                    {d.winner === "tie" ? t("duelTie") : t("duelWinner")}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
