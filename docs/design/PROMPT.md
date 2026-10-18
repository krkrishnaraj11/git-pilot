# Prompt for Claude Code

Paste everything below the line into Claude Code, run from the root of the git-pilot repo, after copying this `design_handoff_gitpilot_redesign/` folder into the repo (e.g. `docs/design/`).

---

You are doing a complete visual and UX revamp of GitPilot (Tauri + React + TypeScript native Git client). The design is in `docs/design/design_handoff_gitpilot_redesign/`. Read `README.md` there first, then open `GitPilot Redesign.dc.html` and `GitPilot Flows.dc.html` in a browser (or read their source) as the visual spec, and `nocturne-styles.css` for tokens. The HTML files are references, not code to ship. Recreate them in this codebase's own patterns.

## Rules
- Follow the design exactly for layout, spacing, color, type and copy. Take colors and spacing from tokens (CSS variables), never hard-coded hex in components.
- Keep all existing functionality working (scan, identities, status, AI commit, merge/rebase, conflicts, backups, audit log, sync). This is a redesign plus the changes below, not a rewrite of Git logic. Do not change Rust/Tauri commands unless a section below requires it.
- Work in the order below. After each step: type-check, run the app, and commit with a clear message. Do not start the next step with a broken build.
- Before starting, read the current components (`App.tsx`, TitleBar, StatsStrip, FilterBar, IdentitySection, RepoCard, StatusBar, SetupWizard, SplashScreen, AiStatusIndicator, MergeWizard, ConflictResolver, BackupManager, AuditLog, IdentityManager, SyncModal) and the stores. Write a short plan mapping each old component to its replacement and list anything in the design that has no data source yet. Show me the plan, then proceed unless I object.
- Use Radix primitives where they exist (menus, dialogs, tooltips, popovers, radio groups), styled to the tokens.
- Accessibility: visible `:focus-visible` ring (2px accent, 2px offset), full keyboard operation of the list, text contrast 4.5:1, min text size 12px.

## Design direction
IDE-native, flat-utilitarian, dark-first. Inter for UI, JetBrains Mono for data (branches, paths, counts, diffs). Sentence case; no uppercase letter-spaced micro-labels except sidebar section captions. Phosphor icons. 8px radius, 1px borders, elevation only on menus, dialogs and the operation tray. Primary buttons are accent-outlined, not filled. Theme must be token-driven so a light theme is a later remap.

## Steps

