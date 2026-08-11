# Rank continuation prompts after every non-release run

QuickStark v3 will emit three ranked, copy-ready next prompts after every non-release public run, including a completed run. The first prompt is the opinionated preferred route and the other two are alternatives. `qs-deploy-release` remains terminal and emits none.

The catalog owns every route, its concise instruction, reason, availability, and recovery role. Core commands may recommend only core commands so the default package remains independent of `qs-specialists`. Failed runs exclude publication-only routes and promote a safe recovery route when one exists.

Each generated prompt uses the exact installed skill literal, a route-specific instruction, a 140-character outcome summary, and at most one 80-character evidence item. This replaces the previous unbounded evidence fan-out and prevents repetitive prompts approaching two thousand characters.

This decision supersedes ADR 0001 and the original v3 consolidation specification only where they require zero prompts for completed work or exactly one prompt for continuation. The one-root rule remains unchanged: prompts are recommendations, and no public skill starts another public skill automatically.
