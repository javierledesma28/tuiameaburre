import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import MonitorHead from "./MonitorHead";

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] },
});

const CERTS = [
  {
    emoji: "🏗️",
    title: "Azure Solutions Architect Expert",
    sub: "AZ-305 · Microsoft",
    color: "bg-sticky-blue",
    rotate: "-rotate-1",
    joke: "Certifica que sé diseñar infraestructura de misión crítica para bancos sistémicos. También certifica que desplegué esto en Docker en un Ubuntu de mi cuarto.",
  },
  {
    emoji: "🤖",
    title: "AI & LLM Specialization",
    sub: "Anthropic ×5 · NVIDIA ×1",
    color: "bg-sticky-green",
    rotate: "rotate-1",
    joke: "Sí. Cinco veces certificado por Anthropic. Y lo primero que hice fue un juego sin IA. No existe un certificado para eso.",
  },
  {
    emoji: "🌐",
    title: "IoT en MIT CSAIL",
    sub: "Massachusetts Institute of Technology",
    color: "bg-sticky-yellow",
    rotate: "-rotate-2",
    joke: "Para entender sensores y cositas parpadeantes. Como el LED del robot de arriba. Aplicación directa.",
  },
  {
    emoji: "☁️",
    title: "VMware VCP / VSP / VTSP",
    sub: "VMware Certified",
    color: "bg-sticky-pink",
    rotate: "rotate-2",
    joke: "Para cuando Azure todavía no existía y virtualizábamos en serio. Muy útil ahora que todo es Kubernetes y nadie recuerda qué es un hypervisor.",
  },
];

const JOBS = [
  { year: "2025 →", role: "Head of IT & Cloud Strategy", place: "Fundanet — plataforma de investigación clínica y biomédica usada por hospitales y universidades en España." },
  { year: "2024–25", role: "Director de Infraestructura", place: "Raona — redefinición de la unidad cloud para clientes enterprise en España." },
  { year: "2022–24", role: "Arquitecto Cloud", place: "Banco Comafi — banco de importancia sistémica. Landing Zones, Hub & Spoke, migración del core bancario." },
  { year: "2018–20", role: "Coordinador de Datacenter", place: "ARSAT — operador TI del Estado argentino. ISO 27001. Datacenter nacional." },
  { year: "2016 →", role: "Co-Fundador & CTO", place: "Think28 — consultoría en cloud, automatización e IA. Compatible con todo lo anterior." },
];