### 1. Tokens and theme
- Add the Nocturne tokens as CSS variables (ground #161826, panel #111320, surface #1b1d2c, borders #232532/#292b31/#3f424d, text #e9e9ed, muted #75798c/#9397ab, accent #9184d9; state colors changed #d9a24f, staged #6f9ae0, ahead/ok #62b98a, behind/error #e0706f; tinted state backgrounds #17261f, #2a2417, #2a1c20, #17202f).
- Identity colors are user-assignable from a fixed palette of 8 (defaults: Work #9184d9, Personal #6bb5a6, Freelance #c79a8a). Store the chosen color on the identity.
- Load Inter and JetBrains Mono (bundled locally, not from a CDN, since this is a desktop app). Replace Plus Jakarta Sans. Type scale: title 20/500, body 13/400, label 12/400, data 12 mono, diff 12.5/22 mono.
- Replace ad hoc inline styles with a small set of shared primitives: Button, IconButton, Tag, Input, SegmentedControl, Row, Panel, Kbd, StatusDot, Popover, Tray. Build them once; use them everywhere.

### 2. App shell
- Custom title bar: Tauri `decorations: false`, `data-tauri-drag-region`. 40px. Left: window controls (macOS traffic lights; implement Windows/Linux controls on the right on those platforms) and logo. Center: search field opening the command palette (Cmd/Ctrl+K). Right: AI engine status (opens the AI menu), "Rescanned Nm ago" with a rescan button, settings. Remove the live clock.
- Left sidebar 232px: "Identity" scope list (All identities + each identity with color and repo count), mismatch notice, "Library" (Backups, Audit log, Identity rules), footer with scan root and counts.
- Bottom status bar 28px with "N of M repos", key hints, backup status.
- Rounded 12px window shape is a design-mock detail; use the native window frame.

### 3. Repository list (replaces the card grid)
- Dense table, 32px rows, virtualized (30 to 500+ repos). Columns: identity marker, name + mono path (+ mismatch warning icon), branch, working tree (changed N amber, staged N blue, conflict red, or "clean"), remote (ahead N green, behind N red, or "synced"), last activity, next action.
- Next action always visible, one per row: Resolve (conflict), Commit (changed/staged), Push (ahead), Pull (behind), none when clean/synced.
- Default sort by urgency (conflict, changed/staged, ahead, behind, clean); also sort by name or last activity.
- Toolbar: segmented state filter (All, Changed, Ahead, Behind, Conflicts, Clean) with live counts, "Group by identity" toggle (default off; when on, group header rows with color, name, email, count), sort menu, Add folder.
- Keyboard: up/down, Enter opens detail, C commit, P push, L pull, / or Cmd+K search, Space selects, Esc clears. Selected row: tinted background plus 2px accent bar.
- Remove: card grid, stat-pill strip, collapsible identity sections as the default hierarchy, hover-reveal overlay.

### 4. Repo detail
- Header 64px: back, identity and repo breadcrumb, branch picker pill, ahead/behind, Fetch / Merge… / Rebase… / Push. Tabs: Changes, History, Branches, Backups, Activity.
- Changes tab: three panes (300px file lists for staged and changes, flexible diff, 340px AI commit panel). Diff add background #17261f, delete #2a1c20, line numbers, inset 2px bar.
- AI commit panel: generated subject and body, Regenerate, Shorter, identity-match banner (green when the repo email matches its identity rule; amber with a one-click "Apply Work identity" when not), primary "Commit N files" (Cmd+Enter) and secondary "Commit and push". Block commits on identity mismatch unless the user confirms.

### 5. Startup, walkthrough, AI engine
- Splash: left-aligned logo, progress line, boot step list with status icons.
- Walkthrough in a 280px-rail window, 4 steps: Welcome, Repos and identities (new: pick scan folder, show found count, detected identities table with suggested path rules, editable), AI engine, Ready (summary and live test prompt on a sample diff).
- Replace the single hard-wired LLM runner with a runner interface: `detect()`, `listModels()`, `ensureModel()`, `generate()`, `health()`. Implement: built-in engine (default, bundled runtime that downloads a GGUF as today), Ollama (localhost:11434), LM Studio (local server), custom OpenAI-compatible endpoint. Persist the chosen runner and model in settings.
- Default models Gemma 3 1B / 4B (recommended) / 12B. Use real file sizes and URLs. Detect RAM/chip and mark which models fit. Download step: progress, speed, ETA, cancel, verify checksum, start engine, run a test prompt. Replace the auto-rotating tips carousel with the 3 static tip cards.
- AI engine menu from the title bar: status, runner picker, model list with Use/Download, Test.
- All AI runs locally; never send diffs or file contents off-machine. Say so in the UI as designed.

### 6. Merge and rebase workspace
- Replace the modal wizard with a full-window workspace: header with branch pill to branch pill, step indicator (Choose, Preview, Backup, Resolve, Finish), conflicting-file list on the left with resolved state, current vs incoming panes, AI suggested resolution (confidence, model, time, reasoning, Accept, Use current, Use incoming), Edit manually. Footer: Abort (restores pre-merge state) and Finish (disabled until all files are resolved, shows files left). Show the auto-created backup branch.
- Rebase uses the same layout. Keep the existing backup-before-operation behavior.

### 7. Library and operation tray
- Pages, not modals: Audit log (filters, table, Export CSV), Backups (per-repo, operation tag, commit, branch, age, two-step Restore confirm, retention setting), Identity rules (identity list, name/email fields, path and remote rules with matched-repo counts, mismatch alert with one-click apply).
- Operation tray bottom right for push/pull/fetch: progress, cancel, success, and error with a recovery action (e.g. "Pull and retry"). Replaces the sync modal.

### 8. Additions
- Command palette (Cmd/Ctrl+K): switch repo, run commit/push/pull/fetch on the selected repo, open Library pages, "Pull all behind (N)", change AI model.
- Bulk actions: multi-select rows, bulk Pull / Push / Fetch with per-repo results in the tray.
- Settings page: scan folders, AI engine, backup retention, shortcuts, plan.
- Empty, error, offline states: no repos found, engine not running, repo path moved, push rejected.

### 9. Free and paid plans (not yet designed; build the plumbing, then the screens as specified)
- Build entitlements behind an interface: `entitlements` store with `plan`, `features`, `limits`; a `<Gate feature="...">` component and `useEntitlement()` hook. No scattered plan checks.
- Free: scan, list, filters, commit, push/pull, diff, basic merge/rebase, local AI with the 1B/4B model, backups, audit log, up to 2 identities. Pro: larger models, AI conflict resolution, bulk actions, unlimited identities, optional GitHub/GitLab status, background fetch, identity-rule sync. Keep the split in one config file so it is easy to change.
- UI: plan chip in the title bar next to AI status opening a plan sheet (Free vs Pro comparison); locked features stay visible with a lock icon and an inline note, never hidden; soft-limit meter in the sidebar ("2 of 2 identities"); upgrade prompt only when a gated action is attempted; Settings > Plan with license key or sign-in, manage, restore; expired and offline states.
- Licensing is offline-safe: cache the entitlement locally with a grace period. Never gate core Git operations on network access. Subscription vs one-time license is undecided: leave the billing provider behind an adapter and ask me before wiring one.

### 10. Cleanup
- Delete the replaced components and unused styles (card grid, stat pills, hover overlay, modal wizards, clock, Plus Jakarta Sans). Update tests. Update the README with the new structure and tokens.

## Definition of done
- Every artboard in the two HTML references has a matching screen in the app, pixel-checked against the reference at 1440x900 and 1120x720.
- Keyboard-only use of the list, detail, merge workspace and palette works.
- No hard-coded colors outside the token file. Type check, lint and tests pass. App builds with `tauri build`.
- A short CHANGELOG entry lists removed components, new settings keys (runner, model, entitlements), and any data migrations (identity color, runner/model).

When something in the design is ambiguous or has no data source, make the smallest reasonable choice, note it in the PR description, and continue; ask me only about the billing model and anything destructive.
