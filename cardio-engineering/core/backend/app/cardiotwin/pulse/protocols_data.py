"""AHA 2026 Emergency Cardiovascular Care (ECC) and Pediatric Protocols Database.

Provides structured clinical decision logic, contraindication alerts, pre-arrival steps,
and in-memory sub-10ms semantic retrieval for emergency cardiac response.
"""

from __future__ import annotations

from typing import Any

EMERGENCY_PROTOCOLS: list[dict[str, Any]] = [
    {
        "id": "CARD-01",
        "title": "Adult Cardiac Arrest & VF/VT Resuscitation",
        "category": "cardiac_arrest",
        "severity": "CRITICAL_ALPHA",
        "cadence_bpm": 110,
        "prearrival_steps": [
            "Verify patient unresponsiveness and absence of normal breathing (gasping/agonal is not breathing).",
            "Place patient flat on a firm, hard surface immediately (floor, not bed/couch).",
            "Expose chest: place heel of hand in center of chest between nipples.",
            "Push hard and push fast: compress 2 to 2.4 inches (5-6 cm) at 110 BPM rhythm.",
            "Allow complete chest recoil between each compression; do not lean on chest.",
            "Deploy Automated External Defibrillator (AED) as soon as available; follow voice prompts.",
        ],
        "contraindications": [
            "DO NOT interrupt chest compressions for more than 10 seconds.",
            "DO NOT administer oral fluids, medications, or food to an unresponsive patient.",
            "DO NOT place pillows under the head (compromises airway patency).",
        ],
        "cad_units_recommended": ["Medic 7 (ALS)", "Engine 4 (BLS First Responder)", "Battalion 1 (Command)"],
        "telemetry_link": {
            "rhythm_status": "VFIB",
            "default_hr": 0,
            "target_bpm": 110,
            "recommended_vessel_focus": "LAD",
        },
    },
    {
        "id": "ACS-14",
        "title": "Acute Coronary Syndrome (STEMI / Severe Ischemia)",
        "category": "ischemia_infarction",
        "severity": "HIGH_BRAVO",
        "cadence_bpm": 80,
        "prearrival_steps": [
            "Keep patient seated in position of comfort (semi-Fowler's 45 degrees); avoid exertion.",
            "Loosen tight clothing around neck and waist to ease breathing.",
            "Ask caller: Has patient taken erectile dysfunction medications (PDE5 inhibitors) in past 24-48 hours?",
            "If NO PDE5 inhibitor use: Administer chewable aspirin 324 mg (4 baby aspirins) unless actively allergic or bleeding.",
            "Prepare patient's prescribed Nitroglycerin 0.4 mg sublingually if systolic BP is known > 100 mmHg.",
            "Keep calm and monitor for sudden loss of consciousness or collapse.",
        ],
        "contraindications": [
            "ABSOLUTE CONTRAINDICATION: Nitroglycerin with Sildenafil/Tadalafil (severe lethal hypotension).",
            "DO NOT give aspirin if active gastrointestinal hemorrhage, stroke signs, or severe aspirin allergy.",
            "Avoid cold or hot exposure.",
        ],
        "cad_units_recommended": ["Medic 7 (ALS Transport)", "Engine 4 (Paramedic Escort)"],
        "telemetry_link": {
            "rhythm_status": "STEMI",
            "default_hr": 110,
            "target_bpm": 80,
            "recommended_vessel_focus": "LAD",
        },
    },
    {
        "id": "PED-03",
        "title": "Infant & Pediatric Foreign Body Airway Obstruction (Choking)",
        "category": "airway_obstruction",
        "severity": "CRITICAL_ALPHA",
        "cadence_bpm": 100,
        "prearrival_steps": [
            "Assess ability to cry, cough, or vocalize; if coughing effectively, encourage coughing.",
            "If infant cannot cry or breathe: Straddle infant face down over forearm, head lower than chest.",
            "Deliver 5 firm back blows between shoulder blades with the heel of your hand.",
            "Turn infant face-up; deliver 5 quick chest thrusts in center of chest with 2 fingers.",
            "Repeat cycle of 5 back slaps and 5 chest thrusts until foreign object is expelled.",
            "If infant becomes unresponsive: Initiate CPR immediately (30 chest compressions, look in mouth, 2 gentle breaths).",
        ],
        "contraindications": [
            "DO NOT perform blind finger sweeps (may push foreign body deeper into larynx).",
            "DO NOT perform abdominal thrusts (Heimlich) on infants under 1 year of age (liver/spleen rupture risk).",
        ],
        "cad_units_recommended": ["Medic 7 (Pediatric ALS)", "Engine 4"],
        "telemetry_link": {
            "rhythm_status": "TACHYCARDIA",
            "default_hr": 160,
            "target_bpm": 100,
            "recommended_vessel_focus": "WHOLE_HEART",
        },
    },
    {
        "id": "STROKE-02",
        "title": "Acute Ischemic Stroke (FAST Protocol & LKW Clock)",
        "category": "cerebrovascular",
        "severity": "HIGH_BRAVO",
        "cadence_bpm": 75,
        "prearrival_steps": [
            "Perform immediate FAST screen: Face drooping, Arm weakness, Speech difficulty, Time critical.",
            "Determine exact 'Last Known Well' (LKW) timestamp from family or bystanders.",
            "Keep patient flat on side (recovery position) if vomiting or drowsy to prevent aspiration.",
            "Do NOT give any oral food, water, or medications (aspiration risk due to dysphagia).",
            "Obtain list of current anticoagulants (Warfarin, Eliquis, Xarelto) for stroke team pre-notification.",
        ],
        "contraindications": [
            "DO NOT administer aspirin prior to CT scan confirmation (cannot rule out hemorrhagic stroke).",
            "DO NOT aggressively lower high blood pressure unless ordered by medical command (penumbral perfusion).",
            "DO NOT allow patient to walk or sit upright unassisted.",
        ],
        "cad_units_recommended": ["Medic 7 (Stroke Pre-Alert)", "Squad 2"],
        "telemetry_link": {
            "rhythm_status": "NSR",
            "default_hr": 84,
            "target_bpm": 75,
            "recommended_vessel_focus": "AORTA",
        },
    },
    {
        "id": "ANAPH-05",
        "title": "Severe Anaphylactic Shock & Angioedema",
        "category": "allergic_reaction",
        "severity": "CRITICAL_ALPHA",
        "cadence_bpm": 95,
        "prearrival_steps": [
            "Assist patient with immediate Epinephrine auto-injector (EpiPen 0.3 mg adult / 0.15 mg child) in mid-outer thigh.",
            "Hold auto-injector firmly in place for 3 full seconds against thigh through clothing if needed.",
            "Have patient lie flat with legs elevated (unless breathing is compromised, then semi-reclined).",
            "Prepare second auto-injector if symptoms do not improve within 5 to 15 minutes.",
            "Monitor airway for stridor, hoarseness, or swelling of lips, tongue, and throat.",
        ],
        "contraindications": [
            "DO NOT allow patient to abruptly stand or walk (causes acute vena cava collapse / empty ventricle).",
            "DO NOT delay epinephrine for antihistamines (diphenhydramine does NOT relieve laryngeal spasm).",
        ],
        "cad_units_recommended": ["Medic 7 (ALS Airway)", "Engine 4"],
        "telemetry_link": {
            "rhythm_status": "TACHYCARDIA",
            "default_hr": 130,
            "target_bpm": 95,
            "recommended_vessel_focus": "WHOLE_HEART",
        },
    },
]
