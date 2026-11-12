(function () {
  "use strict";

  var burger = document.querySelector(".hdr__burger");
  var drawer = document.getElementById("drawer");
  var navLinks = document.querySelectorAll(".hdr__nav a, .drawer a");

  function setDrawer(open) {
    if (!burger || !drawer) return;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    if (open) {
      drawer.removeAttribute("hidden");
    } else {
      drawer.setAttribute("hidden", "");
    }
  }

  if (burger && drawer) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      setDrawer(open);
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      setDrawer(false);
    });
  });

  var sections = ["top", "about", "entry", "format", "rules", "teams", "results"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function updateActiveNav() {
    var y = window.scrollY + 100;
    var current = "top";
    sections.forEach(function (sec) {
      if (sec.offsetTop <= y) current = sec.id;
    });
    document.querySelectorAll(".hdr__nav a").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      a.classList.toggle("is-active", href === "#" + current);
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();

  // エントリーフォームURLは js/config.js の ENTRY_FORM_URL だけを差し替える
  function applyEntryFormUrl() {
    var cfg = window.SANMA_ORANGE_CUP || {};
    var url = (cfg.ENTRY_FORM_URL || "#").trim() || "#";
    var pending = !url || url === "#";
    document.querySelectorAll("[data-entry-form]").forEach(function (el) {
      el.setAttribute("href", pending ? "#entry" : url);
      if (pending) {
        el.classList.add("is-pending");
        el.setAttribute("aria-disabled", "true");
        el.removeAttribute("target");
        el.removeAttribute("rel");
        if (el.hasAttribute("data-entry-label")) {
          el.textContent = "エントリーフォーム（準備中）";
        }
      } else {
        el.classList.remove("is-pending");
        el.removeAttribute("aria-disabled");
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        if (el.hasAttribute("data-entry-label")) {
          el.textContent = "エントリーフォームはこちら";
        }
      }
    });
  }
  applyEntryFormUrl();

  // Countdowns: kickoff (開幕) + next-match
  var EVENT_PAUSED = false;
  var EVENT_END_ISO = "2027-04-11T23:59:59+09:00";
  var MATCH_DAYS = [
    { ymd: "2027-04-09", startIso: "2027-04-09T21:00:00+09:00", sub: "2027年4月9日（金）21:00 開始予定（仮・Asia/Tokyo）" },
    { ymd: "2027-04-10", startIso: "2027-04-10T21:00:00+09:00", sub: "2027年4月10日（土）21:00 開始予定（仮・Asia/Tokyo）" },
    { ymd: "2027-04-11", startIso: "2027-04-11T21:00:00+09:00", sub: "2027年4月11日（日）21:00 開始予定（仮・Asia/Tokyo）" }
  ];

  var countdownRoots = Array.prototype.slice.call(
    document.querySelectorAll("[data-countdown]")
  );

  if (countdownRoots.length) {
    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function tokyoYmd(ms) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(ms));
    }

    function findMatchByYmd(ymd) {
      for (var i = 0; i < MATCH_DAYS.length; i++) {
        if (MATCH_DAYS[i].ymd === ymd) return MATCH_DAYS[i];
      }
      return null;
    }

    function showStatus(root, text) {
      var grid = root.querySelector("[data-cd-grid]");
      var done = root.querySelector("[data-cd-done]");
      var label = root.querySelector(".cd__label");
      var sub = root.querySelector(".cd__sub");
      if (grid) grid.hidden = true;
      if (label) label.hidden = true;
      if (sub) sub.hidden = true;
      if (done) {
        done.hidden = false;
        done.textContent = text;
      }
      root.classList.add("is-live");
    }

    function showCountdown(root) {
      var grid = root.querySelector("[data-cd-grid]");
      var done = root.querySelector("[data-cd-done]");
      var label = root.querySelector(".cd__label");
      var sub = root.querySelector(".cd__sub");
      if (grid) grid.hidden = false;
      if (label) label.hidden = false;
      if (sub) sub.hidden = false;
      if (done) done.hidden = true;
      root.classList.remove("is-live");
    }

    function applyTick(root, diff) {
      var daysEl = root.querySelector('[data-cd="days"]');
      var hoursEl = root.querySelector('[data-cd="hours"]');
      var minsEl = root.querySelector('[data-cd="mins"]');
      var secsEl = root.querySelector('[data-cd="secs"]');
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      var secs = Math.floor((diff % 60000) / 1000);
      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);
    }

    function tickKickoff(root, now) {
      var targetIso = root.getAttribute("data-target") || "2027-04-09T21:00:00+09:00";
      var target = new Date(targetIso).getTime();
      var end = new Date(EVENT_END_ISO).getTime();
      if (now >= end) {
        showStatus(root, "大会終了");
        return true;
      }
      var diff = target - now;
      if (diff <= 0) {
        showStatus(root, "大会期間中");
        return false;
      }
      showCountdown(root);
      applyTick(root, diff);
      return false;
    }

    function resolveNextMatch(now) {
      var today = tokyoYmd(now);
      var todayMatch = findMatchByYmd(today);
      if (todayMatch) {
        var start = new Date(todayMatch.startIso).getTime();
        if (now >= start) {
          return { kind: "live", text: "対局中" };
        }
        return {
          kind: "countdown",
          target: start,
          sub: todayMatch.sub
        };
      }

      var next = null;
      for (var i = 0; i < MATCH_DAYS.length; i++) {
        if (MATCH_DAYS[i].ymd > today) {
          next = MATCH_DAYS[i];
          break;
        }
      }

      if (!next) {
        return { kind: "finished", text: "大会終了" };
      }

      return {
        kind: "countdown",
        target: new Date(next.startIso).getTime(),
        sub: next.sub
      };
    }

    function tickNextMatch(root, now) {
      var state = resolveNextMatch(now);
      if (state.kind === "live" || state.kind === "finished") {
        showStatus(root, state.text);
        return state.kind === "finished";
      }

      var sub = root.querySelector("[data-cd-sub]") || root.querySelector(".cd__sub");
      if (sub) sub.textContent = state.sub;
      var diff = state.target - now;
      if (diff <= 0) {
        showStatus(root, "対局中");
        return false;
      }
      showCountdown(root);
      applyTick(root, diff);
      return false;
    }

    function tickAll() {
      if (EVENT_PAUSED) {
        countdownRoots.forEach(function (root) { showStatus(root, "一時休止中"); });
        return true;
      }
      var now = Date.now();
      var allDone = true;
      countdownRoots.forEach(function (root) {
        var mode = root.getAttribute("data-countdown") || "kickoff";
        var done = mode === "next-match" ? tickNextMatch(root, now) : tickKickoff(root, now);
        if (!done) allDone = false;
      });
      return allDone;
    }

    tickAll();
    setInterval(tickAll, 1000);
  }

  // —— Results: load data/results.json and render ——
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatScore(score) {
    if (score == null || score === "") return "—";
    var n = Number(score);
    if (Number.isNaN(n)) return escapeHtml(score);
    var sign = n > 0 ? "+" : "";
    return sign + n.toLocaleString("ja-JP");
  }

  function showEmpty(container) {
    if (!container) return;
    var empty = container.querySelector("[data-empty-state]");
    var filled = container.querySelector("[data-filled-state]");
    if (empty) empty.hidden = false;
    if (filled) filled.hidden = true;
  }

  function showFilled(container) {
    if (!container) return;
    var empty = container.querySelector("[data-empty-state]");
    var filled = container.querySelector("[data-filled-state]");
    if (empty) empty.hidden = true;
    if (filled) filled.hidden = false;
  }

  var TEAM_IDS = {};
  function teamLabel(name, id) {
    id = id || TEAM_IDS[name];
    var img = id ? '<img class="team-logo" src="images/teams/team-' + escapeHtml(id) + '.png" alt="" width="32" height="32" loading="lazy">' : "";
    return '<span class="team-label">' + img + "<span>" + escapeHtml(name) + "</span></span>";
  }

  function renderTeamRanking(data) {
    var container = document.querySelector('[data-results="teamRanking"]');
    if (!container) return;
    var rows = (data && data.teamRanking) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.score != null; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var tbody = container.querySelector('[data-results-body="teamRanking"]');
    if (!tbody) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });
    tbody.innerHTML = sorted.map(function (row) {
      var rankClass = "rank" + (row.rank === 1 ? " rank--1" : "");
      return (
        "<tr>" +
        '<td class="' + rankClass + '">' + escapeHtml(row.rank) + "</td>" +
        '<td class="name-cell">' + teamLabel(row.name, row.teamId) + "</td>" +
        '<td class="score">' + formatScore(row.score) + "</td>" +
        '<td class="games">' + escapeHtml(row.games != null ? row.games : "—") + "</td>" +
        "</tr>"
      );
    }).join("");
    showFilled(container);
  }

  function renderPlayerScores(data) {
    var container = document.querySelector('[data-results="playerScores"]');
    if (!container) return;
    var rows = (data && data.playerScores) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.name; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var tbody = container.querySelector('[data-results-body="playerScores"]');
    if (!tbody) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    });
    tbody.innerHTML = sorted.map(function (row) {
      var rankClass = "rank" + (row.rank === 1 ? " rank--1" : "");
      return (
        "<tr>" +
        '<td class="' + rankClass + '">' + escapeHtml(row.rank) + "</td>" +
        '<td class="name-cell">' + escapeHtml(row.name) + "</td>" +
        '<td class="team-cell">' + teamLabel(row.team, row.teamId) + "</td>" +
        '<td class="score">' + formatScore(row.score) + "</td>" +
        '<td class="games">' + escapeHtml(row.games != null ? row.games : "—") + "</td>" +
        "</tr>"
      );
    }).join("");
    showFilled(container);
  }

  function renderTopScores(data) {
    var container = document.querySelector('[data-results="topScores"]');
    if (!container) return;
    var rows = (data && data.topScores) || [];
    var ready = data && data.updatedAt && rows.length &&
      rows.some(function (r) { return r.name; });
    if (!ready) {
      showEmpty(container);
      return;
    }
    var list = container.querySelector('[data-results-body="topScores"]');
    if (!list) return;
    var sorted = rows.slice().sort(function (a, b) {
      return (a.rank || 99) - (b.rank || 99);
    }).slice(0, 3);
    list.innerHTML = sorted.map(function (row) {
      var metaParts = [];
      if (row.date) metaParts.push(escapeHtml(row.date));
      if (row.note) metaParts.push(escapeHtml(row.note));
      var meta = metaParts.length
        ? '<p class="top-score-card__meta">' + metaParts.join(" ／ ") + "</p>"
        : "";
      return (
        '<li class="top-score-card top-score-card--' + escapeHtml(row.rank) + '">' +
        '<span class="top-score-card__rank">TOP ' + escapeHtml(row.rank) + "</span>" +
        '<p class="top-score-card__score">' + formatScore(row.score) + "</p>" +
        '<p class="top-score-card__name">' + escapeHtml(row.name) + "</p>" +
        '<p class="top-score-card__team">' + teamLabel(row.team, row.teamId) + "</p>" +
        meta +
        "</li>"
      );
    }).join("");
    showFilled(container);
  }

  function renderSample(data) {
    var on = !!(data && data.sample);
    document.querySelectorAll("[data-sample-banner]").forEach(function (el) { el.hidden = !on; });
  }

  function applyResults(data) {
    renderSample(data);
    if (!data || data.updatedAt == null) {
      showEmpty(document.querySelector('[data-results="teamRanking"]'));
      showEmpty(document.querySelector('[data-results="playerScores"]'));
      showEmpty(document.querySelector('[data-results="topScores"]'));
      return;
    }
    renderTeamRanking(data);
    renderPlayerScores(data);
    renderTopScores(data);
  }

  function loadResults() {
    fetch("data/results.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("results.json " + res.status);
        return res.json();
      })
      .then(applyResults)
      .catch(function () {
        showEmpty(document.querySelector('[data-results="teamRanking"]'));
        showEmpty(document.querySelector('[data-results="playerScores"]'));
        showEmpty(document.querySelector('[data-results="topScores"]'));
      });
  }

  loadResults();
})();
