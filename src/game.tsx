import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { socket, emitAck } from "./lib/socket";

export type Screen =
  | "home"
  | "ask"
  | "answer"
  | "wall"
  | "creator"
  | "account"
  | "ranking"
  | "duel"
  | "halluc";
export type ReactionType = "up" | "bot" | "meh" | "skull";
export type FeedItem = {
  id: string;
  prompt: string;
  answer: string;
  ts: number;
  model?: string | null;
  authorClientId?: string | null;
  rUp?: number;
  rBot?: number;
  rMeh?: number;
  rSkull?: number;
  roast?: number;
  my?: ReactionType | null; // la reacción del cliente actual a esta nota
};
export type Stats = { online: number; totalAnswered: number; pending: number; boost?: Boost };
export type Boost = { team: "ai" | "human"; mult: number } | null;
export type Coronas = { human: number; ai: number };
export type Prefs = { tone: string; lang: string; favModel: string | null };
export type Profile = {
  nick: string | null;
  email: string | null;
  prefs: Prefs | null;
  sex: string | null;
  country: string | null;
  gamesAsked: number;
  gamesAnswered: number;
  coronasHuman: number;
  coronasAi: number;
} | null;

type GameCtx = {
  credits: number;
  creditCap: number;
  askCost: number;
  answerSeconds: number;
  stats: Stats;
  feed: FeedItem[];
  boost: Boost;
  coronas: Coronas;
  streak: number;
  achievements: string[];
  unlocked: string[]; // logros recién desbloqueados (para festejar)
  clearUnlocked: () => void;
  profile: Profile;
  screen: Screen;
  go: (s: Screen) => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
  confettiKey: number;
  burst: () => void;
  ask: (text: string, tone?: string) => Promise<any>;
  requestJob: () => Promise<any>;
  submitAnswer: (jobId: string, answer: string, roast?: boolean) => Promise<any>;
  skipJob: (jobId: string) => void;
  cancelAsk: (promptId: string) => void;
  register: (email: string, nick: string, prefs: Prefs, sex: string) => Promise<any>;
  updatePrefs: (prefs: Prefs, sex: string) => Promise<any>;
  react: (answerId: string, type: ReactionType) => Promise<any>;
  getRanking: (filters: {
    category: "human" | "ai";
    period: "today" | "week" | "all";
    country?: string | null;
    sex?: string | null;
    model?: string | null;
  }) => Promise<any>;
  getHighlight: () => Promise<any>;
  getHallOfShame: () => Promise<any>;
  getDuelState: () => Promise<any>;
  submitDuelEntry: (answer: string) => Promise<any>;
  voteDuel: (duelId: string, side: "a" | "b") => Promise<any>;
  getHallucState: () => Promise<any>;
  submitHallucination: (answer: string) => Promise<any>;
  voteHallucination: (id: string, believe: boolean) => Promise<any>;
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
  const [coronas, setCoronas] = useState<Coronas>({ human: 0, ai: 0 });
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
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
      if (s.coronas) setCoronas(s.coronas);
      if (typeof s.streak === "number") setStreak(s.streak);
      if (Array.isArray(s.achievements)) setAchievements(s.achievements);
      if ("profile" in s) setProfile(s.profile ?? null);
    };
    const onStats = (s: Stats) => {
      setStats(s);
      if ("boost" in s) setBoost(s.boost ?? null);
    };
    // feed:init ahora trae { items, myReactions }; tolera el formato viejo (array).
    const onFeedInit = (payload: any) => {
      const list: FeedItem[] = Array.isArray(payload) ? payload : payload?.items || [];
      const mine: Record<string, ReactionType> = Array.isArray(payload) ? {} : payload?.myReactions || {};
      setFeed(list.slice(0, 40).map((it) => ({ ...it, my: mine[it.id] ?? null })));
    };
    const onFeedNew = (item: FeedItem) => setFeed((f) => [{ ...item, my: null }, ...f].slice(0, 40));
    // Conteos de reacciones actualizados (difundido a todos).
    const onFeedReact = (u: { id: string; rUp: number; rBot: number; rMeh: number; rSkull: number }) =>
      setFeed((f) => f.map((it) => (it.id === u.id ? { ...it, rUp: u.rUp, rBot: u.rBot, rMeh: u.rMeh, rSkull: u.rSkull } : it)));
    const onUnlocked = ({ ids }: { ids: string[] }) => {
      if (Array.isArray(ids) && ids.length) {
        setUnlocked(ids);
        setConfettiKey((k) => k + 1);
      }
    };
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
    socket.on("feed:react", onFeedReact);
    socket.on("unlocked", onUnlocked);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("welcome", onWelcome);
      socket.off("state", onState);
      socket.off("stats", onStats);
      socket.off("feed:init", onFeedInit);
      socket.off("feed:new", onFeedNew);
      socket.off("feed:react", onFeedReact);
      socket.off("unlocked", onUnlocked);
    };
  }, []);

  const toast = (msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  };
  const burst = () => setConfettiKey((k) => k + 1);

  // Reaccionar a una nota: optimista (toggle local) + confirmación del server.
  const react = async (answerId: string, type: ReactionType) => {
    setFeed((f) =>
      f.map((it) => (it.id === answerId ? { ...it, my: it.my === type ? null : type } : it))
    );
    const res = await emitAck<any>("react", { answerId, type });
    if (res?.ok) {
      setFeed((f) => f.map((it) => (it.id === answerId ? { ...it, my: res.my ?? null } : it)));
    }
    return res;
  };

  const value: GameCtx = {
    credits,
    creditCap,
    askCost,
    answerSeconds,
    stats,
    feed,
    boost,
    coronas,
    streak,
    achievements,
    unlocked,
    clearUnlocked: () => setUnlocked([]),
    profile,
    screen,
    go: setScreen,
    toast,
    toastMsg,
    confettiKey,
    burst,
    ask: (text, tone) => emitAck("ask", { text, tone }),
    requestJob: () => emitAck("requestJob", {}),
    submitAnswer: (jobId, answer, roast) => emitAck("submitAnswer", { jobId, answer, roast }),
    skipJob: (jobId) => socket.emit("skipJob", { jobId }),
    cancelAsk: (promptId) => socket.emit("cancelAsk", { promptId }),
    register: (email, nick, prefs, sex) => emitAck("register", { email, nick, prefs, sex }),
    updatePrefs: (prefs, sex) => emitAck("updatePrefs", { prefs, sex }),
    react,
    getRanking: (filters) => emitAck("getRanking", filters),
    getHighlight: () => emitAck("getHighlight", {}),
    getHallOfShame: () => emitAck("getHallOfShame", {}),
    getDuelState: () => emitAck("getDuelState", {}),
    submitDuelEntry: (answer) => emitAck("submitDuelEntry", { answer }),
    voteDuel: (duelId, side) => emitAck("voteDuel", { duelId, side }),
    getHallucState: () => emitAck("getHallucState", {}),
    submitHallucination: (answer) => emitAck("submitHallucination", { answer }),
    voteHallucination: (id, believe) => emitAck("voteHallucination", { id, believe }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGame = () => useContext(Ctx);
