/* Tu IA Mala Onda — lógica del cliente / client logic */
(function () {
  "use strict";

  const socket = io();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const RING_C = 326.7; // circunferencia del anillo (r=52) / ring circumference

  // ---- Estado / state ----
  let lang = localStorage.getItem("lang") || (navigator.language || "es").slice(0, 2);
  if (lang !== "en") lang = "es";
  let serverState = { askCost: 1, answerSeconds: 60, credits: 0 };
  let pendingPromptId = null;
  let currentJobId = null;
  let timerInterval = null;
  let typerTimer = null;
  let revealTimer = null;
  let feed = [];

  const t = (key) => (window.I18N[lang] && window.I18N[lang][key]) || key;

  // ============================ i18n ============================
  function applyI18n() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.getAttribute("data-i18n"))));
    $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.getAttribute("data-i18n-ph"))));
    $$("[data-i18n-title]").forEach((el) => (el.title = t(el.getAttribute("data-i18n-title"))));
    $(".lang-on").textContent = lang.toUpperCase();
    $(".lang-off").textContent = lang === "es" ? "EN" : "ES";
    $("#askCostNote").textContent = t("askCostNote")(serverState.askCost);
    updateCounter($("#askInput"), $("#askCounter"));
    updateCounter($("#answerInput"), $("#answerCounter"));
    startTyper();
  }

  // ============================ helpers ============================
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + id).classList.add("active");
    $$(".nav-link").forEach((n) =>
      n.classList.toggle("active", n.getAttribute("data-nav") === id)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function animateNumber(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) {
      el.textContent = to;
      return;
    }
    const steps = 14;
    let i = 0;
    const inc = (to - from) / steps;
    clearInterval(el._anim);
    el._anim = setInterval(() => {
      i++;
      el.textContent = Math.round(from + inc * i);
      if (i >= steps) {
        el.textContent = to;
        clearInterval(el._anim);
      }
    }, 28);
  }

  function updateCounter(input, counter) {
    if (!input || !counter) return;
    counter.textContent = t("counter")(input.value.length, input.maxLength);
  }

  // ============================ state / stats ============================
  socket.on("connect", () => {
    socket.emit("hello", { clientId: localStorage.getItem("clientId") });
    socket.emit("getFeed");
  });
  socket.on("welcome", ({ clientId }) => localStorage.setItem("clientId", clientId));

  socket.on("state", (state) => {
    serverState = { ...serverState, ...state };
    const el = $("#creditCount");
    const prev = parseInt(el.textContent, 10);
    animateNumber(el, state.credits);
    if (!isNaN(prev) && state.credits > prev) {
      const pill = $(".credits");
      pill.classList.remove("bump");
      void pill.offsetWidth;
      pill.classList.add("bump");
    }
    $("#askCostNote").textContent = t("askCostNote")(serverState.askCost);
  });

  socket.on("stats", (s) => {
    animateNumber($("#statOnline"), s.online);
    animateNumber($("#statAnswered"), s.totalAnswered);
    animateNumber($("#statPending"), s.pending);
  });

  // ============================ muro / wall ============================
  function makeCard(item) {
    const card = document.createElement("div");
    card.className = "wall-card";
    const q = document.createElement("div");
    q.className = "wall-q";
    q.innerHTML = `<span class="q-mark">&gt;</span>`;
    q.appendChild(document.createTextNode(item.prompt));
    const a = document.createElement("div");
    a.className = "wall-a";
    a.innerHTML = `<span class="a-mark">✦</span>`;
    a.appendChild(document.createTextNode(item.answer));
    card.append(q, a);
    return card;
  }

  function renderWall() {
    const preview = $("#wallPreview");
    const full = $("#wallFull");
    preview.innerHTML = "";
    full.innerHTML = "";
    if (!feed.length) {
      preview.innerHTML = full.innerHTML = `<p class="wall-empty">…</p>`;
      return;
    }
    feed.slice(0, 6).forEach((it) => preview.appendChild(makeCard(it)));
    feed.forEach((it) => full.appendChild(makeCard(it)));
  }

  socket.on("feed:init", (list) => {
    feed = Array.isArray(list) ? list.slice(0, 40) : [];
    renderWall();
  });
  socket.on("feed:new", (item) => {
    feed.unshift(item);
    feed = feed.slice(0, 40);
    // Prepend animado sin re-renderizar todo / animated prepend.
    const preview = $("#wallPreview");
    const full = $("#wallFull");
    if (preview.querySelector(".wall-empty")) preview.innerHTML = "";
    if (full.querySelector(".wall-empty")) full.innerHTML = "";
    preview.prepend(makeCard(item));
    full.prepend(makeCard(item));
    while (preview.children.length > 6) preview.lastChild.remove();
    while (full.children.length > 40) full.lastChild.remove();
  });

  // ============================ navegación ============================
  $("#brandHome").addEventListener("click", goHome);
  $$("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => {
      const dest = b.getAttribute("data-nav");
      if (dest === "home") goHome();
      else showScreen(dest);
    })
  );
  $$("[data-back]").forEach((b) => b.addEventListener("click", goHome));
  $("#goAsk").addEventListener("click", openAsk);
  $("#ctaAsk").addEventListener("click", openAsk);
  $("#goAnswer").addEventListener("click", openAnswer);
  $("#ctaAnswer").addEventListener("click", openAnswer);

  function goHome() {
    if (currentJobId) {
      socket.emit("skipJob", { jobId: currentJobId });
      currentJobId = null;
      stopTimer();
    }
    if (pendingPromptId) {
      socket.emit("cancelAsk", { promptId: pendingPromptId });
      pendingPromptId = null;
    }
    showScreen("home");
  }

  // ============================ Preguntar / Ask ============================
  function openAsk() {
    $("#askCompose").classList.remove("hidden");
    $("#askWaiting").classList.add("hidden");
    $("#askResult").classList.add("hidden");
    $("#askInput").value = "";
    updateCounter($("#askInput"), $("#askCounter"));
    showScreen("ask");
    $("#askInput").focus();
  }

  $("#askInput").addEventListener("input", () =>
    updateCounter($("#askInput"), $("#askCounter"))
  );
  $("#askSend").addEventListener("click", submitAsk);
  $("#askInput").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitAsk();
  });

  function submitAsk() {
    const text = $("#askInput").value.trim();
    if (!text) return toast(t("emptyPrompt"));
    if (serverState.credits < serverState.askCost) return toast(t("noCredits"));

    socket.emit("ask", { text }, (res) => {
      if (!res || !res.ok) {
        if (res && res.error === "no_credits") return toast(t("noCredits"));
        return toast(t("emptyPrompt"));
      }
      pendingPromptId = res.promptId;
      $("#askWaitingPrompt").textContent = "“" + text + "”";
      $("#askCompose").classList.add("hidden");
      $("#askResult").classList.add("hidden");
      $("#askWaiting").classList.remove("hidden");
    });
  }

  $("#askCancel").addEventListener("click", () => {
    if (pendingPromptId) socket.emit("cancelAsk", { promptId: pendingPromptId });
    pendingPromptId = null;
    openAsk();
  });
  $("#askAgain").addEventListener("click", openAsk);
  $("#askCopy").addEventListener("click", () => {
    const txt = $("#askEchoPrompt").textContent + "\n\n" + $("#askAnswer").textContent;
    navigator.clipboard?.writeText(txt).then(() => toast(t("copied")));
  });

  socket.on("answerReceived", ({ promptId, prompt, answer }) => {
    if (promptId !== pendingPromptId) return;
    pendingPromptId = null;
    $("#askEchoPrompt").textContent = prompt;
    $("#askWaiting").classList.add("hidden");
    $("#askResult").classList.remove("hidden");
    // Simula que la "IA" escribe antes de revelar / fake AI typing before reveal.
    const typing = $("#askTyping");
    const out = $("#askAnswer");
    typing.classList.remove("hidden");
    out.classList.add("hidden");
    out.textContent = answer;
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => {
      typing.classList.add("hidden");
      out.classList.remove("hidden");
    }, Math.min(1600, 500 + answer.length * 12));
  });

  // ============================ Responder / Answer ============================
  function openAnswer() {
    showScreen("answer");
    requestJob();
  }

  function showAnswerNone() {
    $("#answerJob").classList.add("hidden");
    $("#answerDone").classList.add("hidden");
    $("#answerNone").classList.remove("hidden");
  }

  function requestJob() {
    $("#answerNone").classList.add("hidden");
    $("#answerDone").classList.add("hidden");
    $("#answerJob").classList.add("hidden");

    socket.emit("requestJob", {}, (res) => {
      if (!res || !res.ok) return showAnswerNone();
      currentJobId = res.jobId;
      $("#jobPrompt").textContent = res.prompt;
      $("#answerInput").value = "";
      updateCounter($("#answerInput"), $("#answerCounter"));
      $("#answerJob").classList.remove("hidden");
      $("#answerInput").focus();
      startTimer(res.deadline, res.seconds);
    });
  }

  $("#answerInput").addEventListener("input", () =>
    updateCounter($("#answerInput"), $("#answerCounter"))
  );
  $("#answerRetry").addEventListener("click", requestJob);
  $("#answerNext").addEventListener("click", requestJob);
  $("#answerSkip").addEventListener("click", () => {
    if (currentJobId) socket.emit("skipJob", { jobId: currentJobId });
    currentJobId = null;
    stopTimer();
    requestJob();
  });
  $("#answerSend").addEventListener("click", submitAnswer);
  $("#answerInput").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitAnswer();
  });

  function submitAnswer() {
    if (!currentJobId) return;
    const answer = $("#answerInput").value.trim();
    if (!answer) return toast(t("emptyAnswer"));
    const jobId = currentJobId;

    socket.emit("submitAnswer", { jobId, answer }, (res) => {
      if (!res || !res.ok) {
        if (res && res.error === "expired") {
          stopTimer();
          currentJobId = null;
          toast(t("expired"));
          return showAnswerNone();
        }
        return toast(t("emptyAnswer"));
      }
      stopTimer();
      currentJobId = null;
      const fn = res.seed ? t("rewardSeed") : t("rewardMsg");
      $("#rewardText").innerHTML = fn(res.reward, res.credits);
      $("#answerJob").classList.add("hidden");
      $("#answerDone").classList.remove("hidden");
      confettiBurst();
    });
  }

  socket.on("jobExpired", ({ jobId }) => {
    if (jobId !== currentJobId) return;
    stopTimer();
    currentJobId = null;
    toast(t("expired"));
    $("#answerJob").classList.add("hidden");
    showAnswerNone();
  });

  // ============================ timer circular ============================
  function startTimer(deadline, totalSeconds) {
    stopTimer();
    const total = (totalSeconds || serverState.answerSeconds) * 1000;
    const ring = $(".ring-timer");
    const fg = $("#ringFg");
    const text = $("#timerText");

    const tick = () => {
      const remaining = Math.max(0, deadline - Date.now());
      const frac = remaining / total;
      fg.style.strokeDashoffset = (RING_C * (1 - frac)).toFixed(1);
      const secs = Math.ceil(remaining / 1000);
      text.textContent = secs;
      ring.classList.toggle("warn", secs <= 20 && secs > 10);
      ring.classList.toggle("danger", secs <= 10);
      if (remaining <= 0) stopTimer();
    };
    tick();
    timerInterval = setInterval(tick, 200);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  // ============================ hero typer ============================
  function startTyper() {
    clearTimeout(typerTimer);
    const el = $("#typer");
    if (!el) return;
    const phrases = t("typer");
    let p = 0,
      i = 0,
      deleting = false;
    const step = () => {
      const word = phrases[p % phrases.length];
      el.textContent = word.slice(0, i);
      if (!deleting && i < word.length) {
        i++;
        typerTimer = setTimeout(step, 55);
      } else if (!deleting && i === word.length) {
        deleting = true;
        typerTimer = setTimeout(step, 1500);
      } else if (deleting && i > 0) {
        i--;
        typerTimer = setTimeout(step, 28);
      } else {
        deleting = false;
        p++;
        typerTimer = setTimeout(step, 350);
      }
    };
    step();
  }

  // ============================ confeti ============================
  const cv = $("#confetti");
  const ctx = cv.getContext("2d");
  let parts = [];
  let raf = null;
  function sizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = window.innerWidth * dpr;
    cv.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();

  const COLORS = ["#8b5cf6", "#22d3ee", "#34d399", "#f472b6", "#fbbf24"];
  function confettiBurst() {
    const W = window.innerWidth;
    const cx = W / 2;
    const cy = window.innerHeight * 0.35;
    for (let i = 0; i < 110; i++) {
      const ang = (Math.PI * 2 * i) / 110 + (i % 3) * 0.2;
      const speed = 5 + (i % 7);
      parts.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 4,
        size: 5 + (i % 4) * 1.5,
        color: COLORS[i % COLORS.length],
        rot: i,
        vr: (i % 5) - 2,
        life: 1,
      });
    }
    if (!raf) raf = requestAnimationFrame(drawConfetti);
  }
  function drawConfetti() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.vy += 0.22; // gravedad
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 40);
    if (parts.length) {
      raf = requestAnimationFrame(drawConfetti);
    } else {
      ctx.clearRect(0, 0, cv.width, cv.height);
      raf = null;
    }
  }

  // ============================ idioma ============================
  $("#langToggle").addEventListener("click", () => {
    lang = lang === "es" ? "en" : "es";
    localStorage.setItem("lang", lang);
    applyI18n();
  });

  applyI18n();
})();
