import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>/\\|";

/**
 * Texto que se "escramblea" y se revela de izquierda a derecha — como si una IA
 * lo estuviera generando. El chiste: lo escribe un humano.
 * Text that scrambles and reveals left-to-right, like an AI generating it.
 */
export default function ScrambleText({
  text,
  className = "",
  play = true,
  delay = 0,
  speed = 1.4,
}: {
  text: string;
  className?: string;
  play?: boolean;
  delay?: number;
  speed?: number; // chars revealed per frame
}) {
  const [out, setOut] = useState(play ? "" : text);
  const raf = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!play) {
      setOut(text);
      return;
    }
    let revealed = 0;
    const tick = () => {
      revealed += speed;
      const cut = Math.floor(revealed);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") s += " ";
        else if (i < cut) s += text[i];
        else if (i < cut + 4) s += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setOut(s);
      if (cut < text.length) raf.current = requestAnimationFrame(tick);
      else setOut(text);
    };
    timer.current = window.setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, play, delay, speed]);

  return <span className={className}>{out || " "}</span>;
}