export default function Creator() {
  const { go } = useGame();
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16">

      {/* ── Cabecera ── */}
      <motion.div {...rise(0)} className="relative mb-10 mt-2">
        {/* washi tape top */}
        <div className="tape absolute -top-3 left-1/2 -translate-x-1/2 -rotate-1" />
        <div className="paper rounded-[5px] p-6 shadow-lift">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <MonitorHead className="w-32 animate-float" />
            </div>
            <div className="text-center sm:text-left">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-paper-ink/40">
                Archivo personal / Personal file
              </p>
              <h1 className="font-marker text-4xl text-paper-ink sm:text-5xl">
                Javier Ledesma
              </h1>
              <p className="mt-1 font-mono text-sm text-paper-ink/70">
                Head of Infrastructure · Cloud Architect · Azure
              </p>
              <p className="font-mono text-xs text-paper-ink/40">📍 Santander, España</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {[
                  { label: "t28.io", href: "https://t28.io" },
                  { label: "azurehub.t28.io", href: "https://azurehub.t28.io" },
                  { label: "linkedin", href: "https://linkedin.com/in/ledesmajavier" },
                  { label: "javierledesma.com.ar", href: "https://javierledesma.com.ar" },
                ].map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-paper-ink/20 px-3 py-0.5 font-mono text-[11px] text-paper-ink/60 transition-colors hover:border-paper-ink/60 hover:text-paper-ink"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Bio ── */}
      <motion.section {...rise(0.08)} className="mb-10">
        <h2 className="mb-4 font-marker text-3xl text-ink">
          <span className="scribble">Quién es este tipo</span>
        </h2>
        <div className="space-y-4 font-hand text-xl leading-relaxed text-muted">
          <p>
            Arquitecto Cloud con más de 15 años diseñando plataformas Microsoft Azure para bancos de importancia sistémica,
            hospitales, universidades y organismos del Estado. De esos proyectos donde si algo falla,
            alguien tiene que explicarle al CEO por qué no entran los datos de un paciente.
          </p>
          <p>
            Certificado por Anthropic cinco veces. Por NVIDIA una. Por Microsoft bastantes.
            A pesar de todo eso —o quizás por eso— construyó un juego donde la premisa central es que
            la IA no sirve para nada que no pueda hacer una persona con 60 segundos y algo de descaro.
          </p>
          <p>
            La carrera universitaria sigue inconclusa. El datacenter nacional que coordinó en ARSAT sigue funcionando.
            Las prioridades están claras.
          </p>
        </div>
      </motion.section>

      {/* ── CRT: La ironía técnica ── */}
      <motion.div {...rise(0.12)} className="mb-10">
        <div className="crt rounded-[10px] px-5 py-4 shadow-note">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#8ff0b5]/50">
            comparativa_tecnica.txt
          </p>
          <div className="grid grid-cols-1 gap-2 font-mono text-sm sm:grid-cols-2">
            <div>
              <p className="text-[#8ff0b5]/50 text-xs mb-1">LO QUE CERTIFICA</p>
              <p className="text-[#8ff0b5]">&gt; Landing Zones enterprise</p>
              <p className="text-[#8ff0b5]">&gt; Hub & Spoke multi-región</p>
              <p className="text-[#8ff0b5]">&gt; Migración core bancario</p>
              <p className="text-[#8ff0b5]">&gt; Agentes con Semantic Kernel</p>
              <p className="text-[#8ff0b5]">&gt; RAG sobre Azure AI Search</p>
            </div>
            <div>
              <p className="text-[#8ff0b5]/50 text-xs mb-1">LO QUE USÓ ACÁ</p>
              <p className="text-[#8ff0b5]">&gt; node server.js</p>
              <p className="text-[#8ff0b5]">&gt; socket.io</p>
              <p className="text-[#8ff0b5]">&gt; docker compose up -d</p>
              <p className="text-[#8ff0b5]">&gt; localStorage</p>
              <p className="text-[#8ff0b5]">&gt; <span className="animate-blink">_</span></p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-[#8ff0b5]/30">
            // ambos enfoques son correctos. el segundo costó menos.
          </p>
        </div>
      </motion.div>

      {/* ── Certificaciones ── */}
      <motion.section {...rise(0.16)} className="mb-10">
        <h2 className="mb-5 font-marker text-3xl text-ink">Las credenciales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CERTS.map((c) => (
            <motion.div
              key={c.title}
              whileHover={{ y: -4, rotate: 0 }}
              className={`${c.color} ${c.rotate} rounded-[4px] p-4 shadow-note`}
            >
              <div className="mb-1 text-2xl">{c.emoji}</div>
              <p className="font-marker text-lg text-paper-ink">{c.title}</p>
              <p className="mb-2 font-mono text-[11px] text-paper-ink/60">{c.sub}</p>
              <p className="font-hand text-base leading-snug text-paper-ink/80">{c.joke}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 font-mono text-xs text-muted/60">
          + Scrum Fundamentals · BluePrism Developer & Arch · MCP 70-686 · Design Thinking UTN
        </p>
      </motion.section>

      {/* ── Línea de tiempo ── */}
      <motion.section {...rise(0.2)} className="mb-10">
        <h2 className="mb-5 font-marker text-3xl text-ink">La trayectoria</h2>
        <div className="space-y-3">
          {JOBS.map((j, i) => (
            <div key={i} className="flex gap-4">
              <span className="shrink-0 font-mono text-xs text-lamp pt-1 w-16">{j.year}</span>
              <div className="border-l border-lamp/30 pl-4">
                <p className="font-marker text-lg text-ink leading-tight">{j.role}</p>
                <p className="font-hand text-base text-muted">{j.place}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-4">
            <span className="shrink-0 font-mono text-xs text-marker-red pt-1 w-16">2026</span>
            <div className="border-l border-marker-red/40 pl-4">
              <p className="font-marker text-lg text-marker-red leading-tight">tuiameaburre.com</p>
              <p className="font-hand text-base text-muted">
                Un juego donde los humanos fingen ser IA. Sin base de datos, sin modelo, sin presupuesto.
                Con un robot que te mira con los ojos.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Por qué ── */}
      <motion.div {...rise(0.24)} className="mb-10">
        <div className="tape absolute" style={{ display: "none" }} />
        <div className="relative">
          <div className="tape absolute -top-3 left-8 rotate-3" />
          <div className="paper rounded-[4px] p-5 shadow-note -rotate-1">
            <p className="font-marker text-xl text-paper-ink mb-2">¿Por qué hiciste esto?</p>
            <p className="font-hand text-lg leading-relaxed text-paper-ink/80">
              "Porque el 95% de lo que la gente llama <em>IA</em> podría hacerlo una persona con suficiente
              cafeína y poco amor propio. Y quería que se notara."
            </p>
            <p className="mt-2 font-mono text-xs text-paper-ink/40">— J. Ledesma, 3:17am, Santander</p>
          </div>
        </div>
      </motion.div>

      {/* ── Volver ── */}
      <motion.div {...rise(0.28)} className="text-center">
        <button
          onClick={() => go("home")}
          className="font-hand text-xl text-lamp hover:text-ink transition-colors"
        >
          ← {t("back")}
        </button>
      </motion.div>

    </div>
  );
}
