/* Ge Zhang — site interactions. Dependency-free. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    var d = new Date();
    yearEl.textContent = String(d.getFullYear());
  }

  /* ---- Theme toggle (light / dark / follow OS) ----
     The saved choice is applied inline in <head> to avoid a flash; this
     only wires the button and keeps <meta name="theme-color"> in sync. */
  var root = document.documentElement;
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return systemDark.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch (e) {}
  }

  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ---- Nav: scrolled state + scroll progress ---- */
  var nav = document.getElementById("nav");
  var progress = document.getElementById("scrollProgress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("scrolled", y > 24);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- Mobile menu ---- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");

  function closeMenu() {
    if (!links) return;
    links.classList.remove("open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---- Reveal on scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  var io = null;
  if ("IntersectionObserver" in window && !reduceMotion) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          // stagger siblings a touch
          el.style.transitionDelay = Math.min(i * 60, 180) + "ms";
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Elements injected later (e.g. note cards) opt in through this. */
  window.SiteReveal = function (els) {
    Array.prototype.forEach.call(els, function (el) {
      if (io) io.observe(el); else el.classList.add("in");
    });
  };

  /* ---- Scroll-spy: active nav link ---- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navMap = {};
  document.querySelectorAll(".nav__links a").forEach(function (a) {
    var id = a.getAttribute("href");
    if (id && id.charAt(0) === "#") navMap[id.slice(1)] = a;
  });
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          Object.keys(navMap).forEach(function (k) {
            navMap[k].classList.toggle("active", k === id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Hero role rotator ---- */
  var rotator = document.getElementById("rotator");
  var words = [
    "ML Researcher", "LLM Engineer", "RL Enthusiast",
    "Generative AI", "AI × Sustainability", "PhD Candidate @ Stanford"
  ];
  if (rotator && !reduceMotion) {
    var wi = 0, ci = 0, deleting = false;
    function tick() {
      var word = words[wi];
      if (deleting) {
        ci--;
      } else {
        ci++;
      }
      rotator.textContent = word.slice(0, ci);
      var delay = deleting ? 45 : 90;
      if (!deleting && ci === word.length) {
        delay = 1600; deleting = true;
      } else if (deleting && ci === 0) {
        deleting = false; wi = (wi + 1) % words.length; delay = 340;
      }
      setTimeout(tick, delay);
    }
    rotator.textContent = "";
    setTimeout(tick, 500);
  }

  /* ---- Count-up stats ---- */
  var counters = document.querySelectorAll(".hero__stats .num");
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var start = 0, dur = 1200, t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(start + (target - start) * eased));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(animateCount);
  }
})();
