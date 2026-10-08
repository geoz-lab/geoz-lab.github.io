# geoz-lab.github.io

Personal site for **Geo Zhang** — PhD candidate at Stanford working on LLMs, generative AI, reinforcement learning, and applied machine learning.

Dependency-free static site (no frameworks, no build step), hosted on GitHub Pages.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Writing a note

Notes live in `posts/` as plain Markdown. To publish one:

1. Create `posts/my-note.md` (the file name becomes the URL slug):

   ```markdown
   ---
   title: My note
   date: 2026-07-28
   tags: [RL, LLM]
   summary: One or two sentences shown on the home-page card.
   ---

   Your note starts here…
   ```

2. Rebuild the index:

   ```bash
   python3 tools/build_posts.py
   ```

3. Commit both the `.md` file and `posts/index.json`, then push.

The card appears under **Notes** on the home page with its title and date, and
links to `post.html?p=my-note`, which renders the Markdown in the browser.
`python3 tools/build_posts.py --check` fails if the index is stale.

## Structure

- `index.html` — content and semantic structure
- `post.html` — reader page for a single note (`post.html?p=<slug>`)
- `styles.css` — light/dark visual system, layout, and motion
- `script.js` — theme toggle, nav, scroll-spy, reveal-on-scroll, hero typewriter, count-up stats
- `ask.js` — the "Ask me anything" chat widget
- `md.js` — small Markdown → HTML renderer (no dependencies)
- `posts.js` — loads `posts/index.json`, renders the note list and note pages
- `posts/` — the Markdown notes plus the generated `index.json` manifest
- `tools/build_posts.py` — regenerates `posts/index.json` from `posts/*.md`
- `favicon.svg` — monogram icon

## Theming

Light by default, dark when the visitor's OS prefers it, and the nav button
overrides either choice (remembered in `localStorage`, applied inline in
`<head>` so there is no flash). Every colour is a custom property defined
once in `styles.css` — `:root` for light, then `prefers-color-scheme` and
`:root[data-theme="dark"]` for dark. Adding a colour means adding a token,
not a hex literal.

## "Ask me anything"

`ask.js` adds a floating chat widget that answers questions about Geo. It
calls [Pollinations](https://pollinations.ai), a free keyless LLM gateway, so
there is **no API key and no backend** — which matters, because this is a
static site and anything shipped in the JS is public.

The profile the model is grounded in is the `PROFILE` constant at the top of
`ask.js`; keep it in sync with the page when the CV changes. If every provider
fails, the widget answers from the keyword-matched `TOPICS` table in the same
file, so it never leaves a visitor hanging.

Two things to know: questions go to a third-party service (disclosed in the
widget footer), and that service makes no uptime promise. To take ownership of
both, point `SELF_HOSTED_ENDPOINT` at your own proxy — it receives
`{ system, messages }` and should answer `{ reply }`.
