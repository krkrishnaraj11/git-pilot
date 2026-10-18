# GitPilot Redesign — Implementation Plan

Full visual/UX revamp per the `docs/design/` handoff (Nocturne design system).
This file is the single source of truth for execution. **Each phase below is sized to run in a fresh session**: start by reading this file, then the phase's Bootstrap list — nothing else.

## Fresh-session protocol
1. Read this file (PLAN.md).
2. Read the phase's **Bootstrap** list — nothing else from the codebase.
3. Open the referenced artboard(s) in `GitPilot Redesign.dc.html` / `GitPilot Flows.dc.html` (in a browser, or read the source) for pixel-level fidelity.
4. Execute the phase's steps in order. After each step: `npm run build` (tsc + vite) must pass; run the app and verify visually.
5. Commit with the suggested message (or a clear equivalent). Never start the next phase on a broken build.
6. Check off the DoD items in the status tracker; note any deviations in the commit message / PR description.

## Global rules
- All colors/spacing/radius/shadows come from tokens (Tailwind v4 `@theme` vars in `src/index.css`). **Zero hard-coded hex in components.**
- Inter for UI, JetBrains Mono for data (branches, paths, counts, diffs). Min text 12px. Sentence case; no letter-spaced micro-labels except sidebar section captions.
- Phosphor icons (`@phosphor-icons/react`). 8px radius, 1px borders. Elevation only on menus/dialogs/tray. Primary buttons are accent-outlined, never filled.
- A11y: `:focus-visible` = 2px accent outline + 2px offset (global in index.css); full keyboard operation of list, detail, merge workspace, palette; contrast ≥ 4.5:1.
- Use Radix primitives where they exist (dialog, dropdown-menu, tabs, tooltip, popover, scroll-area); style to tokens.
- Do not change Rust/Tauri commands unless a phase explicitly requires it (phases 3 and 5 do).
- All AI runs locally; never send diffs/file contents off-machine. Say so in UI copy as designed.
- No tests exist in the repo; "tests pass" = `tsc` + vite build + manual verification.
- Environment: if `node`/`npm` are not on PATH in the agent shell, source the user's node setup or ask the user to run `npm run tauri dev` in their terminal.

## Codebase map (verified 2026-10-18, branch `new-design`)
| Layer | What exists |
|---|---|
| Frontend stack | React 19 + TS, Vite 7, Tailwind v4 (CSS-first `@theme` in src/index.css), zustand, CVA + clsx + tailwind-merge |
| Radix installed | dialog, dropdown-menu, tabs, tooltip, scroll-area, collapsible, separator, slot (add: popover) |
| Other deps | cmdk (palette), lucide-react (→ replace with Phosphor), @fontsource plus-jakarta-sans + jetbrains-mono, Tauri v2 api + dialog/fs/shell plugins |
| Stores (src/stores) | app-store.ts (901 lines: repos, identities, filters, syncOp, commit dialog, stats), ai-store.ts (134), setup-store.ts (157), types.ts (251) |
| Components (src/components, 25 files ~4.8k lines) | biggest: MergeWizard 682, IdentityManager 577, RepoDetail 561, SetupWizard 495, CommitDialog 480, AiStatusIndicator 345, BranchManager 304, RepoCard 281 |
| Rust (src-tauri/src, 13 modules ~4.3k lines) | git_ops 820, merge 564, model_manager 511, ai 487, rebase 344, db 337, scanner 301, sidecar 207, commands 209, backup 189, lib 163 (handler registry), watcher 111, matcher 91 |
| Tauri commands (lib.rs generate_handler) | scanner: scan_directory, get_identities, pick_folder · identity/rules/audit/settings CRUD (save_identity, get_all_identities, delete_identity, save_rule, get_rules_for_identity, get_all_rules, delete_rule, log_action, get_audit_log, set_setting, get_setting) · matching: scan_directory_with_matching, apply_identity_to_repo · git_ops: get_repo_diff, stage_files, unstage_files, stage_all, commit, push, pull, get_branches, switch_branch, create_branch, checkout_remote_branch, delete_branch, get_commit_log, get_stashes, stash_save/apply/drop · ai: check_ai_status, generate_commit_message(_stream), explain_diff · sidecar: start/stop/restart_llama_server, get_llama_server_status · model_manager: get_available_models, get_downloaded_models, download_model, delete_model, cancel_download, check_llama_server_binary, ensure_llama_server · backup: create_backup, restore_backup, list_backups, cleanup_old_backups · merge: preview_merge, execute_merge, resolve_conflict, abort_merge, ai_resolve_conflict · rebase: preview/execute/continue/skip/abort + ai resolve · watcher: start_watching |
| Config | tauri.conf.json: 1280×860, decorations not disabled (default frame) |
| Tests | none exist |

