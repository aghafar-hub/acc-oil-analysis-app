# Documentation

Start here, then follow whichever doc matches what you need:

| Doc                                  | What's in it                                                              |
| ------------------------------------ | ------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How the app is put together: data flow, state, the sync-bug fix, diagrams |
| [CODE_GUIDE.md](./CODE_GUIDE.md)     | A walkthrough of every file in `src/` — what it does and why              |
| [SHEET_SCHEMA.md](./SHEET_SCHEMA.md) | The exact Google Sheet column layout this app reads/writes                |
| [API_CONTRACT.md](./API_CONTRACT.md) | The Apps Script webhook endpoints (requests/responses)                    |
| [DEPLOYMENT.md](./DEPLOYMENT.md)     | Local dev, build, CI, and deploying to a static host                      |

## The short version

This app is the UI for an oil-analysis tracking workflow used by Arabian
Cement's reliability team. All of its data — equipment samples, the action
tracker, the oil change log — lives in a **Google Sheet**. A **Google Apps
Script**, deployed as a Web App, sits between this React app and that sheet:
the app calls it over HTTP, and it reads/writes the sheet on the app's
behalf. There is no separate database and no backend server to host — the
Sheet _is_ the database.

This is a rebuild of an earlier version of this app (`oil-analysis-app`)
that had a real, reproducible bug: edits made to an action from the Oil
Analysis Report page would appear to save, then silently disappear on the
next sync. [ARCHITECTURE.md](./ARCHITECTURE.md#the-sync-bug-and-its-fix)
explains exactly what caused that and how this codebase avoids it.
