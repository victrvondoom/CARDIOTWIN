"""Synthetic patients for the workflow: real public feature vectors, synthetic record + wearable.

Each demo patient takes its clinical values from one row of the public Z-Alizadeh Sani dataset
(so the model sees a realistic phenotype), then wraps them in a synthetic FHIR R4 history (LOINC /
UCUM observations, ICD-10-CM conditions, a bound wearable Device, a multi-year heart-rate series) and
a synthetic 30-minute wearable stream. Faults are injected deliberately so every gate is exercised.
No real person is represented; identifiers and dates are generated. Demo rows are part of the
model's training data, so their risk outputs are in-sample illustrations, not validation.

``evaluate_quality_gate`` runs the signal-quality gate over randomised fault-injected streams and
reports detection and false-rejection rates — the evidence that rejection works as specified.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Any

from app.cardiotwin.interop.fhir_exchange import LOCAL_SYSTEM
from app.cardiotwin.riskflow import quality as q
from app.cardiotwin.riskflow.fhir_history import DEVICE_ID_SYSTEM, ICD10, LOINC, SNOMED
from app.cardiotwin.riskflow.vessel_ising import DEMO_ROWS_PATH
from app.cardiotwin.schema import FEATURES
from app.cardiotwin.wearables.core__cardiotwin_wearables__models import WearableDataPoint

DEMO_AS_OF = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)

# column -> (LOINC, UCUM unit, multiplier from dataset unit to that unit)
NUMERIC_LOINC: dict[str, tuple[str, str, float]] = {
    "Weight": ("29463-7", "kg", 1), "Length": ("8302-2", "cm", 1), "BMI": ("39156-5", "kg/m2", 1),
    "FBS": ("1558-6", "mg/dL", 1), "CR": ("2160-0", "mg/dL", 1), "TG": ("2571-8", "mg/dL", 1),
    "LDL": ("13457-7", "mg/dL", 1), "HDL": ("2085-9", "mg/dL", 1), "BUN": ("3094-0", "mg/dL", 1),
    "ESR": ("4537-7", "mm/h", 1), "HB": ("718-7", "g/dL", 1), "K": ("2823-3", "mmol/L", 1),
    "Na": ("2951-2", "mmol/L", 1), "WBC": ("6690-2", "10*3/uL", 0.001), "Lymph": ("736-9", "%", 1),
    "Neut": ("770-8", "%", 1), "PLT": ("777-3", "10*3/uL", 1), "EF-TTE": ("10230-1", "%", 1),
}
CONDITION_ICD = {"DM": "E11.9", "HTN": "I10", "DLP": "E78.5", "CHF": "I50.9", "CRF": "N18.3", "CVA": "I63.9",
                 "Airway disease": "J45.909", "Thyroid Disease": "E03.9", "Obesity": "E66.9"}
HANDLED = set(NUMERIC_LOINC) | set(CONDITION_ICD) | {"Age", "Sex", "FH", "Current Smoker", "EX-Smoker", "BP", "PR"}
LOCAL_FEATURES = [f.name for f in FEATURES if f.name not in HANDLED]
DAYS = {"lab": 45, "ecg": 20, "exam": 20, "echo": 120, "demographics": 60}


@dataclass(frozen=True)
class Scenario:
    patient_id: str
    title: str
    row: int
    fault: str  # none | stale | artifact | unbound | thin_history | flatline
    expect: str
    tg_mmol: bool = False


SCENARIOS: tuple[Scenario, ...] = (
    Scenario("P-001", "Three-vessel phenotype, clean multimodal data", 5, "none",
             "All gates pass; wearable heart rate replaces the record value", tg_mmol=True),
    Scenario("P-002", "Normal coronaries, clean multimodal data", 41, "none", "All gates pass; low vessel probabilities"),
    Scenario("P-003", "Watch last synced 6 hours ago", 2, "stale",
             "Wearable rejected as STALE; pulse rate falls back to the FHIR record"),
    Scenario("P-004", "Exercise session with ectopic beats", 0, "artifact",
             "Wearable degraded: motion samples excluded, HRV rejected (RR_ARTIFACT)"),
    Scenario("P-005", "Stream from a device not registered to this patient", 1, "unbound",
             "Wearable rejected (DEVICE_UNBOUND): wrong-patient data never reaches the model"),
    Scenario("P-006", "Labs and echo older than three years", 9, "thin_history",
             "Risk withheld: INSUFFICIENT_HISTORY after stale records are excluded"),
    Scenario("P-007", "Sensor stuck at a constant value", 6, "flatline", "Wearable rejected (FLATLINE)"),
    Scenario("P-008", "Unusual phenotype at the edge of the training data", 3, "none",
             "Risk withheld (OUT_OF_DOMAIN): a real dataset row beyond the 99th-percentile Mahalanobis distance"),
)
BY_ID = {s.patient_id: s for s in SCENARIOS}


@lru_cache(maxsize=1)
def _demo_rows() -> dict[str, dict[str, Any]]:
    """Dataset rows used by the demo patients, exported at training time (serving must not need pandas)."""
    if not DEMO_ROWS_PATH.exists():
        raise FileNotFoundError(f"{DEMO_ROWS_PATH.name} missing: run `python -m app.cardiotwin.riskflow.train_ising`")
    return json.loads(DEMO_ROWS_PATH.read_text(encoding="utf-8"))["rows"]


def _row(i: int) -> dict[str, Any]:
    return dict(_demo_rows()[str(i)])


def export_demo_rows() -> dict[str, Any]:
    """Training-time: copy the demo patients' rows (verbatim) from the verified dataset CSV."""
    from app.cardiotwin.core__app_cardiotwin__data import DATASET_CSV, file_sha256, load_dataset

    df = load_dataset()
    rows = {str(s.row): {f.name: (df.iloc[s.row][f.name].item() if hasattr(df.iloc[s.row][f.name], "item")
                                  else df.iloc[s.row][f.name]) for f in FEATURES} for s in SCENARIOS}
    out = {"dataset_sha256": file_sha256(DATASET_CSV), "note": "verbatim rows of the public dataset used by demo patients",
           "rows": rows}
    DEMO_ROWS_PATH.write_text(json.dumps(out, indent=1), encoding="utf-8")
    _demo_rows.cache_clear()
    return out


