(function () {
  "use strict";

  var CAPTIONS = {
    1: "背景にみかんと麻雀牌が、ゆっくり浮かんでゆらゆらします。",
    2: "ドットとしましまのポップな背景が、ゆっくり動きます。",
    3: "画面をスクロールすると、要素がぽよんと弾んで現れます。",
    4: "ボタンに触れたり押したりすると、すっとつぶれてからゆらゆらします。",
    5: "カウントダウンの数字が変わるとき、パタンとめくれます。",
    6: "この演出を開いたときと、エントリーボタンを押したときに、みかん色の紙吹雪がはじけます。"
  };

  var TOTAL = 6;
  var KICKOFF = "2027-04-09T21:00:00+09:00";
  var current = 1;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var poyonObserver = null;

  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-fx]"));
  var prevBtn = document.querySelector("[data-fx-prev]");
  var nextBtn = document.querySelector("[data-fx-next]");
  var caption = document.querySelector("[data-fx-caption]");
  var panel = document.getElementById("fx-panel");
  var replayBtn = document.querySelector("[data-fx-replay]");

  function parseHash() {
    var n = parseInt((location.hash || "").replace("#", ""), 10);
    return n >= 1 && n <= TOTAL ? n : 1;
  }

  function setEffect(n, updateHash) {
    n = Math.min(TOTAL, Math.max(1, n | 0));
    var changed = n !== current;
    current = n;
    document.body.setAttribute("data-effect", String(n));
    tabs.forEach(function (tab) {
      var on = Number(tab.getAttribute("data-fx")) === n;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    if (panel) panel.setAttribute("aria-labelledby", "tab-" + n);
    if (caption) caption.textContent = CAPTIONS[n];
    if (prevBtn) prevBtn.disabled = n === 1;
    if (nextBtn) nextBtn.disabled = n === TOTAL;
    if (updateHash && location.hash !== "#" + n) {
      history.replaceState(null, "", "#" + n);
    }
    resetPoyon(false);
    document.querySelectorAll(".flip-digit.is-flipping").forEach(function (el) {
      el.classList.remove("is-flipping");
      var rotor = el.querySelector(".flip-digit__rotor");
      if (rotor) { rotor.style.transition = "none"; rotor.style.transform = "none"; }
    });
    if (n === 3) startPoyon();
    if (n === 6) {
      if (changed || updateHash) burstConfetti();
    } else {
      stopConfetti();
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setEffect(Number(tab.getAttribute("data-fx")), true);
    });
  });
  if (prevBtn) {
    prevBtn.addEventListener("click", function () { setEffect(current - 1, true); });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () { setEffect(current + 1, true); });
  }
  window.addEventListener("hashchange", function () {
    setEffect(parseHash(), false);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      setEffect(current - 1, true);
    } else if (ev.key === "ArrowRight") {
      ev.preventDefault();
      setEffect(current + 1, true);
    }
  });

  // —— 3. ぽよん ——
  function poyonItems() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-poyon]"));
  }

  function clearPoyonObserver() {
    if (poyonObserver) {
      poyonObserver.disconnect();
      poyonObserver = null;
    }
  }

  function resetPoyon(replay) {
    clearPoyonObserver();
    poyonItems().forEach(function (el) {
      el.classList.remove("is-in");
    });
    if (replay && current === 3) startPoyon();
  }

  function startPoyon() {
    var items = poyonItems();
    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    poyonObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          poyonObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.28, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { poyonObserver.observe(el); });
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      var first = document.querySelector(".demo-hero [data-poyon]");
      resetPoyon(true);
      if (first && first.scrollIntoView) {
        first.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }
    });
  }

  // —— 4. ボタンのスクイッ ——
  function playSquish(el) {
    if (current !== 4 || reduceMotion || !el) return;
    el.classList.remove("is-squish");
    void el.offsetWidth;
    el.classList.add("is-squish");
  }

  document.querySelectorAll("[data-fx-entry], [data-fx-sample-btn]").forEach(function (btn) {
    btn.addEventListener("animationend", function () {
      btn.classList.remove("is-squish");
    });
    btn.addEventListener("pointerenter", function (ev) {
      if (ev.pointerType === "mouse") playSquish(btn);
    });
    btn.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse") playSquish(btn);
    });
  });

  // —— 5. カウントダウン（めくり） ——
  var digitStores = {};

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function makeDigit(initial) {
    var root = document.createElement("span");
    root.className = "flip-digit";
    root.innerHTML =
      '<span class="flip-digit__rotor">' +
        '<span class="flip-digit__face flip-digit__face--front"></span>' +
        '<span class="flip-digit__face flip-digit__face--back"></span>' +
      "</span>";
    var front = root.querySelector(".flip-digit__face--front");
    var back = root.querySelector(".flip-digit__face--back");
    front.textContent = initial;
    back.textContent = initial;
    root.dataset.value = initial;
    root.addEventListener("transitionend", function (ev) {
      if (ev.propertyName && ev.propertyName !== "transform") return;
      var pending = root.dataset.pending;
      front.textContent = root.dataset.value;
      back.textContent = root.dataset.value;
      root.classList.remove("is-flipping");
      root.querySelector(".flip-digit__rotor").style.transition = "none";
      root.querySelector(".flip-digit__rotor").style.transform = "none";
      void root.offsetWidth;
      if (pending && pending !== root.dataset.value) {
        window.requestAnimationFrame(function () {
          setDigit(root, pending);
        });
      }
      root.dataset.pending = "";
    });
    return root;
  }

  function ensureDigits(container, length, text) {
    var key = container.getAttribute("data-cd");
    if (!digitStores[key] || digitStores[key].length !== length) {
      container.textContent = "";
      digitStores[key] = [];
      for (var i = 0; i < length; i++) {
        var d = makeDigit(text.charAt(i) || "0");
        container.appendChild(d);
        digitStores[key].push(d);
      }
    }
    return digitStores[key];
  }

  function setDigit(root, value) {
    if (root.dataset.value === value && !root.classList.contains("is-flipping")) return;
    if (root.classList.contains("is-flipping")) {
      root.dataset.pending = value;
      return;
    }
    if (current !== 5 || reduceMotion) {
      root.dataset.value = value;
      root.querySelector(".flip-digit__face--front").textContent = value;
      root.querySelector(".flip-digit__face--back").textContent = value;
      root.classList.remove("is-flipping");
      return;
    }
    var back = root.querySelector(".flip-digit__face--back");
    back.textContent = value;
    root.dataset.value = value;
    var rotor = root.querySelector(".flip-digit__rotor");
    rotor.style.transition = "";
    rotor.style.transform = "";
    void root.offsetWidth;
    root.classList.add("is-flipping");
  }

  function renderPair(name, value) {
    var el = document.querySelector('[data-cd="' + name + '"]');
    if (!el) return;
    var text = pad2(value);
    var digits = ensureDigits(el, 2, text);
    setDigit(digits[0], text.charAt(0));
    setDigit(digits[1], text.charAt(1));
  }

  var live = document.querySelector("[data-cd-live]");
  var lastAnnounced = "";

  function tickCountdown() {
    var target = new Date(KICKOFF).getTime();
    var diff = Math.max(0, target - Date.now());
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    renderDays(days);
    renderPair("hours", hours);
    renderPair("mins", mins);
    renderPair("secs", secs);
    if (live) {
      var phrase = "開幕まであと" + days + "日" + hours + "時間" + mins + "分" + secs + "秒";
      if (phrase !== lastAnnounced && secs % 10 === 0) {
        lastAnnounced = phrase;
        live.textContent = phrase;
      }
    }
  }

  function renderDays(days) {
    var el = document.querySelector('[data-cd="days"]');
    if (!el) return;
    var width = days > 99 ? 3 : 2;
    var text = String(days).padStart(width, "0");
    var digits = ensureDigits(el, width, text);
    for (var i = 0; i < width; i++) setDigit(digits[i], text.charAt(i));
  }

  tickCountdown();
  setInterval(tickCountdown, 1000);

  // —— 6. 紙吹雪 ——
  var canvas = document.getElementById("confetti");
  var ctx = canvas ? canvas.getContext("2d") : null;
  var particles = [];
  var rafId = 0;

  function resizeCanvas() {
    if (!canvas || !panel) return;
    var rect = panel.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stopConfetti() {
    particles = [];
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function burstConfetti(originEl) {
    if (!ctx || !canvas || reduceMotion || current !== 6) return;
    resizeCanvas();
    var rect = panel.getBoundingClientRect();
    var origin = { x: rect.width / 2, y: rect.height * 0.28 };
    if (originEl && originEl.getBoundingClientRect) {
      var r = originEl.getBoundingClientRect();
      origin = {
        x: r.left + r.width / 2 - rect.left,
        y: r.top + r.height / 2 - rect.top
      };
    }
    var count = window.innerWidth < 640 ? 26 : 44;
    var colors = ["#FF7A1A", "#FFB84D", "#E55A00", "#FFF4E0", "#FF8A3D", "#3FA34D"];
    var shapes = ["circle", "circle", "rect", "rect", "leaf"];
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      var speed = 2.2 + Math.random() * 4.2;
      particles.push({
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 8,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        life: 1,
        decay: 0.008 + Math.random() * 0.01
      });
    }
    if (!rafId) rafId = requestAnimationFrame(tickConfetti);
  }

  function tickConfetti() {
    rafId = 0;
    if (!ctx || !canvas) return;
    var rect = panel.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    var next = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.vy += 0.09;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > rect.height + 20) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === "leaf") {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w * 0.35, p.h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
      next.push(p);
    }
    particles = next;
    if (particles.length) rafId = requestAnimationFrame(tickConfetti);
  }

  window.addEventListener("resize", function () {
    if (current === 6) resizeCanvas();
  });

  var entryBtn = document.querySelector("[data-fx-entry]");
  if (entryBtn) {
    entryBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (current === 6) burstConfetti(entryBtn);
    });
  }
  document.querySelectorAll("[data-fx-sample-btn]").forEach(function (btn) {
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (current === 6) burstConfetti(btn);
    });
  });

  setEffect(parseHash(), true);
})();
