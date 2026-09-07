# demoparser2 WASM (vendored, static asset)

Populated automatically by `.github/workflows/build-demoparser-wasm.yml`, which builds the
WASM target directly from the current `LaihoE/demoparser` source - not the stale published
`demoparser2` npm package (that one was 27 versions and 4+ months behind the native
`@laihoe/demoparser2` build as of when this was set up, and almost certainly still missing
bug fixes like the delta-decoding fix that landed in the native 0.42.0 release).

Lives under `public/` (not `lib/` or a normal npm dependency) on purpose: this is a
`wasm-pack --target web` build, which is a plain ES module + `.wasm` binary meant to be
`fetch()`-ed by the browser at runtime, not bundled by webpack/Turbopack. `lib/demo-parser.ts`
loads it via a runtime `import()` of `/vendor/demoparser2-wasm/demoparser2.js`, with
`webpackIgnore` so Next's bundler doesn't try to statically resolve a file that won't exist
until CI has run at least once.

**Until that workflow has run, this directory (other than this README) is empty and demo
parsing will show as unavailable in the UI rather than break the build.**

To trigger the first build: GitHub repo -> Actions tab -> "Build demoparser2 WASM" -> Run
workflow. It also runs automatically every Monday to keep pace with upstream fixes.

`UPSTREAM_COMMIT.txt` (once it exists) records exactly which upstream commit was built, so
it's always traceable which fixes are and aren't included.