def _iso(t: datetime) -> str:
    return t.isoformat().replace("+00:00", "Z")


def _obs(pid: str, oid: str, when: datetime, code: tuple[str, str], **value: Any) -> dict[str, Any]:
    return {"fullUrl": f"urn:uuid:{pid}-{oid}", "resource": {
        "resourceType": "Observation", "id": f"{pid}-{oid}", "status": "final",
        "subject": {"reference": f"Patient/{pid}"}, "effectiveDateTime": _iso(when),
        "code": {"coding": [{"system": code[0], "code": code[1]}]}, **value}}


def _qty(v: float, unit: str) -> dict[str, Any]:
    return {"valueQuantity": {"value": round(float(v), 3), "unit": unit, "system": "http://unitsofmeasure.org", "code": unit}}


def device_id(s: Scenario) -> str:
    return f"wd-{s.patient_id}-a1"


def build_bundle(s: Scenario, as_of: datetime = DEMO_AS_OF) -> dict[str, Any]:
    row = _row(s.row)
    pid = s.patient_id
    rng = random.Random(f"bundle-{pid}")
    shift = 3 * 365 if s.fault == "thin_history" else 0
    birth = (as_of - timedelta(days=int(float(row["Age"]) * 365.2425) + 100)).date().isoformat()
    entries: list[dict[str, Any]] = [
        {"fullUrl": f"urn:uuid:{pid}", "resource": {
            "resourceType": "Patient", "id": pid, "birthDate": birth,
            "gender": "female" if str(row["Sex"]).lower() in {"female", "fmale"} else "male",
            "identifier": [{"system": "urn:cardiotwin:synthetic", "value": pid}]}},
        {"fullUrl": f"urn:uuid:{pid}-dev", "resource": {
            "resourceType": "Device", "id": f"{pid}-dev", "status": "active", "patient": {"reference": f"Patient/{pid}"},
            "type": {"text": "wrist PPG watch + chest ECG patch"},
            "identifier": [{"system": DEVICE_ID_SYSTEM, "value": device_id(s)}]}},
    ]
    group = {f.name: f.group for f in FEATURES}
    for col, (loinc, unit, mult) in NUMERIC_LOINC.items():
        v = float(row[col])
        when = as_of - timedelta(days=DAYS[group[col]] + shift + rng.randint(0, 10))
        if col == "TG" and s.tg_mmol:  # exercise unit conversion: mmol/L in, mg/dL to the model
            entries.append(_obs(pid, f"o-{loinc}", when, (LOINC, loinc), **_qty(v / 88.57, "mmol/L")))
        else:
            entries.append(_obs(pid, f"o-{loinc}", when, (LOINC, loinc), **_qty(v * mult, unit)))
        if group[col] == "lab":  # an older superseded value, to show history handling
            entries.append(_obs(pid, f"o-{loinc}-old", when - timedelta(days=400), (LOINC, loinc),
                                **_qty(v * mult * rng.uniform(0.9, 1.1), unit)))
    bp_when = as_of - timedelta(days=12 + shift)
    entries.append({"fullUrl": f"urn:uuid:{pid}-bp", "resource": {
        "resourceType": "Observation", "id": f"{pid}-bp", "status": "final", "subject": {"reference": f"Patient/{pid}"},
        "effectiveDateTime": _iso(bp_when), "code": {"coding": [{"system": LOINC, "code": "85354-9"}]},
        "component": [{"code": {"coding": [{"system": LOINC, "code": "8480-6"}]}, **_qty(float(row["BP"]), "mm[Hg]")},
                      {"code": {"coding": [{"system": LOINC, "code": "8462-4"}]}, **_qty(float(row["BP"]) * 0.62, "mm[Hg]")}]}})
    for k, days in enumerate((700, 520, 330, 160, 12)):
        when = as_of - timedelta(days=days + shift)
        entries.append(_obs(pid, f"hr{k}", when, (LOINC, "8867-4"), **_qty(float(row["PR"]) + rng.uniform(-4, 4), "/min")))
        entries.append(_obs(pid, f"spo2{k}", when, (LOINC, "59408-5"), **_qty(rng.uniform(95.5, 98.5), "%")))
    for col, icd in CONDITION_ICD.items():
        if str(row[col]).upper() in {"Y", "1"}:
            entries.append({"fullUrl": f"urn:uuid:{pid}-c-{icd}", "resource": {
                "resourceType": "Condition", "id": f"{pid}-c-{icd}", "subject": {"reference": f"Patient/{pid}"},
                "clinicalStatus": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]},
                "code": {"coding": [{"system": ICD10, "code": icd}]}, "onsetDateTime": _iso(as_of - timedelta(days=900))}})
    if str(row["FH"]) == "1":
        entries.append({"fullUrl": f"urn:uuid:{pid}-fh", "resource": {
            "resourceType": "FamilyMemberHistory", "id": f"{pid}-fh", "status": "completed",
            "patient": {"reference": f"Patient/{pid}"},
            "condition": [{"code": {"coding": [{"system": ICD10, "code": "I25.10"}]}}]}})
    smoke = "77176002" if str(row["Current Smoker"]) == "1" else "8517006" if str(row["EX-Smoker"]) == "1" else "266919005"
    entries.append(_obs(pid, "smoke", as_of - timedelta(days=60), (LOINC, "72166-2"),
                        valueCodeableConcept={"coding": [{"system": SNOMED, "code": smoke}]}))
    for col in LOCAL_FEATURES:  # findings with no standard code in scope: same local system as the exporter
        when = as_of - timedelta(days=DAYS[group[col]] + shift)
        entries.append(_obs(pid, f"l-{col.replace(' ', '_')}", when, (LOCAL_SYSTEM, f"input:{col}"), valueString=str(row[col])))
    entries.append({"fullUrl": f"urn:uuid:{pid}-prelim", "resource": {  # must be rejected: not final
        "resourceType": "Observation", "id": f"{pid}-prelim", "status": "preliminary", "subject": {"reference": f"Patient/{pid}"},
        "effectiveDateTime": _iso(as_of - timedelta(days=1)), "code": {"coding": [{"system": LOINC, "code": "2085-9"}]},
        **_qty(20, "mg/dL")}})
    return {"resourceType": "Bundle", "type": "collection", "id": f"history-{pid}", "entry": entries}