App flow today (src/App.tsx): needsSetup → SetupWizard; isInitializing → SplashScreen; else TitleBar + StatsStrip + MismatchBanner + FilterBar/SearchModal row + main (IdentitySection → RepoCard grid) + StatusBar; overlays: IdentityManager, AuditLog, RepoDetail, AiCommitPanel, MergeWizard/RebaseWizard, BackupManager, SyncModal, ToastContainer.

## Design reference index (docs/design/)
| Artboard | File / section | Content |
|---|---|---|
| 1a | GitPilot Redesign.dc.html #1a | Direction, pushbacks (01–05), color swatches, type scale |
| 1b | GitPilot Redesign.dc.html #1b | Repo list: title bar, sidebar, toolbar (filter/group/sort/add folder), dense table, status bar — interactive |
| 1c | GitPilot Redesign.dc.html #1c | Repo detail: header, tabs, 3-pane (files/diff/AI commit) |
| 2a | GitPilot Flows.dc.html #2a | Splash: logo, progress line, boot steps |
| 2b–2f | Flows #2b…#2f | Walkthrough (280px rail): Welcome / Repos+identities / AI engine / Download / Ready |
| 2g | Flows #2g | Merge workspace (full window, step 4 of 5 shown) |
| 2h | Flows #2h | Library pages: Audit log / Backups / Identity rules (sidebar nav) |
| 2i | Flows #2i | AI engine menu popover + operation tray cards |
| tokens | nocturne-styles.css, README.md | Nocturne token values (source of truth for hex) |

## Tokens (Nocturne → Tailwind v4 `@theme` in src/index.css)
| Role | Token | Value |
|---|---|---|
| Ground (app bg) | --color-ground | #161826 |
| Panel (sidebar, title bar) | --color-panel | #111320 |
| Surface (inputs, hover) | --color-surface | #1b1d2c |
| Border (row/section) | --color-border | #232532 |
| Border (control) | --color-border-2 | #292b31 |
| Border (strong) | --color-border-3 | #3f424d |
| Text primary | --color-text | #e9e9ed |
| Muted 1 | --color-muted | #75798c |
| Muted 2 | --color-muted-2 | #9397ab |
| Accent (selection/focus) | --color-accent | #9184d9 |
| Accent tint (selection bg) | --color-accent-tint | #2b2741 |
| Text on accent | --color-accent-text | #d2cefd |
| Accent (button border) | --color-accent-600 | #796cbf |
| Accent (bright text) | --color-accent-300 | #d2cefd / #b5abfc |
| State: changed (amber) | --color-changed | #d9a24f |
| State: staged (blue) | --color-staged | #6f9ae0 |
| State: ahead/ok (green) | --color-ok | #62b98a |
| State: behind/error (red) | --color-error | #e0706f |
| Tint bg: ok | --color-tint-ok | #17261f |
| Tint bg: warn | --color-tint-warn | #2a2417 |
| Tint bg: error | --color-tint-error | #2a1c20 |
| Tint bg: info | --color-tint-info | #17202f |
| Identity palette (8, user-assignable) | --color-id-1…8 | #9184d9 (Work), #6bb5a6 (Personal), #c79a8a (Freelance) + 5 more from Nocturne ramps |

