# Session State — Nocturne Redesign (handoff)

Last updated: 2026-10-18, end of session. Branch `new-design`, pushed to origin.
Start here tomorrow: read this file, then PLAN.md's Phase 2/3 sections.

## Goal
Implement the GitPilot Nocturne visual/UX redesign in the existing Tauri + React + TypeScript app while preserving current Git, identity, AI, merge/rebase, backup, and audit behavior.

## State
- **Phase 0 ✅ `d19825b`** — `docs/design/PLAN.md`: phases, bootstrap lists, DoD, status tracker.
- **Phase 1 ✅ `9df4627`** — Nocturne token layer (legacy `gp-*` tokens deliberately aliased to Nocturne values), Inter/JetBrains Mono fonts, Phosphor icons, shared UI primitives (`src/components/ui/*`), restyled `ToastContainer`.
- **Phase 2 🟡 `afc0a7b`** — shell code complete and committed; **visual verification pending** (user reported "major UI issues" mid-session, then said they have further issues to bring tomorrow):
  - Borderless window: `decorations: false` in `tauri.conf.json`; full macOS definition in `src-tauri/tauri.macos.conf.json` (`titleBarStyle: Overlay`, `hiddenTitle: true`).
  - `App.tsx` shell: `TitleBar` / `Sidebar` + main / `StatusBar`, with view routing (repos/library/settings).
  - New/rewritten: `TitleBar.tsx`, `Sidebar.tsx` (identity scopes), `StatusBar.tsx`; `SearchInput.tsx` is the ⌘K palette trigger.
  - `app-store.ts`: view routing, `identityScope`, `scopedIdentities()`, `lastScanAt`.
  - `SetupWizard.tsx`: isMac-aware step indicator (`top-[48px]` on macOS, `top-6` elsewhere) + drag strip for borderless windows.
  - Build status: `npm run build` ✅; `cargo`/`tauri dev` ✅ (window launches at 1280×860).

## Key learnings (read before touching the shell again)
1. **Tauri platform config arrays replace, not merge.** `tauri.macos.conf.json` must carry the *full* window definition (title/width/height/mins/decorations/titleBarStyle/hiddenTitle). A partial object silently resets the other keys to defaults — symptom seen: "Tauri App" title + 800×600 window.
2. **`hiddenTitle: true`** is required with Overlay style, else the window title text renders next to the traffic lights.
3. **Config is embedded at compile time** (`generate_context!`). Editing `tauri*.conf.json` does NOT trigger a cargo rebuild — `touch src-tauri/src/lib.rs` to force the dev watcher to re-embed and restart.
4. **Orphaned Vite on port 1420** after killing `tauri dev`: run `lsof -ti :1420 | xargs kill` before relaunching.
5. **Setup wizard gating**: `setup-store.ts checkNeedsSetup()` invokes `get_setting("setup_complete")`; the wizard shows unless it is `"true"`. Settings live in SQLite: `~/Library/Application Support/com.gitpilot.desktop/gitpilot.db` (`settings` table). This machine's DB is fresh (created 2026-10-18); `setup_complete='true'` was inserted so the app opens straight into the shell.
6. **openssl-sys 0.9.117** in `src-tauri/Cargo.lock` is required for Homebrew OpenSSL 4.x (0.9.111 fails to build).
7. **Tauri v2 drag regions**: the injected script checks the clicked element itself, not ancestors — nested buttons inside a `data-tauri-drag-region` parent are fine.

## Next (tomorrow)
1. **Collect the user's other UI issues** — they said "i have other issue also". Get screenshots, fix, re-verify.
2. Finish Phase 2 verification checklist: window drag from title bar; macOS traffic lights visible/positioned (adjust `tauri.macos.conf.json` if needed); sidebar identity scopes filter the repos view; StatusBar visible/total counts + backup status; library/settings placeholder routes render.
3. Once green: mark Phase 2 ✅ in PLAN.md with the final commit hash; commit + push.
4. Start **Phase 3** (repo list table): read `RepoCard.tsx`, `IdentitySection.tsx`, `FilterBar.tsx`, `SearchInput.tsx`, `stores/types.ts`, `src-tauri/src/scanner.rs`; add Rust conflict detection to scanner output; extend `RepoInfo` with `in_conflict`; replace the card/section list with a virtualized repo table + filters + group-by-identity + sorting + keyboard navigation.

## Environment notes
- Run the app: `npm run tauri dev` (Vite on 1420; logs to `/tmp/tauri-dev*.log`).
- Frontend gate: `npm run build` (tsc + vite).
- Inspect app data: `sqlite3 ~/Library/Application\ Support/com.gitpilot.desktop/gitpilot.db` (tables: repositories, identities, identity_rules, settings, backups, audit_log).
