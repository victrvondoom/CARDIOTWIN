"""FastAPI router for Multi-Telemetry and OpenTelemetry Observability."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.cardiotwin.telemetry.service import get_multi_telemetry_service

router = APIRouter(prefix="/telemetry", tags=["cardiotwin_telemetry"])


@router.get("/live-stream", summary="Get live multi-telemetry snapshot (ECG, ABP, CVP, PAP, CO)")
async def get_live_stream(
    hr: float = Query(72.0, description="Base heart rate"),
    map_target: float = Query(93.0, description="Target mean arterial pressure"),
    stress: bool = Query(False, description="Whether exercise stress is active"),
) -> dict[str, Any]:
    svc = get_multi_telemetry_service()
    data = svc.get_live_telemetry_snapshot(hr=hr, map_target=map_target, stress_active=stress)
    return {"status": "success", "data": data}


@router.get("/otel-spans", summary="Get recent OpenTelemetry distributed tracing spans")
async def get_otel_spans(limit: int = Query(20, ge=1, le=100)) -> dict[str, Any]:
    svc = get_multi_telemetry_service()
    spans = svc.get_recent_otel_spans(limit=limit)
    return {
        "status": "success",
        "total_spans": len(spans),
        "protocol": "W3C Trace Context (traceparent)",
        "spans": spans,
    }


@router.get("/otel-status", summary="OpenTelemetry distributed observability status")
async def get_otel_status() -> dict[str, Any]:
    return {
        "status": "healthy",
        "service_name": "cardiotwin-core",
        "instrumentation": [
            "FastAPI Middleware",
            "Wispr Flow Voice Dictation",
            "Multilingual Signs Database",
            "Coronary Lumped Hemodynamics",
            "3D Real Body & Central Heart WebGL",
            "12-Lead Multi-Telemetry Pipeline",
        ],
        "exporter": "OTLP HTTP/gRPC & W3C Traceparent Header Propagation",
        "version": "1.4.0",
    }
