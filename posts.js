/* Geo Zhang — notes/posts loading. Dependency-free.
   Reads posts/index.json (the manifest) and renders either
   the list on the home page or a single note on post.html. */
(function () {
  "use strict";

  var MANIFEST = "posts/index.json";

  /* ---- helpers ------------------------------------------------------ */
  function fmtDate(value) {
    if (!value) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function isoDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return m ? m[0] : "";
  }

  function sortByDate(list) {
    return list.slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
  }

  function safeSlug(s) {
    return /^[A-Za-z0-9._-]+$/.test(String(s || "")) ? String(s) : "";
  }

  function readingTime(post, text) {
    if (post && post.minutes) return post.minutes;
    var words = String(text || "").trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 220));
  }

  function loadManifest() {
    return fetch(MANIFEST, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("manifest " + r.status);
      return r.json();
    }).then(function (data) {
      var list = Array.isArray(data) ? data : (data.posts || []);
      return sortByDate(list.filter(function (p) { return p && safeSlug(p.slug); }));
    });
  }

  function esc(s) { return window.MD.escapeHtml(s); }

  /* ---- home page list ----------------------------------------------- */
  var listEl = document.getElementById("notesList");

  if (listEl) {
    var limit = parseInt(listEl.getAttribute("data-limit"), 10) || 0;
    var countEl = document.getElementById("notesCount");
    var moreEl = document.getElementById("notesMore");

    loadManifest().then(function (posts) {
      if (!posts.length) {
        listEl.innerHTML = '<p class="notes__empty">No notes published yet — drop a <code>.md</code> file in <code>posts/</code> to get started.</p>';
        return;
      }

      var shown = limit ? posts.slice(0, limit) : posts;

      listEl.innerHTML = shown.map(function (p) {
        var tags = (p.tags || []).slice(0, 3).map(function (t) {
          return '<span class="note__tag mono">' + esc(t) + "</span>";
        }).join("");

        return '<a class="note reveal" href="post.html?p=' + encodeURIComponent(p.slug) + '">' +
          '<div class="note__meta">' +
            '<time class="note__date mono" datetime="' + esc(isoDate(p.date)) + '">' + esc(fmtDate(p.date)) + "</time>" +
            (p.minutes ? '<span class="note__read mono">' + esc(p.minutes) + " min read</span>" : "") +
          "</div>" +
          "<h3 class=\"note__title\">" + esc(p.title || p.slug) + "</h3>" +
          (p.summary ? '<p class="note__summary">' + esc(p.summary) + "</p>" : "") +
          (tags ? '<div class="note__tags">' + tags + "</div>" : "") +
          '<span class="note__cta mono">Read note →</span>' +
        "</a>";
      }).join("");

      if (countEl) countEl.textContent = posts.length === 1 ? "1 note" : posts.length + " notes";
      if (moreEl && limit && posts.length > limit) {
        moreEl.hidden = false;
        moreEl.textContent = "Showing the " + limit + " most recent of " + posts.length + " notes.";
      }

      // hand the freshly inserted cards to the site-wide reveal observer
      if (window.SiteReveal) window.SiteReveal(listEl.querySelectorAll(".reveal"));
    }).catch(function (err) {
      listEl.innerHTML = '<p class="notes__empty">Couldn\'t load notes (' + esc(err.message) + ")." +
        " If you opened this file directly, run <code>python3 -m http.server 8000</code> and visit " +
        "<code>localhost:8000</code> — <code>fetch()</code> is blocked on <code>file://</code>.</p>";
    });
  }

  /* ---- single note page ---------------------------------------------- */
  var articleEl = document.getElementById("postBody");

  if (articleEl) {
    var params = new URLSearchParams(window.location.search);
    var slug = safeSlug(params.get("p") || params.get("post"));

    var titleEl = document.getElementById("postTitle");
    var dateEl = document.getElementById("postDate");
    var readEl = document.getElementById("postRead");
    var tagsEl = document.getElementById("postTags");
    var tocEl = document.getElementById("postToc");
    var navEl = document.getElementById("postNav");

    if (!slug) {
      articleEl.innerHTML = "<p>No note specified. <a href=\"index.html\">Back to home</a>.</p>";
      return;
    }

    Promise.all([
      fetch("posts/" + slug + ".md", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Note not found (" + r.status + ")");
        return r.text();
      }),
      loadManifest().catch(function () { return []; })
    ]).then(function (res) {
      var raw = res[0];
      var posts = res[1];
      var entry = posts.filter(function (p) { return p.slug === slug; })[0] || {};

      var fm = window.MD.frontMatter(raw);
      var meta = fm.meta;
      var body = fm.body;

      // a leading `# Title` duplicates the page header — drop it
      var lead = /^\s*#\s+(.+?)\s*$/m.exec(body.split("\n").slice(0, 3).join("\n"));
      var title = meta.title || entry.title || (lead && lead[1]) || slug;
      if (lead && (!meta.title || lead[1] === title)) {
        body = body.replace(/^\s*#\s+.+?\s*$/m, "");
      }

      var date = meta.date || entry.date || "";
      var tags = meta.tags || entry.tags || [];
      if (typeof tags === "string") tags = tags.split(/[,\s]+/).filter(Boolean);

      document.title = title + " — Geo Zhang";
      var descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute("content", meta.summary || entry.summary || title);

      if (titleEl) titleEl.textContent = title;
      if (dateEl) {
        dateEl.textContent = fmtDate(date);
        dateEl.setAttribute("datetime", isoDate(date));
      }
      if (readEl) readEl.textContent = readingTime(entry, body) + " min read";
      if (tagsEl && tags.length) {
        tagsEl.innerHTML = tags.map(function (t) {
          return '<span class="note__tag mono">' + esc(t) + "</span>";
        }).join("");
      }

      var rendered = window.MD.renderWithHeadings(body);
      articleEl.innerHTML = rendered.html;

      // table of contents from h2/h3
      var heads = rendered.headings.filter(function (h) { return h.level === 2 || h.level === 3; });
      if (tocEl && heads.length > 2) {
        tocEl.innerHTML = '<p class="post__toc-title mono">On this page</p><ul>' +
          heads.map(function (h) {
            return '<li class="lvl-' + h.level + '"><a href="#' + h.id + '">' + esc(h.text) + "</a></li>";
          }).join("") + "</ul>";
        tocEl.hidden = false;
      }

      // prev / next by date
      if (navEl && posts.length > 1) {
        var idx = -1;
        posts.forEach(function (p, k) { if (p.slug === slug) idx = k; });
        var newer = idx > 0 ? posts[idx - 1] : null;
        var older = idx > -1 && idx < posts.length - 1 ? posts[idx + 1] : null;
        var html = "";
        if (newer) html += '<a class="post__nav-link" href="post.html?p=' + encodeURIComponent(newer.slug) +
          '"><span class="mono">← Newer</span>' + esc(newer.title || newer.slug) + "</a>";
        if (older) html += '<a class="post__nav-link post__nav-link--next" href="post.html?p=' + encodeURIComponent(older.slug) +
          '"><span class="mono">Older →</span>' + esc(older.title || older.slug) + "</a>";
        navEl.innerHTML = html;
      }

      if (window.location.hash) {
        var target = document.getElementById(window.location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    }).catch(function (err) {
      articleEl.innerHTML = "<p><strong>" + esc(err.message) + "</strong></p>" +
        '<p>Looked for <code>posts/' + esc(slug) + ".md</code>. " +
        'If you opened this page from the filesystem, serve it with <code>python3 -m http.server 8000</code> instead.</p>' +
        '<p><a href="index.html">← Back to home</a></p>';
      if (titleEl) titleEl.textContent = "Note unavailable";
    });
  }
})();
