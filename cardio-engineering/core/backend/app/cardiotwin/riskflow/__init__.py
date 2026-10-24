"""Clinician cardiac-risk workflow (riskflow).

One fail-closed path from "clinician selects a patient" to "validated risk + simulation":

  1. identity & device binding  — the wearable must be a FHIR Device bound to this Patient
  2. FHIR history               — R4 resources validated, units normalised, as-of time-travel guard
  3. wearable signal quality    — stale / implausible / flatline / motion / RR-artifact rejection
  4. alignment                  — wearable window aligned to historical FHIR values, per-feature provenance
  5. validated risk             — coherent vessel-pattern model (conditional Ising), OOD + conformal checks
  6. physics simulation         — organ (elastance-Windkessel) → vessel (stenosis) → cell (Mitchell-Schaeffer)

Every rejection carries a machine-readable reason code; nothing rejected reaches the model or the
simulation. Synthetic demo patients are built from rows of the public Z-Alizadeh Sani dataset.
"""

RISKFLOW_VERSION = "1.0.0"
