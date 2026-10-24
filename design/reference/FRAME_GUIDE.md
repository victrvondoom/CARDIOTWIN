# CardioTwin video frame guide

These are screenshots extracted from the user's provided ~2m28s reference recording. They demonstrate *appearance and interaction concepts*, not reusable app assets or verified clinical data. Do not distribute them in your shipped CardioTwin UI and do not copy the reference application's trademark/branding.

| Filename | Timestamp | Visual details to replicate using original assets and code |
|---|---:|---|
| `01_probe_overview.jpg` | 00:01 | Overall 2-panel 3D torso/probe + 2D echocardiogram composition, dark top navigation, clinical guidance header, probe sector |
| `02_probe_position.jpg` | 00:09 | Color/material/transparency of thoracic anatomy, probe movement, sector visualization, patient landmark labels |
| `03_echo_different_depth.jpg` | 00:20 | Changed ultrasound depth/probe parameters and anatomy position with same synchronized two-column layout |
| `04_heart_view_presets.jpg` | 00:31 | Probe section controls, bottom gallery with PLAX/PSAX/APICAL/SUBX/SSN categories, state/status feedback |
| `05_calculator_navigation.jpg` | 00:36 | Transition to calculator mode: compact top bar, 3-column info hierarchy, category rail, calculator list, working area |
| `06_rv_measurements.jpg` | 00:42 | Right-ventricle calculator inputs, measurement tabs, numerical results and formula card |
| `07_rv_worked_example.jpg` | 00:55 | Educational anatomy illustration, green accent, playback/timeline and result preview |
| `08_aortic_stenosis_formula.jpg` | 01:14 | Aortic stenosis formula and component highlights with distinct colors, structured sidebars |
| `09_aortic_continuity_animation.jpg` | 01:21 | Interactive annotated vessel continuity diagram, scrub bar, measured parameters, compact educational copy |
| `10_aortic_regurgitation_simulation.jpg` | 01:53 | Aortic regurgitation measurements, color-coded regurgitant flow diagram and calculator connection |
| `11_pisa_flow_illustration.jpg` | 02:04 | Illustrated PISA educational controls, anatomy schematic and time/phase controls |
| `12_pulmonary_valve.jpg` | 02:25 | Other valve calculator context, reusable diagrams and consistent styling across categories |

## What not to infer

- Visual frames do not prove any actual patient data, validated calculation, physically accurate ultrasound simulation or treatment recommendation.
- For CardioTwin, mark generated waveforms, anatomy and measurements as synthetic demonstration until validated against appropriate licensed sources.
- Do not ship captured third-party frames in the public product.

## Suggested instruction to Claude Code

Read this guide and individually inspect `frames/01_probe_overview.jpg`, `frames/05_calculator_navigation.jpg`, `frames/08_aortic_stenosis_formula.jpg`, and `frames/11_pisa_flow_illustration.jpg` first. Inspect remaining frames for details. Use the full implementation prompt at `CARDIOTWIN_CLAUDE_CODE_PROMPT.md`.