Type scale: title 20/500 Inter · body 13/400 Inter · label 12/400 Inter · data 12 JetBrains Mono · diff 12.5/22 JetBrains Mono.

## Cross-cutting decisions (already made — do not re-litigate)
- Fonts: add `@fontsource/inter` (400/500/600), remove `@fontsource/plus-jakarta-sans`. JetBrains Mono stays.
- Icons: add `@phosphor-icons/react`, remove `lucide-react`.
- Radix: add `@radix-ui/react-popover` (AI engine menu). Runner/model pickers = buttons with ARIA radio semantics (design uses card-style radios, not native ones).
- Virtualization: hand-rolled `useVirtualList` hook (fixed 32px rows, ~15 visible + overscan; supports optional 30px group-header rows). No new dependency.
- Window: tauri.conf.json → `decorations: false`; macOS keeps traffic lights (overlay title-bar style); Windows/Linux get JS-side min/max/close via `@tauri-apps/api` window controls (no Rust needed).
- View routing: simple in-store view state (`repositories` | `library:audit|backups|identities` | `settings`) — no router library.
- Identity colors: fixed 8-color palette; chosen color stored on the identity (DbIdentity.color already exists).
- Billing: adapter stub only, never wired. Ask the user before wiring any billing provider.

## Component mapping (old → new)
| Current component | Disposition |
|---|---|
| TitleBar (130) | Rewrite — 40px drag region, ⌘K search field, AI status (opens menu), "Rescanned Nm ago" + rescan, settings, plan chip. Clock removed |
| StatsStrip (105) | Delete — replaced by segmented state filter with counts in the list toolbar |
| FilterBar (88) | Replace — new SegmentedControl: All / Changed / Ahead / Behind / Conflicts / Clean |
| SearchInput/SearchModal (390) | Replace — CommandPalette on cmdk: switch repo, commit/push/pull/fetch on selected, open Library pages, "Pull all behind (N)", change AI model |
| IdentitySection (114) | Delete as default hierarchy — becomes optional "Group by identity" header rows (default off) |
| RepoCard (281) | Delete — replaced by 32px RepoRow in virtualized table |
| App main area (card grid) | Replace — 232px Sidebar + content routing (Repositories / Library pages / Settings) |
| StatusBar (42) | Rewrite — "N of M repos", key hints, backup status |
| RepoDetail (561) | Rewrite — 64px header (breadcrumb, branch pill, ahead/behind, Fetch/Merge…/Rebase…/Push); tabs History/Branches/Backups/Activity; 300px file panes + diff + 340px AI commit panel |
| AiCommitPanel (251) | Rewrite as detail's right pane — identity-match banner, commit guard on mismatch, ⌘⏎ |
| CommitDialog (480) | Delete — folded into AI commit panel; keyboard C focuses it |
| MergeWizard + RebaseWizard (682) | Delete — new full-window MergeWorkspace (both ops, same layout) |
| ConflictResolver (178) | Fold into workspace Resolve step (current/incoming panes + AI suggestion) |
| SyncModal (253) | Delete — new bottom-right OperationTray (progress, cancel, error + recovery) |
| BackupManager (155) | Replace — Library page: Backups (two-step restore, retention) |
| AuditLog (168) | Replace — Library page: Audit log (filters, table, Export CSV) |
| IdentityManager (577) + IdentityRuleEditor (153) | Replace — Library page: Identity rules (+ color palette picker, mismatch apply) |
| IdentityMismatchWarning (99) | Split — sidebar notice + row warning icon + commit-panel check |
| SplashScreen (173) | Rewrite per artboard 2a |
| SetupWizard (495) | Rewrite — 280px-rail, 4 steps per 2b–2f (new "Repos and identities" step) |
| AiStatusIndicator (345) | Rewrite — title-bar status + AI engine menu popover per 2i |
| DiffViewer (244) | Restyle — Nocturne diff tokens, line numbers, inset 2px bar |
| BranchManager (304) | Restyle into detail's Branches tab |
| ToastContainer (95) | Keep, restyle — minor feedback only; ops move to tray |

