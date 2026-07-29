---
title: Starting a notes section
date: 2026-07-28
tags: [meta]
summary: A place to keep short writeups on what I'm reading, training, and debugging — rendered straight from Markdown files in the repo.
---

# Starting a notes section

I keep a lot of short writeups — training runs that behaved oddly, papers worth
remembering, small results that never become a paper. They have been living in
scattered files, so this section is where the useful ones land.

The workflow is deliberately boring: write a Markdown file, run one command,
push. No CMS, no build pipeline, no framework — the site renders the Markdown
in the browser.

## How it works

1. Add `posts/my-note.md` with a `title` and `date` in the front matter.
2. Run `python3 tools/build_posts.py` to refresh `posts/index.json`.
3. Commit and push — GitHub Pages does the rest.

More to come on RL for multimodal models, and on what actually breaks when you
scale a training loop past one node.
