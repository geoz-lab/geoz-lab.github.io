---
title: Markdown formatting reference
date: 2026-07-27
tags: [meta, reference]
summary: Every formatting feature the note renderer supports, in one page — headings, code, tables, lists, quotes and links. Delete this file once you have your own notes.
---

# Markdown formatting reference

This note is a template: it shows everything the renderer handles. Delete it
whenever you like.

## Text

**Bold**, *italic*, ***both***, ~~struck through~~, and `inline code`.
Links look like [this](https://github.com/geoz-lab), and bare URLs such as
https://scholar.google.com are linked automatically.

## Lists

- Unordered items
- With **inline formatting**
  - And one level of nesting
- [x] Task list, done
- [ ] Task list, not done

1. Ordered items
2. Work the same way

## Code

```python
def grpo_advantage(rewards, group_size):
    """Group-relative advantage: normalize within each sampled group."""
    grouped = rewards.view(-1, group_size)
    return (grouped - grouped.mean(1, keepdim=True)) / (grouped.std(1, keepdim=True) + 1e-8)
```

## Tables

| Method | Reward model | Notes                          |
| ------ | :----------: | ------------------------------ |
| PPO    |   Learned    | Needs a value head             |
| GRPO   |   Learned    | Group-relative, no value head  |
| DPO    |   Implicit   | Offline, preference pairs only |

## Quotes and rules

> Notes are for the version of you that has forgotten the details.

---

Images work too — just drop the file next to the note and reference it
relatively: `![caption](my-figure.png)`.
