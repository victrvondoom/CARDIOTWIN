"""FastAPI Router for the CardioTwin Agent Sandbox Environment."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.cardiotwin.sandbox.agent import default_sandbox_agent

router = APIRouter(prefix="/sandbox", tags=["CardioTwin Agent Sandbox"])


class TalkRequest(BaseModel):
    message: str = Field(..., description="Message or query spoken or typed to the CardioTwin agent.")
    session_id: str = Field("default_sandbox", description="Unique session identifier for the sandbox sandbox.")
    language: Optional[str] = Field("en", description="ISO 639-1 language code (en, hi, es, zh, fr, de, ar, ja).")
    persona: Optional[str] = Field("doctor", description="Active role persona: 'patient', 'nurse', or 'doctor'.")
    state_overrides: Optional[Dict[str, Any]] = Field(
        None, description="Direct parameter tweaks from the sandbox UI sliders."
    )


class ResetRequest(BaseModel):
    session_id: str = Field("default_sandbox", description="Session ID to reset.")


@router.post("/talk")
async def talk_to_agent(req: TalkRequest) -> Dict[str, Any]:
    """Talk directly to the CardioTwin AI Agent in the interactive sandbox."""
    agent_msg = default_sandbox_agent.talk(
        user_message=req.message,
        session_id=req.session_id,
        language=req.language,
        persona=req.persona,
        state_overrides=req.state_overrides,
    )
    current_state = default_sandbox_agent.get_or_create_state(req.session_id)

    return {
        "status": "success",
        "reply": agent_msg.content,
        "persona": agent_msg.persona,
        "language": agent_msg.language,
        "thoughts": agent_msg.thoughts,
        "tools_executed": [
            {
                "tool_name": t.tool_name,
                "arguments": t.arguments,
                "output_summary": t.output_summary,
                "timestamp": t.timestamp,
            }
            for t in agent_msg.tools_executed
        ],
        "sandbox_state": {
            "target_vessel": current_state.target_vessel,
            "stenosis_pct": current_state.stenosis_pct,
            "heart_rate_bpm": current_state.heart_rate_bpm,
            "mean_arterial_pressure": current_state.mean_arterial_pressure,
            "ischemia_severity": current_state.ischemia_severity,
            "hyperemic_stress": current_state.hyperemic_stress,
            "ffr": round(current_state.ffr, 3),
            "wall_shear_stress": round(current_state.wall_shear_stress, 1),
            "apd90_ms": round(current_state.apd90_ms, 1),
            "cardiac_health_score": round(current_state.cardiac_health_score, 1),
            "persona": current_state.persona,
            "language": current_state.language,
        },
        "traceparent": agent_msg.traceparent,
        "timestamp": agent_msg.timestamp,
    }


@router.post("/reset")
async def reset_sandbox(req: ResetRequest) -> Dict[str, Any]:
    """Reset the sandbox environment to baseline physiology and clear chat history."""
    state = default_sandbox_agent.reset_sandbox(req.session_id)
    return {
        "status": "success",
        "message": f"Sandbox session '{req.session_id}' reset to baseline.",
        "sandbox_state": {
            "target_vessel": state.target_vessel,
            "stenosis_pct": state.stenosis_pct,
            "heart_rate_bpm": state.heart_rate_bpm,
            "mean_arterial_pressure": state.mean_arterial_pressure,
            "ffr": round(state.ffr, 3),
            "cardiac_health_score": round(state.cardiac_health_score, 1),
        },
    }


@router.get("/state")
async def get_sandbox_state(session_id: str = Query("default_sandbox")) -> Dict[str, Any]:
    """Retrieve the live state of the digital twin inside the sandbox."""
    state = default_sandbox_agent.get_or_create_state(session_id)
    return {
        "status": "success",
        "session_id": session_id,
        "sandbox_state": {
            "target_vessel": state.target_vessel,
            "stenosis_pct": state.stenosis_pct,
            "heart_rate_bpm": state.heart_rate_bpm,
            "mean_arterial_pressure": state.mean_arterial_pressure,
            "ischemia_severity": state.ischemia_severity,
            "hyperemic_stress": state.hyperemic_stress,
            "ffr": round(state.ffr, 3),
            "wall_shear_stress": round(state.wall_shear_stress, 1),
            "apd90_ms": round(state.apd90_ms, 1),
            "cardiac_health_score": round(state.cardiac_health_score, 1),
            "persona": state.persona,
            "language": state.language,
        },
    }


@router.get("/conversation")
async def get_sandbox_conversation(session_id: str = Query("default_sandbox")) -> Dict[str, Any]:
    """Retrieve the full conversation transcript for the sandbox session."""
    history = default_sandbox_agent.get_conversation(session_id)
    return {
        "status": "success",
        "session_id": session_id,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "language": m.language,
                "persona": m.persona,
                "thoughts": m.thoughts,
                "tools_executed": [
                    {
                        "tool_name": t.tool_name,
                        "arguments": t.arguments,
                        "output_summary": t.output_summary,
                    }
                    for t in m.tools_executed
                ],
                "traceparent": m.traceparent,
                "timestamp": m.timestamp,
            }
            for m in history
        ],
    }
