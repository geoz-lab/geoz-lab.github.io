/* Geo Zhang — tiny Markdown renderer. Dependency-free.
   Supports: front matter, ATX headings, fenced + indented code, blockquotes,
   ordered/unordered (nested) lists, tables, hr, images, links, bold/italic/
   strike, inline code, autolinks. Input is HTML-escaped before parsing, so
   raw HTML in a note is shown as text rather than executed. */
window.MD = (function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(s) {
    return String(s)
      .replace(/<[^>]*>/g, "")
      .replace(/&[a-z#0-9]+;/gi, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  /* ---- Front matter ------------------------------------------------- */
  /* Minimal YAML subset: `key: value`, plus `tags: [a, b]` or `- a` lists. */
  function frontMatter(text) {
    var src = String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(src);
    if (!m) return { meta: {}, body: src };

    var meta = {};
    var lines = m[1].split("\n");
    var lastKey = null;

    lines.forEach(function (line) {
      if (!line.trim() || /^\s*#/.test(line)) return;

      var item = /^\s*-\s+(.*)$/.exec(line);
      if (item && lastKey) {
        if (!Array.isArray(meta[lastKey])) meta[lastKey] = [];
        meta[lastKey].push(unquote(item[1]));
        return;
      }

      var kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
      if (!kv) return;
      var key = kv[1].trim();
      var val = kv[2].trim();
      lastKey = key;

      if (val === "") { meta[key] = []; return; }
      if (/^\[.*\]$/.test(val)) {
        meta[key] = val.slice(1, -1).split(",")
          .map(function (v) { return unquote(v.trim()); })
          .filter(Boolean);
        return;
      }
      meta[key] = unquote(val);
    });

    return { meta: meta, body: src.slice(m[0].length) };
  }

  function unquote(v) {
    return v.replace(/^['"]|['"]$/g, "").trim();
  }

  /* ---- Inline ------------------------------------------------------- */
  function safeUrl(url) {
    var u = String(url).trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|tel:|#|\/|\.{0,2}\/|[A-Za-z0-9._~-]+(\.md|\.html|\.png|\.jpg|\.jpeg|\.gif|\.svg|\.pdf))/i.test(u)) return u;
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(u)) return "#"; // unknown scheme (javascript:, data:, …)
    return u;
  }

  function inline(text) {
    var codes = [];
    var s = text;

    // inline code first so its contents are left alone
    s = s.replace(/(`+)([\s\S]*?)\1/g, function (_, ticks, body) {
      codes.push(body.replace(/^ | $/g, ""));
      return "\u0000" + (codes.length - 1) + "\u0000";
    });

    // images then links
    s = s.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      function (_, alt, src, title) {
        return '<img src="' + safeUrl(src) + '" alt="' + alt + '"' +
          (title ? ' title="' + title + '"' : "") + ' loading="lazy" />';
      });

    s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      function (_, label, href, title) {
        var url = safeUrl(href);
        var ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : "";
        return '<a href="' + url + '"' + (title ? ' title="' + title + '"' : "") + ext + '>' + label + "</a>";
      });

    // bare URLs (not already inside an href="…")
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (all, pre, url) {
      return pre + '<a href="' + url + '" target="_blank" rel="noopener">' + url + "</a>";
    });

    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    s = s.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([\s\S]+?)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
    s = s.replace(/~~([\s\S]+?)~~/g, "<del>$1</del>");

    // hard line break: two trailing spaces
    s = s.replace(/ {2,}\n/g, "<br />\n");

    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + codes[+i] + "</code>";
    });
  }

  /* ---- Blocks ------------------------------------------------------- */
  function isBlank(l) { return !l || !l.trim(); }

  function render(markdown) {
    return parse(escapeHtml(String(markdown).replace(/\r\n?/g, "\n")).split("\n"));
  }

  /* parse() works on already-escaped lines, so nested blocks (blockquotes,
     multi-line list items) can recurse without escaping twice. */
  function parse(lines) {
    var out = [];
    var headings = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (isBlank(line)) { i++; continue; }

      // fenced code
      var fence = /^\s{0,3}(```+|~~~+)\s*([A-Za-z0-9_+-]*)\s*$/.exec(line);
      if (fence) {
        var marker = fence[1].charAt(0);
        var lang = fence[2];
        var buf = [];
        i++;
        while (i < lines.length && !new RegExp("^\\s{0,3}" + marker + "{3,}\\s*$").test(lines[i])) {
          buf.push(lines[i]); i++;
        }
        i++; // closing fence
        out.push('<pre><code' + (lang ? ' class="lang-' + lang + '"' : "") + ">" +
          buf.join("\n") + "</code></pre>");
        continue;
      }

      // heading
      var h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (h) {
        var level = h[1].length;
        var html = inline(h[2]);
        var id = slugify(h[2]);
        headings.push({ level: level, text: h[2], id: id });
        out.push("<h" + level + ' id="' + id + '">' + html + "</h" + level + ">");
        i++;
        continue;
      }

      // horizontal rule
      if (/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(line)) { out.push("<hr />"); i++; continue; }

      // table
      if (line.indexOf("|") !== -1 && i + 1 < lines.length &&
          /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        var head = splitRow(line);
        var align = splitRow(lines[i + 1]).map(function (c) {
          if (/^:-+:$/.test(c)) return "center";
          if (/^-+:$/.test(c)) return "right";
          if (/^:-+$/.test(c)) return "left";
          return "";
        });
        i += 2;
        var body = [];
        while (i < lines.length && !isBlank(lines[i]) && lines[i].indexOf("|") !== -1) {
          body.push(splitRow(lines[i])); i++;
        }
        out.push(renderTable(head, align, body));
        continue;
      }

      // blockquote (">" is "&gt;" post-escaping)
      if (/^\s{0,3}&gt;/.test(line)) {
        var quote = [];
        while (i < lines.length && (/^\s{0,3}&gt;/.test(lines[i]) || (!isBlank(lines[i]) && quote.length))) {
          quote.push(lines[i].replace(/^\s{0,3}&gt;\s?/, "")); i++;
        }
        out.push("<blockquote>" + parse(quote).html + "</blockquote>");
        continue;
      }

      // list
      var lead = /^(\s*)([-*+]|\d{1,9}[.)])\s+/.exec(line);
      if (lead) {
        var baseCol = lead[1].length;
        var ordered = /\d/.test(lead[2]);
        var block = [];
        var more = true;

        while (more && i < lines.length) {
          while (i < lines.length && !isBlank(lines[i])) { block.push(lines[i]); i++; }

          // a blank line continues the list only if the next line belongs to it:
          // an indented continuation, or another item of the same kind
          more = false;
          var next = lines[i + 1];
          if (i < lines.length && isBlank(lines[i]) && next && !isBlank(next)) {
            var nm = /^(\s*)([-*+]|\d{1,9}[.)])\s+/.exec(next);
            if ((nm && nm[1].length >= baseCol && /\d/.test(nm[2]) === ordered) ||
                (!nm && /^\s{2,}\S/.test(next))) {
              block.push(""); i++; more = true;
            }
          }
        }
        out.push(renderList(block));
        continue;
      }

      // paragraph
      var para = [];
      while (i < lines.length && !isBlank(lines[i]) &&
             !/^\s{0,3}(#{1,6}\s|```|~~~|&gt;)/.test(lines[i]) &&
             !/^\s*([-*+]|\d{1,9}[.)])\s+/.test(lines[i]) &&
             !/^\s{0,3}([-*_])\s*(\1\s*){2,}$/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push("<p>" + inline(para.join("\n")) + "</p>");
      else i++;
    }

    return { html: out.join("\n"), headings: headings };
  }

  function splitRow(row) {
    return row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|")
      .map(function (c) { return c.trim(); });
  }

  function renderTable(head, align, body) {
    function cell(tag, c, idx) {
      var a = align[idx] ? ' style="text-align:' + align[idx] + '"' : "";
      return "<" + tag + a + ">" + inline(c) + "</" + tag + ">";
    }
    var thead = "<thead><tr>" + head.map(function (c, k) { return cell("th", c, k); }).join("") + "</tr></thead>";
    var tbody = "<tbody>" + body.map(function (r) {
      return "<tr>" + head.map(function (_, k) { return cell("td", r[k] || "", k); }).join("") + "</tr>";
    }).join("") + "</tbody>";
    return '<div class="prose__tablewrap"><table>' + thead + tbody + "</table></div>";
  }

  /* Nested lists: group by indentation width. */
  function renderList(block) {
    var items = [];
    var current = null;
    var baseIndent = null;

    block.forEach(function (line) {
      var m = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line);
      if (m && (baseIndent === null || m[1].length <= baseIndent)) {
        if (baseIndent === null) baseIndent = m[1].length;
        current = { marker: m[2], lines: [m[3]] };
        items.push(current);
      } else if (current) {
        current.lines.push(line.replace(new RegExp("^\\s{0," + (baseIndent + 2) + "}"), ""));
      }
    });

    if (!items.length) return "";

    var ordered = /\d/.test(items[0].marker);
    var start = ordered ? parseInt(items[0].marker, 10) : 1;
    var html = items.map(function (it) {
      var text = it.lines.join("\n");
      var task = /^\[([ xX])\]\s+([\s\S]*)$/.exec(text);
      var prefix = "";
      if (task) {
        prefix = '<input type="checkbox" disabled' + (task[1] === " " ? "" : " checked") + " /> ";
        text = task[2];
      }
      var multi = /\n/.test(text);
      var inner = multi
        ? parse(text.split("\n")).html.replace(/^<p>([\s\S]*?)<\/p>/, "$1")
        : inline(text);
      return "<li" + (task ? ' class="task"' : "") + ">" + prefix + inner + "</li>";
    }).join("");

    return ordered
      ? "<ol" + (start !== 1 ? ' start="' + start + '"' : "") + ">" + html + "</ol>"
      : "<ul>" + html + "</ul>";
  }

  return {
    render: function (md) { return render(md).html; },
    renderWithHeadings: render,
    frontMatter: frontMatter,
    escapeHtml: escapeHtml,
    slugify: slugify
  };
})();
