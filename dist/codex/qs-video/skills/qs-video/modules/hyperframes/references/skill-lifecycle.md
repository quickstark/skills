# Private dependency lifecycle

All supported workflow and domain resources are pinned inside this QS package. Read the root dependency index; verify it with the root closure checker. Missing resources block their dependent route. Ordinary use never installs or refreshes skills, changes optional package selection, or imports public skill bodies.

Fresh scaffolding uses the root scaffold helper. It forces noninteractive initialization with HYPERFRAMES_SKIP_SKILLS=1 (the upstream --skip-skills flag alone is ignored), preserves existing projects, and replaces only the newly generated AGENTS.md/CLAUDE.md with QS instructions. Normal initialization returns before preview. The runtime can still attempt read-only version/skills-manifest freshness requests; report actual runtime behavior honestly.

Package updates and existing-project runtime upgrades belong to separately authorized managed operations. Do not use upstream fallback installers. Keep the prior usable selected package/pin until replacement evidence passes.
