/* =========================================================
   "Ask me anything" — a small chat widget about Geo Zhang.
   Dependency-free; builds its own DOM so any page that loads
   this file gets the widget.

   No API key and no backend: questions go straight to
   Pollinations.ai, a free keyless LLM gateway that sends
   Access-Control-Allow-Origin: *. Nothing to deploy, nothing
   to pay for, no key that could leak.

   Because that is a free public service with no uptime promise,
   a failed request falls back to the local keyword answers
   below, so the widget always replies. Set SELF_HOSTED_ENDPOINT
   if you ever want to front it with your own proxy instead.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Providers, tried in order. All keyless.
     --------------------------------------------------------- */
  var PROVIDERS = [
    { url: "https://text.pollinations.ai/openai", model: "openai" },
    { url: "https://text.pollinations.ai/openai", model: "mistral" }
  ];

  /* Optional: your own proxy. If set it is tried first, receives
     { system, messages }, and should reply { reply }. */
  var SELF_HOSTED_ENDPOINT = "";

  var MAX_CHARS = 500;
  var HISTORY_TURNS = 6;

  /* ---------------------------------------------------------
     Profile the model is grounded in. Keep this in sync with
     the site; it is also the source for offline answers.
     --------------------------------------------------------- */
  var PROFILE = [
    "Geo Zhang (also published as Ge Zhang) is a PhD candidate in Energy Resources Engineering at Stanford University, expected to graduate August 2026. Frank G. Miller Fellow. Email gmzhang@stanford.edu.",
    "Research: large language models, generative AI, reinforcement learning, computer vision, and applied machine learning, including AI for the energy transition.",
    "Methods: fine-tuning (SFT, DPO, PPO, GRPO, RLHF), RAG, agents, deep learning, physical modeling, numerical simulation, and experimental prototyping.",
    "Industry experience: ML systems at TikTok, Valuenex, Chevron, and Fervo Energy.",
    "Publication record: 20 papers, 171 citations, h-index 9, i10-index 7, plus 60+ peer reviews. Google Scholar: https://scholar.google.com/citations?user=PZgIiEoAAAAJ",
    "Selected recent work: order sensitivity as an attack surface in LLM listwise recommenders (arXiv 2026); data-efficient generation of pore-scale microstructures for rock-on-chip design (Lab on a Chip); RL fine-tuning of language models for instruction following and math reasoning (arXiv 2506.21560); large language models for carbon market insights (SPE-224146-MS); pore-scale salt precipitation under geological carbon storage conditions (Lab on a Chip 2025).",
    "Earlier work: Rayleigh-Taylor instability and lattice Boltzmann / discrete Boltzmann modeling of fracture and microchannel flow, in Physics of Fluids, Granular Matter, Geofluids, and Advances in Geo-Energy Research.",
    "Awards: URTeC Best of Paper Award (2024), NSF Nanotechnology Competition Diversity Award (2023), Frank G. Miller Fellowship (2022), Saudi Aramco Research Fellowship (2021), National Outstanding Graduation Thesis Award (2017).",
    "Education: PhD Energy Resources Engineering, Stanford (expected Aug 2026, GPA 3.8). BE Civil Engineering, China University of Mining & Technology (2017, top 1%, National Scholarship).",
    "Currently open to ML / AI engineering and research roles in the SF Bay Area and beyond, plus research collaborations.",
    "Links: GitHub github.com/geoz-lab, LinkedIn linkedin.com/in/geozhang."
  ].join("\n");

  var SYSTEM_PROMPT =
    "You are a helpful assistant embedded on Geo Zhang's personal website. " +
    "Answer questions about Geo using only the profile below. Be concise — two or three sentences " +
    "unless asked for detail — and speak about Geo in the third person. If the profile does not " +
    "cover the question, say so plainly and suggest emailing gmzhang@stanford.edu. Do not invent " +
    "publications, employers, dates, or numbers.\n\nPROFILE:\n" + PROFILE;

  var SUGGESTIONS = [
    "What does Geo research?",
    "Summarize his publication record",
    "What industry experience does he have?",
    "What roles is he looking for?"
  ];

  /* ---------------------------------------------------------
     Offline fallback: keyword match over the profile lines.
     --------------------------------------------------------- */
  var TOPICS = [
    { keys: ["research", "work on", "focus", "interest", "llm", "language model", "reinforcement", "rl", "generative", "vision", "machine learning", "ai"],
      answer: "Geo works on large language models, generative AI, reinforcement learning, and computer vision, with a strong thread of applying them to the energy transition. Hands-on with SFT, DPO, PPO, GRPO and RLHF, plus RAG and agent systems." },
    { keys: ["publication", "paper", "cited", "citation", "h-index", "scholar", "publish"],
      answer: "20 publications, 171 citations, an h-index of 9 and an i10-index of 7, plus 60+ peer reviews. Recent work spans LLM recommender robustness, RL fine-tuning for math reasoning, LLMs for carbon markets, and pore-scale imaging in Lab on a Chip. Full list is in the Publications section above." },
    { keys: ["industry", "intern", "job experience", "company", "tiktok", "chevron", "fervo", "valuenex", "worked"],
      answer: "He has shipped ML systems at TikTok, Valuenex, Chevron, and Fervo Energy, alongside his Stanford research." },
    { keys: ["hiring", "role", "looking for", "open to", "available", "job", "opportunit", "contact", "email", "reach"],
      answer: "Geo is open to ML / AI engineering and research roles in the SF Bay Area and beyond, plus research collaborations. Email is the fastest route: gmzhang@stanford.edu." },
    { keys: ["education", "degree", "phd", "stanford", "university", "study", "graduate", "school"],
      answer: "PhD candidate in Energy Resources Engineering at Stanford (expected August 2026, Frank G. Miller Fellow, GPA 3.8), after a BE in Civil Engineering from China University of Mining & Technology where he graduated in the top 1%." },
    { keys: ["award", "honor", "prize", "fellowship", "recogni"],
      answer: "URTeC Best of Paper Award (2024), an NSF Nanotechnology Competition Diversity Award (2023), the Frank G. Miller Fellowship (2022), a Saudi Aramco Research Fellowship (2021), and a National Outstanding Graduation Thesis Award (2017)." },
    { keys: ["energy", "carbon", "geothermal", "hydrogen", "climate", "sustainab", "storage"],
      answer: "A large part of his work applies ML to energy and climate: carbon storage and sequestration, enhanced geothermal systems, hydrogen storage, and LLM-driven analysis of carbon markets. See the Energy section above." },
    { keys: ["who", "about", "bio", "yourself", "introduce", "hello", "hi "],
      answer: "Geo Zhang is a Stanford PhD candidate in Energy Resources Engineering working at the intersection of LLMs, generative AI, and reinforcement learning — with industry stints at TikTok, Valuenex, Chevron, and Fervo Energy." }
  ];

  function offlineAnswer(q) {
    var text = " " + q.toLowerCase() + " ";
    var best = null, bestScore = 0;
    TOPICS.forEach(function (t) {
      var score = 0;
      t.keys.forEach(function (k) { if (text.indexOf(k) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = t; }
    });
    if (best) return best.answer;
    return "I can answer questions about Geo's research, publications, industry experience, education, awards, and what he's looking for next. For anything else, email gmzhang@stanford.edu.";
  }

  /* ---------------------------------------------------------
     DOM
     --------------------------------------------------------- */
  var svgNS = "http://www.w3.org/2000/svg";

  function icon(paths, extra) {
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", extra || "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    paths.forEach(function (d) {
      var el = document.createElementNS(svgNS, "path");
      el.setAttribute("d", d);
      svg.appendChild(el);
    });
    return svg;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var launcher = el("button", "ask__launcher");
  launcher.type = "button";
  launcher.id = "askLauncher";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "askPanel");
  launcher.appendChild(icon(["M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.2-.5L4 21l1.3-4a8.2 8.2 0 0 1-1.3-4.5A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"]));
  launcher.appendChild(el("span", "ask__launcher-text", "Ask me anything"));

  var panel = el("section", "ask__panel");
  panel.id = "askPanel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Ask me anything about Geo Zhang");

  var head = el("header", "ask__head");
  var headText = el("div", "ask__head-text");
  headText.appendChild(el("p", "ask__title", "Ask me anything"));
  headText.appendChild(el("p", "ask__sub", "An AI assistant answering from Geo's profile"));
  var closeBtn = el("button", "ask__close");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.appendChild(icon(["M6 6l12 12M18 6L6 18"]));
  head.appendChild(headText);
  head.appendChild(closeBtn);

  var log = el("div", "ask__log");
  log.id = "askLog";
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");

  var chips = el("div", "ask__chips");
  SUGGESTIONS.forEach(function (q) {
    var c = el("button", "ask__chip", q);
    c.type = "button";
    c.addEventListener("click", function () { send(q); });
    chips.appendChild(c);
  });

  var form = el("form", "ask__form");
  var input = el("input", "ask__input");
  input.type = "text";
  input.placeholder = "Ask about his research, papers, experience…";
  input.maxLength = MAX_CHARS;
  input.setAttribute("aria-label", "Your question");
  input.autocomplete = "off";
  var sendBtn = el("button", "ask__send");
  sendBtn.type = "submit";
  sendBtn.setAttribute("aria-label", "Send");
  sendBtn.appendChild(icon(["M4.5 12h14M12.5 5.5 19 12l-6.5 6.5"]));
  form.appendChild(input);
  form.appendChild(sendBtn);

  var note = el("p", "ask__note");
  note.appendChild(document.createTextNode("AI-generated — may be imprecise, and questions are sent to a free third-party model ("));
  var pol = el("a", null, "Pollinations");
  pol.href = "https://pollinations.ai";
  pol.target = "_blank";
  pol.rel = "noopener";
  note.appendChild(pol);
  note.appendChild(document.createTextNode("). For anything important, "));
  var mail = el("a", null, "email Geo");
  mail.href = "mailto:gmzhang@stanford.edu";
  note.appendChild(mail);
  note.appendChild(document.createTextNode("."));

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(chips);
  panel.appendChild(form);
  panel.appendChild(note);

  var wrap = el("div", "ask");
  wrap.appendChild(panel);
  wrap.appendChild(launcher);
  document.body.appendChild(wrap);

  /* ---------------------------------------------------------
     Messages
     --------------------------------------------------------- */
  var history = [];
  var busy = false;

  function bubble(role, text) {
    var row = el("div", "ask__msg ask__msg--" + role);
    row.appendChild(el("div", "ask__bubble", text));
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function thinking() {
    var row = el("div", "ask__msg ask__msg--bot");
    var b = el("div", "ask__bubble ask__bubble--wait");
    b.appendChild(el("span", "ask__dot"));
    b.appendChild(el("span", "ask__dot"));
    b.appendChild(el("span", "ask__dot"));
    row.appendChild(b);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function setBusy(state) {
    busy = state;
    input.disabled = state;
    sendBtn.disabled = state;
    chips.classList.toggle("is-hidden", state || history.length > 0);
  }

  function chatBody(provider, msgs) {
    return JSON.stringify({
      model: provider.model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(msgs),
      temperature: 0.3,
      max_tokens: 400,
      private: true,
      referrer: "geoz-lab.github.io"
    });
  }

  function postJSON(url, body) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  /* Pull the assistant text out of an OpenAI-shaped reply.
     Deliberately ignores any sibling "reasoning" field — that is
     the model's scratchpad, not an answer. */
  function extractReply(data) {
    var text =
      (data && data.choices && data.choices[0] && data.choices[0].message &&
       data.choices[0].message.content) ||
      (data && data.reply) ||
      (data && data.response) ||
      "";
    return String(text).trim();
  }

  function ask(question) {
    var msgs = history.slice(-HISTORY_TURNS * 2).concat([{ role: "user", content: question }]);
    var attempts = [];

    if (SELF_HOSTED_ENDPOINT) {
      attempts.push(function () {
        return postJSON(SELF_HOSTED_ENDPOINT,
          JSON.stringify({ system: SYSTEM_PROMPT, messages: msgs }));
      });
    }
    PROVIDERS.forEach(function (provider) {
      attempts.push(function () { return postJSON(provider.url, chatBody(provider, msgs)); });
    });

    function attempt(i) {
      if (i >= attempts.length) return Promise.reject(new Error("all providers failed"));
      return attempts[i]().then(function (data) {
        var reply = extractReply(data);
        if (!reply) throw new Error("empty reply");
        return reply;
      }).catch(function () {
        return attempt(i + 1);
      });
    }

    return attempt(0).catch(function () {
      return offlineAnswer(question) +
        "\n\n(The live assistant is unreachable right now, so that came from the built-in profile.)";
    });
  }

  function send(question) {
    question = String(question || "").trim();
    if (!question || busy) return;
    if (question.length > MAX_CHARS) question = question.slice(0, MAX_CHARS);

    bubble("user", question);
    history.push({ role: "user", content: question });
    input.value = "";
    setBusy(true);
    var wait = thinking();

    ask(question).then(function (reply) {
      log.removeChild(wait);
      bubble("bot", reply);
      history.push({ role: "assistant", content: reply });
      setBusy(false);
      input.focus();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send(input.value);
  });

  /* ---------------------------------------------------------
     Open / close
     --------------------------------------------------------- */
  var greeted = false;

  function open() {
    panel.hidden = false;
    wrap.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      bubble("bot", "Hi — ask me anything about Geo's research, publications, or experience.");
    }
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    wrap.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
    panel.hidden = true;
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (wrap.classList.contains("is-open")) close(); else open();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap.classList.contains("is-open")) close();
  });
})();
