// Genera una "captura de chat con IA" en un canvas y la comparte (o descarga).
// Es el motor viral: cada imagen lleva el branding y la URL del juego.
import { MODEL_BY_ID } from "../models";

type CardData = { prompt: string; answer: string; modelId?: string | null };

const W = 1080;
const H = 1080;
const PAD = 80;

// Envuelve texto a un ancho máximo, devolviendo las líneas.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

async function renderCard({ prompt, answer, modelId }: CardData): Promise<Blob> {
  // Asegura que las fuentes de Google (ya enlazadas en index.html) estén listas.
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* no-op */
  }

  const model = modelId ? MODEL_BY_ID[modelId] : null;
  const accent = model?.accent || "#5fbf7d";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fondo papel crema.
  ctx.fillStyle = "#f3e9d2";
  ctx.fillRect(0, 0, W, H);
  // Marco.
  ctx.strokeStyle = "rgba(44,36,25,0.18)";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Barra superior con el modelo.
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, PAD, W - PAD * 2, 8);

  let y = PAD + 70;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#2c2419";
  ctx.font = "700 44px 'Permanent Marker', sans-serif";
  ctx.fillText(`${model?.emoji || "🤖"} ${model?.name || "IA (un humano)"}`, PAD, y);

  ctx.fillStyle = "rgba(44,36,25,0.45)";
  ctx.font = "400 24px 'Space Mono', monospace";
  ctx.fillText("verificada*", PAD, y + 34);

  // Prompt (monospace, atenuado).
  y += 110;
  ctx.fillStyle = "rgba(44,36,25,0.55)";
  ctx.font = "400 30px 'Space Mono', monospace";
  const promptLines = wrap(ctx, "> " + prompt, W - PAD * 2).slice(0, 4);
  for (const l of promptLines) {
    ctx.fillText(l, PAD, y);
    y += 42;
  }

  // Respuesta (manuscrita, grande).
  y += 40;
  ctx.fillStyle = "#2c2419";
  ctx.font = "700 64px 'Caveat', cursive";
  const answerLines = wrap(ctx, answer, W - PAD * 2);
  const maxLines = Math.min(answerLines.length, 9);
  for (let i = 0; i < maxLines; i++) {
    let line = answerLines[i];
    if (i === maxLines - 1 && answerLines.length > maxLines) line += " …";
    ctx.fillText(line, PAD, y);
    y += 76;
  }

  // Pie con branding.
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, H - PAD - 64, W - PAD * 2, 4);
  ctx.fillStyle = "rgba(44,36,25,0.7)";
  ctx.font = "700 30px 'Permanent Marker', sans-serif";
  ctx.fillText("escrito por un humano 🤖", PAD, H - PAD - 16);
  ctx.fillStyle = accent;
  ctx.font = "400 28px 'Space Mono', monospace";
  const url = "tuiameaburre.com";
  const uw = ctx.measureText(url).width;
  ctx.fillText(url, W - PAD - uw, H - PAD - 16);

  return await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
}

// Comparte la tarjeta vía Web Share API; si no hay, la descarga.
// Devuelve "shared" | "download" | "cancel" | "error".
export async function shareCard(data: CardData): Promise<string> {
  let blob: Blob;
  try {
    blob = await renderCard(data);
  } catch {
    return "error";
  }
  const file = new File([blob], "tuiameaburre.png", { type: "image/png" });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: "Tu IA me aburre",
        text: "Esto lo respondió un humano fingiendo ser IA 🤖 tuiameaburre.com",
      });
      return "shared";
    } catch {
      return "cancel";
    }
  }
  // Fallback: descarga.
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = "tuiameaburre.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(u);
  return "download";
}
