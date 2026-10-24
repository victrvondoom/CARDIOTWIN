"""Cardio Intelligence TwinOS — continuously updated, evidence-aware cardiovascular digital twin.

Connects five YC themes (Personalized Medicine, Dynamic Interfaces, Software for Agents,
Company Brain, AI-Native Services) into a cohesive digital twin engine.
"""

from __future__ import annotations

from app.cardiotwin.twinos.api import router
from app.cardiotwin.twinos.engine import get_twinos_engine

__all__ = ["router", "get_twinos_engine"]
