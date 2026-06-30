import { useEffect, useRef, useState } from "react";

export default function MonitorHead({
  className = "",
  photoSrc,
  eye = "#8ff0b5",
  led = "#ffb454",
  hat,
}: {
  className?: string;
  photoSrc?: string;
  eye?: string; // color de fósforo (ojos/boca)
  led?: string; // color del LED de la antena
  hat?: string; // emoji de sombrero (opcional)
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.38;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const MAX = 4.5;
      const factor = Math.min(1, dist / 140);
      setGaze({
        x: (dx / (dist || 1)) * MAX * factor,
        y: (dy / (dist || 1)) * MAX * factor,
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const { x, y } = gaze;

  return (
    <svg
      ref={ref}
      viewBox="0 0 120 218"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mh-screen-glow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#8ff0b5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8ff0b5" stopOpacity="0" />
        </radialGradient>
        {/* Vignette for face photo */}
        <radialGradient id="mh-vignette" cx="60" cy="81" r="42" gradientUnits="userSpaceOnUse">
          <stop offset="45%" stopColor="#071007" stopOpacity="0" />
          <stop offset="100%" stopColor="#071007" stopOpacity="0.82" />
        </radialGradient>
        {/* Scanlines pattern */}
        <pattern id="mh-scan" x="0" y="0" width="2" height="3" patternUnits="userSpaceOnUse">
          <rect width="2" height="1" fill="rgba(0,0,0,0.38)" />
        </pattern>
        {/* Phosphor glow filter */}
        <filter id="mh-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* LED glow filter */}
        <filter id="mh-led" x="-80%" y="-80%" width="360%" height="360%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* High-contrast phosphor-green CRT filter:
            crushes blacks, boosts midtones, keeps whites bright */}
        <filter id="mh-face-crt" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey">
            <feFuncR type="linear" slope="0" intercept="0.02" />
            <feFuncG type="table" tableValues="0 0.02 0.4 0.85 1.0 1.0" />
            <feFuncB type="linear" slope="0.06" intercept="0" />
          </feComponentTransfer>
        </filter>
        {/* Clip to screen bezel */}
        <clipPath id="mh-screen-clip">
          <rect x="22" y="52" width="76" height="58" rx="5" />
        </clipPath>
      </defs>

      {/* ── Antenna ── */}
      <line x1="60" y1="18" x2="60" y2="44" stroke="#5fbf7d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="14" r="5" fill={led} filter="url(#mh-led)" className="animate-twinkle" />
      <circle cx="60" cy="14" r="3" fill="#fff" opacity="0.55" className="animate-twinkle" />

      {/* ── Sombrero (opcional) ── */}
      {hat && (
        <text x="60" y="12" textAnchor="middle" fontSize="22" style={{ pointerEvents: "none" }}>
          {hat}
        </text>
      )}

      {/* ── Monitor shell ── */}
      <rect x="12" y="44" width="96" height="74" rx="10" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2.5" />
      <circle cx="20" cy="52" r="2" fill="#2a4a2a" stroke="#5fbf7d" strokeWidth="1" />
      <circle cx="100" cy="52" r="2" fill="#2a4a2a" stroke="#5fbf7d" strokeWidth="1" />
      <circle cx="20" cy="110" r="2" fill="#2a4a2a" stroke="#5fbf7d" strokeWidth="1" />
      <circle cx="100" cy="110" r="2" fill="#2a4a2a" stroke="#5fbf7d" strokeWidth="1" />

      {/* ── Screen ── */}
      <rect x="22" y="52" width="76" height="58" rx="5" fill="#071007" />

      {photoSrc ? (
        <>
          {/* Face photo: high-contrast phosphor + clipped */}
          <g clipPath="url(#mh-screen-clip)">
            <image
              href={photoSrc}
              x="22" y="52" width="76" height="58"
              preserveAspectRatio="xMidYMid slice"
              filter="url(#mh-face-crt)"
            />
            {/* Vignette: darkens edges so face pops */}
            <rect x="22" y="52" width="76" height="58" fill="url(#mh-vignette)" />
            {/* Scanlines */}
            <rect x="22" y="52" width="76" height="58" fill="url(#mh-scan)" opacity="0.4" />
            {/* Animated scan bar */}
            <rect x="22" y="52" width="76" height="2.5" fill="rgba(143,240,181,0.22)">
              <animate attributeName="y" from="52" to="107" dur="3s" repeatCount="indefinite" calcMode="linear" />
            </rect>
          </g>

          {/* Phosphor glow overlay */}
          <rect x="22" y="52" width="76" height="58" rx="5" fill="url(#mh-screen-glow)" />

          {/* Corner detection brackets */}
          <g filter="url(#mh-glow)" stroke="#8ff0b5" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <path d="M33 57 L27 57 L27 64" />
            <path d="M87 57 L93 57 L93 64" />
            <path d="M33 105 L27 105 L27 98" />
            <path d="M87 105 L93 105 L93 98" />
          </g>

          {/* Scan label */}
          <text x="60" y="60" textAnchor="middle" fill="#8ff0b5" fontSize="3.5" fontFamily="monospace" opacity="0.75" filter="url(#mh-glow)">◈ FACIAL SCAN ◈</text>
        </>
      ) : (
        <>
          <rect x="22" y="52" width="76" height="58" rx="5" fill="url(#mh-screen-glow)" />
          <rect x="22" y="52" width="76" height="58" rx="5" fill="url(#mh-scan)" opacity="0.55" />
          <ellipse cx="60" cy="58" rx="28" ry="6" fill="rgba(143,240,181,0.04)" />

          <g filter="url(#mh-glow)">
            <ellipse cx="44" cy="76" rx="10" ry="10" fill="#061206" stroke={eye} strokeWidth="1" opacity="0.6" />
            <ellipse cx={44 + x} cy={76 + y} rx="6.5" ry="6.5" fill={eye} opacity="0.92" />
            <ellipse cx={44 + x} cy={76 + y} rx="3.2" ry="3.2" fill="#071007" />
            <circle cx={43.2 + x} cy={74.8 + y} r="1" fill="rgba(255,255,255,0.45)" />

            <ellipse cx="76" cy="76" rx="10" ry="10" fill="#061206" stroke={eye} strokeWidth="1" opacity="0.6" />
            <ellipse cx={76 + x} cy={76 + y} rx="6.5" ry="6.5" fill={eye} opacity="0.92" />
            <ellipse cx={76 + x} cy={76 + y} rx="3.2" ry="3.2" fill="#071007" />
            <circle cx={75.2 + x} cy={74.8 + y} r="1" fill="rgba(255,255,255,0.45)" />
          </g>

          <path
            d="M 46 95 Q 60 104 74 95"
            fill="none"
            stroke={eye}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#mh-glow)"
          />
        </>
      )}

      {/* Power LED + brand badge */}
      <circle cx="84" cy="108" r="3.5" fill="#5fbf7d" filter="url(#mh-led)" className="animate-flicker" />
      {!photoSrc && <text x="23" y="108" fill="#8ff0b5" fontSize="5.5" fontFamily="monospace" opacity="0.55">TUI</text>}

      {/* ── Monitor base/stand ── */}
      <rect x="46" y="118" width="28" height="6" rx="3" fill="#142014" stroke="#5fbf7d" strokeWidth="1.5" />
      <rect x="36" y="123" width="48" height="4" rx="2" fill="#142014" stroke="#5fbf7d" strokeWidth="1.5" opacity="0.7" />

      {/* ── Neck ── */}
      <rect x="49" y="127" width="22" height="12" rx="3" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="1.5" />

      {/* ── Torso ── */}
      <rect x="30" y="139" width="60" height="44" rx="7" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2.2" />
      <rect x="40" y="147" width="40" height="26" rx="4" fill="#071007" stroke="#5fbf7d" strokeWidth="1" opacity="0.9" />
      <rect x="44" y="152" width="10" height="4" rx="2" fill="#8ff0b5" opacity="0.5" />
      <rect x="44" y="159" width="6" height="4" rx="2" fill="#ffb454" opacity="0.55" />
      <rect x="52" y="159" width="6" height="4" rx="2" fill="#ff6f61" opacity="0.45" />
      <text x="68" y="163" fill="#8ff0b5" fontSize="6" fontFamily="monospace" opacity="0.7">AI?</text>

      {/* ── Arms ── */}
      <line x1="30" y1="152" x2="10" y2="172" stroke="#5fbf7d" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="8" cy="175" r="5.5" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2" />
      <line x1="90" y1="152" x2="110" y2="172" stroke="#5fbf7d" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="112" cy="175" r="5.5" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2" />

      {/* ── Legs ── */}
      <line x1="50" y1="183" x2="46" y2="206" stroke="#5fbf7d" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="70" y1="183" x2="74" y2="206" stroke="#5fbf7d" strokeWidth="5.5" strokeLinecap="round" />
      <rect x="37" y="203" width="18" height="7" rx="3.5" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2" />
      <rect x="65" y="203" width="18" height="7" rx="3.5" fill="#0c1a10" stroke="#5fbf7d" strokeWidth="2" />
    </svg>
  );
}
