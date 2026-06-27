import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { socket, emitAck } from "./lib/socket";

export type Screen = "home" | "ask" | "answer" | "wall" | "creator" | "account";
export type FeedItem = {
  id: string;
  prompt: string;
  answer: string;
  ts: number;
  model?: string | null;
};
export type Stats = { online: number; totalAnswered: number; pending: number; boost?: Boost };
export type Boost = { team: "ai" | "human"; mult: number } | null;
export type Prefs = { tone: string; lang: string; favModel: string | null };
export type Profile = {
  nick: string | null;
  email: string | null;
  prefs: Prefs | null;
  gamesAsked: number;
  gamesAnswered: number;
} | null;

type GameCtx = {
  credits: number;
  creditCap: number;
  askCost: number;
  answerSeconds: number;
  stats: Stats;
  feed: FeedItem[];
  boost: Boost;
  profile: Profile;
  screen: Screen;
  go: (s: Screen) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  confettiKey: number;
  burst: () => void;
  ask: (text: string, tone?: string) => Promise<any>;
  requestJob: () => Promise<any>;
  submitAnswer: (jobId: string, answer: string) => Promise<any>;
  skipJob: (jobId: string) => void;
  cancelAsk: (promptId: string) => void;
  register: (email: string, nick: string, prefs: Prefs) => Promise<any>;
  updatePrefs: (prefs: Prefs) => Promise<any>;
};

const Ctx = createContext<GameCtx>(null as any);

export function GameProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [creditCap, setCreditCap] = useState(10);
  const [askCost, setAskCost] = useState(1);
  const [answerSeconds, setAnswerSeconds] = useState(60);
  const [stats, setStats] = useState<Stats>({ online: 0, totalAnswered: 0, pending: 0, boost: null });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [boost, setBoost] = useState<Boost>(null);
  const [profile, setProfile] = useState<Profile>(null);
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
      setBoost(s.boost ?? null);
      if ("profile" in s) setProfile(s.profile ?? null);
    };
    const onStats = (s: Stats) => {
      setStats(s);
      if ("boost" in s) setBoost(s.boost ?? null);
    };
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
    boost,
    profile,
    screen,
    go: setScreen,
    toast,
    toastMsg,
    confettiKey,
    burst,
    ask: (text, tone) => emitAck("ask", { text, tone }),
    requestJob: () => emitAck("requestJob", {}),
    submitAnswer: (jobId, answer) => emitAck("submitAnswer", { jobId, answer }),
    skipJob: (jobId) => socket.emit("skipJob", { jobId }),
    cancelAsk: (promptId) => socket.emit("cancelAsk", { promptId }),
    register: (email, nick, prefs) => emitAck("register", { email, nick, prefs }),
    updatePrefs: (prefs) => emitAck("updatePrefs", { prefs }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
