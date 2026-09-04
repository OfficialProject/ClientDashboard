This folder is named without a leading dot ONLY so it's visible in iOS's
Files app / zip extraction. Once you've imported this into Working Copy:

1. Rename "github-workflows-RENAME-TO-DOTGITHUB" back to ".github"
   (inside Working Copy's own file browser/rename tool - not Files app).
2. Confirm the path afterward is: .github/workflows/build-demoparser-wasm.yml
3. Delete this READ_ME_FIRST.txt file - it's not part of the repo.

If Working Copy won't let you type a leading dot when renaming, try
renaming via its "..." menu > Rename, or check if it has a raw
file-path/terminal-style rename option rather than a plain text field
(some iOS text fields auto-strip or reject a leading dot).
