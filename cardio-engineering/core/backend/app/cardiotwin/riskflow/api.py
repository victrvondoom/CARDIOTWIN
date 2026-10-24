"""Riskflow API — mounted under the authenticated CardioTwin router at /api/v1/cardiotwin/riskflow.

  GET  /riskflow/patients     synthetic demo patients (one per gate behaviour)
  POST /riskflow/run          run the workflow for a demo patient, or for a supplied Bundle + stream
  GET  /riskflow/model-card   CVP vs XGBoost benchmark + signal-gate fault-injection evaluation

Same conventions as the parent router: every route requires `get_current_user`; nothing about the
submitted patient is stored; only SHA-256 digests and the outcome are logged.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.auth import get_current_user
from app.cardiotwin.riskflow import RISKFLOW_VERSION
from app.cardiotwin.riskflow.synthetic import (
    BY_ID,
    DEMO_AS_OF,
    SCENARIOS,
    build_bundle,
    build_stream,
    evaluate_quality_gate,
)
from app.cardiotwin.riskflow.vessel_ising import BENCHMARK_PATH, load_cvp
from app.cardiotwin.riskflow.workflow import run_workflow
from app.cardiotwin.wearables.core__cardiotwin_wearables__models import WearableDataPoint

log = structlog.get_logger()
router = APIRouter(prefix="/riskflow", tags=["cardiotwin-riskflow"])
MAX_SAMPLES = 5000
MAX_RR_PER_SAMPLE = 300


class WearableSample(BaseModel):
    timestamp: datetime
    heart_rate: float | None = None
    rr_intervals: list[float] | None = Field(default=None, max_length=MAX_RR_PER_SAMPLE)
    spo2: float | None = None
    steps: int | None = None
    activity_level: float | None = None
    device_id: str = Field(min_length=1, max_length=128)
    device_type: str = Field(default="", max_length=64)
    signal_quality: float = 1.0

    @field_validator("timestamp")
    @classmethod
    def _aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("timestamp must include a timezone")
        return v

    def to_point(self) -> WearableDataPoint:
        return WearableDataPoint(**self.model_dump())


class RunRequest(BaseModel):
    patient_id: str | None = Field(default=None, max_length=32)
    as_of: datetime | None = None
    bundle: dict[str, Any] | None = None
    wearable: list[WearableSample] | None = Field(default=None, max_length=MAX_SAMPLES)

    @field_validator("as_of")
    @classmethod
    def _aware(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("as_of must include a timezone")
        return v


@router.get("/patients")
def list_patients(user: Any = Depends(get_current_user)) -> dict[str, Any]:
    return {"as_of": DEMO_AS_OF.isoformat(), "synthetic": True,
            "patients": [{"patient_id": s.patient_id, "title": s.title, "expect": s.expect} for s in SCENARIOS]}


@router.post("/run")
def run(req: RunRequest, user: Any = Depends(get_current_user)) -> dict[str, Any]:
    if req.patient_id:
        scenario = BY_ID.get(req.patient_id)
        if scenario is None:
            raise HTTPException(404, f"unknown demo patient {req.patient_id!r}")
        as_of = req.as_of or DEMO_AS_OF
        bundle, samples, label = build_bundle(scenario, as_of), build_stream(scenario, as_of), scenario.title
    elif req.bundle is not None:
        as_of = req.as_of or datetime.now(UTC)
        bundle, label = req.bundle, None
        samples = [s.to_point() for s in req.wearable] if req.wearable else None
    else:
        raise HTTPException(422, "provide patient_id (demo) or a FHIR bundle")
    if len(json.dumps(bundle)) > 5_000_000:
        raise HTTPException(413, "bundle too large")
    try:
        result = run_workflow(bundle, samples, as_of, label=label)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    if req.patient_id:
        result["synthetic"] = {"patient_id": req.patient_id, "expect": BY_ID[req.patient_id].expect,
                               "note": "Synthetic record and wearable built around a public dataset row (in-sample)."}
    log.info("cardiotwin.riskflow.run", outcome=result["outcome"], input_sha256=result["provenance"]["input_sha256"],
             result_sha256=result["provenance"]["result_sha256"], demo=bool(req.patient_id))
    return result


@lru_cache(maxsize=1)
def _gate_evaluation() -> dict[str, Any]:
    return evaluate_quality_gate(60)


@router.get("/model-card")
def model_card(user: Any = Depends(get_current_user)) -> dict[str, Any]:
    try:
        cvp = load_cvp()
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    bench = json.loads(BENCHMARK_PATH.read_text(encoding="utf-8")) if BENCHMARK_PATH.exists() else None
    art = cvp.artifact
    return {
        "version": RISKFLOW_VERSION,
        "model": {"id": art["model_id"], "version": art["version"], "family": art["family"], "sha256": cvp.sha256,
                  "created_at": art["created_at"], "lambdas": art["lambdas"],
                  "coupling": dict(zip(art["theta"]["coupling_names"], art["theta"]["coupling"], strict=True)),
                  "conformal": art["conformal"], "ood": {k: art["ood"][k] for k in ("method", "threshold", "quantile")}},
        "benchmark": bench,
        "signal_gate_evaluation": _gate_evaluation(),
        "limits": [
            "Single-centre public dataset (303 patients); no external validation.",
            "Demo patients are dataset rows (in-sample) wrapped in synthetic FHIR + wearable data.",
            "Fault-injection rates test the gate's specification, not real-world sensor sensitivity.",
            "Decision support only; not a medical device; does not locate or size lesions.",
        ],
    }
