# Legacy exact copy

This folder is a byte-for-byte copy of the original app (from the
`oil-analysis-app` repo's live `index.html` + `assets/index-U8zifJ6S.js`
bundle). The only change from the original files is the asset path in
`index.html` (`/oil-analysis-app/...` → `/acc-oil-analysis-app/...`),
required because this repo is hosted under a different path — nothing about
the app's code, behavior, or UI was touched.

**Why this exists:** the React rebuild under `src/` at the repo root was
built from screenshots and reverse-engineering the minified bundle, and it
diverged noticeably from the real app's actual screens, tabs, and workflow.
This folder is the ground truth to compare against (and currently what's
actually deployed — see `.github/workflows/deploy.yml`) while that gets
sorted out, rather than continuing to build on a UI that doesn't match.

This is still the same minified, sourceless bundle described in the main
`docs/` — editing it directly means patching compiled JS, not readable
source. It's here as a reference/staging point, not a long-term answer to
"real source code we can maintain."
