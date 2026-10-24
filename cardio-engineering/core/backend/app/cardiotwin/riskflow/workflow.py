"""The single clinician workflow: select patient → gates 1-6 → validated risk + simulation, or withheld.

Fail-closed rules
  * identity/history errors stop the run (nothing downstream can be trusted)
  * a rejected wearable stream is excluded, never repaired; pulse rate falls back to a fresh FHIR value
  * insufficient fresh history, an out-of-domain patient or an incoherent output withholds the risk
  * the simulation runs only after a risk estimate has been presented, from gated inputs only
Every input and the result are hashed (SHA-256) for audit; no patient data is persisted.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from functools import lru_cache
from typing import Any

from app.cardiotwin.riskflow import RISKFLOW_VERSION
from app.cardiotwin.riskflow.alignment import align
from app.cardiotwin.riskflow.fhir_history import parse_history
from app.cardiotwin.riskflow.physiology import simulate_patient
from app.cardiotwin.riskflow.quality import REASON_TEXT, QualityPolicy, QualityReport, assess_stream
from app.cardiotwin.riskflow.vessel_ising import load_cvp
from app.cardiotwin.wearables.core__cardiotwin_wearables__models import WearableDataPoint

MAX_PREDICTION_SET = 6  # of 8 patterns; larger sets are reported as low-information


def _sha(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()


def _gate(gid: str, title: str, status: str, reasons: list[str] | None = None, **detail: Any) -> dict[str, Any]:
    return {"id": gid, "title": title, "status": status, "reasons": reasons or [], "detail": detail}


@lru_cache(maxsize=128)
def _simulate_cached(hr: float, sbp: float | None, ef: float | None, age: float | None, qt: float | None) -> dict[str, Any]:
    return simulate_patient(hr, sbp, ef, age, qt)


def _sensors(quality: QualityReport | None, bound: bool) -> list[dict[str, Any]]:
    ch = quality.channels if quality else {}

    def node(sid: str, label: str, site: str, channel: str) -> dict[str, Any]:
        c = ch.get(channel)
        status = "unbound" if not bound else (c.status if c else "absent")
        if quality and quality.status == "rejected" and status == "absent":
            status = "rejected"
        return {"id": sid, "label": label, "site": site, "channel": channel, "status": status,
                "reasons": list(c.reasons) if c and c.reasons else (list(quality.reasons) if quality and status == "rejected" else []),
                "value": dict(c.value) if c else {}}

    return [node("wrist-hr", "Wrist PPG · heart rate", "left-wrist", "heart_rate"),
            node("wrist-rr", "Wrist PPG · beat-to-beat (HRV)", "left-wrist", "rr"),
            node("finger-spo2", "Pulse oximetry · SpO2", "right-finger", "spo2")]


def _patient_summary(risk: dict[str, Any] | None, quality: QualityReport | None, outcome: str,
                     withheld_reason: list[str]) -> list[str]:
    lines = []
    if quality is None:
        lines.append("No watch data was sent, so your recorded heart rate was used.")
    elif quality.status == "accepted":
        lines.append(f"Your watch data from the last 30 minutes was checked and used (resting heart rate {quality.resting_hr:.0f}).")
    elif quality.status == "degraded":
        lines.append("Some of your watch data was unreliable (for example taken while moving) and was left out; the rest was used.")
    else:
        lines.append("Your watch data could not be trusted this time ("
                     + ", ".join(REASON_TEXT.get(r, r).lower() for r in quality.reasons[:2])
                     + "), so it was not used. Your recorded values were used instead.")
    if outcome != "presented" or risk is None:
        lines.append("We could not give a reliable estimate today because " + (
            "some important test results are too old or missing." if "INSUFFICIENT_HISTORY" in withheld_reason
            else "your information is unlike the patients this tool learned from.") +
            " Your care team will review what is needed.")
        return lines
    cad = risk["marginals"]["CAD"]
    word = "lower" if cad < 0.33 else "moderate" if cad < 0.66 else "higher"
    lines.append(f"Based on patients similar to you, the chance of narrowed heart arteries is {word} "
                 f"(about {round(cad * 100)} in 100).")
    multi = risk["vessel_count"]["2VD"] + risk["vessel_count"]["3VD"]
    lines.append(f"The chance that more than one artery is involved is about {round(multi * 100)} in 100.")
    lines.append("This is an estimate to support your doctor's decisions, not a diagnosis. Only tests such as "
                 "an angiogram can show the arteries directly.")
    return lines


def run_workflow(bundle: dict[str, Any], samples: list[WearableDataPoint] | None, as_of: datetime,
                 policy: QualityPolicy | None = None, label: str | None = None) -> dict[str, Any]:
    gates: list[dict[str, Any]] = []
    input_sha = _sha({"bundle": bundle, "wearable": [s.to_dict() for s in samples or []], "as_of": as_of.isoformat()})
    history = parse_history(bundle, as_of)

    def finish(outcome: str, **parts: Any) -> dict[str, Any]:
        result = {"workflow": "cardiac-risk", "version": RISKFLOW_VERSION, "label": label, "as_of": as_of.isoformat(),
                  "outcome": outcome, "gates": gates, **parts}
        result["provenance"] = {"input_sha256": input_sha, "result_sha256": _sha(result),
                                "persisted": False, "as_of": as_of.isoformat()}
        return result

    # ---- gate 1: identity & device binding -------------------------------------------
    if history.errors:
        gates.append(_gate("identity", "Identity & device binding", "fail", history.errors))
        return finish("withheld", withheld_reasons=["INVALID_HISTORY"], sensors=_sensors(None, False),
                      patient_summary=["Your record could not be read safely, so no estimate was made."])
    stream_devices = sorted({s.device_id for s in samples or []})
    bound = history.bound_device_ids
    unbound_devices = [d for d in stream_devices if d not in bound]
    gates.append(_gate("identity", "Identity & device binding", "warn" if unbound_devices else "pass",
                       ["DEVICE_UNBOUND"] if unbound_devices else [], patient=history.patient_ref,
                       bound_devices=sorted(bound), stream_devices=stream_devices, unbound_devices=unbound_devices))

    # ---- gate 2: FHIR history -------------------------------------------------------------
    gates.append(_gate("history", "FHIR history validation", "warn" if history.rejected else "pass",
                       ["RESOURCES_REJECTED"] if history.rejected else [],
                       resources=history.n_resources, facts=len(history.facts), conditions=sorted(history.conditions),
                       rejected=history.rejected))

    # ---- gate 3: wearable signal quality ---------------------------------------------------
    quality = assess_stream(samples, as_of, bound, policy) if samples else None
    if quality is None:
        gates.append(_gate("signal", "Wearable signal quality", "warn", ["NO_WEARABLE"]))
    else:
        g3 = {"accepted": "pass", "degraded": "warn", "rejected": "fail"}[quality.status]
        gates.append(_gate("signal", "Wearable signal quality", g3, quality.reasons, report=quality.to_dict()))
    usable = quality if quality is not None and quality.status != "rejected" else None

    # ---- gate 4: alignment ------------------------------------------------------------------
    al = align(history, usable, as_of)
    gates.append(_gate("alignment", "Wearable - FHIR alignment", al.status, al.reasons,
                       core_completeness=al.core_completeness, core_missing=al.core_missing, drift=al.drift,
                       provenance=al.provenance, timeline=al.timeline))
    sensors = _sensors(quality, not unbound_devices)
    if al.status == "fail":
        gates.append(_gate("risk", "Validated risk estimate", "fail", ["WITHHELD", *al.reasons[:1]]))
        gates.append(_gate("simulation", "Physics simulation", "skipped", ["RISK_NOT_PRESENTED"]))
        return finish("withheld", withheld_reasons=al.reasons[:1], sensors=sensors,
                      patient_summary=_patient_summary(None, quality, "withheld", al.reasons))

    # ---- gate 5: validated risk ---------------------------------------------------------------
    cvp = load_cvp()
    risk = cvp.predict(al.values)
    problems = []
    if not risk["applicability"]["in_domain"]:
        problems.append("OUT_OF_DOMAIN")
    if not risk["coherent"]:
        problems.append("INCOHERENT_OUTPUT")
    warn = []
    if risk["prediction_set"]["size"] > MAX_PREDICTION_SET:
        warn.append("LOW_INFORMATION_SET")
    if risk["imputed_features"]:
        warn.append("IMPUTED_FEATURES")
    risk["model"] = {"id": cvp.artifact["model_id"], "version": cvp.artifact["version"], "sha256": cvp.sha256,
                     "trained_on": "Extension of Z-Alizadeh Sani (UCI 411), 303 patients",
                     "dataset_sha256": cvp.artifact["dataset_sha256"]}
    if problems:
        gates.append(_gate("risk", "Validated risk estimate", "fail", ["WITHHELD", *problems],
                           applicability=risk["applicability"]))
        gates.append(_gate("simulation", "Physics simulation", "skipped", ["RISK_NOT_PRESENTED"]))
        return finish("withheld", withheld_reasons=problems, sensors=sensors,
                      patient_summary=_patient_summary(None, quality, "withheld", problems))
    gates.append(_gate("risk", "Validated risk estimate", "warn" if warn else "pass", warn,
                       applicability=risk["applicability"], prediction_set_size=risk["prediction_set"]["size"]))

    # ---- gate 6: physics simulation -------------------------------------------------------------
    phys = al.physiology_inputs
    simulation = None
    if phys["heart_rate"] is None:
        gates.append(_gate("simulation", "Physics simulation", "fail", ["NO_GATED_HEART_RATE"]))
    else:
        try:
            r1 = lambda v: None if v is None else round(float(v), 1)  # noqa: E731 - stable cache keys
            simulation = _simulate_cached(round(float(phys["heart_rate"]), 1), r1(phys["sbp"]), r1(phys["ef"]),
                                          r1(phys["age"]), r1(phys["qt_ms"]))
            sim_warn = [] if simulation["organ"]["calibration_converged"] else ["CALIBRATION_RESIDUAL"]
            gates.append(_gate("simulation", "Physics simulation", "warn" if sim_warn else "pass", sim_warn, inputs=phys))
        except (ValueError, ArithmeticError) as e:
            gates.append(_gate("simulation", "Physics simulation", "fail", ["SIMULATION_OUT_OF_RANGE"], error=str(e)))
    return finish("presented", risk=risk, simulation=simulation, sensors=sensors,
                  patient_summary=_patient_summary(risk, quality, "presented", []))
