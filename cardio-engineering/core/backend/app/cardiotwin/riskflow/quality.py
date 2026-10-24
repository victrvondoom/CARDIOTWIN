"""Wearable signal-quality gate: decide which samples may reach the model, and why not.

Checks run per sample, then per channel, then for the stream:

  sample   implausible value, device-reported quality, future timestamp, duplicate timestamp,
           wrong (unbound) device, motion (activity above the resting ceiling)
  channel  heart rate: flatline, coverage, enough resting samples
           RR / HRV:   successive-difference artifact fraction (Malik 20 % rule), HR-vs-RR agreement
           SpO2:       plausibility + enough samples
  stream   staleness of the newest accepted sample relative to the clinician's as-of time

A channel is "accepted", "rejected" or "absent"; the stream is "accepted", "degraded" (heart rate
usable, another channel rejected) or "rejected" (no usable heart rate). Rejected samples never
contribute to any summary value.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from app.cardiotwin.wearables.core__cardiotwin_wearables__models import WearableDataPoint

# Reason codes (stable strings: the UI and tests key on them)
STALE = "STALE"
NO_DATA = "NO_DATA"
LOW_COVERAGE = "LOW_COVERAGE"
DEVICE_UNBOUND = "DEVICE_UNBOUND"
DEVICE_LOW_QUALITY = "DEVICE_LOW_QUALITY"
IMPLAUSIBLE_VALUE = "IMPLAUSIBLE_VALUE"
FUTURE_TIMESTAMP = "FUTURE_TIMESTAMP"
DUPLICATE_TIMESTAMP = "DUPLICATE_TIMESTAMP"
FLATLINE = "FLATLINE"
MOTION_ARTIFACT = "MOTION_ARTIFACT"
RR_ARTIFACT = "RR_ARTIFACT"
HR_RR_MISMATCH = "HR_RR_MISMATCH"
INSUFFICIENT_REST = "INSUFFICIENT_REST"

REASON_TEXT: dict[str, str] = {
    STALE: "Newest usable sample is older than the freshness limit",
    NO_DATA: "No samples in the evaluation window",
    LOW_COVERAGE: "Too few samples for the evaluation window",
    DEVICE_UNBOUND: "Device is not registered to this patient in the FHIR record",
    DEVICE_LOW_QUALITY: "Device-reported signal quality below threshold",
    IMPLAUSIBLE_VALUE: "Value outside physiological limits",
    FUTURE_TIMESTAMP: "Sample timestamp is in the future relative to the as-of time",
    DUPLICATE_TIMESTAMP: "Repeated timestamp (replayed or duplicated packet)",
    FLATLINE: "Heart rate does not vary (sensor stuck or not worn)",
    MOTION_ARTIFACT: "Sample taken during activity; excluded from resting estimates",
    RR_ARTIFACT: "Too many RR intervals fail the successive-difference artifact rule",
    HR_RR_MISMATCH: "Optical heart rate disagrees with heart rate implied by RR intervals",
    INSUFFICIENT_REST: "Not enough resting, good-quality heart-rate samples",
}


@dataclass(frozen=True)
class QualityPolicy:
    window_s: float = 1800.0  # evaluation window ending at as-of
    max_staleness_s: float = 900.0  # newest accepted sample must be this fresh
    expected_interval_s: float = 60.0
    min_coverage: float = 0.6
    min_device_quality: float = 0.6
    hr_range: tuple[float, float] = (30.0, 220.0)
    spo2_range: tuple[float, float] = (70.0, 100.0)
    rr_range_ms: tuple[float, float] = (300.0, 2000.0)
    max_future_skew_s: float = 120.0
    rest_activity_max: float = 0.3
    min_rest_samples: int = 5
    flatline_min_samples: int = 10
    rr_successive_change_max: float = 0.20  # Malik criterion
    max_rr_artifact_fraction: float = 0.20
    min_rr_intervals: int = 30
    hr_rr_disagreement_bpm: float = 10.0
    min_spo2_samples: int = 3

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ChannelReport:
    status: str = "absent"  # accepted | rejected | absent
    reasons: list[str] = field(default_factory=list)
    n_used: int = 0
    value: dict[str, float] = field(default_factory=dict)


@dataclass
class QualityReport:
    status: str  # accepted | degraded | rejected
    reasons: list[str]
    as_of: str
    n_samples: int
    n_in_window: int
    coverage: float
    newest_accepted_age_s: float | None
    sample_flags: dict[str, int]
    channels: dict[str, ChannelReport]
    policy: dict[str, Any]

    @property
    def resting_hr(self) -> float | None:
        ch = self.channels["heart_rate"]
        return ch.value.get("resting_hr") if ch.status == "accepted" else None

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["reason_text"] = {r: REASON_TEXT[r] for r in self.reasons}
        return d


def _finite(x: Any) -> bool:
    return isinstance(x, int | float) and not isinstance(x, bool) and math.isfinite(x)


def _in(x: Any, lo_hi: tuple[float, float]) -> bool:
    return _finite(x) and lo_hi[0] <= float(x) <= lo_hi[1]


def _rejected(reason: str, as_of: datetime, n: int, n_window: int, flags: dict[str, int], p: QualityPolicy) -> QualityReport:
    channels = {k: ChannelReport() for k in ("heart_rate", "rr", "spo2")}
    return QualityReport("rejected", [reason], as_of.isoformat(), n, n_window, 0.0, None, flags, channels, p.to_dict())


def assess_stream(
    samples: list[WearableDataPoint],
    as_of: datetime,
    bound_device_ids: set[str],
    policy: QualityPolicy | None = None,
) -> QualityReport:
    """Gate a wearable stream for one patient at the clinician's as-of time (timezone-aware)."""
    p = policy or QualityPolicy()
    if as_of.tzinfo is None:
        raise ValueError("as_of must be timezone-aware")
    flags: dict[str, int] = {}

    def flag(code: str, k: int = 1) -> None:
        if k:
            flags[code] = flags.get(code, 0) + k

    in_window: list[WearableDataPoint] = []
    older = 0
    for s in samples:
        if s.timestamp.tzinfo is None:
            raise ValueError("wearable timestamps must be timezone-aware")
        age = (as_of - s.timestamp).total_seconds()
        if age < -p.max_future_skew_s:
            flag(FUTURE_TIMESTAMP)
        elif age <= p.window_s:
            in_window.append(s)
        else:
            older += 1
    in_window.sort(key=lambda s: s.timestamp)
    if not in_window:
        # Samples that exist but all predate the window are stale, not absent.
        return _rejected(STALE if older else NO_DATA, as_of, len(samples), 0, flags, p)

    # ---- per-sample screening ------------------------------------------------
    seen: set[datetime] = set()
    clean: list[WearableDataPoint] = []
    for s in in_window:
        if s.timestamp in seen:
            flag(DUPLICATE_TIMESTAMP)
            continue
        seen.add(s.timestamp)
        if s.device_id not in bound_device_ids:
            flag(DEVICE_UNBOUND)
            continue
        if not _finite(s.signal_quality) or s.signal_quality < p.min_device_quality:
            flag(DEVICE_LOW_QUALITY)
            continue
        clean.append(s)
    if flags.get(DEVICE_UNBOUND, 0) == len(in_window):
        return _rejected(DEVICE_UNBOUND, as_of, len(samples), len(in_window), flags, p)
    if not clean:  # every sample screened out: report the dominant cause, not a generic one
        return _rejected(max(flags, key=lambda k: flags[k]), as_of, len(samples), len(in_window), flags, p)

    channels = {k: ChannelReport() for k in ("heart_rate", "rr", "spo2")}
    coverage = min(1.0, len(clean) / max(1.0, p.window_s / p.expected_interval_s))

    # ---- heart rate channel --------------------------------------------------
    hr_ok: list[WearableDataPoint] = []
    for s in clean:
        if s.heart_rate is None:
            continue
        if not _in(s.heart_rate, p.hr_range):
            flag(IMPLAUSIBLE_VALUE)
            continue
        hr_ok.append(s)
    hr = channels["heart_rate"]
    if hr_ok:
        values = [float(s.heart_rate) for s in hr_ok]  # type: ignore[arg-type]
        rest = [s for s in hr_ok if s.activity_level is None or s.activity_level <= p.rest_activity_max]
        flag(MOTION_ARTIFACT, len(hr_ok) - len(rest))
        if len(values) >= p.flatline_min_samples and max(values) - min(values) < 1e-9:
            hr.reasons.append(FLATLINE)
        if coverage < p.min_coverage:
            hr.reasons.append(LOW_COVERAGE)
        if len(rest) < p.min_rest_samples:
            hr.reasons.append(INSUFFICIENT_REST)
        if hr.reasons:
            hr.status = "rejected"
        else:
            rest_vals = [float(s.heart_rate) for s in rest]  # type: ignore[arg-type]
            hr.status, hr.n_used = "accepted", len(rest_vals)
            hr.value = {
                "resting_hr": round(statistics.median(rest_vals), 1),
                "resting_hr_iqr": round(_iqr(rest_vals), 1),
                "hr_min": round(min(values), 1),
                "hr_max": round(max(values), 1),
            }

    # ---- RR / HRV channel ------------------------------------------------------
    rr_ch = channels["rr"]
    rr_all: list[float] = []
    for s in clean:
        if not s.rr_intervals or (s.activity_level is not None and s.activity_level > p.rest_activity_max):
            continue
        good = [float(r) for r in s.rr_intervals if _in(r, p.rr_range_ms)]
        flag(IMPLAUSIBLE_VALUE, len(s.rr_intervals) - len(good))
        rr_all.extend(good)
    if rr_all:
        bad = [False] + [
            abs(rr_all[i] - rr_all[i - 1]) / rr_all[i - 1] > p.rr_successive_change_max
            for i in range(1, len(rr_all))
        ]
        artifact_frac = sum(bad) / len(rr_all)
        clean_rr = [r for r, b in zip(rr_all, bad, strict=True) if not b]
        if len(rr_all) < p.min_rr_intervals:
            rr_ch.reasons.append(LOW_COVERAGE)
        if artifact_frac > p.max_rr_artifact_fraction:
            rr_ch.reasons.append(RR_ARTIFACT)
        if hr.status == "accepted" and clean_rr:
            hr_from_rr = 60000.0 / statistics.median(clean_rr)
            if abs(hr_from_rr - hr.value["resting_hr"]) > p.hr_rr_disagreement_bpm:
                rr_ch.reasons.append(HR_RR_MISMATCH)
        if not rr_ch.reasons and len(clean_rr) >= 2:
            diffs = [clean_rr[i] - clean_rr[i - 1] for i in range(1, len(clean_rr))]
            rr_ch.status, rr_ch.n_used = "accepted", len(clean_rr)
            rr_ch.value = {
                "rmssd_ms": round(math.sqrt(sum(d * d for d in diffs) / len(diffs)), 1),
                "sdnn_ms": round(statistics.pstdev(clean_rr), 1),
                "mean_rr_ms": round(statistics.fmean(clean_rr), 1),
                "artifact_fraction": round(artifact_frac, 3),
            }
        else:
            rr_ch.status = "rejected"
            rr_ch.value = {"artifact_fraction": round(artifact_frac, 3)}

    # ---- SpO2 channel ----------------------------------------------------------
    sp = channels["spo2"]
    sp_vals: list[float] = []
    for s in clean:
        if s.spo2 is None:
            continue
        if _in(s.spo2, p.spo2_range):
            sp_vals.append(float(s.spo2))
        else:
            flag(IMPLAUSIBLE_VALUE)
    if sp_vals:
        if len(sp_vals) >= p.min_spo2_samples:
            sp.status, sp.n_used = "accepted", len(sp_vals)
            sp.value = {"spo2_median": round(statistics.median(sp_vals), 1), "spo2_min": min(sp_vals)}
        else:
            sp.status, sp.reasons = "rejected", [LOW_COVERAGE]

    # ---- stream-level freshness ------------------------------------------------
    newest_age = min((as_of - s.timestamp).total_seconds() for s in hr_ok) if hr_ok else None
    if newest_age is not None and newest_age > p.max_staleness_s:
        for ch in channels.values():
            if ch.status != "absent":
                ch.status = "rejected"
                ch.reasons.append(STALE)

    reasons: list[str] = []
    for ch in channels.values():
        reasons.extend(r for r in ch.reasons if r not in reasons)
    if flags.get(DEVICE_UNBOUND):
        reasons.append(DEVICE_UNBOUND)  # some packets came from a foreign device and were dropped
    if hr.status != "accepted":
        status = "rejected"
        if not reasons:
            reasons.append(INSUFFICIENT_REST)
    elif any(ch.status == "rejected" for ch in channels.values()):
        status = "degraded"
    else:
        status = "accepted"
    return QualityReport(status, reasons, as_of.isoformat(), len(samples), len(in_window),
                         round(coverage, 3), newest_age, flags, channels, p.to_dict())


def _iqr(values: list[float]) -> float:
    if len(values) < 4:
        return 0.0
    q = statistics.quantiles(values, n=4)
    return q[2] - q[0]