New files: Sidebar, RepoListTable/RepoRow + useVirtualList, CommandPalette, OperationTray, MergeWorkspace, LibraryPage shell + 3 pages, SettingsPage, AiEngineMenu, PlanSheet/Gate + entitlements store + plan config, primitives (Button, IconButton, Tag, Input, SegmentedControl, Kbd, StatusDot, Panel, Popover).

## Data source gaps (design has no data yet) → where they come from
| Gap | Source |
|---|---|
| Conflict state in repo list (Resolve action, red marker) | Rust: scanner.rs detects merge/rebase state (MERGE_HEAD / rebase dir, UU files) → add `in_conflict` to RepoInfo |
| Runner-agnostic AI (Ollama / LM Studio / custom endpoint) | Rust: new commands — detect + list models per runner; refactor ai.rs behind a runner interface |
| "Which models fit" (RAM/chip detection) | Rust: new command (sysinfo/sysctl) |
| Identity colors, user-assignable from 8-color palette | Frontend only — DbIdentity.color exists; add palette + picker |
| Rescan recency, "N of M repos" | Frontend timestamps/counts only |
| Audit CSV export | Frontend blob download (plugin-fs available if a save dialog is wanted) |
| Backup retention setting | cleanup_old_backups exists; add settings key + UI |
| Multiple scan folders ("Add folder") | Frontend loops existing scan_directory_with_matching per root; settings stores list |
| Free/Pro entitlements | All new, frontend: entitlements store (local cache + grace period), one config file, Gate/useEntitlement. No billing provider wired |

## Phases

### Phase 0 — Persist plan + baseline
- **Bootstrap:** none (setup phase).
- **Steps:** write this PLAN.md; verify `npm run build` passes on current code (baseline); commit `docs/` (design handoff + plan).
- **DoD:** plan committed; baseline build green; branch `new-design` clean.
- **Commit:** `docs: add design handoff and phased implementation plan`

### Phase 1 — Tokens, fonts, icons, primitives
- **Bootstrap (read first):** `src/index.css`; `package.json`; `docs/design/nocturne-styles.css` (tokens section); artboard **1a**.
- **Steps:**
  1. Replace `@theme` in index.css with Nocturne tokens (table above) + type-scale vars; keep animation keyframes for now (cleanup in phase 9); add global `:focus-visible` ring; scrollbar tokens.
  2. package.json: add `@fontsource/inter`, `@phosphor-icons/react`, `@radix-ui/react-popover`; remove plus-jakarta-sans + lucide-react. Update index.css font imports.
  3. Build primitives in `src/components/ui/`: Button (primary = accent-outlined, secondary, ghost, danger-outline; sizes sm/md), IconButton, Tag (state variants from tint tokens), Input, SegmentedControl, Kbd, StatusDot, Panel, Popover (Radix wrapper), TrayCard shell. CVA-based like existing code.
  4. Token aliasing (deviation, decided in-session): redefine the legacy `--color-gp-*` tokens inside @theme with Nocturne values, so all 25 existing components (most deleted/rewritten in phases 2–8) pick up the new palette with zero class changes. New code uses canonical token names (ground/panel/surface/text/muted/accent/state). Aliases removed in phase 9.
  5. lucide-react is an unused dep (0 imports — icons are inline SVGs): remove from package.json; Phosphor is used in new/rewritten components.
- **Files:** index.css, package.json, new `src/components/ui/*` (~10 files), ToastContainer (restyle with primitives + Phosphor).
- **DoD:** app runs with Nocturne palette (via aliases); build green; primitives used by ToastContainer; no hard-coded hex in new code.
- **Commit:** `feat(theme): Nocturne tokens, Inter + Phosphor, shared UI primitives`

