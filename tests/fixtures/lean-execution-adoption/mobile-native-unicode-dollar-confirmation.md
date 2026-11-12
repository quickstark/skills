Exact-version parser conclusion (no models executed):

Official source commit: 7a078f6bb4ce0dc2a81408b334ce52979d92c603.
https://github.com/openai/codex/blob/7a078f6bb4ce0dc2a81408b334ce52979d92c603/codex-rs/skills/src/mentions.rs

TOOL_MENTION_SIGIL is '$' (:41). Ordinary extraction requires the actual sigil byte (:114-117). Linked extraction also requires the actual sigil immediately after '[' (:157-159). Thus user-input text with no raw ASCII dollar has neither extraction path under extract_tool_mentions, even if it contains the six literal characters backslash-u-0-0-2-4. The parser performs no JSON-unescaping step.

Boundary caveat: JSON wire spelling alone is insufficient. A transport-level JSON unicode escape becomes a raw dollar when the request is decoded. The intended encoded fixture content must retain the six literal characters in the decoded text string (requiring doubled backslash on the JSON wire). A mechanical Python JSON transport round trip confirmed that this representation retains no raw dollar and that semantic decoding recovers the original literal. A mere backslash-dollar escape still contains the raw dollar and does not prevent extraction because the scanner has no backslash exclusion.

This establishes parser non-selection for the stated no-raw-dollar input, not model adherence or actual native injection behavior. All fixture acceptance remains pending.

LICENSE and NOTICE were fetched from the same exact commit, saved unmodified under /tmp, and their Git blob SHA-1 values recomputed to match GitHub's returned identities. Full SHA-256 values, byte counts, original URLs and local paths are in /tmp/lex-mobile-native-notices-hashes.json. NOTICE retains OpenAI, Florian Dehau and Ratatui Developers copyright lines.