def clean_stream(hr: float, end: datetime, dev: str, seed: str, minutes: int = 30) -> list[WearableDataPoint]:
    rng = random.Random(seed)
    out = []
    for k in range(minutes):
        h = hr + rng.gauss(0, 1.8)
        out.append(WearableDataPoint(
            timestamp=end - timedelta(minutes=minutes - 1 - k), heart_rate=round(h, 1),
            rr_intervals=[round(60000.0 / h + rng.gauss(0, 18), 1) for _ in range(8)],
            spo2=round(rng.uniform(96, 98.5), 1), activity_level=round(rng.uniform(0.02, 0.15), 2),
            steps=rng.randint(0, 6), device_id=dev, device_type="wrist-ppg",
            signal_quality=round(rng.uniform(0.88, 0.99), 2)))
    return out


def _with(s: WearableDataPoint, **changes: Any) -> WearableDataPoint:
    d = {k: getattr(s, k) for k in ("timestamp", "heart_rate", "rr_intervals", "spo2", "steps", "activity_level",
                                     "sleep_stage", "device_id", "device_type", "signal_quality")}
    d.update(changes)
    return WearableDataPoint(**d)


def inject(fault: str, stream: list[WearableDataPoint], as_of: datetime, rng: random.Random) -> list[WearableDataPoint]:
    """Apply one named fault to a clean stream (used by demo patients and the gate evaluation)."""
    if fault == "none":
        return stream
    if fault == "stale":
        return [_with(s, timestamp=s.timestamp - timedelta(hours=6)) for s in stream]
    if fault == "flatline":
        return [_with(s, heart_rate=72.0, rr_intervals=None) for s in stream]
    if fault == "unbound":
        return [_with(s, device_id="wd-UNKNOWN-9f") for s in stream]
    if fault == "motion_heavy":
        return [_with(s, activity_level=round(rng.uniform(0.5, 0.9), 2)) for s in stream]
    if fault in ("artifact", "rr_ectopy"):
        out = []
        for i, s in enumerate(stream):
            rr = [r * (rng.choice([0.6, 1.5]) if rng.random() < 0.35 else 1.0) for r in (s.rr_intervals or [])]
            act = round(rng.uniform(0.5, 0.9), 2) if fault == "artifact" and i % 3 == 0 else s.activity_level
            out.append(_with(s, rr_intervals=[round(r, 1) for r in rr], activity_level=act))
        return out
    if fault == "dropout":
        return stream[::4]
    if fault == "implausible_burst":
        return [_with(s, heart_rate=255.0) if i % 6 == 0 else s for i, s in enumerate(stream)]
    if fault == "low_device_quality":
        return [_with(s, signal_quality=0.3) for s in stream]
    if fault == "duplicate_replay":
        return stream + [_with(s) for s in stream]
    if fault == "future_timestamps":
        return stream + [_with(s, timestamp=as_of + timedelta(hours=1, minutes=i)) for i, s in enumerate(stream[:5])]
    raise KeyError(fault)


