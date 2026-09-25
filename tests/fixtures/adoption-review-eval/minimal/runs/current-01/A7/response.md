I’ll read the local guidance, then review `diff.patch` against `SPEC.md` and the supplied evidence. I’ll return findings in chat without changing existing files.

- [x] Read the complete local guidance, specification, patch, and supplied observations.
- [ ] Verify finding locations and finish the report.

Stage: Review | Stage estimate: ~90% | Overall estimate: ~90% | Continuing — `quantity || 1` replaces a valid zero quantity with one. The supplied observations cover quantity `2` and `null`, but not zero. Input needed: none.

**[P2] Preserve zero quantity** — [src/line-total.cjs:3](/tmp/qs-review-eval-A7-c9jGg9/src/line-total.cjs:3): `quantity || 1` treats zero as missing. Consequently, `lineTotal(25, 0)` returns `25` instead of the required `0`, regressing existing callers. Default only null or omitted quantities, for example with `quantity ?? 1`.

**Status:** Complete — bounded review, one finding.
**Specs:** [SPEC.md](/tmp/qs-review-eval-A7-c9jGg9/SPEC.md)

**Work summary:**

- Finished — inspected the patch, source, specification, and supplied observations; verified the finding’s location. No files changed.
- Validation — static inspection only; no tests executed. Supplied observations cover `2` and `null`, but omit zero.
- Next — the zero-quantity regression remains unresolved; repairs are outside this task.

**Next work prompt:** None — review only.