<div align="center">

```
  ████████╗██╗   ██╗    ██╗ █████╗     ███╗   ███╗ █████╗ ██╗      █████╗      ██████╗ ███╗   ██╗██████╗  █████╗ 
  ╚══██╔══╝██║   ██║    ██║██╔══██╗    ████╗ ████║██╔══██╗██║     ██╔══██╗    ██╔═══██╗████╗  ██║██╔══██╗██╔══██╗
     ██║   ██║   ██║    ██║███████║    ██╔████╔██║███████║██║     ███████║    ██║   ██║██╔██╗ ██║██║  ██║███████║
     ██║   ██║   ██║    ██║██╔══██║    ██║╚██╔╝██║██╔══██║██║     ██╔══██║   ██║   ██║██║╚██╗██║██║  ██║██╔══██║
     ██║   ╚██████╔╝    ██║██║  ██║    ██║ ╚═╝ ██║██║  ██║███████╗██║  ██║   ╚██████╔╝██║ ╚████║██████╔╝██║  ██║
     ╚═╝    ╚═════╝     ╚═╝╚═╝  ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝
```

### 🤖 El juego donde los humanos fingen ser IA · y lo hacen fatal

[![Live](https://img.shields.io/badge/🌐_JUGAR_AHORA-tuiameaburre.com-black?style=for-the-badge)](https://tuiameaburre.com)
[![IA usada](https://img.shields.io/badge/IA_usada-0%25-red?style=for-the-badge&logo=openai&logoColor=white)](https://tuiameaburre.com)
[![Hecho a las](https://img.shields.io/badge/Hecho_a_las-3am-blueviolet?style=for-the-badge)](https://github.com/javierledesma28/tuiameaburre)
[![Node](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io)](https://socket.io)

</div>

---

## ¿Qué es esto?

**Tu IA me aburre** es un experimento social disfrazado de juego:

> 💬 Alguien escribe un prompt como si se lo diera a ChatGPT.  
> 🤖 Otra persona —un humano real, en este momento— tiene **60 segundos** para responder *fingiendo* ser una IA.  
> 😐 El resultado es, inevitablemente, una IA bastante mala onda.

Es el **test de Turing al revés**: en vez de adivinar si es IA, todos saben que es humano, y aun así siguen jugando. Hay algo inquietante en eso.

Inspirado en [_Your AI Slop Bores Me_](https://youraislopbores.me/). Construido como sátira al _AI slop_ que inunda internet.

---

## Cómo se juega

| Modo | Lo que pasa | Créditos |
|------|-------------|----------|
| 💬 **Preguntar** | Mandás un prompt. Algún desconocido lo recibe y tiene 60 s para responder como "IA". | **−1 crédito** |
| 🤖 **Responder como IA** | Te cae el prompt de alguien. Tenés que sonar convincentemente artificial. O no. Da igual. | **+1–2 créditos** |

- Empezás con **3 créditos**, tope **10**
- Sin créditos → respondé para ganar más
- Los 60 s vencen → el prompt vuelve a la cola
- **El corcho** 📌 → muro en vivo con todas las respuestas reales de humanos-IA

> Hay prompts de práctica (semilla) para que puedas jugar aunque estés solo a las 4am en tu cuarto.

---

## El vibe

No es otro SaaS con gradientes rosas y "powered by AI".

La estética es la habitación de quien programó esto de madrugada:

```
🪔  Lámpara cálida en la esquina
🪟  Ventana de noche con lucecitas
📌  Corcho con notas adhesivas
🖥️  Monitor CRT con fósforo verde
📝  Washi tape y garabatos en papel
```

El robot de la pantalla de inicio tiene una cabeza de monitor. Sigue tu cursor con los ojos.
Juzga en silencio.

---

## Stack técnico

```
Frontend  →  React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
Backend   →  Node.js + Express + Socket.IO (estado 100% en memoria)
Fuentes   →  Permanent Marker · Caveat · Space Mono (lo que se esperaría)
Deploy    →  Docker (multi-stage build) + Cloudflare Tunnel
Repo      →  Este que estás viendo
IA        →  Ninguna (el punto)
```

---

## Correr localmente

**Requisitos:** Node.js ≥ 18

```bash
git clone git@github.com:javierledesma28/tuiameaburre.git
cd tuiameaburre
npm install
npm run dev
```

Abre **http://localhost:5175** y el backend queda en :5050.  
Para jugar solo: abrí otra pestaña en incógnito y jugá los dos roles vos mismo. Sí, da un poco de pena. Pero funciona.

### Producción

```bash
npm run build   # compila React → /dist
npm start       # Express sirve /dist + Socket.IO en :5050
```

### Docker

```bash
docker compose up -d   # build multi-stage + cloudflared tunnel
```

El `docker-compose.yml` ya incluye el container de Cloudflare Tunnel.  
Configurá `CLOUDFLARE_TUNNEL_TOKEN` en `.env` (ver `.env.example`).

---

## Estructura del repo

```
tuiameaburre/
├── 🖥️  server.js              # matchmaking · cola · timers · créditos · muro · stats
├── 🌱  seeds.js               # prompts de práctica y respuestas de ejemplo
├── 🐳  Dockerfile             # multi-stage: builder (Vite) → prod (solo Express)
├── 🐳  docker-compose.yml     # app + cloudflared tunnel
├── src/
│   ├── App.tsx                # layout · transiciones · confeti · toast
│   ├── game.tsx               # estado global + socket actions
│   ├── i18n.tsx               # traducciones ES / EN
│   └── components/
│       ├── MonitorHead.tsx    # 🤖 el robot con cabeza de monitor (sigue tu cursor)
│       ├── RoomScene.tsx      # 🪔 el cuarto de madrugada (SVG/CSS, sin assets)
│       ├── Hero.tsx           # landing principal
│       ├── Ask.tsx            # pantalla de preguntar
│       ├── Answer.tsx         # pantalla de responder (con timer)
│       ├── WallBoard.tsx      # 📌 corcho con notas
│       └── ScrambleText.tsx   # texto que "se genera" como una IA
└── legacy-vanilla/            # 🗿 versión anterior en HTML/CSS/JS puro (congelada)
```

---

## FAQ honesto

**¿Por qué?**  
Porque el 95% de lo que la gente llama "IA" podría reemplazarse por una persona con suficiente cafeína y poco amor propio.

**¿Los créditos persisten si recargo la página?**  
Sí, vía `clientId` en `localStorage`. No hay base de datos. Si el server se reinicia, todos volvemos a cero y nadie habla de eso.

**¿Puedo hacer trampa y responder como humano en vez de como IA?**  
Eso es exactamente lo que hace todo el mundo. Ese es el juego.

**¿Hay una API?**  
Socket.IO. Los eventos están documentados en `server.js`. No hay REST porque vivimos en el presente.

**¿Cuándo sale la versión con base de datos?**  
Cuando deje de ser "más adelante".

---

## Ideas para el futuro que quizás nunca pasen

- 🎨 Lienzo para responder con garabatos (respuesta visual como IA)
- 🏆 Ranking de "mejor humano-IA" de la semana
- 😂 Reacciones en el corcho (👍 / 🤖 / 😐)
- 🔊 Sonido lo-fi ambient opcional
- 💾 Persistencia en base de datos (algún día)

---

<div align="center">

**[tuiameaburre.com](https://tuiameaburre.com)** · hecho a mano · de madrugada

*Cero IA fue usada o herida en la producción de este juego.*  
*Los humanos que respondieron como IA sí sufrieron un poco.*

</div>
