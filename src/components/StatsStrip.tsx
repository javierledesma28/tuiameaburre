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
    <div className="flex flex-col items-center px-2.5 sm:px-4">
      <span className="font-marker text-2xl text-lamp sm:text-3xl">
        <Count value={value} />
      </span>
      <span className="text-center font-hand text-sm leading-tight text-paper-ink/70 sm:text-lg">{label}</span>
    </div>
  );
  return (
    <div className="paper relative mx-auto inline-flex max-w-[92vw] -rotate-1 items-center rounded-[4px] px-2 py-2 shadow-note sm:px-3">
      <span className="tape" style={{ left: "50%", top: -11, transform: "translateX(-50%) rotate(2deg)" }} />
      {item(stats.online, t("statOnline"))}
      <span className="h-8 w-px shrink-0 bg-paper-ink/15 sm:h-9" />
      {item(stats.totalAnswered, t("statAnswered"))}
      <span className="h-8 w-px shrink-0 bg-paper-ink/15 sm:h-9" />
      {item(stats.pending, t("statPending"))}
    </div>
  );
}
