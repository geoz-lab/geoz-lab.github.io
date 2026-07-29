# How to publish a note

1. Drop a Markdown file in this folder, e.g. `posts/grpo-notes.md`.
   The file name (minus `.md`) becomes the URL: `post.html?p=grpo-notes`.

2. Start it with front matter:

```markdown
---
title: Notes on GRPO
date: 2026-07-28
tags: [RL, LLM]
summary: One or two sentences shown on the home page card.
---

Your note starts here…
```

Only `title` and `date` are required — `tags` and `summary` are optional.

3. Regenerate the index (scans this folder, writes `index.json`):

```bash
python3 tools/build_posts.py
```

4. Commit and push. `index.json` is what the site reads, so it must be committed.

Note: `README.md` and any file starting with `_` or `.` are skipped by the generator.