### Phase 2 — App shell
- **Bootstrap:** `src/App.tsx`; `components/TitleBar.tsx`, `StatusBar.tsx`; `tauri.conf.json`; `stores/app-store.ts` (state shape + initializeApp); artboards **1b** (chrome) + **2h** (title bar/sidebar).
- **Steps:**
  1. tauri.conf.json: `decorations: false` (+ macOS overlay title-bar style); JS window controls for non-mac.
  2. Rewrite TitleBar: 40px, `data-tauri-drag-region`; left: traffic lights (mac) + logo; center: search field (opens palette — placeholder button until phase 8); right: AI status chip (placeholder until phases 5/7), "Rescanned Nm ago" + rescan button, settings icon. Remove clock if present.
  3. New Sidebar (232px): Identity section caption + scope list (All identities + each identity: color dot, name, repo count) from app-store; mismatch notice (amber tint card); Library section: Backups / Audit log / Identity rules nav items; footer: scan root + "N repos · M identities".
  4. New StatusBar (28px): "N of M repos" + key hints (↑↓ ⏎ C P) + "Backups on".
  5. App.tsx: view routing (`repositories` | `library:*` | `settings`); shell = TitleBar / [Sidebar + main] / StatusBar; keep old list rendering inside repositories view temporarily (phase 3 replaces); delete StatsStrip + MismatchBanner from shell.
  6. app-store: add `view` state + setters; `lastScanAt` timestamp for rescan recency.
- **Rust:** none (config only).
- **DoD:** shell matches 1b chrome at 1440×900 and 1120×720; sidebar scopes filter the (old) list; library nav shows placeholder pages.
- **Commit:** `feat(shell): custom title bar, sidebar scopes, status bar, view routing`

### Phase 3 — Repo list table
- **Bootstrap:** `components/RepoCard.tsx`, `IdentitySection.tsx`, `FilterBar.tsx`, `SearchInput.tsx`; `stores/app-store.ts` (901), `types.ts`; `src-tauri/src/scanner.rs`; artboard **1b** (full).
- **Steps:**
  1. Rust scanner.rs: detect conflict state (MERGE_HEAD / rebase-merge|rebase-apply dir, or UU entries in status) → add `in_conflict: bool` to RepoInfo (keep existing status enum; frontend derives display). Rebuild + verify.
  2. types.ts: add `in_conflict` to RepoInfo; new filter set: all | changed | ahead | behind | conflict | clean (changed = uncommitted or staged; map old values for compat).
  3. New RepoListTable + RepoRow (32px, grid columns per artboard: 40 identity marker | name+path (+mismatch icon) | branch | working tree (changed amber / staged blue / conflict red / clean) | remote (↑N green ↓N red / synced) | last activity | next action). Next action: Resolve (conflict, error outline) / Commit (changed|staged, accent) / Push (ahead) / Pull (behind) / none.
  4. useVirtualList hook: fixed-height windowing, ~15 visible + overscan; supports 30px group-header rows.
  5. Toolbar: SegmentedControl filter with live counts; "Group by identity" toggle (default off → group header rows: color, name, email, count); sort menu (urgency default: conflict > changed/staged > ahead > behind > clean; name; last activity); Add folder button.
  6. Keyboard: ↑↓ move, ⏎ open detail, C commit, P push, L pull, / or ⌘K search (palette placeholder), Space select, Esc clear; selection = accent-tint bg + 2px inset accent bar.
  7. Delete: RepoCard, IdentitySection, StatsStrip, old FilterBar; wire sidebar scope + mismatch notice to store.
- **Rust:** yes — scanner conflict detection (only Rust change in this phase).
- **DoD:** 22-repo mock list matches artboard; keyboard-only usable; conflict row shows Resolve and opens merge workspace (placeholder until phase 6); urgency sort correct.
- **Commit:** `feat(list): virtualized repo table with filters, scopes, group-by, keyboard nav`

