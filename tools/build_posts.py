#!/usr/bin/env python3
"""Rebuild posts/index.json from the Markdown files in posts/.

Usage:
    python3 tools/build_posts.py [--check]

--check exits non-zero if the manifest is out of date (useful in CI).
Front matter is a small YAML subset: `key: value`, `tags: [a, b]`, and
`- item` lists. Only `title` and `date` really matter; everything else
is derived when missing.
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, "posts")
MANIFEST = os.path.join(POSTS_DIR, "index.json")

FM_RE = re.compile(r"\A---[ \t]*\n(.*?)\n---[ \t]*\n?", re.S)
WORDS_PER_MIN = 220


def parse_front_matter(text):
    """Return (meta_dict, body)."""
    m = FM_RE.match(text)
    if not m:
        return {}, text

    meta, last_key = {}, None
    for line in m.group(1).split("\n"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue

        item = re.match(r"\s*-\s+(.*)$", line)
        if item and last_key:
            meta.setdefault(last_key, [])
            if isinstance(meta[last_key], list):
                meta[last_key].append(unquote(item.group(1)))
            continue

        kv = re.match(r"([A-Za-z0-9_-]+)\s*:\s*(.*)$", line)
        if not kv:
            continue
        key, val = kv.group(1).strip(), kv.group(2).strip()
        last_key = key

        if val == "":
            meta[key] = []
        elif val.startswith("[") and val.endswith("]"):
            meta[key] = [unquote(v) for v in val[1:-1].split(",") if v.strip()]
        else:
            meta[key] = unquote(val)

    return meta, text[m.end():]


def unquote(v):
    return v.strip().strip("'\"").strip()


def strip_markdown(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"^\s{0,3}>\s?", "", text, flags=re.M)
    text = re.sub(r"[*_~]{1,3}", "", text)
    return text


def first_paragraph(body):
    for chunk in re.split(r"\n\s*\n", strip_markdown(body).strip()):
        chunk = " ".join(chunk.split())
        if not chunk or chunk.startswith(("|", "-", "*")) or re.match(r"^\d+[.)]\s", chunk):
            continue
        return chunk[:220].rstrip() + ("…" if len(chunk) > 220 else "")
    return ""


def title_from(body, slug):
    m = re.search(r"^\s{0,3}#\s+(.+?)\s*$", body, flags=re.M)
    if m:
        return m.group(1).strip()
    return slug.replace("-", " ").replace("_", " ").title()


def date_from(meta, path, slug):
    raw = str(meta.get("date", "")).strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m:
        return m.group(0)
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", slug)  # e.g. 2026-07-28-my-note.md
    if m:
        return m.group(0)
    import datetime
    return datetime.date.fromtimestamp(os.path.getmtime(path)).isoformat()


def build():
    entries = []
    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.endswith(".md") or name.startswith((".", "_")) or name.lower() == "readme.md":
            continue

        path = os.path.join(POSTS_DIR, name)
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()

        slug = name[:-3]
        meta, body = parse_front_matter(raw)
        tags = meta.get("tags", [])
        if isinstance(tags, str):
            tags = [t for t in re.split(r"[,\s]+", tags) if t]

        words = len(strip_markdown(body).split())
        entries.append({
            "slug": slug,
            "title": meta.get("title") or title_from(body, slug),
            "date": date_from(meta, path, slug),
            "tags": tags,
            "summary": meta.get("summary") or meta.get("description") or first_paragraph(body),
            "minutes": max(1, round(words / WORDS_PER_MIN)),
        })

    entries.sort(key=lambda e: (e["date"], e["slug"]), reverse=True)
    return entries


def main():
    entries = build()
    payload = json.dumps(entries, indent=2, ensure_ascii=False) + "\n"

    if "--check" in sys.argv:
        current = ""
        if os.path.exists(MANIFEST):
            with open(MANIFEST, encoding="utf-8") as fh:
                current = fh.read()
        if current != payload:
            print("posts/index.json is out of date — run: python3 tools/build_posts.py")
            return 1
        print("posts/index.json is up to date (%d notes)." % len(entries))
        return 0

    with open(MANIFEST, "w", encoding="utf-8") as fh:
        fh.write(payload)
    print("Wrote %s (%d note%s)" % (
        os.path.relpath(MANIFEST, ROOT), len(entries), "" if len(entries) == 1 else "s"))
    for e in entries:
        print("  %s  %-34s %s" % (e["date"], e["slug"], e["title"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
