"""Align the gated wearable window with historical FHIR facts into one model input.

For every model column the newest admissible value is chosen as of the clinician's time:

  * the value must be dated ≤ as-of (parse_history already enforces this)
  * it must be younger than the column's freshness limit (symptoms 90 d; vitals, ECG, labs 365 d;
    anthropometrics and echo 730 d) — older values are reported as ``stale`` and left missing
  * pulse rate (dataset column ``PR``) comes from the wearable's resting heart rate only when the
    signal-quality gate accepted it; otherwise from the newest fresh FHIR heart-rate Observation

Coded conditions follow problem-list convention: an active coded condition is positive; absence is
recorded as an *assumed* negative and labelled so in provenance. Columns with no admissible value
stay missing (the model imputes training medians and says so).

Drift: the accepted wearable resting HR / SpO2 are compared with the patient's own FHIR history
(median of the last two years). A large shift is a warning for clinician review, not a rejection —
it may be real physiology.
"""

from __future__ import annotations

import statistics
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from app.cardiotwin.riskflow.fhir_history import Fact, History, _parse_time
from app.cardiotwin.riskflow.quality import QualityReport
from app.cardiotwin.schema import FEATURES

HISTORY_FLAGS = ("DM", "HTN", "FH", "Obesity", "CRF", "CVA", "Airway disease", "Thyroid Disease", "CHF", "DLP")
ANTHRO = {"Weight", "Length", "BMI"}
MIN_CORE_COMPLETENESS = 0.7
HR_DRIFT_BPM = 20.0
SPO2_DRIFT_PCT = 4.0
SPEC = {f.name: f for f in FEATURES}


def max_age_days(feature: str) -> float:
    spec = SPEC[feature]
    if feature in ANTHRO or spec.group == "echo":
        return 730
    if spec.group == "exam":
        return 365 if feature in {"BP", "PR"} else 90
    return 365  # ecg, lab


@dataclass
class Alignment:
    status: str  # pass | warn | fail
    reasons: list[str]
    values: dict[str, Any]
    provenance: dict[str, dict[str, Any]]
    core_completeness: float
    core_missing: list[str]
    drift: dict[str, Any]
    timeline: list[dict[str, Any]]
    physiology_inputs: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _age_days(as_of: datetime, iso: str | None) -> float:
    t = _parse_time(iso)
    return (as_of - t).total_seconds() / 86400 if t else float("inf")


def _latest_fresh(history: History, feature: str, as_of: datetime, limit: float) -> Any:
    return next((f.value for f in reversed(history.series(feature)) if _age_days(as_of, f.time) <= limit), None)


