import { useEffect, useRef, useState } from "react";
import { useGame } from "../game";
import { useI18n } from "../i18n";

function Count({ value }: { value: number }) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return setN(value);
    let i = 0;
    const steps = 14;
    const id = window.setInterval(() => {
      i++;
      setN(Math.round(from + ((value - from) * i) / steps));
      if (i >= steps) {
        setN(value);
        window.clearInterval(id);
      }
    }, 28);
    return () => window.clearInterval(id);
  }, [value]);
  return <>{n}</>;
}

export default function StatsStrip() {
  const { stats } = useGame();
  const { t } = useI18n();
  const item = (value: number, label: string) => (
    <div className="flex flex-col items-center px-4">
      <span className="font-marker text-3xl text-lamp">
        <Count value={value} />
      </span>
      <span className="font-hand text-lg text-paper-ink/70">{label}</span>
    </div>
  );
  return (
    <div className="paper relative mx-auto inline-flex -rotate-1 items-center rounded-[4px] px-3 py-2 shadow-note">
      <span className="tape" style={{ left: "50%", top: -11, transform: "translateX(-50%) rotate(2deg)" }} />
      {item(stats.online, t("statOnline"))}
      <span className="h-9 w-px bg-paper-ink/15" />
      {item(stats.totalAnswered, t("statAnswered"))}
      <span className="h-9 w-px bg-paper-ink/15" />
      {item(stats.pending, t("statPending"))}
    </div>
  );
}