### Phase 4 — Repo detail
- **Bootstrap:** `components/RepoDetail.tsx`, `AiCommitPanel.tsx`, `CommitDialog.tsx`, `DiffViewer.tsx`, `BranchManager.tsx`; `stores/app-store.ts`, `ai-store.ts`; artboard **1c**.
- **Steps:**
  1. Header (64px): back, identity dot + name / repo breadcrumb; branch picker pill (Radix dropdown: local/remote branches, switch/create/checkout); ahead/behind mono; Fetch / Merge… / Rebase… / Push buttons (Merge/Rebase open workspace — placeholder until phase 6; Push via tray — placeholder until phase 7, toast for now).
  2. Tabs (Radix): Changes / History / Branches / Backups / Activity with counts.
  3. Changes tab: 300px file pane (Staged section + Changes section, status letters A/M/D colored, dir path muted mono); diff pane (Nocturne: add bg tint-ok + inset 2px ok bar, delete tint-error; dual line numbers; hunk headers); 340px AI commit pane.
  4. AI commit pane: generated subject (mono, bright) + body; "from N staged files"; Regenerate / Shorter; identity-match banner (green tint: "Committing as Name <email> — matches the Work identity rule"; amber + one-click "Apply Work identity to this repo" on mismatch); primary "Commit N files ⌘⏎" (accent outline) + secondary "Commit and push"; **commit guard**: on mismatch, block until user confirms (inline confirm) or applies identity.
  5. History tab: commit log list (existing get_commit_log). Branches tab: restyled BranchManager. Backups tab: per-repo backup list (existing list_backups) with restore → links to library page. Activity tab: watcher events / recent ops (minimal).
  6. Delete CommitDialog; keyboard C in detail focuses commit pane.
- **Rust:** none (all commands exist).
- **DoD:** matches 1c; commit flow works end-to-end incl. mismatch block + apply-identity; diff renders with tokens.
- **Commit:** `feat(detail): three-pane repo detail with AI commit panel and identity guard`

### Phase 5 — Startup, walkthrough, AI runner
- **Bootstrap:** `components/SetupWizard.tsx`, `SplashScreen.tsx`, `AiStatusIndicator.tsx`; `stores/setup-store.ts`, `ai-store.ts`; Rust: `src-tauri/src/ai.rs` (487), `sidecar.rs` (207), `model_manager.rs` (511); artboards **2a–2f**.
- **Steps:**
  1. Rust runner abstraction in ai.rs: `AiRunner` trait { detect(), list_models(), ensure_model(), generate(), health() }; impls: BuiltIn (existing llama-server sidecar path), Ollama (HTTP localhost:11434 /api/tags, /api/generate), LmStudio (HTTP localhost:1234 v1/models), CustomOpenAI (user URL, /v1/models). New commands: `detect_ai_runners`, `list_runner_models { runner }`, `get_system_info` (RAM/chip). Register in lib.rs.
  2. Model catalog: Gemma 3 1B / 4B (recommended) / 12B with real GGUF filenames, URLs, sizes; mark which fit detected RAM.
  3. Settings keys: `ai_runner` (builtin|ollama|lmstudio|custom), `ai_model`, custom endpoint URL. Migration: existing users with active_model → runner=builtin, model preserved.
  4. ai-store: runner state (status per runner), models, active model; generate() routes to active runner.
  5. Splash per 2a: left-aligned logo + tagline, progress line, boot step list (settings/db/identities/scan/engine) with status icons + timings.
  6. Walkthrough per 2b–2f (280px rail, 4 steps): Welcome (feature list) / Repos+identities (folder picker + browse, found count, detected identities table with suggested path rules, editable) / AI engine (runner cards w/ detect status tags: Recommended/Detected/Not running/Advanced; model list with fit + size + speed; CTA varies by runner: Download / Use Ollama / Check again / Connect) → Download step (progress, speed, ETA, cancel; steps: download/verify/start/test; 3 static tip cards) / Ready (summary cards + live test prompt on sample diff → generated message).
  7. setup-store: track step, folder, detected identities, runner/model choice; persist on finish.
