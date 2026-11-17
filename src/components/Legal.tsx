import { useGame } from "../game";
import { useI18n } from "../i18n";

// Privacidad + términos + aviso de almacenamiento local, en un solo lugar.
// Contenido bilingüe directo (no vale la pena i18n-ear cada párrafo).
const ES = {
  title: "Privacidad y términos",
  sub: "En criollo, sin letra chica escondida.",
  sections: [
    ["Qué guardamos", [
      "Un identificador anónimo en tu navegador (localStorage) para reconocer tu sesión y tus créditos. No es una cookie de rastreo.",
      "Si te das de alta: tu apodo, y opcionalmente un email (no lo verificamos ni te mandamos nada).",
      "Tu país aproximado (por IP, vía Cloudflare) y estadísticas del juego (partidas, coronas).",
      "Lo que escribís en el juego (preguntas y respuestas) se muestra públicamente en el muro.",
      "Contamos las visitas con Umami, una herramienta de analítica que corre en un servidor propio (analytics.t28.io). Anota de forma anónima qué página se abrió, desde qué sitio llegaste, tu país aproximado, navegador, sistema, tamaño de pantalla e idioma. No usa cookies, no guarda tu IP, no arma perfiles tuyos, no registra lo que escribís en el juego y respeta la señal «No rastrear» de tu navegador.",
    ]],
    ["Qué NO hacemos", [
      "No vendemos tus datos. No hay publicidad ni herramientas de analítica de terceros: las visitas las medimos nosotros, en un servidor propio.",
      "No usamos cookies de marketing. El único almacenamiento es funcional (tu sesión).",
    ]],
    ["Reglas de convivencia", [
      "Nada de odio, acoso, datos personales de otros, spam ni contenido ilegal.",
      "El contenido puede filtrarse, ocultarse por reportes o borrarse. Jugás fingiendo ser una IA: sé creativo, no cruel.",
      "El juego se ofrece “tal cual”, sin garantías. Puede haber caídas o reinicios.",
    ]],
    ["Tus datos", [
      "Podés borrar tu identidad local vaciando el almacenamiento del sitio en tu navegador.",
      "Para borrar tu cuenta/nick del servidor, escribinos.",
    ]],
  ],
  contact: "Dudas o pedidos: ",
};
const EN = {
  title: "Privacy & terms",
  sub: "Plain and short, no hidden fine print.",
  sections: [
    ["What we store", [
      "An anonymous id in your browser (localStorage) to recognize your session and credits. Not a tracking cookie.",
      "If you sign up: your nickname, and optionally an email (unverified — we never email you).",
      "Your approximate country (by IP, via Cloudflare) and game stats (games, crowns).",
      "What you type in the game (questions and answers) is shown publicly on the board.",
      "We count visits with Umami, an analytics tool that runs on our own server (analytics.t28.io). It anonymously notes which page was opened, where you came from, your approximate country, browser, system, screen size and language. It uses no cookies, doesn't store your IP, doesn't build profiles of you, doesn't record what you type in the game and honors your browser's “Do Not Track” signal.",
    ]],
    ["What we DON'T do", [
      "We don't sell your data. No ads and no third-party analytics tools: we measure visits ourselves, on our own server.",
      "No marketing cookies. The only storage is functional (your session).",
    ]],
    ["House rules", [
      "No hate, harassment, others' personal data, spam or illegal content.",
      "Content may be filtered, hidden by reports, or removed. You're pretending to be an AI: be creative, not cruel.",
      "The game is provided “as is”, no warranties. Outages and resets can happen.",
    ]],
    ["Your data", [
      "You can delete your local identity by clearing the site's storage in your browser.",
      "To delete your server account/nick, reach out.",
    ]],
  ],
  contact: "Questions or requests: ",
};

export default function Legal() {
  const { go } = useGame();
  const { t, lang } = useI18n();
  const c = lang === "en" ? EN : ES;
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <button onClick={() => go("home")} className="font-hand text-xl text-muted hover:text-ink">
        {t("back")}
      </button>
      <h2 className="mb-1 mt-2 font-marker text-3xl text-ink sm:text-4xl">{c.title}</h2>
      <p className="mb-6 font-hand text-xl text-muted">{c.sub}</p>

      <div className="space-y-5">
        {c.sections.map(([h, items]) => (
          <section key={h as string} className="rounded-[10px] border border-ink/10 bg-night-800/50 p-4">
            <h3 className="mb-2 font-marker text-xl text-lamp">{h as string}</h3>
            <ul className="list-disc space-y-1.5 pl-5 font-hand text-lg text-ink/85">
              {(items as string[]).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 font-hand text-lg text-muted">
        {c.contact}
        <a
          href="https://linkedin.com/in/ledesmajavier"
          target="_blank"
          rel="noopener noreferrer"
          className="text-lamp underline"
        >
          LinkedIn
        </a>
      </p>
    </div>
  );
}
