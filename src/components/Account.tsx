import { useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import { MODELS } from "../models";
import ModelCard from "./ModelCard";

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as any },
});

const TONES = ["any", "gracioso", "serio", "poetico", "acido"];
const LANGS = ["any", "es", "en"];
const SEXES = ["m", "f", "nb", "na"];

export default function Account() {
  const { profile, credits, coronas, register, updatePrefs, toast, go } = useGame();
  const { t } = useI18n();

  const registered = !!profile?.nick;
  const [nick, setNick] = useState(profile?.nick || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [tone, setTone] = useState(profile?.prefs?.tone || "any");
  const [lang, setLang] = useState(profile?.prefs?.lang || "any");
  const [favModel, setFavModel] = useState<string | null>(profile?.prefs?.favModel ?? null);
  const [sex, setSex] = useState<string>(profile?.sex || "na");
  const [busy, setBusy] = useState(false);

  const prefs = { tone, lang, favModel };

  const errorMsg = (e?: string) =>
    e === "nick_taken" ? t("nickTaken") : e === "bad_email" ? t("badEmail") : t("badNick");

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (registered) {
        const res = await updatePrefs(prefs, sex);
        if (!res?.ok) return toast(errorMsg(res?.error));
        toast(t("savedMsg"));
      } else {
        if (nick.trim().length < 2) return toast(t("badNick"));
        const res = await register(email.trim(), nick.trim(), prefs, sex);
        if (!res?.ok) return toast(errorMsg(res?.error));
        toast(t("savedMsg"));
      }
    } finally {
      setBusy(false);
    }
  };

  // Chip de selección reusable / reusable selectable chip.
  const Chip = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-hand text-lg leading-none transition-colors ${
        active
          ? "border-lamp bg-lamp/15 text-lamp"
          : "border-ink/20 text-muted hover:border-ink/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>

      {/* ── Cabecera ── */}
      <motion.div {...rise(0)} className="relative mb-8 mt-2">
        <div className="tape absolute -top-3 left-10 -rotate-2" />
        <div className="paper rounded-[6px] p-6 shadow-lift">
          <h1 className="font-marker text-3xl text-paper-ink sm:text-4xl">
            {registered ? t("welcomeBack")(profile!.nick) : t("accountTitle")}
          </h1>
          <p className="mt-2 font-hand text-xl leading-snug text-paper-ink/70">
            {registered ? t("accountSubReturning") : t("accountSubNew")}
          </p>

          {registered && (
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                { v: `🧠 ${coronas.human}`, l: t("coronasHuman") },
                { v: `🤖 ${coronas.ai}`, l: t("coronasAi") },
                { v: credits, l: t("yourCredits") },
                { v: profile!.gamesAsked, l: t("statsAsked") },
                { v: profile!.gamesAnswered, l: t("statsAnsweredP") },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex min-w-[80px] flex-1 flex-col items-center rounded-[4px] bg-paper-ink/5 px-3 py-2"
                >
                  <span className="font-marker text-2xl text-paper-ink">{s.v}</span>
                  <span className="text-center font-mono text-[10px] uppercase tracking-wide text-paper-ink/50">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Datos de alta (solo si no está registrado) ── */}
      {!registered && (
        <motion.section {...rise(0.06)} className="mb-8 space-y-4">
          <div className="paper rounded-[5px] p-4 shadow-note">
            <label className="block font-mono text-[11px] uppercase tracking-widest text-paper-ink/50">
              {t("fieldNick")}
            </label>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value.slice(0, 24))}
              placeholder={t("nickPlaceholder")}
              className="mt-1 w-full bg-transparent font-hand text-2xl text-paper-ink outline-none placeholder:text-paper-ink/30"
            />
          </div>
          <div className="paper rounded-[5px] p-4 shadow-note">
            <label className="block font-mono text-[11px] uppercase tracking-widest text-paper-ink/50">
              {t("fieldEmail")} <span className="lowercase text-paper-ink/35">· {t("emailOptional")}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 120))}
              placeholder={t("emailPlaceholder")}
              className="mt-1 w-full bg-transparent font-mono text-base text-paper-ink outline-none placeholder:text-paper-ink/30"
            />
          </div>
        </motion.section>
      )}

      {/* ── Preferencias ── */}
      <motion.section {...rise(0.12)} className="mb-8 space-y-6">
        <div>
          <h3 className="mb-2 font-marker text-xl text-ink">{t("prefTone")}</h3>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tn) => (
              <Chip key={tn} active={tone === tn} onClick={() => setTone(tn)}>
                {t("tone" + tn.charAt(0).toUpperCase() + tn.slice(1))}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-marker text-xl text-ink">{t("prefLang")}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((lg) => (
              <Chip key={lg} active={lang === lg} onClick={() => setLang(lg)}>
                {t("lang" + lg.charAt(0).toUpperCase() + lg.slice(1))}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-1 font-marker text-xl text-ink">{t("prefSex")}</h3>
          <p className="mb-2 font-hand text-base text-muted/70">{t("prefSexNote")}</p>
          <div className="flex flex-wrap gap-2">
            {SEXES.map((sx) => (
              <Chip key={sx} active={sex === sx} onClick={() => setSex(sx)}>
                {t("sex_" + sx)}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-1 font-marker text-xl text-ink">{t("prefModel")}</h3>
          <p className="mb-3 font-hand text-base text-muted/70">{t("matchmakingNote")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFavModel(null)}
              className={`rounded-[6px] border-2 px-3 py-3 text-left font-hand text-lg transition-colors ${
                favModel === null ? "border-lamp text-lamp" : "border-ink/15 text-muted hover:border-lamp/60"
              }`}
            >
              🎲 {t("prefModelAny")}
            </button>
            {MODELS.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={favModel === m.id}
                onClick={() => setFavModel(m.id)}
              />
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Guardar ── */}
      <motion.div {...rise(0.18)}>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-[4px] bg-marker-red px-6 py-3 font-marker text-lg text-white shadow-note transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {registered ? t("savePrefs") : t("saveAccount")} ✎
        </button>
      </motion.div>
    </div>
  );
}
