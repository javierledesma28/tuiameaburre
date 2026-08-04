// Unit tests de db.js (sin servidor): import dinámico con una DB temporal.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuia-unit-"));
process.env.DB_PATH = path.join(dir, "tuia.db");

const db = await import("../db.js");
const mod = await import("../moderation.js");

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("✅", m)) : (fail++, console.log("❌", m)));

try {
  // 1) Usuarios y créditos
  ok(db.getUser("u1", 3).credits === 3, "getUser crea con créditos iniciales");
  ok(db.getUser("u1", 3).credits === 3, "getUser devuelve la misma fila");
  db.setCredits("u1", 7);
  ok(db.getUser("u1", 3).credits === 7, "setCredits persiste");

  // 2) Coronas con clamp en 0
  db.addCoronas("u1", -5, -5);
  const u1 = db.getUser("u1", 3);
  ok(u1.coronasHuman === 0 && u1.coronasAi === 0, "addCoronas nunca baja de 0");

  // 3) Reacciones + coronas del autor + toggle + self-vote
  db.upsertProfile("author1", { nick: "campeon_x", nickKey: mod.nickKey("campeon_x") }, 3);
  db.pushAnswer({ id: "ans1", prompt: "p", answer: "a", authorClientId: "author1", ts: Date.now() });
  const r = db.react("ans1", "voter1", "up");
  ok(r && r.my === "up", "react registra el voto");
  ok(db.getUser("author1", 3).coronasHuman === 1, "voto 'up' → +1 corona humana al autor");
  db.react("ans1", "voter1", "up"); // toggle off
  ok(db.getUser("author1", 3).coronasHuman === 0, "re-votar el mismo tipo quita la corona (toggle)");
  const self = db.react("ans1", "author1", "up");
  ok(self && self.selfVote === true, "no se puede votar la propia respuesta");
  ok(db.getUser("author1", 3).coronasHuman === 0, "self-vote no suma coronas");

  // 4) topPlayers agrega desde reactions y excluye bots
  db.react("ans1", "v1", "up");
  db.react("ans1", "v2", "up");
  db.ensureBot("bot:z", "botnick", 3);
  db.pushAnswer({ id: "ansb", prompt: "p", answer: "a", authorClientId: "bot:z", ts: Date.now() });
  db.react("ansb", "v1", "up");
  db.react("ansb", "v2", "up");
  db.react("ansb", "v3", "up"); // el bot tendría 3, más que author1 (2)
  const rows = db.topPlayers({ category: "human", period: "all", limit: 10 });
  ok(rows.some((x) => x.clientId === "author1"), "topPlayers incluye al autor humano");
  ok(!rows.some((x) => x.clientId === "bot:z"), "topPlayers EXCLUYE a los bots");

  // 5) Helpers de identidad
  ok(db.userExists("author1") === true, "userExists true para fila existente");
  ok(db.userExists("nope") === false, "userExists false para desconocido");
  const key = mod.nickKey("campeon_x");
  ok(db.isNickKeyTaken(key, "otro") === true, "isNickKeyTaken detecta colisión de otro");
  ok(db.isNickKeyTaken(key, "author1") === false, "isNickKeyTaken no choca consigo mismo");

  // 6) Reportes + ocultado
  db.pushAnswer({ id: "ansr", prompt: "p", answer: "a", authorClientId: "author1", ts: Date.now() });
  ok(db.addReport("ansr", "r1") === 1, "addReport cuenta 1");
  ok(db.addReport("ansr", "r1") === 1, "addReport idempotente por persona");
  ok(db.addReport("ansr", "r2") === 2, "addReport de otra persona cuenta 2");
  db.hideAnswer("ansr");
  ok(!db.recentAnswers(50).some((a) => a.id === "ansr"), "recentAnswers excluye la oculta");

  // 7) Backup online
  const bkDir = path.join(dir, "bk");
  const f = await db.backupTo(bkDir);
  ok(fs.existsSync(f), "backupTo crea el archivo de backup");
} catch (e) {
  fail++; console.log("❌ excepción:", e);
} finally {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  console.log(`\n${pass}/${pass + fail} OK`);
  process.exit(fail ? 1 : 0);
}