def build_stream(s: Scenario, as_of: datetime = DEMO_AS_OF) -> list[WearableDataPoint]:
    row = _row(s.row)
    stream = clean_stream(float(row["PR"]) + 1.5, as_of - timedelta(minutes=2), device_id(s), f"stream-{s.patient_id}")
    fault = s.fault if s.fault in {"stale", "artifact", "unbound", "flatline"} else "none"
    return inject(fault, stream, as_of, random.Random(f"fault-{s.patient_id}"))


# ---------------------------------------------------------------------------
# Gate evaluation over randomised fault injection
# ---------------------------------------------------------------------------

EXPECTED: dict[str, tuple[str, str | None]] = {
    # fault -> (expected stream status, or "excluded" = bad samples dropped but stream usable; reason code)
    "none": ("accepted", None),
    "stale": ("rejected", q.STALE),
    "flatline": ("rejected", q.FLATLINE),
    "unbound": ("rejected", q.DEVICE_UNBOUND),
    "motion_heavy": ("rejected", q.INSUFFICIENT_REST),
    "rr_ectopy": ("degraded", q.RR_ARTIFACT),
    "dropout": ("rejected", q.LOW_COVERAGE),
    "low_device_quality": ("rejected", q.DEVICE_LOW_QUALITY),
    "implausible_burst": ("excluded", q.IMPLAUSIBLE_VALUE),
    "duplicate_replay": ("excluded", q.DUPLICATE_TIMESTAMP),
    "future_timestamps": ("excluded", q.FUTURE_TIMESTAMP),
}


def evaluate_quality_gate(n_per_fault: int = 60, seed: int = 2026) -> dict[str, Any]:
    rng = random.Random(seed)
    as_of = DEMO_AS_OF
    results: dict[str, Any] = {}
    for fault, (want, reason) in EXPECTED.items():
        hits = 0
        hr_err: list[float] = []
        for k in range(n_per_fault):
            hr = rng.uniform(52, 105)
            dev = f"wd-eval-{k}"
            end = as_of - timedelta(minutes=rng.randint(0, 8))
            rep = q.assess_stream(inject(fault, clean_stream(hr, end, dev, f"{fault}-{k}-{seed}"), as_of, rng), as_of, {dev})
            if want in ("excluded", "accepted"):
                ok = rep.status == "accepted" and (reason is None or rep.sample_flags.get(reason, 0) > 0)
                if rep.resting_hr is not None:
                    hr_err.append(abs(rep.resting_hr - hr))
            else:
                ok = rep.status == want and reason in rep.reasons
            hits += ok
        results[fault] = {"expected": want, "reason": reason, "n": n_per_fault, "rate": round(hits / n_per_fault, 4)}
        if hr_err:
            results[fault]["resting_hr_abs_error_bpm_p95"] = round(sorted(hr_err)[int(0.95 * (len(hr_err) - 1))], 2)
    return {"seed": seed, "n_per_fault": n_per_fault, "faults": results,
            "false_rejection_rate_clean": round(1 - results["none"]["rate"], 4)}
