# Tu IA Mala Onda 🤖🛏️

> Un juego donde los **humanos se hacen pasar por IA**.
> Inspirado en [_"Your AI Slop Bores Me"_](https://youraislopbores.me/).
> Sin redes neuronales: solo una persona, un cuadro de texto y **60 segundos**.

Es una sátira al _"AI slop"_: en vez de que una IA conteste tus prompts, lo hace
otra persona fingiendo ser una IA. Y tú puedes ponerte del otro lado.

**El look:** la habitación de quien programó esto a las 3am — lámpara cálida,
lucecitas, pósters torcidos, washi tape, un corcho con notas y un CRT que hace de
"IA". Hecho a mano, nada de glow neón genérico.

---

## Cómo se juega

| Modo | Qué haces | Créditos |
|------|-----------|----------|
| 💬 **Preguntar** | Escribes un prompt como el que le darías a ChatGPT. Un humano lo responde fingiendo ser IA. | Cuesta **1 crédito** |
| 🤖 **Responder como IA** | Te cae el prompt de un desconocido. Tienes **60 s** para contestar como una "IA". | Ganas **1–2 créditos** |

- Empiezas con **3 créditos**, tope **10**.
- Sin créditos → responde como IA para ganar más.
- Si se acaban los 60 s, el prompt vuelve a la cola.
- **El corcho**: muro en vivo con las respuestas reales de humanos-IA.
- **Bilingüe ES/EN** (botón arriba a la derecha).

> Hay prompts de práctica (semilla) para que puedas jugar aunque estés solo.

---

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Framer Motion.
- **Backend:** Node + Express + **Socket.IO** (tiempo real, estado en memoria).
- Fondo y UI ilustrados a mano en SVG/CSS (sin assets externos).

## Arrancar

Requisitos: **Node.js ≥ 18**.

```bash
npm install
```

### Desarrollo (con recarga en caliente)

```bash
npm run dev
```

Levanta el backend en **:5050** y Vite en **http://localhost:5173** (Vite
reenvía Socket.IO al backend). Abre la URL de Vite.

### Producción

```bash
npm run build      # genera /dist
npm start          # Node sirve /dist en http://localhost:5050
```

> El puerto por defecto del backend es **5050** (el 3000 suele estar ocupado).
> Cámbialo con `PORT=8080 npm start`.

### Jugar tú solo

Abre la app, pulsa **Preguntar** y envía un prompt; luego abre la misma URL en una
**ventana de incógnito** (otra "persona"), pulsa **Responder como IA** y contesta.
La respuesta aparece en el chat de la primera pestaña y en el corcho.

---

## Estructura

```
tuiamalaonda/
├── server.js            # Express + Socket.IO: matchmaking, cola, timers, créditos, muro, stats
├── seeds.js             # prompts de práctica + respuestas de ejemplo del corcho
├── index.html           # entrada de Vite
├── vite.config.ts       # proxy /socket.io → :5050
├── tailwind.config.js   # paleta cálida + fuentes (Caveat, Permanent Marker, Space Mono, Inter)
├── src/
│   ├── main.tsx         # raíz React (I18nProvider + GameProvider)
│   ├── App.tsx          # layout, escena, cambio de pantalla, confeti, toast
│   ├── game.tsx         # estado de juego + acciones de socket
│   ├── i18n.tsx         # traducciones ES/EN
│   ├── lib/socket.ts    # cliente Socket.IO
│   └── components/
│       ├── RoomScene.tsx   # cuarto de uni (lámpara, ventana, lucecitas, plantas…)
│       ├── Nav.tsx · Hero.tsx · ModeCards.tsx · StatsStrip.tsx
│       ├── Ask.tsx · Answer.tsx · Wall.tsx (corcho) · Home.tsx
│       ├── ScrambleText.tsx # texto que se "genera" como una IA
│       └── Confetti.tsx     # papelitos rasgados
└── legacy-vanilla/      # versión anterior en HTML/CSS/JS vanilla (referencia)
```

**Sin base de datos:** el estado vive en memoria; reiniciar el server reinicia el
juego. Los créditos persisten entre recargas vía `clientId` en `localStorage`.

### Eventos de socket

Cliente → servidor: `hello`, `ask`, `requestJob`, `submitAnswer`, `skipJob`,
`cancelAsk`, `getFeed`.
Servidor → cliente: `welcome`, `state`, `stats`, `feed:init`, `feed:new`,
`answerReceived`, `jobExpired`.

---

## Ideas para más adelante

- Lienzo de dibujo para responder con garabatos 🎨
- Persistencia en base de datos
- Reacciones (👍/😂) y compartir notas del corcho como imagen
- Sonido ambiente lo-fi opcional

---

_Inspirado en "Your AI Slop Bores Me". Hecho a mano, de madrugada. Cero IA fue usada o herida._
