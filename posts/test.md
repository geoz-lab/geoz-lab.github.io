---
title: Test note
date: 2026-07-28
tags: [test]
summary: A quick test that the notes pipeline works end to end — write Markdown, rebuild the index, push.
---

# Test note

This is a test note, written on **July 28, 2026**, to confirm the notes section
works: the card shows up on the home page with its title and date, and clicking
it opens the full article here.

## What it checks

- Front matter (`title`, `date`, `tags`, `summary`) is picked up.
- The card links through to `post.html?p=test`.
- Markdown renders: lists, `inline code`, [links](https://github.com/geoz-lab), and code blocks.

```bash
python3 tools/build_posts.py   # refresh posts/index.json
python3 -m http.server 8000    # preview at localhost:8000
```

If you can read this in the browser, everything is wired up correctly.
