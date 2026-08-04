// Guard anti-XSS: falla si aparecen patrones peligrosos en el frontend.
// React escapa el contenido por defecto; esto evita que alguien reintroduzca
// dangerouslySetInnerHTML / innerHTML= / eval y abra un agujero de XSS almacenado
// (el muro muestra texto de usuarios).
import fs from "node:fs";
import path from "node:path";

const ROOT = "src";
const PATTERNS = [
  { re: /dangerouslySetInnerHTML/, name: "dangerouslySetInnerHTML" },
  { re: /\.innerHTML\s*=/, name: "innerHTML=" },
  { re: /\bouterHTML\s*=/, name: "outerHTML=" },
  { re: /\beval\s*\(/, name: "eval(" },
  { re: /new\s+Function\s*\(/, name: "new Function(" },
  { re: /document\.write\s*\(/, name: "document.write(" },
];

const hits = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      lines.forEach((ln, i) => {
        for (const pat of PATTERNS) if (pat.re.test(ln)) hits.push({ file: p, line: i + 1, name: pat.name, text: ln.trim() });
      });
    }
  }
}

walk(ROOT);
if (hits.length) {
  console.log("❌ Patrones peligrosos encontrados en el frontend:");
  for (const h of hits) console.log(`   ${h.file}:${h.line} → ${h.name}  |  ${h.text}`);
  console.log(`\n0/1 OK`);
  process.exit(1);
}
console.log("✅ frontend sin patrones de XSS (dangerouslySetInnerHTML/innerHTML/eval/…)");
console.log("\n1/1 OK");
process.exit(0);