- **Rust:** yes — runner abstraction + new commands (biggest Rust phase).
- **DoD:** first-run flow matches 2b–2f; switching runner/model works from walkthrough and later settings; existing llama path still functions (migration); engine status in title bar reflects active runner.
- **Commit:** `feat(ai): runner abstraction (builtin/Ollama/LM Studio/custom) + Gemma catalog` / `feat(setup): Nocturne splash and 4-step walkthrough`

### Phase 6 — Merge/rebase workspace
- **Bootstrap:** `components/MergeWizard.tsx` (682), `ConflictResolver.tsx`; `stores/app-store.ts` (merge/rebase state); Rust: `src-tauri/src/merge.rs` (564), `rebase.rs` (344) — read to confirm command shapes; artboard **2g**.
- **Steps:**
  1. New MergeWorkspace (full window, replaces modal): header = branch pill → arrow → branch pill + 5-step indicator (Choose / Preview / Backup / Resolve / Finish; done = green check, current = accent, future = muted).
  2. Left pane (280px): conflicting files list with state (unresolved = red lightning + tint, resolved = green check); backup-branch card at bottom (shield icon, branch name).
  3. Center: file path bar + "N conflicts" tag + Edit manually button; current vs incoming split panes (green/blue headers, tinted lines).
  4. Bottom: AI suggested resolution — header (sparkle, confidence tag, model + time), resolved code pane, reasoning column; Accept suggestion / Use current / Use incoming.
  5. Footer: "Nothing is committed until every file is resolved…" + Abort (error outline, restores pre-op state) + Finish (disabled until all resolved, "N files left").
  6. Rebase: same layout (step indicator adapts; conflict per commit step).
  7. Delete MergeWizard + RebaseWizard + ConflictResolver; wire entry points (detail header, list Resolve action).
- **Rust:** none (commands exist: preview/execute/resolve/abort + ai_resolve_conflict).
- **DoD:** matches 2g; merge with conflict resolves end-to-end (AI suggestion + manual); abort restores pre-merge state; rebase flow works.
- **Commit:** `feat(merge): full-window merge/rebase workspace with AI conflict resolution`

### Phase 7 — Library pages, operation tray, AI menu
- **Bootstrap:** `components/AuditLog.tsx`, `BackupManager.tsx`, `IdentityManager.tsx`, `IdentityRuleEditor.tsx`, `SyncModal.tsx`, `AiStatusIndicator.tsx`; `stores/app-store.ts` (syncOp); artboards **2h** + **2i**.
- **Steps:**
  1. LibraryPage shell (title row + content) + sidebar nav wiring (from phase 2).
  2. AuditLogPage: filter segmented (All/Applied/Mismatch/Created/Rules), table (when/action tag/identity dot+name/repo/details), Export CSV (frontend blob download).
  3. BackupsPage: repo selector, retention control ("Delete older than N days" → cleanup_old_backups), table (operation tag/commit hash/backup branch/created/restore with two-step confirm "Replaces current branch").
  4. IdentityRulesPage: identity list (color dot, name, email, repo count) + Add; detail pane: color palette picker (8), name/email fields, rules list (type/value/matched count/delete) + Add rule; mismatch alert card with one-click "Apply X identity to this repo".
  5. OperationTray (bottom-right, fixed): stack of op cards for push/pull/fetch — icon + title + mono detail + progress bar (indeterminate/percent) + Cancel; success = green check, auto-dismiss; error = red ring + recovery action ("Pull and retry"). Replace syncOp modal usage in app-store (keep store shape, render as tray).
  6. AiEngineMenu (Radix popover from title bar): status header (dot + "Running · <runner>"), Test button; runner picker row; model list (name, size·speed, In use/Use/Download actions).
  7. Delete SyncModal + old dialog versions of AuditLog/BackupManager/IdentityManager; restyle ToastContainer (minor feedback only).
- **Rust:** none (CSV via frontend blob).
- **DoD:** all three pages match 2h; push/pull/fetch run in tray per 2i incl. error recovery; AI menu matches 2i.
- **Commit:** `feat(library): audit/backups/identity-rules pages, operation tray, AI engine menu`

