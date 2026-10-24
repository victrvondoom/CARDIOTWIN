# Third-party notices and license status

The original work in this repository is by Victor von Doom and is licensed under the
MIT License (see [LICENSE](LICENSE)). Third-party data, assets and module folders keep
their own terms. This file records the status of each one so that nothing is published
under a license its authors did not grant.

## 1. Data and assets with their own licenses

| Component | Location | License | Required notice |
| --- | --- | --- | --- |
| Extension of Z-Alizadeh Sani dataset (UCI Machine Learning Repository, id 411) | `cardio-engineering/core/backend/data/cardiotwin/`, `cardio-engineering/modules/cardiotwin/data/raw/` | CC BY 4.0 | Alizadehsani R., Roshanzamir M., Sani Z. A. (2017). *Extension of Z-Alizadeh Sani dataset* [Dataset]. UCI Machine Learning Repository. https://archive.ics.uci.edu/dataset/411 |
| BodyParts3D-derived anatomy mesh | `cardio-engineering/modules/cardiotwin/frontend/public/anatomy/cardiotwin_anatomy.glb` | CC BY-SA 2.1 Japan | "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan." Derived meshes stay under CC BY-SA 2.1 Japan. |
| Human Reference Atlas heart model (VH_M_Heart, CCF 3D Reference Object Library v1.2) | `cardio-engineering/core/frontend/public/models/hra-human-heart.glb` | CC BY 4.0 | See `cardio-engineering/core/frontend/public/models/core__public_models__README.md` |

## 2. Module folders with a license

These module folders keep the license files that their authors supplied. Their
copyright notices must stay with them. This repository's MIT license covers only
the original work, not these folders.

| Module | License | Copyright line in its license file |
| --- | --- | --- |
| `cardio-engineering/modules/cardiolens-track-a` | MIT | Copyright (c) 2026 Nivasri Thirumeni |
| `cardio-engineering/modules/cardioscope` | MIT | Copyright (c) 2026 CardioScope contributors |
| `cardio-engineering/modules/cardiotwin` | MIT | Copyright (c) 2026 Mohammad Umar |
| `cardio-engineering/modules/case-twin` | MIT | Copyright (c) 2026 CaseTwin Contributors |
| `cardio-engineering/modules/corolens` | MIT | Copyright (c) 2026 Ritesh Kumar Mahato |
| `cardio-engineering/modules/heartai` | MIT | Copyright (c) 2025 Ethan Tam |
| `cardio-engineering/modules/multimodal-hackathon-2026` | Eclipse Public License 2.0 | See its license file |
| `cardio-engineering/modules/slicerheart` | BSD 3-Clause | Copyright (c) 2021, SlicerHeart Contributors |

## 3. Core code adapted from third-party projects

These files in `cardio-engineering/core/` are adapted from, and used under, the
licenses of the upstream projects named in their file headers:

- From **heartAI** (MIT, Copyright (c) 2025 Ethan Tam): imaging API and embedding
  services, and the `frontend/src/cardiotwin/cardiac/` components.
- From **CaseTwin** (MIT, Copyright (c) 2026 CaseTwin Contributors): case search API,
  vector search services, and the `frontend/src/cardiotwin/evidence/` components.
- From **SlicerHeart** (BSD 3-Clause, Copyright (c) 2021 SlicerHeart Contributors):
  `backend/app/integrations/slicerheart/` (valve metrics vocabulary and provenance).
- From **EpiCast** (CC BY 4.0, as declared at its upstream repository): the clinical
  extraction API and service (`core__cardiotwin_api__clinical_extraction.py`,
  `core__cardiotwin_services__clinical_extraction.py`).

## 4. The Pulse 911 application

`pulse/` is based on the open-source **pulse911** project by Jay Gopal
(https://github.com/j4yop/pulse911), distributed under the MIT License. Its
copyright notice applies to that folder.

## 5. Excluded content

Module folders and derived files whose upstream projects did not grant a license
were **not published** in this repository and are not covered by its MIT license.

## 6. Runtime services (not redistributed)

The application can call the Anthropic API, OpenRouter, AWS Bedrock and xAI when
started with live AI enabled. Those services are governed by their own terms. No
keys are included in this repository.

## 7. Software dependencies

Python and JavaScript dependencies keep their own licenses. See
`cardio-engineering/core/backend/requirements.txt`,
`cardio-engineering/core/backend/pyproject.toml` and
`cardio-engineering/core/frontend/package-lock.json`.
