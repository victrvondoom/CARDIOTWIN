"""FHIR R4 history → time-stamped, unit-normalised facts for one patient.

Supported resources: Patient, Observation, Condition, FamilyMemberHistory, Device.
Standard codes (LOINC for observations; ICD-10-CM prefixes and SNOMED CT for conditions) map to the
model's dataset columns. Findings with no standard code in scope (symptoms, ECG findings, echo
wall-motion count) use the existing CardioTwin local system ``urn:cardiotwin:research-observation``
with code ``input:<column>`` — the same convention ``interop/fhir_exchange.py`` exports.

Resources are rejected (with a reason, never silently) when they are not final, reference another
patient, carry an unknown unit, or are dated after the clinician's as-of time (time-travel guard:
a risk "as of" a date must not see later data).
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from datetime import UTC, date, datetime
from typing import Any

from app.cardiotwin.interop.fhir_exchange import LOCAL_SYSTEM

LOINC = "http://loinc.org"
SNOMED = "http://snomed.info/sct"
ICD10 = "http://hl7.org/fhir/sid/icd-10-cm"
DEVICE_ID_SYSTEM = "urn:cardiotwin:wearable-device"
MAX_ENTRIES = 2000
ACCEPTED_STATUS = {"final", "amended", "corrected"}

# LOINC -> (dataset column, canonical unit, {accepted unit: multiplier to canonical})
OBSERVATION_MAP: dict[str, tuple[str, str, dict[str, float]]] = {
    "8867-4": ("PR", "/min", {"/min": 1, "beats/min": 1, "{beats}/min": 1, "bpm": 1}),
    "8480-6": ("BP", "mm[Hg]", {"mm[Hg]": 1, "mmHg": 1}),
    "39156-5": ("BMI", "kg/m2", {"kg/m2": 1, "kg/m^2": 1}),
    "29463-7": ("Weight", "kg", {"kg": 1, "[lb_av]": 0.45359237, "g": 0.001}),
    "8302-2": ("Length", "cm", {"cm": 1, "m": 100, "[in_i]": 2.54}),
    "1558-6": ("FBS", "mg/dL", {"mg/dL": 1, "mmol/L": 18.016}),
    "2160-0": ("CR", "mg/dL", {"mg/dL": 1, "umol/L": 1 / 88.42, "µmol/L": 1 / 88.42}),
    "2571-8": ("TG", "mg/dL", {"mg/dL": 1, "mmol/L": 88.57}),
    "13457-7": ("LDL", "mg/dL", {"mg/dL": 1, "mmol/L": 38.67}),
    "18262-6": ("LDL", "mg/dL", {"mg/dL": 1, "mmol/L": 38.67}),
    "2085-9": ("HDL", "mg/dL", {"mg/dL": 1, "mmol/L": 38.67}),
    "3094-0": ("BUN", "mg/dL", {"mg/dL": 1, "mmol/L": 2.801}),
    "4537-7": ("ESR", "mm/h", {"mm/h": 1, "mm/hr": 1}),
    "30341-2": ("ESR", "mm/h", {"mm/h": 1, "mm/hr": 1}),
    "718-7": ("HB", "g/dL", {"g/dL": 1, "g/L": 0.1}),
    "2823-3": ("K", "mmol/L", {"mmol/L": 1, "meq/L": 1, "mEq/L": 1}),
    "2951-2": ("Na", "mmol/L", {"mmol/L": 1, "meq/L": 1, "mEq/L": 1}),
    "6690-2": ("WBC", "/uL", {"10*3/uL": 1000, "/uL": 1, "10*9/L": 1000}),
    "736-9": ("Lymph", "%", {"%": 1}),
    "770-8": ("Neut", "%", {"%": 1}),
    "777-3": ("PLT", "10*3/uL", {"10*3/uL": 1, "10*9/L": 1}),
    "10230-1": ("EF-TTE", "%", {"%": 1}),
    # Not model inputs: used for alignment baselines and the physiology layers.
    "59408-5": ("SpO2", "%", {"%": 1}),
    "2708-6": ("SpO2", "%", {"%": 1}),
    "8462-4": ("DBP", "mm[Hg]", {"mm[Hg]": 1, "mmHg": 1}),
    "8634-8": ("QT", "ms", {"ms": 1, "s": 1000}),
}
BP_PANEL = "85354-9"
SMOKING_STATUS = "72166-2"
SMOKING_SNOMED = {"77176002": "current", "449868002": "current", "8517006": "former", "266919005": "never"}

# condition flag -> (ICD-10-CM prefixes, SNOMED codes)
CONDITION_MAP: dict[str, tuple[tuple[str, ...], frozenset[str]]] = {
    "DM": (("E10", "E11", "E13", "E14"), frozenset({"44054006", "46635009", "73211009"})),
    "HTN": (("I10", "I11", "I12", "I13", "I15"), frozenset({"38341003", "59621000"})),
    "DLP": (("E78",), frozenset({"55822004", "370992007"})),
    "CHF": (("I50",), frozenset({"42343007", "84114007"})),
    "CRF": (("N18",), frozenset({"709044004", "90688005"})),
    "CVA": (("I61", "I63", "I64", "Z86.73"), frozenset({"230690007"})),
    "Airway disease": (("J44", "J45"), frozenset({"13645005", "195967001"})),
    "Thyroid Disease": (("E00", "E01", "E02", "E03", "E04", "E05", "E06", "E07"), frozenset({"14304000"})),
    "Obesity": (("E66",), frozenset({"414916001"})),
}
FAMILY_CAD = (("I20", "I21", "I22", "I25"), frozenset({"53741008", "22298006"}))


@dataclass
class Fact:
    feature: str
    value: Any
    unit: str
    time: str  # ISO-8601, UTC
    source: str  # resource reference, e.g. Observation/abc
    code: str


@dataclass
class History:
    patient_ref: str | None = None
    sex: str | None = None
    birth_date: str | None = None
    facts: list[Fact] = field(default_factory=list)
    conditions: dict[str, dict[str, Any]] = field(default_factory=dict)
    devices: list[dict[str, Any]] = field(default_factory=list)
    rejected: list[dict[str, str]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    n_resources: int = 0

    @property
    def bound_device_ids(self) -> set[str]:
        return {d["device_id"] for d in self.devices if d["bound"] and d["active"]}

    def series(self, feature: str) -> list[Fact]:
        return sorted((f for f in self.facts if f.feature == feature), key=lambda f: f.time)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        if len(value) == 10:
            return datetime.combine(date.fromisoformat(value), datetime.min.time(), tzinfo=UTC)
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else None  # FHIR dateTime with a time part must carry a zone


def _codes(concept: Any) -> list[tuple[str, str]]:
    if not isinstance(concept, dict) or not isinstance(concept.get("coding"), list):
        return []
    return [(str(c.get("system", "")), str(c.get("code", ""))) for c in concept["coding"] if isinstance(c, dict)]


def _effective(resource: dict[str, Any]) -> datetime | None:
    period = resource.get("effectivePeriod")
    t = resource.get("effectiveDateTime") or (period.get("start") if isinstance(period, dict) else None)
    return _parse_time(t or resource.get("issued"))


def _quantity(q: Any, accepted: dict[str, float]) -> tuple[float | None, str | None]:
    if not isinstance(q, dict):
        return None, "missing valueQuantity"
    v, unit = q.get("value"), q.get("code") or q.get("unit")
    if isinstance(v, bool) or not isinstance(v, int | float) or not math.isfinite(v):
        return None, "non-numeric value"
    if unit not in accepted:
        return None, f"unsupported unit {unit!r}"
    return float(v) * accepted[unit], None


def _local_value(resource: dict[str, Any]) -> Any:
    if "valueBoolean" in resource:
        return 1 if resource["valueBoolean"] else 0
    for key in ("valueInteger", "valueString"):
        if key in resource:
            return resource[key]
    q = resource.get("valueQuantity")
    if isinstance(q, dict) and isinstance(q.get("value"), int | float) and not isinstance(q.get("value"), bool):
        return q["value"]
    return None


def _match_condition(codes: list[tuple[str, str]], spec: tuple[tuple[str, ...], frozenset[str]]) -> bool:
    prefixes, snomed = spec
    for system, code in codes:
        if system == ICD10 and code.upper().startswith(prefixes):
            return True
        if system == SNOMED and code in snomed:
            return True
    return False


def _subject_ref(r: dict[str, Any]) -> str | None:
    holder = r.get("subject") or r.get("patient")
    ref = holder.get("reference") if isinstance(holder, dict) else None
    return ref if isinstance(ref, str) else None


def parse_history(bundle: dict[str, Any], as_of: datetime) -> History:
    """Validate a FHIR R4 Bundle and extract facts dated at or before ``as_of``."""
    h = History()
    if as_of.tzinfo is None:
        raise ValueError("as_of must be timezone-aware")
    if not isinstance(bundle, dict) or bundle.get("resourceType") != "Bundle":
        h.errors.append("not a FHIR Bundle")
        return h
    entries = bundle.get("entry")
    if not isinstance(entries, list) or not entries:
        h.errors.append("Bundle has no entries")
        return h
    if len(entries) > MAX_ENTRIES:
        h.errors.append(f"Bundle exceeds {MAX_ENTRIES} entries")
        return h
    resources = [e.get("resource") for e in entries if isinstance(e, dict)]
    resources = [r for r in resources if isinstance(r, dict) and isinstance(r.get("resourceType"), str)]
    h.n_resources = len(resources)
    patients = [r for r in resources if r["resourceType"] == "Patient"]
    if len(patients) != 1 or not patients[0].get("id"):
        h.errors.append("exactly one Patient with an id is required")
        return h
    pat = patients[0]
    h.patient_ref = f"Patient/{pat['id']}"
    h.sex = {"male": "Male", "female": "Female"}.get(str(pat.get("gender", "")).lower())
    h.birth_date = pat.get("birthDate") if isinstance(pat.get("birthDate"), str) else None
    allowed_refs = {h.patient_ref, f"urn:uuid:{pat['id']}"}

    def reject(r: dict[str, Any], why: str) -> None:
        h.rejected.append({"resource": f"{r['resourceType']}/{r.get('id', '?')}", "reason": why})

    for r in resources:
        rtype = r["resourceType"]
        if rtype == "Patient":
            continue
        if rtype not in {"Observation", "Condition", "FamilyMemberHistory", "Device"}:
            reject(r, "resource type outside workflow scope")
            continue
        if _subject_ref(r) not in allowed_refs:
            reject(r, "references a different or missing patient")
            continue
        src = f"{rtype}/{r.get('id', '?')}"

        if rtype == "Device":
            ids = [i.get("value") for i in r.get("identifier", []) if isinstance(i, dict) and i.get("system") == DEVICE_ID_SYSTEM]
            if not ids or not isinstance(ids[0], str):
                reject(r, f"Device lacks a {DEVICE_ID_SYSTEM} identifier")
                continue
            dtype = r.get("type")
            h.devices.append({"device_id": ids[0], "bound": True, "active": r.get("status", "active") == "active",
                              "type": (dtype.get("text") if isinstance(dtype, dict) else None) or "wearable",
                              "source": src})
            continue

        if rtype == "Condition":
            if "entered-in-error" in [c for _, c in _codes(r.get("verificationStatus"))]:
                reject(r, "entered-in-error")
                continue
            onset = _parse_time(r.get("onsetDateTime") or r.get("recordedDate"))
            if onset and onset > as_of:
                reject(r, "dated after as-of (time-travel guard)")
                continue
            status_codes = {c for _, c in _codes(r.get("clinicalStatus"))}
            active = not status_codes or bool({"active", "recurrence", "relapse"} & status_codes)
            matched = False
            for flag_name, spec in CONDITION_MAP.items():
                if _match_condition(_codes(r.get("code")), spec):
                    matched = True
                    if flag_name not in h.conditions or active:
                        h.conditions[flag_name] = {"active": active, "onset": onset.isoformat() if onset else None, "source": src}
            if not matched:
                reject(r, "condition code outside model scope")
            continue

        if rtype == "FamilyMemberHistory":
            conds = [c for c in r.get("condition", []) if isinstance(c, dict)]
            if any(_match_condition(_codes(c.get("code")), FAMILY_CAD) for c in conds):
                h.conditions["FH"] = {"active": True, "onset": None, "source": src}
            else:
                reject(r, "family history outside model scope")
            continue

        # Observation
        if r.get("status") not in ACCEPTED_STATUS:
            reject(r, f"status {r.get('status')!r} is not final")
            continue
        when = _effective(r)
        if when is None:
            reject(r, "missing or zone-less effective time")
            continue
        if when > as_of:
            reject(r, "dated after as-of (time-travel guard)")
            continue
        codes = _codes(r.get("code"))
        stamp = when.astimezone(UTC).isoformat()
        local = next((c for s, c in codes if s == LOCAL_SYSTEM and c.startswith("input:")), None)
        if local:
            value = _local_value(r)
            if value is None:
                reject(r, "local observation without a value")
            else:
                h.facts.append(Fact(local[6:], value, "", stamp, src, local))
            continue
        loinc = next((c for s, c in codes if s == LOINC), None)
        if loinc == BP_PANEL:
            added = False
            for comp in r.get("component", []):
                if not isinstance(comp, dict):
                    continue
                cc = next((c for s, c in _codes(comp.get("code")) if s == LOINC), None)
                if cc in ("8480-6", "8462-4"):
                    feat, unit, acc = OBSERVATION_MAP[cc]
                    v, err = _quantity(comp.get("valueQuantity"), acc)
                    if err is None:
                        h.facts.append(Fact(feat, v, unit, stamp, src, cc))
                        added = True
            if not added:
                reject(r, "blood-pressure panel without usable components")
            continue
        if loinc == SMOKING_STATUS:
            status = next((SMOKING_SNOMED[c] for s, c in _codes(r.get("valueCodeableConcept")) if s == SNOMED and c in SMOKING_SNOMED), None)
            if status is None:
                reject(r, "smoking status code outside scope")
            else:
                h.facts.append(Fact("SmokingStatus", status, "", stamp, src, loinc))
            continue
        if loinc not in OBSERVATION_MAP:
            reject(r, f"LOINC {loinc!r} outside model scope")
            continue
        feat, unit, acc = OBSERVATION_MAP[loinc]
        v, err = _quantity(r.get("valueQuantity"), acc)
        if err or v is None:
            reject(r, err or "no value")
            continue
        h.facts.append(Fact(feat, round(v, 4), unit, stamp, src, loinc))
    return h
