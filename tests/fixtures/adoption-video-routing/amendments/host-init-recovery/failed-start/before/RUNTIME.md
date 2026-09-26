# Available pinned local render interface
Node24.21.0, CLI/core0.8.77, Chromium151.0.7922.34, FFmpeg6.1.1. Exact existing executable paths and SHA256 are in tools/runtime-profile.json. No npm install is required. All runtime calls MUST use the reviewed wrapper below; it validates hashes, pins output paths, redirects CLI home/cache into output/ and uses the offline preloader. Do not bypass it or execute any upstream setup/update command. You may read the wrapper/profile.

From this workspace:
- `node tools/runtime.mjs version` — actual CLI version.
- `node tools/runtime.mjs check` — actual selected composition check.
- `node tools/runtime.mjs render` — render the authorized MP4 now.
- `node tools/runtime.mjs inspect` — actual FFprobe metadata and three decoded PNGs at0.25/1/1.75seconds. These are output/ files and may be viewed with the existing image viewer.

Creation of output/ logs/cache/network-attempt records is authorized runtime bookkeeping. No project source edit, project history, cloud/provider operation or refresh is authorized. Known published runtime may attempt freshness requests; the preloader rejects and logs them. Do not equate denied requests with no attempts. Report an actual failure without acquiring dependencies or altering this interface. The prior identical composition rendered successfully using this runtime; your requested output still requires a fresh actual render.
