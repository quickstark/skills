# Runtime evidence

Candidate source: Leonxlnx/unlazy at
`16671491f6679ad9378f52604d3bc2415b4120c7` (unreleased target 2.1.0).
The scripts require Node >=16. Compatibility fixtures ran on Linux x64 with
Node 16.20.2 and 24.21.0. This is evidence, not a recommendation to install an
obsolete Node version. Actual Windows process integration has not been verified.

Definition fingerprints reject stale CHECK/EXPECT/CWD evidence. They do not hash
all files used by a command. Inspect changed artifacts and use `--reverify`.
Timeout cleanup handles ordinary POSIX descendants in the tested process group;
detached processes can escape it. No sandbox or arbitrary descendant containment
is promised. Upstream helper simulations are distinct from native host evidence.

The optional hook has been exercised only in isolated test projects. It must
remain opt-in in real projects. Moved-install recovery must preserve unrelated
settings and handlers. The dependency index records original and derived hashes
separately; canonical package activation and installed-host acceptance are separate
from upstream suite results.
