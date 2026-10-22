# Third-Party Notices

Lumina-Space v0.1 is an original implementation. **No source code from the projects below was copied or modified in v0.1**; their data models, architecture, and interaction patterns were used as references. This file records the licenses and attribution so future changes can stay compliant.

## Super Productivity

- Upstream: https://github.com/super-productivity/super-productivity
- License: MIT
- Used for: task model, timer state machine, storage layering, feature-sliced structure (concepts only).
- If code is copied or adapted, include the upstream MIT notice and the following attribution:

```
部分修改或直接使用的代码源于 super-productivity (MIT License)
仓库链接：https://github.com/super-productivity/super-productivity
```

## eDEX-UI

- Upstream: https://github.com/GitSquared/edex-ui
- License: GPL-3.0
- Used for: theme JSON structure, boot animation rhythm, audio fallback, declarative modal (concepts only).
- **No GPL code is copied into this MIT project.** Do not copy eDEX-UI code without a license review.

## HyperFrames

- Upstream: https://github.com/heygen-com/hyperframes
- License: Apache-2.0
- Used for: code-driven scene/motion pipeline, shader transitions, frame-adapter ideas.
- If code is copied/adapted: keep the Apache-2.0 LICENSE and NOTICE files, mark modified files, and record the source commit.

## Lemo-Opuscar

- Upstream: https://github.com/lemomo-ai/lemo-opuscar
- License: MIT (code) + CC BY 4.0 (films/styles/assets)
- Used for: code-film style, motion/utility patterns, deterministic render contract ideas.
- If code is copied/adapted: keep the MIT notice. If any film/style/image/audio content is reused: attribute the author, source, license, and changes (CC BY 4.0).

## How to record a new copy

When code is copied or adapted, add a row here:

| Source | File | Upstream commit | License | Changes | Where it lives |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Then add the license text/link, update the README "参考与致谢" section, and mention it in the commit message.