### Phase 8 — Palette, bulk actions, settings, plans
- **Bootstrap:** `components/SearchInput.tsx` (existing cmdk usage); `stores/app-store.ts`; README.md plan section.
- **Steps:**
  1. CommandPalette (cmdk, ⌘K): switch repo; run commit/push/pull/fetch on selected repo; open Library pages + Settings; "Pull all behind (N)"; change AI model.
  2. Bulk actions: multi-select rows (Space/shift+click), bulk Pull/Push/Fetch → per-repo results in tray.
  3. SettingsPage: scan folders (add/remove, list), AI engine (runner + model + custom URL — reuse phase 5 UI), backup retention, shortcuts list, Plan.
  4. Entitlements: `src/stores/entitlements.ts` (plan, features Record<FeatureKey,bool>, limits) + `src/config/plans.ts` (single source: Free = scan/list/filters/commit/push-pull/diff/basic merge-rebase/AI 1B+4B/backups/audit/2 identities; Pro = larger models, AI conflict resolution, bulk actions, unlimited identities, GitHub/GitLab status, background fetch, identity-rule sync); `<Gate feature>` component + `useEntitlement()` hook; local cache with grace period (offline-safe); never gate core git ops on network.
  5. Plan UI: chip in title bar next to AI status → PlanSheet (Free vs Pro comparison); locked features visible with lock icon + inline note; soft-limit meter in sidebar ("2 of 2 identities"); upgrade prompt only when a gated action is attempted; Settings > Plan (compare, license key entry or sign-in placeholder, manage, restore); expired + offline states.
  6. Billing: adapter interface stub only — **do not wire a provider** (ask user first).
- **Rust:** none.
- **DoD:** palette/bulk/settings/plan all functional; Free limits enforced declaratively via Gate (no scattered plan checks).
- **Commit:** `feat(plans): entitlements, command palette, bulk actions, settings`

### Phase 9 — States, cleanup, docs
- **Bootstrap:** `git grep` for deleted component names; README.md; CHANGELOG.md (create if absent).
- **Steps:**
  1. Empty/error/offline states per design language: no repos found (folder picker CTA), engine not running (title bar + AI menu + commit pane fallback: manual message), repo path moved, push rejected (tray recovery).
  2. Delete all replaced components + unused styles/animations in index.css; remove plus-jakarta dep if any residue.
  3. Grep audit: zero hard-coded hex outside index.css; remove `gp-*` alias tokens from @theme (zero `gp-` references anywhere); no dead imports.
  4. Update README (new structure, tokens, how to run) + CHANGELOG entry: removed components, new settings keys (ai_runner, ai_model, backup retention, entitlements), migrations (identity color, runner/model).
  5. Final: `tsc` + vite build + `tauri build`; pixel-check every artboard at 1440×900 and 1120×720.
- **DoD:** overall definition of done (below).
- **Commit:** `chore: remove replaced components, document tokens and structure`

## Overall definition of done (from PROMPT.md)
- Every artboard in the two HTML references has a matching screen, pixel-checked at 1440×900 and 1120×720.
- Keyboard-only use of list, detail, merge workspace, palette works.
- No hard-coded colors outside the token file; type-check + build pass; app builds with `tauri build`.
- CHANGELOG entry lists removed components, new settings keys (runner, model, entitlements), data migrations.

## Phase status tracker
| Phase | Status |
|---|---|
| 0 — Persist plan + baseline | ⬜ pending |
| 1 — Tokens, fonts, icons, primitives | ⬜ pending |
| 2 — App shell | ⬜ pending |
| 3 — Repo list table | ⬜ pending |
| 4 — Repo detail | ⬜ pending |
| 5 — Startup, walkthrough, AI runner | ⬜ pending |
| 6 — Merge/rebase workspace | ⬜ pending |
| 7 — Library pages, operation tray, AI menu | ⬜ pending |
| 8 — Palette, bulk actions, settings, plans | ⬜ pending |
| 9 — States, cleanup, docs | ⬜ pending |

Update this table as phases complete (⬜ → ✅, with date + commit hash).
