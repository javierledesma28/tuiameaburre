import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { socket, emitAck } from "./lib/socket";

export type Screen = "home" | "ask" | "answer" | "wall";
export type FeedItem = { id: string; prompt: string; answer: string; ts: number };
export type Stats = { online: number; totalAnswered: number; pending: number };

type GameCtx = {
  credits: number;
  creditCap: number;
  askCost: number;
  answerSeconds: number;
  stats: Stats;
  feed: FeedItem[];
  screen: Screen;
  go: (s: Screen) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  confettiKey: number;
  burst: () => void;
  ask: (text: string) => Promise<any>;
  requestJob: () => Promise<any>;
  submitAnswer: (jobId: string, answer: string) => Promise<any>;
  skipJob: (jobId: string) => void;
  cancelAsk: (promptId: string) => void;
};

const Ctx = createContext<GameCtx>(null as any);

export function GameProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [creditCap, setCreditCap] = useState(10);
  const [askCost, setAskCost] = useState(1);
  const [answerSeconds, setAnswerSeconds] = useState(60);
  const [stats, setStats] = useState<Stats>({ online: 0, totalAnswered: 0, pending: 0 });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  // Si quedó una pregunta esperando respuesta (p. ej. recargó la página),
  // volvemos directo a la pantalla de Preguntar para retomar la espera.
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem("pendingAsk") ? "ask" : "home"
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onState = (s: any) => {
      setCredits(s.credits);
      if (typeof s.creditCap === "number") setCreditCap(s.creditCap);
      if (typeof s.askCost === "number") setAskCost(s.askCost);
      if (typeof s.answerSeconds === "number") setAnswerSeconds(s.answerSeconds);
    };
    const onStats = (s: Stats) => setStats(s);
    const onFeedInit = (list: FeedItem[]) => setFeed(Array.isArray(list) ? list.slice(0, 40) : []);
    const onFeedNew = (item: FeedItem) => setFeed((f) => [item, ...f].slice(0, 40));
    const onWelcome = ({ clientId }: { clientId: string }) =>
      localStorage.setItem("clientId", clientId);
    const onConnect = () => {
      socket.emit("hello", { clientId: localStorage.getItem("clientId") });
      socket.emit("getFeed");
    };

    socket.on("connect", onConnect);
    socket.on("welcome", onWelcome);
    socket.on("state", onState);
    socket.on("stats", onStats);
    socket.on("feed:init", onFeedInit);
    socket.on("feed:new", onFeedNew);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("welcome", onWelcome);
      socket.off("state", onState);
      socket.off("stats", onStats);
      socket.off("feed:init", onFeedInit);
      socket.off("feed:new", onFeedNew);
    };
  }, []);

  const toast = (msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  };
  const burst = () => setConfettiKey((k) => k + 1);

  const value: GameCtx = {
    credits,
    creditCap,
    askCost,
    answerSeconds,
    stats,
    feed,
    screen,
    go: setScreen,
    toast,
    toastMsg,
    confettiKey,
    burst,
    ask: (text) => emitAck("ask", { text }),
    requestJob: () => emitAck("requestJob", {}),
    submitAnswer: (jobId, answer) => emitAck("submitAnswer", { jobId, answer }),
    skipJob: (jobId) => socket.emit("skipJob", { jobId }),
    cancelAsk: (promptId) => socket.emit("cancelAsk", { promptId }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
