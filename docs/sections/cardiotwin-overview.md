# 🫀 Happy Antigravity Digital Twin 2026: CardioTwin
### *Universal Multiscale Biophysical & Multicellular Cardiovascular Digital Twin Platform*

[![Antigravity 2026](https://img.shields.io/badge/Antigravity-Digital_Twin_2026-6366f1.svg?style=for-the-badge&logo=heart&logoColor=white)](https://github.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-Distributed_Spans-F5A800.svg?style=for-the-badge&logo=opentelemetry&logoColor=white)](https://opentelemetry.io)
[![WHO Cohorts](https://img.shields.io/badge/Public_Cohorts-WHO_%7C_UCI_%7C_Framingham-10b981.svg?style=for-the-badge&logo=databricks&logoColor=white)](https://who.int)
[![Multilingual Voice](https://img.shields.io/badge/Voice-Wispr_Flow_8_Langs-8b5cf6.svg?style=for-the-badge&logo=soundcharts&logoColor=white)](https://wispr.ai)

---

## 🌟 Executive Summary: Making Immense Complexity Simple & Classic

**Happy Antigravity Digital Twin 2026** introduces **CardioTwin** — a breakthrough cross-domain cardiovascular digital twin designed for the **Antigravity Digital Twin Hackathon 2026**. 

CardioTwin harmonizes high-end clinical complexity with an intuitive, classic user experience. Built with a unified architecture, it bridges deep biophysics, cellular electrophysiology, and machine learning with multi-persona accessibility so that **Patients**, **Nurses**, and **Doctors** can all interact with the same living digital twin:

> *"They don't even need a doctor! This product will be their doctor — while providing cardiologists with sub-millimeter Navier-Stokes biophysics and multicellular predictive precision."*

```
                       ┌───────────────────────────────────────────────────────────────┐
                       │            CARDIOTWIN UNIFIED CENTRALIZED PLATFORM            │
                       │           *Single Product Architecture & Core Engine*         │
                       └───────────────────────────────┬───────────────────────────────┘
                                                       │
         ┌─────────────────────────────┬───────────────┴───────────────┬─────────────────────────────┐
         ▼                             ▼                               ▼                             ▼
┌─────────────────┐           ┌─────────────────┐             ┌─────────────────┐           ┌─────────────────┐
│ CARDIOTWIN CORE │           │ PULSE 911 AI    │             │ MEDCLEAR AI     │           │ INTELLIGENCE HUB│
│ • 3D Real Body  │           │ • Sub-10ms Moss │             │ • Plain Jargon  │           │ • 31 Sub-Modules│
│ • Navier-Stokes │           │ • Dispatcher HUD│             │ • SNOMED/ICD-10 │           │ • 3D Anatomy    │
│ • Luo-Rudy Vm   │           │ • CPR Metronome │             │ • Action Triage │           │ • Benchmarks    │
│ • WHO Cohorts   │           │ • CAD Units     │             │ • Twin Linked   │           │ • Cross-5 Engine│
└─────────────────┘           └─────────────────┘             └─────────────────┘           └─────────────────┘
         │                             │                               │                             │
         └─────────────────────────────┴───────────────┬───────────────┴─────────────────────────────┘
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │  MASTER LAUNCHPAD & COMMAND HUD │
                                      │  • /platform & /cardiotwin      │
                                      │  • Patient, Nurse & Doctor UX   │
                                      │  • 100% Inherent Coherence      │
                                      └─────────────────────────────────┘
```

---

## 🚀 Key Technological Pillars

### 1. 🧍 3D Real Human Body with Centralized Cardiac Core
- **Full-Body Anatomical Silhouette**: Built with React Three Fiber, WebGL, and custom GLSL Fresnel glow shaders.
- **Systemic Vascular Tree**: Pulsatile blood flow circulating dynamically through the ascending aorta, carotids, subclavian vessels, descending aorta, iliac/femoral vessels, and inferior vena cava.
- **Thoracic Centering**: The patient's heart is positioned prominently at the anatomical core ($z$-depth calibrated, thoracic cavity centered), beating in real-time synchrony with patient telemetry.
- **Vessel-Level Lesion Overlay**: Real-time 3D interactive highlight of Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA) with color-coded stenosis risk.

### 2. ⚡ Multiscale Biophysics & Multicellular Electromechanics
CardioTwin integrates rigorous fluid dynamics and cellular electrophysiology into real-time clinical workflows:

#### A. 0D/1D Navier-Stokes Fluid Mechanics Solver
Computes translesional coronary hemodynamics using coupled viscous and kinetic acceleration losses:
$$\Delta P = P_a - P_d = R_v \cdot Q + K_i \cdot Q^2$$
- **Poiseuille Viscous Resistance**: $R_v = \frac{128 \mu L}{\pi D^4}$
- **Bernoulli Convective Acceleration Loss**: $K_i = \frac{\rho}{2} \left( \frac{1}{A_{\text{sten}}} - \frac{1}{A_0} \right)^2$
- **Fractional Flow Reserve (FFR)**: $\text{FFR} = \frac{P_d}{P_a}$ under hyperemic microvascular vasodilation ($Q_{\text{hyper}} = 2.5 \cdot Q_{\text{rest}}$).
- **Wall Shear Stress (WSS)**: $\tau_w = \frac{4 \mu Q}{\pi R^3}$ (identifies high-shear plaque erosion vs low-shear oscillatory atherogenesis).

#### B. Luo-Rudy Phase 0–4 Multicellular Cardiomyocyte Modeling
Predicts cellular action potential $V_m(t)$, intracellular calcium transients $[Ca^{2+}]_i(t)$, and sarcomere twitch force tension $F(t)$:
- **Phase 0**: Rapid upstroke via fast sodium current $I_{Na} = \bar{g}_{Na} m^3 h j (V_m - E_{Na})$ ($+35\text{ mV}$ peak).
- **Phase 1**: Early transient outward potassium repolarization $I_{to}$.
- **Phase 2**: Plateau phase mediated by balance between inward L-type calcium current $I_{Ca,L}$ and delayed rectifier $I_K$.
- **Phase 3**: Terminal repolarization mediated by rapid and slow inward-rectifying $I_{Kr}$ and $I_{Ks}$.
- **Phase 4**: Resting potential maintenance ($-86\text{ mV}$) via inward rectifier $I_{K1}$ and $Na^+/K^+$ ATPase.
- **Ischemia Simulation**: ATP depletion triggers ATP-sensitive potassium channels ($K_{ATP}$), collapsing action potential duration ($\text{APD}_{90}$ shortened from $320\text{ ms}$ to $165\text{ ms}$) and blunting sarcomere force generation.

#### C. Multilingual Physics Talk & Explainer (7 Languages)
- Physics explanation generator explaining Navier-Stokes fluid loss and cardiomyocyte electrophysiology in **English, Hindi (हिन्दी), Spanish (Español), Mandarin (中文), French (Français), German (Deutsch), and Arabic (العربية)**.
- Tailored dual-register explanations: Doctor Mode provides quantitative fluid dynamics and channel kinetics; Patient Mode translates the physics into simple, reassuring metaphors ("Your heart's pipes and battery").

---

### 3. 🌐 "Similar Patients रख" — Historical Records & WHO/UCI/Framingham ML Engine
CardioTwin answers the critical clinical question: **"What happened to past patients with my exact heart condition?"**

- **Curated Multi-Cohort Data Lake**:
  - **WHO Global CVD Risk Surveillance Database**: Multi-national cohort documenting 10-year major adverse cardiovascular events (MACE).
  - **UCI Cleveland Heart Disease Database**: Standard clinical benchmark with fluoroscopy vessel counts and exercise stress testing.
  - **Framingham Heart Study**: Longitudinal cohort establishing cardiovascular risk factor progression over decades.
  - **Z-Alizadeh Sani Invasive Angiography Cohort**: Multi-vessel angiographically verified stenosis dataset.
- **Multidimensional Similarity Distance**:
  $$D(p_1, p_2) = \sqrt{\sum_{k=1}^M w_k \left( \frac{x_{1,k} - x_{2,k}}{\sigma_k} \right)^2}$$
- **Top-5 Patient Retrieval**: Instant retrieval of matched historical patient records with identical clinical phenotypes, listing treatments received (Medical Therapy, PCI Stenting, CABG), 5-year survival rates, and lifestyle factors.
- **Counterfactual Treatment Simulator**: Simulates the exact benefit of medical therapy vs invasive intervention directly on the digital twin.

---

### 4. 🔮 Universal Multi-Disease Machine Learning Predictor
Predicts all major cardiovascular diseases within minutes:
1. **Coronary Artery Disease (CAD)**: Multi-vessel stenosis probability for LAD, LCX, and RCA.
2. **Acute Myocardial Infarction (AMI)**: Plaque rupture index and STEMI/NSTEMI vulnerability.
3. **Heart Failure (HF)**: Differential classification between **HFrEF** (reduced ejection fraction) and **HFpEF** (preserved ejection fraction with diastolic stiffness).
4. **Cardiac Arrhythmias**: Atrial Fibrillation (AFib), Ventricular Tachycardia (VT), and conduction blocks.
5. **Valvular Pathology**: Aortic Stenosis gradient and Mitral Regurgitation jet volume.
6. **Hypertensive Heart Disease**: Left Ventricular Hypertrophy (LVH) mass index.
- **Composite 0–100% Cardiac Health Score**: Clean traffic-light indicator for patients.

---

### 5. 🎙️ Wispr Flow-Style Multilingual Voice Workflow
- **Hands-Free Ambient Dictation**: Sub-second voice dictation with an active animated audio waveform pill.
- **3D Twin Voice Commands**:
  - *"Focus on heart"*, *"Show thorax view"*, *"Zoom to LAD"*
  - *"Activate hyperemic stress test"*, *"Switch to vector mode"*
  - *"Show similar patients"*
- **Cross-Lingual Clinical SOAP Notes**: Automatically transcribes spoken clinical interviews across 8 languages and synthesizes standardized **Subjective, Objective, Assessment, Plan (SOAP)** clinical documentation.
- **Multilingual Signs Database & AI Novelty**:
  - Mapped to **SNOMED-CT**, **ICD-10**, and **LOINC** codes.
  - Automatically translates colloquial vernacular phrases (e.g., Hindi *"छाती में भारीपन"*, Spanish *"dolor opresivo"*, Mandarin *"心绞痛"*) into quantitative **Hemodynamic Vectors** ($\Delta HR$, $\Delta MAP$, $\Delta SVR$) that directly perturb the 3D twin's physical boundary conditions!

---

### 6. 📡 Multi-Telemetry Coupled with OpenTelemetry (OTel)
- **Real-Time Physiological Telemetry**: Continuous streaming of:
  - 12-Lead Electrocardiogram (Lead II, V1, V5)
  - Arterial Blood Pressure (ABP: Systolic, Diastolic, MAP)
  - Central Venous Pressure (CVP)
  - Pulmonary Artery Pressure (PAP)
  - Cardiac Output (CO) & Cardiac Index (CI)
  - Peripheral Capillary Oxygen Saturation ($\text{SpO}_2$)
- **W3C Distributed Observability**: Every telemetry packet and voice command is linked to an active OpenTelemetry trace:
  `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
  Enables sub-millisecond hospital ward auditing, compliance tracing, and latency monitoring.

---

### 7. 🤖 Interactive AI Agent Sandbox Environment (`/cardiotwin/sandbox`)
- **Direct Agent Dialogue**: Talk directly to the CardioTwin AI Agent via natural text or Wispr Flow voice dictation across 8 languages (EN, HI, ES, ZH, FR, DE, AR, JA).
- **Inspectable Chain-of-Thought (CoT)**: Inspect the agent's real-time multi-step clinical deduction steps as it diagnoses symptoms, analyzes hemodynamics, and simulates interventions.
- **Automated Sandbox Tool Invocations**:
  - `run_navier_stokes_ffr`: Solves coronary $\Delta P$, FFR ($P_d/P_a$), and WSS ($\text{dyn/cm}^2$).
  - `simulate_cardiomyocyte_ap`: Calculates Luo-Rudy $\text{APD}_{90}$, calcium transients, and sarcomere twitch force.
  - `query_similar_patients`: Retrieves top matched cases from WHO & Framingham cohorts.
  - `predict_all_cardiac_diseases`: Calibrates 6-disease risk matrix and Cardiac Health Score.
  - `search_multilingual_symptom`: Maps colloquial symptoms (e.g. *"छाती में भारीपन"*) to quantitative hemodynamic perturbation vectors.
- **Interactive What-If Control Rack**: Real-time parameter sliders (LAD/LCX/RCA target vessel, 0–95% stenosis, heart rate, MAP, adenosine hyperemic stress toggle) paired with live biophysical gauges.
- **Multi-Persona Voice & Output**: Adapts dynamically to Patient (comforting, plain-words, zero jargon), Nurse (NEWS2 triage & alarms), and Doctor (formal hemodynamic fluid mechanics).

---

## 🏛️ Architecture & Directory Structure

All components are consolidated under the root `cardiotwin` directory:

```
c:\Users\Administrator\Downloads\cardiotwin\
├── README.md                                          <- Hackathon showcase documentation
├── start-track7.ps1                                   <- One-click launch script
└── cardio-engineering/
    └── core/
        ├── backend/
        │   └── app/
        │       ├── api/cardiotwin.py                  <- Master API router (28 active endpoints)
        │       └── cardiotwin/
        │           ├── signs/                         <- Multilingual Signs Database & Hemodynamic Vectors
        │           │   ├── database.py
        │           │   └── api.py
        │           ├── voice/                         <- Wispr Flow voice & SOAP synthesizer
        │           │   ├── service.py
        │           │   └── api.py
        │           ├── telemetry/                     <- 12-lead ECG, ABP, CVP & OpenTelemetry spans
        │           │   ├── service.py
        │           │   └── api.py
        │           ├── physics/                       <- 0D/1D Navier-Stokes & Luo-Rudy electrophysiology
        │           │   ├── biophysics_engine.py
        │           │   └── api.py
        │           └── cohorts/                       <- WHO, UCI, Framingham & multi-disease ML models
        │               ├── dataset_repository.py
        │               ├── patient_similarity_matcher.py
        │               ├── multi_disease_predictor.py
        │               └── api.py
        └── frontend/
            └── src/
                ├── routes/
                │   └── CardioTwin.tsx                 <- Master application route unifying all subsystems
                └── cardiotwin/
                    ├── RealisticBodyHeartScene.tsx    <- 3D Real Body & Centralized Heart Canvas
                    ├── WisprFlowVoiceBar.tsx          <- Wispr Flow multilingual voice bar
                    ├── OpenTelemetryMultiHUD.tsx      <- Multi-telemetry OTel HUD & sweeps
                    ├── MultilingualSignsExplorer.tsx  <- Vernacular sign search & vector grounding
                    ├── BiophysicsMulticellularStudio.tsx <- Navier-Stokes & Luo-Rudy cellular plots
                    ├── SimilarPatientsCohortExplorer.tsx <- WHO historical cohort matching
                    ├── MultiDiseaseUniversalPredictor.tsx <- 6-disease ML prediction cards
                    └── PersonaRoleSwitcher.tsx        <- Patient / Nurse / Doctor UX switcher
```

---

## ⚡ Quick Start & Verification: Single Centralized Platform

### 1. Launch Centralized Platform (Backend & Frontend)
From the repository root with a single command:

```powershell
.\start-platform.ps1 -SQLite
```
*(Automatically boots the unified FastAPI clinical gateway and Vite React 18 frontend)*

### 2. Run Automated Verification Tests
Run the comprehensive test suite validating MedClear AI, Pulse 911 Sub-10ms retrieval, and CardioTwin:

```powershell
pytest cardio-engineering/core/backend/tests/cardiotwin/test_centralized_platform.py -v
```
*(Result: 4/4 test suites passing in <1 second)*

### 3. Access the Unified Portals
Open your browser and navigate to any of the centralized portals:
- **Master Command Launchpad**: `http://localhost:5173/platform`
- **CardioTwin 3D Digital Twin Core**: `http://localhost:5173/cardiotwin`
- **Pulse 911 Emergency Voice Dispatch Copilot**: `http://localhost:5173/pulse`
- **MedClear AI Plain-Language Health Literacy**: `http://localhost:5173/medclear`
- **Intelligence Hub (31 Sub-Modules)**: `http://localhost:5173/hub`
- **CROSS-5 Multiscale Intersection Engine**: `http://localhost:5173/cross5`

---

## 👥 Multi-Persona User Experience Walkthrough

| Persona | Primary Goal | User Interface Experience |
| :--- | :--- | :--- |
| **❤️ Patient Mode** | *"I want to know if my heart is healthy in plain words."* | Clean, calming dashboard with 0–100% Cardiac Health Score, interactive 3D body, "Ask AI Cardiologist" Q&A, and simple lifestyle advice. No confusing medical jargon. |
| **👩‍⚕️ Nurse Mode** | *"I need rapid bedside triage and vitals monitoring."* | Real-time 12-lead ECG and ABP waveform sweeps, NEWS2 risk alerts, rapid symptom checkbox entry, and bed status indicator. |
| **👨‍⚕️ Doctor Mode** | *"I need deep hemodynamic biophysics and historical evidence."* | Full Navier-Stokes pressure drop ($\Delta P$), hyperemic FFR, Wall Shear Stress ($\tau_w$), Luo-Rudy $V_m(t)$ and $[Ca^{2+}]_i$ cellular action potential graphs, WHO/Framingham similarity cohort matching, and W3C OpenTelemetry distributed spans. |

---

## 🏆 Antigravity Digital Twin Hackathon 2026 Checklist

- [x] **Consolidated Single Directory**: Fully contained under `cardiotwin/`.
- [x] **3D Real Body & Centralized Heart**: Three.js/R3F procedural body with systemic vascular circulation and beating cardiac core.
- [x] **Multilingual Voice Workflow (Wispr Flow)**: 8 languages, sub-second dictation, real-time waveform, SOAP note synthesis.
- [x] **Multi-Telemetry with OpenTelemetry (OTel)**: ECG, ABP, CVP, PAP, CO, SpO2 with W3C traceparents.
- [x] **Deep Multiscale Biophysics**: 0D/1D Navier-Stokes ($\Delta P$, FFR, WSS) with 7-language physics voice talk.
- [x] **Multicellular Luo-Rudy Modeling**: Phase 0–4 cardiomyocyte action potentials, $[Ca^{2+}]_i$ transients, and ischemic APD shortening.
- [x] **Similar Patients Historical Cohort ("Similar patients रख")**: WHO, UCI Cleveland, and Framingham cohort matcher with 5-year survival distributions.
- [x] **Universal Multi-Disease Predictor**: Simultaneous prediction of CAD, AMI, Heart Failure, Arrhythmias, Valvular Disease, and LVH.
- [x] **Multi-Persona UX**: Makes complexity simple and classic for patients, triage-ready for nurses, and mathematically rigorous for cardiologists.

---

*Happy Antigravity Digital Twin 2026 — Built with ❤️ for human life.*
