# Calculator verification

Run with Node built-ins only, from the repository root:

```sh
node verification/run.cjs --doctor
node verification/run.cjs
```

An absolute path to run.cjs also works from any directory. `--doctor` checks
Node fetch availability and syntax without starting the app. The normal run
repeats doctor before each owned session, waits for a complete JSON port
announcement, and requires HTTP 200 with JSON `ready: true` from `/health`
before driving features. Requests stay on the app's loopback port; redirects
are not followed. Startup, requests, and shutdown have time limits. After a
failed feature, doctor and readiness run again. Failed readiness causes an
owned-session cleanup and relaunch before the next feature.

Every entry in features.json is accounted for. Sum requires HTTP 200 and JSON
`result: 12` for `a=7&b=5`. Export requires HTTP 200, an attachment disposition,
and a nonempty body. Its documented 404 is an unavailable product feature, not
a passing download check. Unsupported map entries fail explicitly. Startup
failure records each dependent route as unreachable.

Exit 0 means all checks passed (or static checks passed in doctor mode); exit 1
means a check, prerequisite, interruption, or cleanup failed. Each invocation
writes a unique JSON file under verification/evidence/ containing source
hashes, doctor observations, feature responses, and owned-process exit records.
Cleanup sends SIGTERM only to the child created by that invocation, escalates
to SIGKILL after a timeout, and awaits closure. Evidence is written and read
back after cleanup; reruns preserve earlier evidence. Product and map files
remain read-only.
