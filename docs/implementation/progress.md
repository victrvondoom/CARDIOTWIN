# CardioTwin reference-faithful upgrade — progress log

Keep this file current. It survives context compaction, so each entry states what is done, what is verified, and the next action.

## Status

| Phase | Item | State |
|---|---|---|
| 0 | Audit and gap analysis (`cardio-visual-gap-analysis.md`) | done |
| 1 | Routes: `/cardiotwin` Probe Lab; `/cardiotwin/risk` classic page; `/cardiotwin/calculators`; `/cardiotwin/case` | done |
| 1 | Shared navigation: scenario row on `/platform`; workspace links for the new routes; two duplicate links removed | done |
| 1 | App-shell top bar rebuilt as the reference's compact nav (Platform / Probe Lab / Calculators / CROSS-5 / Case Studio) | **not done** — the existing app shell (with its workspace tabs) remains |
| 2 | Probe geometry + deterministic synthetic echo (pure TS) | done, 36 unit tests |
| 2 | 3D torso, ribs, lungs, probe, beam, labels, layers, heartbeat, WebGL fallback | done; placement checked in browser once |
| 2 | Probe presets (PLAX, PSAX, APICAL, SUBX, SSN, RV inflow) change pose and scan plane | done, verified in browser |
| 3 | Formulas + registry (AVA continuity, DVI, LVOT SV, PISA EROA/RVol/RF, EF, RV FAC, Bernoulli, E/A, E/e′) | done, 42 tests |
| 3 | Calculator studio: category rail, search, favourites, worked examples, validation, animated diagrams | done, browser-checked |
| 3 | Categories with no validated calculator (Atria, Mitral, Tricuspid, Pulmonary, Pericardium, Shunts) | shown as empty, not implemented |
| 4 | Evidence-linked synthetic case: typed measurements, provenance, uncertainty, derived metrics, what-if diff, Evidence Difference, cross-checks | done, 15 tests |
| 4 | CROSS-5 live status on the case page (5 frames, 6 supported and 4 unsupported intersections) | done, browser-checked |
| 4 | MedClear: deterministic plain-language summary on the case page | done; `/medclear` itself is not prefilled from the case |
| 4 | Pulse 911: handoff text on the case page | done; `/pulse` unchanged |
| 4 | `-AI` narrative | **not connected** — deterministic templates only |
| 5 | Frontend tsc: 0 errors | done |
| 5 | Frontend vitest: 439 of 460 pass; 21 fail in 7 pre-existing files (see below) | measured |
| 5 | Frontend production build (`vite build`) | passed, before the last nav edits |
| 5 | Backend pytest, CROSS-5 subset (`tests/cardiotwin -k cross5`) | passed, no failures |
| 5 | Backend pytest, full suite | **not run** |
| 5 | Pulse tests, MedClear tests | MedClear 2 of 2 pass; Pulse has no test suite in `pulse/` |
| 5 | Viewport checks at 390 px and 768 px | **not done** |
| 5 | Windows launcher re-run with this code; Ctrl+C stop test | **not re-run** — the launcher started earlier is still serving |

## Verified in the browser

- `/platform`, `/cardiotwin`, `/cardiotwin/calculators`, `/cardiotwin/case`, `/cross5`, `/medclear`, `/pulse`, `/hub` each render real content with no error screen.
- `/cardiotwin`: switching PLAX → PSAX → RV inflow changes the scan plane contents (LV/Ao/MV/TV/AV → LV/RV/IVS/MV/TV/AV/PV → RV/LA/RA/MV/TV/AV/PV).
- `/cardiotwin/calculators?calc=aortic-stenosis-continuity`: worked example gives AVA 0.63 cm², DVI 0.20, LVOT area 3.14 cm².
- `/cardiotwin/case`: derived values match the formulas; raising aortic VTI 100 → 120 cm changes D-001 0.63 → 0.52 cm² and D-002 0.20 → 0.17, and no other metric moves. CROSS-5 answers with live counts.

## Pre-existing failing tests (not caused by this work)

Failing: `auth`, `cardiotwin-page` (5), `case-intake` (4), `cohorts-page` (3), `dashboard-tiles` (5), `pulse-cardio`, `reviewer-page`. None of their component files were edited. Several assert test IDs or text that do not exist in the current source (for example `cardiotwin-error`, `cardiotwin-lr-multivessel`, `queue-empty`).

## Decisions

- Old `/cardiotwin` prediction page moved to `/cardiotwin/risk`. Its component and test file are unchanged.
- Heart geometry: `public/models/hra-human-heart.glb` (CC-BY-4.0, attributed in `public/models/core__public_models__README.md`).
- Ultrasound is a deterministic 2D cross-section of the same landmark model. It is labelled `SYNTHETIC EDUCATIONAL ULTRASOUND SIMULATION`.
- Calculators return raw values. No clinical thresholds are applied, because none are verified in this repository.
- Case values are synthetic and deterministic. CROSS-5 is shown through the existing client and an authenticated session, and the page reports unavailable when the call fails.

## Known limits

- The 3D heart runs its own clock (`RealisticHeart`). The echo phase follows the play button and slider, so the two are not frame-locked.
- Torso, rib and lung geometry is simplified. The heart's placement on the torso was checked by eye, not against anatomical measurements.
- Only six calculators are implemented.
- No LLM narrative is wired; the case page and MedClear summary use fixed templates.
- The hub's 31 module statuses (`integrated`, `standalone`, `needs setup`) are not implemented.
