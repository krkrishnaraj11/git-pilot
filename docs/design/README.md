# Handoff: GitPilot full redesign

Design references (open in a browser, pan/zoom canvases; `support.js` must sit beside them):
- `GitPilot Redesign.dc.html`: 1a rationale and system, 1b repo list (interactive), 1c repo detail
- `GitPilot Flows.dc.html`: 2a startup, 2b-2f walkthrough and AI setup, 2g merge workspace, 2h library (audit, backups, identity rules), 2i AI menu and operation tray
- `nocturne-styles.css`: design tokens (colors, type, spacing, radius, shadow)

These are HTML references, not production code. Recreate them in the existing React + TypeScript + Radix codebase. Fidelity is high; data is mock.

## Direction
IDE-native, flat-utilitarian. Dark-first (light theme later by remapping the same semantic tokens). Inter for UI, JetBrains Mono for data (branches, paths, counts, diffs). Min text 12px, sentence case, no letter-spaced micro-labels except sidebar section captions. Phosphor icons. 8px radius, 1px borders, no card shadows; only menus/modals/tray elevate.

## Tokens (Nocturne)
Ground #161826, panel #111320, surface #1b1d2c, border #232532 / #292b31 / #3f424d, text #e9e9ed, muted #75798c / #9397ab, accent #9184d9 (selection tint #2b2741, text on accent #d2cefd).
State: changed #d9a24f, staged #6f9ae0, ahead/ok #62b98a, behind/error #e0706f. Identity colors: Work #9184d9, Personal #6bb5a6, Freelance #c79a8a (user-assignable, from a fixed palette of 8). Tinted state backgrounds: #17261f ok, #2a2417 warn, #2a1c20 error, #17202f info.
Primary buttons are accent-outlined, never filled. Use `var(--*)` tokens from the stylesheet; do not hard-code hex.

## Product decisions (intentional, implement as designed)
1. Repo list is a dense 32px-row table, not cards. Default sort by urgency: conflict, changed/staged, ahead, behind, clean.
2. Identity is a scope (sidebar), a colored marker per row, and an optional "Group by identity" toggle (default off). State filter is a separate segmented control with counts.
3. No hover-reveal actions. Each row shows its next action: Resolve, Commit, Push, Pull. Everything else lives in detail view and the command palette.
4. Identity mismatch is a safety state: row warning icon, sidebar notice, commit-panel check.
5. Modals become workspaces/pages: merge and rebase are a full-window workspace; audit log, backups, identity rules are Library pages; push/pull use a bottom-right operation tray.
6. Remove the live clock and the stat-pill strip. Custom title bar (Tauri `decorations: false`, `data-tauri-drag-region`, macOS traffic lights; provide Windows/Linux controls on the right): search field (Cmd/Ctrl+K), AI status, rescan recency, settings.
7. AI engine is runner-agnostic: built-in engine (default), Ollama, LM Studio, custom OpenAI-compatible endpoint. Default models Gemma 3 1B / 4B (recommended) / 12B. Sizes in mocks are approximate; use real GGUF sizes.

## Plan handling (free and paid): proposal, not yet designed
Not in the mockups. Pricing model (subscription vs one-time) is undecided, so build entitlement behind an interface and keep gating declarative.
- Free: scan, list, filters, commit, push/pull, diff, basic merge/rebase, local AI with the 1B/4B model, backups, audit log, 2 identities.
- Pro: larger models, AI conflict resolution, bulk actions, unlimited identities, optional GitHub/GitLab status, background fetch, identity-rule sync.
- UI: plan chip in title bar next to AI status opens a plan sheet; locked features stay visible with a lock icon and inline note; soft-limit meters ("2 of 2 identities"); upgrade prompt only when a gated action is attempted; Settings > Plan page (compare, license key or sign-in, manage); expired and offline states.
- Licensing: cache entitlement locally with a grace period (offline-safe); never gate Git operations on network.
- Implementation: `entitlements` store with `plan`, `features: Record<FeatureKey, boolean>`, `limits`; a `<Gate feature="bulkActions">` component and `useEntitlement()` hook; no scattered plan checks.

## Build order
1. Tokens and theme layer (CSS variables, Tailwind config mapped to tokens, Inter + JetBrains Mono, Phosphor).
2. App shell: custom title bar, sidebar, status bar, routing for Repositories / Library pages.
3. Repo list table (virtualized, keyboard nav: up/down, Enter, C, P), filter, scope, group toggle, sort.
4. Repo detail (three panes, AI commit panel, identity check).
5. AI runner abstraction and setup walkthrough (splash, 4 steps, download).
6. Merge/rebase workspace with AI conflict suggestion and backup.
7. Library pages, operation tray, AI engine menu.
8. Command palette, bulk actions, Settings, plan/entitlements.
9. Empty, error, offline, engine-not-running states.
10. Remove replaced components (card grid, stat pills, modal wizards, hover overlay, clock).

## Suggested additions after the core (from review)
Command palette actions, bulk pull/push/fetch, commit-time identity guard (optionally a git hook), stash/WIP snapshot before pull/rebase, AI PR and changelog drafts, staged-diff review (secrets, debug logs, large files), commit-style learning, optional GitHub/GitLab status, background fetch with notifications, tray widget, light theme.
