# CardioTwin

**Developed by Victor von Doom**

CardioTwin is a cardiology decision-support research prototype. It estimates the risk of coronary artery disease (CAD) and of stenosis in each major coronary artery from routine clinical data. It shows how reliable each number is, traces the figures to their inputs, and offers an interactive 3D echocardiography trainer. It is not a medical device and is not validated for clinical use.

---

## Submission checklist

| Item | Where |
| --- | --- |
| Author | Victor von Doom |
| Co-author | Mistral Vibe |
| Incubator | Not provided. Add here if applicable. |
| Project title | CardioTwin |
| Problem statement | [Problem statement](#problem-statement) |
| Healthcare use case | [Healthcare use case](#healthcare-use-case) |
| Technical stack | [Technical stack](#technical-stack) |
| AI/ML model | `cardiotwin-lr-multivessel` v1.0.0. See [AI/ML model](#aiml-model). |
| Demo video (15–20 min, unlisted YouTube) | **PENDING.** See [Demo video](#demo-video). |
| Architecture diagram (PDF) | [docs/submission/CardioTwin_Architecture.pdf](docs/submission/CardioTwin_Architecture.pdf) |
| Presentation (PDF) | [docs/submission/CardioTwin_Presentation.pdf](docs/submission/CardioTwin_Presentation.pdf) |
| Open-source license | MIT: [LICENSE](LICENSE). Third-party licenses and module status: [NOTICE.md](NOTICE.md). |
| Public access | The repository and both PDFs are public. No sign-in is needed to view them. |

---

## Problem statement

Coronary artery disease is one of the leading causes of death worldwide. Whether a patient with chest pain or breathlessness needs invasive angiography depends on how a clinician weighs routine findings: symptoms, the ECG, the echocardiogram and blood tests. These findings often do not point clearly one way. Simple risk scores return a single number, usually without saying how uncertain it is or which coronary artery is most likely involved. Trainees have few chances to practise matching echocardiogram views to cardiac anatomy.

CardioTwin tests whether an open, transparent tool can help with these gaps. It estimates risk for each major coronary artery from data a clinician already has, states the uncertainty and the limits of each estimate, shows which inputs drove it, and teaches echo anatomy interactively. The tool supports clinical reasoning. It does not replace angiography or clinical judgment.

---

## Healthcare use case

This use case comes from the code in this repository:

1. **Risk estimate from routine data.** The model in `cardio-engineering/core/backend/app/cardiotwin/` takes 54 inputs. They cover demographics, risk factors (diabetes, hypertension, smoking, family history, dyslipidemia), symptoms (typical chest pain, dyspnoea), ECG findings, echocardiographic findings (ejection fraction, regional wall-motion abnormality, valve disease) and laboratory values. It returns the probability of CAD and of stenosis in the LAD, LCX and RCA.
2. **Transparent reporting.** Each output reports the bootstrap intervals, the calibration method and the limitations recorded in the model artifact. The CAD output is projected so that P(CAD) is never lower than the largest of the three vessel probabilities.
3. **Hash-sealed evidence records.** Cases can be packaged as evidence passports with a hash seal. The passport states that hash integrity does not establish scientific truth.
4. **Echo education.** A 3D torso and heart show six probe positions (PLAX, PSAX, apical, subcostal, suprasternal and RV inflow), and the scan plane moves with each one. The ultrasound image is a deterministic synthetic cross-section, labelled as a simulation.
5. **Echo calculators.** Six calculators return the raw result of a formula, with worked examples and sources. They apply no clinical thresholds, because none are verified in this repository.
6. **Patient communication.** MedClear turns dense clinical notes into plain language and an action checklist. It runs offline.
7. **Emergency-response demonstration.** Pulse 911 is a voice-first emergency dispatch simulation. It is a demonstration, not a validated triage tool.

**Intended users:** cardiology clinicians and trainees, and researchers. **Not intended** for patient-care decisions.

---

## What the demo shows

| Route | What it does | Status |
| --- | --- | --- |
| `/platform` | Launchpad for every section | Working |
| `/cardiotwin` | 3D torso, heart and probe with a synchronised synthetic echo | Working. Educational simulation. |
| `/cardiotwin/calculators` | Six echo calculators with worked examples | Working |
| `/cardiotwin/case` | Evidence-linked synthetic case: measurements, uncertainty, what-if changes, CROSS-5 status | Working. Synthetic data. |
| `/cardiotwin/risk` | CAD risk prediction, sensitivity and model trust | Working |
| `/hub` | Overview of the inherited module projects | Overview works. Per-module status badges are not implemented. |
| `/medclear` | Plain-language summaries of clinical notes | Working |
| `/pulse` | Pulse 911 emergency copilot studio | Simulation |
| `/cross5` | CROSS-5 multiscale intersection engine | Experimental |

---

## Architecture

The architecture diagram is in [docs/submission/CardioTwin_Architecture.pdf](docs/submission/CardioTwin_Architecture.pdf).

- The browser uses one origin, `http://localhost:5173`. The Vite dev server proxies `/api` and `/mcp` to the FastAPI gateway on port 8000. The browser does not contact port 8000 or the interop receiver (port 8091) directly.
- The gateway runs the CardioTwin model (its artifact is checked against a SHA-256 hash), the evidence passports, the CROSS-5 API and the interop receiver.
- The database is a SQLite file by default. With `-Database postgres` it is PostgreSQL in Docker.
- The calculators, the synthetic case and the probe simulation run in the browser.
- The LLM providers are called only when the launcher is started with `-AI`.

---

## Technical stack

| Layer | Technology |
| --- | --- |
| Risk model | Python 3.12, scikit-learn logistic regression, NumPy |
| Backend API | FastAPI 0.115, Uvicorn 0.32, Pydantic 2.9 |
| Dashboard | React 18.3, TypeScript 5, Vite 6, React Router 7 |
| 3D | Three.js 0.169, React Three Fiber 8.17, Drei 9.114 |
| Pulse 911 app | React 19, Vite, Tailwind CSS v4 |
| MedClear | Python 3.12 |
| Tests | pytest (backend), Vitest 4 (dashboard) |
| Data stores | SQLite (default), PostgreSQL in Docker (optional) |
| Launcher | PowerShell (`start.ps1`) |
| Optional AI | Anthropic SDK 0.39 (Claude). OpenRouter and AWS Bedrock are alternative routes. |

---

## AI/ML model

**Model ID:** `cardiotwin-lr-multivessel`, version 1.0.0. The definition is in `cardio-engineering/core/backend/app/cardiotwin/`. The evaluation record is `artifacts/evaluation.json`.

- **Outputs.** The probability of CAD (any target-vessel stenosis), and the probability of stenosis in the LAD, LCX and RCA.
- **Algorithm.** L2-regularised logistic regression from scikit-learn, one model per output. Regularisation strength is chosen by inner 5-fold cross-validation.
- **Consistency rule.** The shipped CAD output uses max-projection, so P(CAD) is at least the largest vessel probability. In the evaluation this changes the CAD ROC-AUC by −0.0006.
- **Calibration.** Platt scaling was adopted for all four outputs, under a rule that requires the Brier improvement to exceed its standard error.
- **Uncertainty.** Reported intervals come from 1,000 patient-level bootstrap resamples. A bootstrap ensemble gives per-patient spread. The shipped artifact has no held-out calibration set for conformal prediction, so it makes no coverage guarantee.
- **Leakage control.** LAD, LCX, RCA and the catheterisation label are excluded from the CAD inputs. Those labels nearly determine the CAD label.
- **Training data.** The Z-Alizadeh Sani extension dataset (UCI id 411): 303 patients, CC BY 4.0. It is single-centre data from the Shaheed Rajaei Cardiovascular Center, Iran. There is no external validation.

**Out-of-fold results** (3 × 5 repeated stratified cross-validation; 95% intervals from 1,000 patient-level bootstrap resamples):

| Output | ROC-AUC (95% CI) | Other figures |
| --- | --- | --- |
| CAD, direct model | 0.913 (0.876–0.944) | PR-AUC 0.961 (0.938–0.979); Brier 0.103 (0.081–0.125); ECE 0.054 |
| CAD, shipped (max-projected) | 0.912 | Enforces the vessel consistency rule |
| LAD | 0.823 (0.776–0.868) | |
| LCX | 0.679 (0.615–0.734) | Weakest of the four outputs |
| RCA | 0.738 (0.682–0.788) | |

**What these results do not show.** They come from one centre and have not been tested externally. Calibration was estimated on the same sample. Discrimination for the LCX and RCA is modest. Performance in other populations is unknown.

**Use of an LLM.** The risk model does not use an LLM. When the launcher is started with `-AI`, the platform can call Claude Sonnet 4.6 (`claude-sonnet-4-6`) through the Anthropic API, or through OpenRouter (`anthropic/claude-sonnet-4.6`) or AWS Bedrock. The case page's narrative uses fixed templates and does not call an LLM.

---

## Data

- **Clinical dataset:** the Extension of Z-Alizadeh Sani dataset (UCI id 411), licensed CC BY 4.0. The code checks the file against a pinned SHA-256 hash. The citation is in [NOTICE.md](NOTICE.md).
- **Demonstration cases:** synthetic and deterministic. The demonstration does not need real patient information.

---

## How to run

**Prerequisites:** Windows PowerShell 5.1 or later, Python 3.12, and Node.js 20 or later. Docker Desktop is needed only for `-Database postgres`.

```powershell
git clone https://github.com/victrvondoom/CARDIOTWIN.git
cd CARDIOTWIN
python -m pip install -r cardio-engineering\core\backend\requirements.txt
Copy-Item .env.example .env     # optional: only needed for live AI
.\start.ps1
```

The launcher prints one link, `http://localhost:5173/platform`, and opens it in a browser. It also prints a synthetic demo sign-in for localhost. That sign-in is not a production credential.

| Flag | Default | Meaning |
| --- | --- | --- |
| `-Database sqlite` | yes | Synthetic, deterministic data in a local file. No Docker needed. |
| `-Database postgres` | | PostgreSQL in Docker Desktop. Start Docker Desktop first. |
| `-Port <n>` | `5173` | Dashboard port on localhost |
| `-AI` | off | Enables live AI calls. Needs provider keys in `.env`. |
| `-NoBrowser` | off | Starts without opening a browser window |

**Troubleshooting**

| Symptom | Fix |
| --- | --- |
| `cannot import name 'apply_configuration' from 'pypdf'` | `python -m pip install pypdf==6.19.0` |
| The port is already in use | `.\start.ps1 -Port 5180` |
| `-Database postgres` cannot connect | Start Docker Desktop, then run the launcher again |
| The dashboard loads but API calls fail | Keep the launcher window open. The API gateway runs there. |

---

## Demo video

**PENDING.** The 15–20 minute unlisted YouTube video has not been recorded or uploaded yet. When it is ready, replace this line with:

`Demo video: https://youtu.be/<video-id>`

Suggested outline, about 19 minutes:

1. Problem and healthcare use case (2 min)
2. Launch with `.\start.ps1` and tour `/platform` (2 min)
3. 3D heart: probe positions and the synthetic echo (3 min)
4. Calculators: worked example for aortic stenosis continuity (2 min)
5. Evidence-linked case: a what-if change and its uncertainty (3 min)
6. Risk model: metrics, calibration and limits (3 min)
7. MedClear and Pulse 911 (2 min)
8. Architecture, licensing, limitations and next steps (2 min)

---

## Open-source license

- **Original work:** MIT License, Copyright (c) 2026 Victor von Doom. See [LICENSE](LICENSE).
- **Third-party components:** data, assets and module folders keep their own licenses. [NOTICE.md](NOTICE.md) lists each one, its license and its required notice.
- **No unlicensed third-party code is published:** module folders without a license were excluded and are not part of this repository.

---

## Tests and verification

Results from the last recorded runs. The source is [docs/implementation/progress.md](docs/implementation/progress.md).

| Area | Result |
| --- | --- |
| Dashboard type check (`tsc`) | 0 errors |
| Dashboard unit tests (Vitest) | 439 of 460 pass. 21 tests in 7 files fail. These failures predate this work. |
| Probe geometry and echo simulation | 36 tests pass |
| Calculator formulas and registry | 42 tests pass |
| Evidence-linked case model | 15 tests pass |
| Backend CROSS-5 tests | Pass (subset run with `-k cross5`) |
| MedClear | 2 of 2 pass |
| **Not yet run** | Full backend pytest suite. Layout checks at 390 px and 768 px. Production build after the final navigation edits. Launcher re-run with the final code. |

---

## Limitations and safety

- This is a research prototype. It is not a medical device and is not CE-marked or FDA-cleared.
- The model has not been validated externally and was trained on single-centre data. Its intervals describe sampling uncertainty, not performance in other hospitals.
- Outputs are not diagnoses. Any use in care needs clinician review and confirmatory testing, such as angiography or CT, as appropriate.
- The 3D heart and the echo simulation are educational. Their two clocks are not frame-locked.
- The calculators give raw values only. No clinical thresholds are applied.
- Pulse 911 is a simulation, not a validated triage system.

---

## Repository layout

```
CARDIOTWIN/
├── start.ps1                  one launcher for the whole repository
├── LICENSE                    MIT (original work)
├── NOTICE.md                  third-party licenses and module status
├── README.md                  this file
├── .env.example               environment template, secrets left blank
├── docs/submission/           architecture diagram and presentation (PDF)
├── cardio-engineering/
│   ├── core/                  FastAPI backend and React dashboard
│   ├── modules/               module project folders (see NOTICE.md)
│   └── docs/
├── medclear/                  MedClear plain-language engine
└── pulse/                     Pulse 911 application
```

---

## Acknowledgements

- UCI Machine Learning Repository, and Alizadehsani, Roshanzamir and Sani, for the Z-Alizadeh Sani dataset extension.
- Human Reference Atlas and HuBMAP (CCF 3D Reference Object Library), for the heart model.
- Database Center for Life Science, Japan (BodyParts3D), for the anatomy meshes.
- SlicerHeart contributors (BSD 3-Clause).
- The authors of the MIT-licensed module folders listed in [NOTICE.md](NOTICE.md).
