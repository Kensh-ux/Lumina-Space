# AGENTS.md

Guidance for AI agents working on **Lumina-Space** — a mood-aware todo and focus workspace for students.

## Current state

- **v0.1 (2026-10-22)**: app shell, mood themes, bottom-left sidebar, CSS-only Stage, localStorage, Vitest.
- **v0.2 (2026-10-23)**: full-bleed Stage, radial mood dial, touch/keyboard interactions.
- **v0.3 (2026-10-24)**: task CRUD, sidebar drawer (today/focus/settings), pomodoro.
- **v0.4 (2026-10-24)**: resizable full-height sidebar, large task editor (title/description/due date+time/priority), filters/search, focus stats, export; mood history UI removed.
- **v1.0 (2026-10-24)**: particle hero, floating today orb, 7-day planner, focus timer tuning, generated hover/click/white-noise audio, mute.
- **Current v2.0**: 3D cottage. Do not start 3D before the v2.0 card.

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
  app/              App, Sidebar, Stage
  features/mood/    MoodDial, mood.ts, useMood
  features/tasks/   task CRUD, editor (v0.4)
  lib/              shared types, storage adapter
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
6. Commit message uses a prefix (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`); report the hash.
7. Receipt: what changed / how verified / risks.

Do not over-self-check: run the commands in the task card once. The reviewer handles verification.

## Commit and push

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

## Where to look

- Task cards: private workspace (`05_任务卡`); not shipped in this repo
- Design decisions: README + task cards (the detailed decision log lives in the private workspace)
- Reference decomposition notes: private workspace (`01_输入项目/00_项目拆解`), not shipped in this repo.
