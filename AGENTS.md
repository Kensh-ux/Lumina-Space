# AGENTS.md

Guidance for AI agents working on **Lumina-Space** — a mood-aware todo and focus workspace for students.

## Current state

- **v0.1 (2026-10-22)**: app shell, mood themes, bottom-left sidebar, CSS-only Stage, localStorage, Vitest.
- **v0.2 (2026-10-23)**: full-bleed Stage, radial mood dial, touch/keyboard interactions.
- **v0.3 (2026-10-24)**: task CRUD, sidebar drawer (today/focus/settings), pomodoro.
- **v0.4 (2026-10-24)**: resizable full-height sidebar, large task editor (title/description/due date+time/priority), filters/search, focus stats, export; mood history UI removed.
- **v1.0 (2026-10-24)**: particle hero, floating today orb, 7-day planner, focus timer tuning, generated hover/click/white-noise audio, mute.
- **v1.1 (2026-10-24)**: Qoder-generated mood scenes (positive/neutral/negative, no central orb), global white noise in settings, per-mood soundscapes.
- **v1.2 (2026-10-26)**: neutral theme re-done as a dusk palette; soundscapes replaced with real recordings (birdsong / dusk lo-fi / rain) streamed from GitHub Releases; scene draw cost cut by removing the full-screen aurora blur and caching full-screen gradients. **This is the "simple mode"** — pure Canvas 2D + CSS, light first paint, runs anywhere.
- **v1.2.1 (2026-10-27)**: soundscape loading state (fade in only when the element is actually audible), stopped old-track downloads, engine-level enable/mute authority, stale-fade race fixes; 153 tests.
- **v1.3 (2026-10-27)**: planner reworked — selectable start date (that day becomes the first column), 365 days instead of 7, `YYYY年，M月` title that follows horizontal scrolling; task list sorted by priority 60% + days-to-due 40%; complete / uncomplete / delete confirmations everywhere; Today panel shows open tasks only plus a collapsible completed-tasks stats card (default filter `open`); new **mood journal** view (`features/journal/`) with 22 built-in emotion words plus a custom word, event description and a -724..597 score; focus cap 487 → 486; settings version `v1.3.0`; 193 tests.
- **Next: v2.0 "3D mode"** — a code-generated stylized cottage (`three` + R3F). It is an *alternative* to simple mode, not a replacement. Do not start 3D before the v2.0 card.

> Soundscape note: the three looping mp3s are **not** in this repo; they live in GitHub Release `audio-v1.2`
> and are referenced by URL in `src/lib/audio.ts`. See `docs/audio-sources.md`.

## Stack

- Vite 8 + React 19 + TypeScript 6
- Native CSS + CSS variables + CSS Modules (no Tailwind, no UI kit)
- `useState` / `useReducer` / Context (no Redux/Zustand)
- `localStorage` behind a small adapter
- Vitest + jsdom
- Static build to `dist/`

## Layout

```
src/
  app/              App, Sidebar, Stage, PlannerView, PlannerDayColumn
  features/mood/    MoodDial, mood.ts, useMood
  features/tasks/   task CRUD, editor, ConfirmDialog, CompletedTasks
  features/journal/ mood journal (MoodNoteEditor, EmotionPicker, JournalView)
  features/focus/   focus timer + stats
  features/settings/SettingsPanel
  lib/              shared types, storage adapter, planner helpers, audio
  styles/           tokens.css, global.css
tests/              mirror of src
docs/
  screenshots/      README images
```

Rules:

- One feature per directory; features do not import another feature's internals.
- Pure logic in `*.ts`; components only render and bind events.
- Theme values live in `tokens.css`; do not hard-code colors in components.
- Keep components under ~200 lines.

## Commands

```bash
npm run dev        # dev server
npm run check      # tsc -b
npm test           # vitest run
npm run build      # tsc -b && vite build → dist/
npm run preview    # preview dist/
```

## Definition of done

1. `npm run check` passes.
2. `npm test` passes; new pure logic has tests.
3. `npm run dev` starts without console errors.
4. UI changes have a screenshot that a human/Lead actually looked at.
5. `git status` contains only files in the task card.
6. Commit message uses a prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`) **and is written in English**; report the hash.
7. Receipt: what changed / how verified / risks.

Do not over-self-check: run the commands in the task card once. The reviewer handles verification.

## Commit and push

- **Commit messages are written in English** (prefix + English body); do not mix Chinese into them.
- Small change: commit directly on `main`; **only `git add` files in scope**, never `git add -A`.
- Large change (refactor, stack change, many files): branch `feat/<name>`; do not merge until the user says so.
- Never `git commit --amend`, `reset --hard`, `push -f`, or rewrite remote history.
- Do not commit secrets, tokens, local absolute paths, or `dist/`.
- Push is a maintainer action; if explicitly asked, use the repo's configured SSH remote and report the commit hash.

## Reference projects & licenses

Reference repos live outside this repository; read only the files named in the task card, and never copy UI code.

| Project | License | How we use it |
|---|---|---|
| Super Productivity | MIT | Task model, timer state machine, storage ideas; no code copied in v0.1 |
| eDEX-UI | GPL-3.0 | Theme JSON, boot animation, audio/modal ideas; **do not copy GPL code** |
| HyperFrames | Apache-2.0 | Code-driven scene/motion pipeline reference; keep LICENSE/NOTICE if code is copied |
| Lemo-Opuscar | MIT + CC BY 4.0 | Code-film style/motion reference; content needs attribution |

If code is copied or adapted: record source, commit, license, and changes in the private project workspace; add a `THIRD_PARTY_NOTICES.md` only when code is actually copied. If unsure, ask first.

## Red lines

1. No task card, no work.
2. No new dependencies without approval; runtime dependencies stay minimal.
3. No stack, directory, or naming changes without approval.
4. No deleting or overwriting the user's uncommitted changes.
5. No secrets, tokens, or local absolute paths in the repo.
6. Do not modify `LICENSE`.
7. Do not copy reference-project UI or GPL code.
8. Do not use external 3D models or AIGC backgrounds as if they were code-generated scenes.
9. No "while I'm here" refactors outside the task card.
10. If blocked for more than 20 minutes, stop and report what you tried.
11. **Never run delete commands** (`cmd.exe`, `del`, `rd`, `Remove-Item`). Move anything disposable to the
    workspace quarantine folder (`06_待删\<project>\`) and let the user delete it. A past shell mistake
    wiped an entire drive; this rule exists because of it.
12. **Workspace paths are under `D:\记事本\workplace\`** (moved back from C: on 2026-10-27). Old docs may
    still show `C:\记事本\...` — treat those as stale and verify before running. The WSL mount is
    `/mnt/d/记事本/workplace/`.
13. **The staging folder must mirror this repo.** `05_暂存\01_Lumina-Space\` is not a scratch area —
    whatever gets pushed is its content. Edit staging first, copy into WSL, then commit. Never edit repo
    files without writing the same change back to staging. Run `node _tools/check_mirror.mjs <stage> .`
    before committing and after pushing; it must print `✓ 镜像一致`.

## Where to look

- Task cards: private workspace (`05_任务卡`); not shipped in this repo
- Design decisions: README + task cards (the detailed decision log lives in the private workspace)
- Reference decomposition notes: private workspace (`01_输入项目/00_项目拆解`), not shipped in this repo.
