# CardioTwin visual-reference gap analysis (Phase 0)

Scope: the reference-faithful upgrade described in `CARDIOTWIN_CLAUDE_CODE_PROMPT.md`.
Reference stills: `design/reference/frames/` (personal QA only, git-ignored, never shipped).
Every claim below was checked against the source tree on this machine.

## Existing (verified)

| Area | What exists | Evidence |
|---|---|---|
| Launcher | `start.ps1` → `cardio-engineering/core/backend/scripts/track7_demo.py`; SQLite default, `-Database postgres`, `-Port`, `-AI`, `-NoBrowser` | root `start.ps1`, `track7_demo.py` |
| One origin | Vite proxies `/api` and `/mcp` to the gateway on 8000 | `cardio-engineering/core/frontend/vite.config.ts` |
| Platform launchpad | `/platform` | `src/cardiotwin/PlatformLaunchpad.tsx` |
| Old 3D page | `/cardiotwin` is the CardioTwin risk page (1,286 lines, prediction UI); tested by `tests/cardiotwin-page.test.tsx` | `src/routes/CardioTwin.tsx` |
| 3D heart | `RealisticHeart.tsx` loads `public/models/hra-human-heart.glb` (CC-BY-4.0, attribution recorded) | `public/models/core__public_models__README.md`, `docs/ASSET_LICENSES.md` |
| Cardio-Hemo studio | `/cardiotwin/hemo` anatomy studio on the same heart model | `src/routes/CardioHemoTwin*` |
| Hub | `/hub`, `/hub/:slug`, `/hub/apps`; 31 module projects discovered by `backend/app/hub/module_catalog.py` | `core/backend/app/hub/module_catalog.py` |
| CROSS-5 | `/cross5` studio; API `/api/cross5/{frames,intersections,flow,chronos,earth,city,experiments}`; typed evidence records with status observed/derived/modeled/simulated | `backend/app/api/cross5.py`, `backend/app/cardiotwin/cross5/` |
| MedClear | `/medclear` UI; `POST /api/v1/cardiotwin/medclear/simplify` (offline simplifier) | `src/medclear/`, `backend/app/cardiotwin/medclear/` |
| Pulse | `/pulse` embedded studio (16 files); full standalone `pulse/` app (82 files) | `src/pulse/`, `pulse/` |
| Physiology | Circulation ODE (`simulate_circulation`), coronary sweep, action-potential model | `backend/app/cardiotwin/riskflow/physiology.py` |
| LLM hooks | Anthropic / Bedrock / OpenRouter clients, circuit breaker, gateway | `backend/app/llm/` |
| Case contracts | `CardiacCase`, `SimulationRun`, `EvidenceArtifact`, `EvidenceGraph` | `backend/app/cardiotwin/models/` |

## Missing (confirmed absent)

- **Valve calculators.** `backend/app/integrations/slicerheart/valve_metrics.py` states that it "never computes or fabricates" valve metrics. No AVA, PISA, RV, or EF calculator exists anywhere in the repo.
- **Probe-and-torso scene.** No torso silhouette, rib cage, probe, or scan-beam model exists. The heart asset exists but is not posed by a probe.
- **Ultrasound renderer.** No synthetic sector renderer exists. Nothing maps a probe pose to a scan image.
- **Shared synthetic case.** No single case object links observations, measurements, calculator outputs, what-if runs, CROSS-5 status, MedClear text, and Pulse handoff.
- **Calculator category registry** for the 11 categories in the reference.

## Reuse / build decisions

| Item | Decision | Reason |
|---|---|---|
| `RealisticHeart.tsx` + heart GLB | Reuse inside the new torso scene | Already licensed, attributed, and tested |
| `/cardiotwin` old page | Move to `/cardiotwin/risk`; keep the file and its test | Preserves prediction workflow and test |
| `/cardiotwin` new page | Probe Lab (3D + synthetic echo) | Reference experience A |
| Valve formulas | Build as pure TypeScript with unit tests; cite ASE/EACVI 2017 recommendations and label sources; no clinical thresholds unless verified | `valve_metrics.py` cannot compute them |
| CROSS-5 | Read through the existing `cross5Api` client; show its real status; do not reinterpret CROSS-5 meaning | Prompt requires the real semantics |
| LLM narrative | Deterministic templates by default; LLM only behind `-AI`, validated before display | Prompt requirement |
| Probe ultrasound | Deterministic 2D procedural model; labeled SYNTHETIC EDUCATIONAL SIMULATION | No validated ultrasound recordings exist in the repo |

## Route-to-component map (target after this work)

```
/platform                 PlatformLaunchpad (+ synthetic scenario entry)
/cardiotwin               CardioProbeLab          (3D torso + probe | synthetic echo sector)
/cardiotwin/risk          CardioTwin              (existing prediction page, unchanged)
/cardiotwin/calculators   CardioCalculatorStudio  (rail | list | working area)
/cardiotwin/case          CardioCaseStudio        (Evidence-Linked CardioTwin)
/cross5                   Cross5Studio            (existing; reads the same case evidence)
/medclear                 MedClearRoute           (existing; plain-language view of the case metric)
/pulse                    PulseOrchestrator       (existing; marked as handoff/simulation)
/hub                      HubOverviewPage         (31 modules, registry status)
```

## State before work

- The launcher and API were checked earlier in this session (`/api/v1/healthz` 200, `/platform` 200).
- Backend pytest and frontend test totals have not been run in this session yet.
- No page in the target map has been exercised through a browser for the reference upgrade yet.