def align(history: History, quality: QualityReport | None, as_of: datetime) -> Alignment:
    values: dict[str, Any] = {}
    prov: dict[str, dict[str, Any]] = {}
    timeline: list[dict[str, Any]] = []
    reasons: list[str] = []

    def use(feature: str, value: Any, source: str, time: str | None, how: str) -> None:
        values[feature] = value
        prov[feature] = {"source": source, "time": time, "status": how,
                         "age_days": round(_age_days(as_of, time), 1) if time else None}

    # ---- demographics -----------------------------------------------------------
    birth = _parse_time(history.birth_date)
    if birth:
        use("Age", int((as_of - birth).days / 365.2425), history.patient_ref or "Patient", history.birth_date, "fhir")
    if history.sex:
        use("Sex", history.sex, history.patient_ref or "Patient", None, "fhir")

    # ---- coded conditions (binary columns accept 1/0) ---------------------------
    for flag in HISTORY_FLAGS:
        c = history.conditions.get(flag)
        if c and c["active"]:
            use(flag, 1, c["source"], c["onset"], "fhir")
        elif c:
            use(flag, 0, c["source"], c["onset"], "resolved")
        else:
            use(flag, 0, "problem list", None, "assumed-negative")

    smoking = history.series("SmokingStatus")
    if smoking:
        s = smoking[-1]
        use("Current Smoker", int(s.value == "current"), s.source, s.time, "fhir")
        use("EX-Smoker", int(s.value == "former"), s.source, s.time, "fhir")
    else:
        use("Current Smoker", 0, "smoking status", None, "assumed-negative")
        use("EX-Smoker", 0, "smoking status", None, "assumed-negative")

    # ---- observations (LOINC + local codes) -------------------------------------
    by_feature: dict[str, list[Fact]] = {}
    for f in history.facts:
        if f.feature in SPEC:
            by_feature.setdefault(f.feature, []).append(f)
    for name, series in by_feature.items():
        if name in values:
            continue
        series.sort(key=lambda f: f.time)
        limit = max_age_days(name)
        fresh = [f for f in series if _age_days(as_of, f.time) <= limit]
        chosen = fresh[-1] if fresh else None
        for f in series:
            status = "used" if f is chosen else ("superseded" if f in fresh else "stale")
            timeline.append({"time": f.time, "feature": name, "value": f.value, "unit": f.unit,
                             "source": f.source, "status": status})
        if chosen is not None:
            use(name, chosen.value, chosen.source, chosen.time, "fhir")
        else:
            last = series[-1]
            prov[name] = {"source": last.source, "time": last.time, "status": "stale",
                          "age_days": round(_age_days(as_of, last.time), 1)}

    if "BMI" not in values and "Weight" in values and values.get("Length"):
        bmi = float(values["Weight"]) / (float(values["Length"]) / 100) ** 2
        use("BMI", round(bmi, 2), "derived(Weight, Length)", prov["Weight"]["time"], "derived")

    # ---- wearable alignment ------------------------------------------------------
    drift: dict[str, Any] = {}
    hr_hist = [float(f.value) for f in history.series("PR") if _age_days(as_of, f.time) <= 730]
    spo2_hist = [float(f.value) for f in history.series("SpO2") if _age_days(as_of, f.time) <= 730]
    if quality is not None and quality.resting_hr is not None:
        hr_now = quality.resting_hr
        record_pr = prov.get("PR")
        use("PR", round(hr_now), "wearable", quality.as_of, "wearable")
        if record_pr:
            prov["PR"]["superseded_record"] = record_pr
        timeline.append({"time": quality.as_of, "feature": "PR", "value": hr_now, "unit": "/min",
                         "source": "wearable (gated resting window)", "status": "used"})
        for e in timeline:
            if e["feature"] == "PR" and e["source"] != "wearable (gated resting window)" and e["status"] == "used":
                e["status"] = "superseded"
        if hr_hist:
            base = statistics.median(hr_hist)
            delta = hr_now - base
            drift["heart_rate"] = {"wearable": hr_now, "fhir_median_2y": base, "delta": round(delta, 1),
                                   "n_history": len(hr_hist), "flag": abs(delta) > HR_DRIFT_BPM}
            if abs(delta) > HR_DRIFT_BPM:
                reasons.append("HR_DRIFT")
        sp = quality.channels["spo2"]
        if sp.status == "accepted" and spo2_hist:
            base = statistics.median(spo2_hist)
            delta = sp.value["spo2_median"] - base
            drift["spo2"] = {"wearable": sp.value["spo2_median"], "fhir_median_2y": base,
                             "delta": round(delta, 1), "flag": abs(delta) > SPO2_DRIFT_PCT}
            if abs(delta) > SPO2_DRIFT_PCT:
                reasons.append("SPO2_DRIFT")
    elif "PR" in values:
        reasons.append("PR_FROM_RECORD")  # wearable unusable; fell back to the record

    # ---- completeness gate -------------------------------------------------------
    core = [f.name for f in FEATURES if f.core]
    measured = [n for n in core if n in values and prov[n]["status"] in {"fhir", "wearable", "derived"}]
    missing = [n for n in core if n not in values]
    completeness = len(measured) / len(core)
    if any(p["status"] == "stale" for p in prov.values()):
        reasons.append("STALE_RECORDS_EXCLUDED")
    if completeness < MIN_CORE_COMPLETENESS:
        status = "fail"
        reasons.insert(0, "INSUFFICIENT_HISTORY")
    else:
        status = "warn" if reasons or missing else "pass"

    physio = {
        "heart_rate": values.get("PR"),
        "heart_rate_source": prov.get("PR", {}).get("source"),
        "sbp": values.get("BP"),
        "dbp": _latest_fresh(history, "DBP", as_of, 365),
        "ef": values.get("EF-TTE"),
        "age": values.get("Age"),
        "qt_ms": _latest_fresh(history, "QT", as_of, 365),
    }
    timeline.sort(key=lambda e: e["time"])
    return Alignment(status, reasons, values, prov, round(completeness, 3), missing, drift, timeline, physio)
