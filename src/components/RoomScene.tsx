import { motion, useScroll, useTransform } from "framer-motion";

// Fondo: el cuarto de quien programó esto, a las 3am.
// Background: the room of whoever coded this, at 3am.
// Hecho a mano en SVG/CSS, con parallax al hacer scroll.

const BULB_COLORS = ["#ffd27a", "#ff9bb3", "#9be7a8", "#9cc9ff", "#ffb454"];

function FairyLights() {
  const bulbs = Array.from({ length: 22 });
  return (
    <svg
      viewBox="0 0 1200 110"
      preserveAspectRatio="none"
      className="absolute left-0 top-0 h-[110px] w-full overflow-hidden"
    >
      <path
        d="M0 22 Q 150 70 300 30 T 600 30 T 900 30 T 1200 26"
        fill="none"
        stroke="#3a2f20"
        strokeWidth="2.5"
      />
      {bulbs.map((_, i) => {
        const x = (i / (bulbs.length - 1)) * 1200;
        const y = 30 + Math.sin(i * 1.1) * 16 + 14;
        return (
          <g key={i} className="animate-twinkle" style={{ animationDelay: `${(i % 6) * 0.4}s` }}>
            <line x1={x} y1={y - 14} x2={x} y2={y - 4} stroke="#3a2f20" strokeWidth="2" />
            <circle cx={x} cy={y} r="5.5" fill={BULB_COLORS[i % BULB_COLORS.length]} />
            <circle cx={x} cy={y} r="11" fill={BULB_COLORS[i % BULB_COLORS.length]} opacity="0.25" />
          </g>
        );
      })}
    </svg>
  );
}

function Window() {
  return (
    <div className="absolute left-[4vw] top-[10vh] h-[26vh] w-[15vw] min-w-[140px] rotate-[-1deg]">
      <div className="relative h-full w-full rounded-md border-[6px] border-night-600 bg-gradient-to-b from-[#1b2740] to-[#0f1830] shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
        {/* luna / moon */}
        <div className="absolute right-3 top-3 h-9 w-9 rounded-full bg-[#f3ecd0] shadow-[0_0_24px_rgba(243,236,208,0.6)]" />
        {/* estrellas / stars */}
        {[
          [20, 30], [60, 18], [40, 60], [75, 55], [30, 80], [85, 78],
        ].map(([l, t], i) => (
          <span
            key={i}
            className="animate-twinkle absolute h-[3px] w-[3px] rounded-full bg-white"
            style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.6}s` }}
          />
        ))}
        {/* cruz de la ventana / window cross */}
        <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-night-600" />
        <div className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 bg-night-600" />
      </div>
    </div>
  );
}

function Lamp() {
  return (
    <div className="absolute right-[6vw] top-0 hidden md:block">
      {/* cono de luz cálida / warm light cone */}
      <div className="absolute right-2 top-10 h-[70vh] w-[42vw] origin-top -rotate-12 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(255,180,84,0.22),transparent_70%)]" />
      {/* brazo y cabezal / arm and head */}
      <svg viewBox="0 0 120 160" className="h-[150px] w-[110px] animate-flicker">
        <line x1="95" y1="0" x2="95" y2="50" stroke="#2a2118" strokeWidth="6" />
        <line x1="95" y1="50" x2="45" y2="78" stroke="#2a2118" strokeWidth="6" strokeLinecap="round" />
        <circle cx="95" cy="50" r="6" fill="#3a2f20" />
        <path d="M30 70 L66 70 L52 96 L20 96 Z" fill="#3a2f20" />
        <ellipse cx="36" cy="96" rx="18" ry="5" fill="#ffcf8f" opacity="0.9" />
      </svg>
    </div>
  );
}

function Poster({ style, hue }: { style: React.CSSProperties; hue: string }) {
  return (
    <div className="absolute hidden lg:block" style={style}>
      <div
        className="relative h-[20vh] w-[11vw] min-w-[120px] rounded-[2px] shadow-note"
        style={{ background: hue }}
      >
        <span className="tape" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(-4deg)" }} />
        <div className="absolute inset-3 flex flex-col gap-2 opacity-60">
          <div className="h-1/2 rounded-sm bg-black/20" />
          <div className="h-2 w-3/4 rounded-full bg-black/25" />
          <div className="h-2 w-1/2 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  );
}

function Plant() {
  return (
    <div className="absolute bottom-0 left-[3vw] hidden origin-bottom animate-sway md:block">
      <svg viewBox="0 0 120 160" className="h-[24vh] w-[90px]">
        <g fill="none" stroke="#5fbf7d" strokeWidth="6" strokeLinecap="round">
          <path d="M60 150 C 40 110 30 80 36 50" />
          <path d="M60 150 C 60 110 60 80 60 44" />
          <path d="M60 150 C 80 110 92 84 86 54" />
        </g>
        <g fill="#5fbf7d">
          <ellipse cx="36" cy="46" rx="13" ry="7" transform="rotate(-35 36 46)" />
          <ellipse cx="60" cy="40" rx="13" ry="7" />
          <ellipse cx="86" cy="50" rx="13" ry="7" transform="rotate(35 86 50)" />
        </g>
        <path d="M34 150 L86 150 L80 120 L40 120 Z" fill="#b5764a" />
      </svg>
    </div>
  );
}

function MugAndBooks() {
  return (
    <div className="absolute bottom-0 right-[3vw] hidden md:block">
      <svg viewBox="0 0 160 130" className="h-[20vh] w-[150px]">
        {/* libros apilados / stacked books */}
        <rect x="20" y="96" width="120" height="16" rx="2" fill="#ff6f61" />
        <rect x="28" y="80" width="104" height="16" rx="2" fill="#5b8def" />
        <rect x="24" y="64" width="112" height="16" rx="2" fill="#ffc24b" />
        {/* taza / mug */}
        <rect x="96" y="34" width="40" height="30" rx="5" fill="#f3e9d2" />
        <path d="M136 40 q 14 4 0 18" fill="none" stroke="#f3e9d2" strokeWidth="5" />
        {/* vapor / steam */}
        <g className="animate-twinkle" stroke="#cdbf9c" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7">
          <path d="M108 30 q 6 -8 0 -16" />
          <path d="M122 30 q 6 -8 0 -16" />
        </g>
      </svg>
    </div>
  );
}

export default function RoomScene() {
  const { scrollYProgress } = useScroll();
  const yBack = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <FairyLights />
      <motion.div style={{ y: yBack }} className="absolute inset-0">
        <Window />
        <Poster hue="#c97b56" style={{ left: "22vw", top: "9vh", transform: "rotate(3deg)" }} />
        <Poster hue="#4b6a8a" style={{ right: "24vw", top: "12vh", transform: "rotate(-2deg)" }} />
      </motion.div>
      <Lamp />
      <motion.div style={{ y: yFront }} className="absolute inset-0">
        <Plant />
        <MugAndBooks />
      </motion.div>
      {/* viñeta para legibilidad / vignette for readability */}
      <div className="absolute inset-0 bg-[radial-gradient(85%_60%_at_50%_45%,transparent,rgba(10,8,5,0.6))]" />
    </div>
  );
}
