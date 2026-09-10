---
name: obsidian-vault
description: Search, create, and manage notes in the Obsidian vault with wikilinks and index notes. Use when user wants to find, create, or organize notes in Obsidian.
---

# Obsidian Vault

## Vault location

`/mnt/d/Obsidian Vault/AI Research/`

Mostly flat at root level.

## Naming conventions

- **Index notes**: aggregate related topics (e.g., `Ralph Wiggum Index.md`, `Skills Index.md`, `RAG Index.md`)
- **Title case** for all note names
- No folders for organization - use links and index notes instead

## Linking

- Use Obsidian `[[wikilinks]]` syntax: `[[Note Title]]`
- Notes link to dependencies/related notes at the bottom
- Index notes are just lists of `[[wikilinks]]`

## Workflows

### Search for notes

```bash
# Search by filename
find "/mnt/d/Obsidian Vault/AI Research/" -name "*.md" | grep -i "keyword"

# Search by content
grep -rl "keyword" "/mnt/d/Obsidian Vault/AI Research/" --include="*.md"
```

Or use Grep/Glob tools directly on the vault path.

### Create a new note

1. Use **Title Case** for filename
2. Write content as a unit of learning (per vault rules)
3. Add `[[wikilinks]]` to related notes at the bottom
4. If part of a numbered sequence, use the hierarchical numbering scheme

### Find related notes

Search for `[[Note Title]]` across the vault to find backlinks:

```bash
grep -rl "\\[\\[Note Title\\]\\]" "/mnt/d/Obsidian Vault/AI Research/"
```

### Find index notes

```bash
find "/mnt/d/Obsidian Vault/AI Research/" -name "*Index*"
```

<!-- qs-progress:start -->
## Progress reporting

Keep a checklist in the conversation. During long operations, tell me the current stage, whether progress is continuing, and whether you need anything from me. Verify each completed stage. Finish with a short explanation of what was configured, which checks passed, and what remains.

Start with a concise checklist of meaningful stages; one stage is enough for a short task. Label stages pending, active, verified, skipped, blocked, or failed. Only verified stages receive completed checkboxes; explain skipped stages. Verify each stage against relevant artifacts, command results, sources, or observable behavior before checking it off. A failing required check prevents completion; reopen a verified stage when later evidence invalidates it.

During long operations, aim for updates within sixty seconds when the host allows control to return. State the current stage, observed progress or waiting state, and whether user input is needed. Distinguish a process that is running from confirmed progress; elapsed time alone proves neither progress nor completion. Finish with what changed or was configured, checks passed or failed, and remaining work. Read-only runs describe findings without implying mutations. Apply this contract regardless of effort or report mode; brief output may compress evidence but retains blockers and failed checks.
<!-- qs-progress:end -->
