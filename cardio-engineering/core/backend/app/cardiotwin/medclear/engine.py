"""MedClear AI — Clinical Plain-Language Simplifier & Patient Advocacy Engine.

Integrated directly into CardioTwin Centralized Platform.
Translates dense, high-acuity clinical notes, discharge summaries, and cardiology
reports into plain-language summaries and structured next-step checklists for patients,
while linking detected cardiovascular terms to digital twin hemodynamic vectors.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class DetectedTerm:
    term: str
    plain_explanation: str
    category: str  # cardiovascular, metabolic, general, pulmonary
    severity: str  # urgent, moderate, routine
    snomed_ct: str | None = None
    icd10: str | None = None


@dataclass
class SimplificationResult:
    original_text: str
    simplified_text: str
    original_length: int
    detected_terms: list[dict[str, Any]]
    urgent_actions: list[str]
    monitoring_actions: list[str]
    routine_actions: list[str]
    target_lang: str
    hemodynamic_vector_summary: dict[str, Any] | None = None


class MedClearEngine:
    """Core simplification and patient translation engine."""

    def __init__(self) -> None:
        # Multilingual clinical glossary (English and Spanish terms with plain translations)
        self.glossary: dict[str, dict[str, Any]] = {
            # Cardiovascular Acuity
            "angina": {
                "plain_en": "chest pain or pressure caused by reduced blood flow to heart muscle",
                "plain_es": "dolor o presión en el pecho por menor flujo de sangre al músculo cardíaco",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "225566008",
                "icd10": "I20.9",
            },
            "myocardial infarction": {
                "plain_en": "heart attack (blocked blood flow causing injury to heart muscle)",
                "plain_es": "ataque cardíaco (bloqueo que daña parte del músculo del corazón)",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "22298006",
                "icd10": "I21.9",
            },
            "infarction": {
                "plain_en": "tissue damage caused by lack of blood supply",
                "plain_es": "daño en el tejido por falta de irrigación sanguínea",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "22298006",
                "icd10": "I21.9",
            },
            "ischemia": {
                "plain_en": "insufficient blood flow and oxygen to heart tissue",
                "plain_es": "falta de oxígeno y flujo de sangre al corazón",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "414024009",
                "icd10": "I25.9",
            },
            "stenosis": {
                "plain_en": "abnormal narrowing of a blood vessel or valve",
                "plain_es": "estrechamiento anormal de un vaso sanguíneo o válvula",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "415582006",
                "icd10": "I25.1",
            },
            "tachycardia": {
                "plain_en": "fast heart rate (greater than 100 beats per minute)",
                "plain_es": "latidos cardíacos acelerados (más de 100 por minuto)",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "3424008",
                "icd10": "R00.0",
            },
            "bradycardia": {
                "plain_en": "unusually slow heart rate (under 60 beats per minute)",
                "plain_es": "latidos cardíacos más lentos de lo habitual (menos de 60 por minuto)",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "48867003",
                "icd10": "R00.1",
            },
            "dyspnea": {
                "plain_en": "shortness of breath or difficulty breathing",
                "plain_es": "sensación de falta de aire o dificultad para respirar",
                "category": "pulmonary",
                "severity": "urgent",
                "snomed": "267036007",
                "icd10": "R06.0",
            },
            "orthopnea": {
                "plain_en": "difficulty breathing while lying flat, relieved by sitting upright",
                "plain_es": "dificultad para respirar al acostarse boca arriba",
                "category": "pulmonary",
                "severity": "urgent",
                "snomed": "70119007",
                "icd10": "R06.02",
            },
            "hypertension": {
                "plain_en": "high blood pressure (heart pumps against higher resistance)",
                "plain_es": "presión arterial alta (el corazón trabaja con más fuerza de lo normal)",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "38341003",
                "icd10": "I10",
            },
            "hypotension": {
                "plain_en": "low blood pressure, which may cause dizziness or fainting",
                "plain_es": "presión arterial baja, que puede provocar mareo o desmayo",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "45007003",
                "icd10": "I95.9",
            },
            "dyslipidemia": {
                "plain_en": "elevated cholesterol or fats circulating in the bloodstream",
                "plain_es": "niveles elevados de grasas o colesterol en la sangre",
                "category": "metabolic",
                "severity": "moderate",
                "snomed": "370992007",
                "icd10": "E78.5",
            },
            "hyperlipidemia": {
                "plain_en": "high blood cholesterol and triglycerides",
                "plain_es": "colesterol y triglicéridos altos en la sangre",
                "category": "metabolic",
                "severity": "moderate",
                "snomed": "55822004",
                "icd10": "E78.4",
            },
            "hyperglycemia": {
                "plain_en": "high blood sugar levels",
                "plain_es": "azúcar alta en la sangre",
                "category": "metabolic",
                "severity": "moderate",
                "snomed": "80394007",
                "icd10": "R73.9",
            },
            "hypoglycemia": {
                "plain_en": "low blood sugar levels, requiring quick glucose",
                "plain_es": "azúcar baja en la sangre que requiere glucosa rápida",
                "category": "metabolic",
                "severity": "urgent",
                "snomed": "302866003",
                "icd10": "E16.2",
            },
            "edema": {
                "plain_en": "swelling caused by fluid accumulation in body tissues",
                "plain_es": "hinchazón causada por acumulación de líquido en los tejidos",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "267038008",
                "icd10": "R60.9",
            },
            "syncope": {
                "plain_en": "temporary loss of consciousness or fainting spell",
                "plain_es": "pérdida temporal del conocimiento o desmayo repentino",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "271594007",
                "icd10": "R55",
            },
            "diaphoresis": {
                "plain_en": "excessive, profuse sweating often seen during acute cardiac stress",
                "plain_es": "sudoración fría y profusa común en eventos cardíacos",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "52613005",
                "icd10": "R61",
            },
            "palpitations": {
                "plain_en": "sensation of rapid, fluttering, or pounding heartbeats",
                "plain_es": "sensación de latidos cardíacos rápidos o desbocados",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "80313002",
                "icd10": "R00.2",
            },
            "arrhythmia": {
                "plain_en": "irregular cardiac electrical rhythm",
                "plain_es": "ritmo eléctrico irregular del corazón",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "698247007",
                "icd10": "I49.9",
            },
            "atrial fibrillation": {
                "plain_en": "irregular, rapid heartbeat in the upper heart chambers increasing clot risk",
                "plain_es": "arritmia rápida en las cámaras superiores del corazón que aumenta riesgo de coágulo",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "49436004",
                "icd10": "I48.91",
            },
            "erythema": {
                "plain_en": "redness of the skin caused by inflammation or irritation",
                "plain_es": "enrojecimiento de la piel por irritación o inflamación",
                "category": "general",
                "severity": "routine",
                "snomed": "247441003",
                "icd10": "L53.9",
            },
            "myalgia": {
                "plain_en": "muscle pain or soreness",
                "plain_es": "dolor o molestia muscular",
                "category": "general",
                "severity": "routine",
                "snomed": "68962001",
                "icd10": "M79.1",
            },
            "arthralgia": {
                "plain_en": "joint pain or stiffness",
                "plain_es": "dolor o rigidez en las articulaciones",
                "category": "general",
                "severity": "routine",
                "snomed": "57676002",
                "icd10": "M25.5",
            },
            "cephalalgia": {
                "plain_en": "headache discomfort",
                "plain_es": "dolor de cabeza",
                "category": "general",
                "severity": "routine",
                "snomed": "25064002",
                "icd10": "R51",
            },
            "pruritus": {
                "plain_en": "persistent itching sensation of the skin",
                "plain_es": "picazón o comezón constante en la piel",
                "category": "general",
                "severity": "routine",
                "snomed": "418290006",
                "icd10": "L29.9",
            },
            "benign": {
                "plain_en": "non-cancerous and not spreading",
                "plain_es": "no canceroso ni peligroso",
                "category": "general",
                "severity": "routine",
                "snomed": "62414009",
                "icd10": "D49",
            },
            "malignant": {
                "plain_en": "cancerous, requiring specialized oncology care",
                "plain_es": "canceroso y que requiere atención especializada",
                "category": "general",
                "severity": "urgent",
                "snomed": "363346000",
                "icd10": "C80.1",
            },
            "acute": {
                "plain_en": "sudden or newly developing symptom",
                "plain_es": "repentino o de inicio reciente",
                "category": "general",
                "severity": "moderate",
                "snomed": "373933003",
                "icd10": "R69",
            },
            "chronic": {
                "plain_en": "long-standing or persistent condition",
                "plain_es": "de larga duración o constante",
                "category": "general",
                "severity": "moderate",
                "snomed": "90734009",
                "icd10": "R69",
            },
            "prognosis": {
                "plain_en": "expected medical recovery and future health outlook",
                "plain_es": "pronóstico o evolución esperada de la salud",
                "category": "general",
                "severity": "routine",
                "snomed": "365858006",
                "icd10": "Z00.0",
            },
            "analgesic": {
                "plain_en": "pain-relief medication (such as acetaminophen)",
                "plain_es": "medicamento para aliviar el dolor",
                "category": "general",
                "severity": "routine",
                "snomed": "373294004",
                "icd10": "Z51.81",
            },
            "antipyretic": {
                "plain_en": "fever-reducing medication",
                "plain_es": "medicamento para bajar la fiebre",
                "category": "general",
                "severity": "routine",
                "snomed": "373298001",
                "icd10": "Z51.81",
            },
            # Spanish synonyms & direct clinical terms
            "disnea": {
                "plain_en": "shortness of breath or difficulty breathing",
                "plain_es": "sensación de falta de aire o dificultad para respirar",
                "category": "pulmonary",
                "severity": "urgent",
                "snomed": "267036007",
                "icd10": "R06.0",
            },
            "taquicardia": {
                "plain_en": "fast heart rate (greater than 100 beats per minute)",
                "plain_es": "latidos cardíacos acelerados (más de 100 por minuto)",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "3424008",
                "icd10": "R00.0",
            },
            "isquemia": {
                "plain_en": "insufficient blood flow and oxygen to heart tissue",
                "plain_es": "falta de oxígeno y flujo de sangre al corazón",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "414024009",
                "icd10": "I25.9",
            },
            "infarto": {
                "plain_en": "tissue damage caused by lack of blood supply",
                "plain_es": "daño en el tejido por falta de irrigación sanguínea (ataque al corazón)",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "22298006",
                "icd10": "I21.9",
            },
            "hipertensión": {
                "plain_en": "high blood pressure",
                "plain_es": "presión arterial alta (el corazón trabaja con más fuerza de lo normal)",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "38341003",
                "icd10": "I10",
            },
            "hipertension": {
                "plain_en": "high blood pressure",
                "plain_es": "presión arterial alta (el corazón trabaja con más fuerza de lo normal)",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "38341003",
                "icd10": "I10",
            },
            "bradicardia": {
                "plain_en": "unusually slow heart rate (under 60 beats per minute)",
                "plain_es": "latidos cardíacos más lentos de lo habitual (menos de 60 por minuto)",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "48867003",
                "icd10": "R00.1",
            },
            "cefalea": {
                "plain_en": "headache discomfort",
                "plain_es": "dolor de cabeza",
                "category": "general",
                "severity": "routine",
                "snomed": "25064002",
                "icd10": "R51",
            },
            "arritmia": {
                "plain_en": "irregular cardiac electrical rhythm",
                "plain_es": "ritmo eléctrico irregular del corazón",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "698247007",
                "icd10": "I49.9",
            },
            "sincope": {
                "plain_en": "temporary loss of consciousness or fainting spell",
                "plain_es": "pérdida temporal del conocimiento o desmayo repentino",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "271594007",
                "icd10": "R55",
            },
            "síncope": {
                "plain_en": "temporary loss of consciousness or fainting spell",
                "plain_es": "pérdida temporal del conocimiento o desmayo repentino",
                "category": "cardiovascular",
                "severity": "urgent",
                "snomed": "271594007",
                "icd10": "R55",
            },
            "palpitaciones": {
                "plain_en": "sensation of rapid, fluttering, or pounding heartbeats",
                "plain_es": "sensación de latidos cardíacos rápidos o desbocados",
                "category": "cardiovascular",
                "severity": "moderate",
                "snomed": "80313002",
                "icd10": "R00.2",
            },
        }

    def simplify(self, text: str, target_lang: str = "en", link_twin: bool = True) -> SimplificationResult:
        """Simplify text and extract actionable patient next steps."""
        is_es = target_lang.lower().startswith("es")
        simplified = text
        detected: list[dict[str, Any]] = []

        # Find matching terms (case-insensitive boundary match)
        for term, data in sorted(self.glossary.items(), key=lambda x: -len(x[0])):
            pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
            if pattern.search(simplified):
                plain_desc = data["plain_es"] if is_es else data["plain_en"]
                detected.append({
                    "term": term,
                    "explanation": plain_desc,
                    "category": data["category"],
                    "severity": data["severity"],
                    "snomed_ct": data["snomed"],
                    "icd10": data["icd10"],
                })
                # Replace with styled plain text annotation: term [plain meaning]
                simplified = pattern.sub(f"{term} [→ {plain_desc}]", simplified)

        # Generate structured actionable checklist
        urgent_actions: list[str] = []
        monitoring_actions: list[str] = []
        routine_actions: list[str] = []

        lower_text = text.lower()

        # Check for urgent cardiac/pulmonary symptoms
        urgent_keywords = [
            "angina", "infarction", "ischemia", "dyspnea", "orthopnea", "tachycardia",
            "syncope", "diaphoresis", "arrhythmia", "fibrillation", "malignant",
            "disnea", "taquicardia", "isquemia", "infarto", "arritmia", "sincope", "síncope", "diaforesis"
        ]
        if any(k in lower_text for k in urgent_keywords):
            if is_es:
                urgent_actions.append("🚨 Atención Urgente: Se detectaron síntomas cardiovasculares o de alta prioridad. Si presenta dolor en el pecho, falta de aire o desmayo, llame a emergencias (911) inmediatamente.")
            else:
                urgent_actions.append("🚨 Urgent Medical Attention: High-priority cardiovascular symptoms detected. If experiencing ongoing chest pressure, severe shortness of breath, or fainting, seek emergency care (911) immediately.")

        # Check for chronic monitoring items
        monitoring_keywords = [
            "hypertension", "hypotension", "dyslipidemia", "hyperlipidemia",
            "hyperglycemia", "hypoglycemia", "edema", "palpitations", "stenosis",
            "hipertensión", "hipertension", "bradicardia", "palpitaciones"
        ]
        if any(k in lower_text for k in monitoring_keywords):
            if is_es:
                monitoring_actions.append("📋 Monitoreo Diario: Registre su presión arterial, frecuencia cardíaca y niveles de glucosa por la mañana y por la noche antes de su próxima consulta médica.")
            else:
                monitoring_actions.append("📋 Daily Vital Monitoring: Log your blood pressure, resting heart rate, and blood sugar mornings and evenings prior to your follow-up cardiology visit.")

        # Routine wellness
        if is_es:
            routine_actions.append("✅ Cuidados de Rutina: Tome sus medicamentos prescritos en el horario indicado. Mantenga una hidratación balanceada y una dieta baja en sodio.")
        else:
            routine_actions.append("✅ Routine Care & Adherence: Continue taking your prescribed cardiovascular medications on schedule. Maintain balanced hydration and a low-sodium heart-healthy diet.")

        # Optional link to Hemodynamic Digital Twin
        twin_impact = None
        if link_twin:
            twin_impact = self._calculate_hemodynamic_twin_projection(detected)

        return SimplificationResult(
            original_text=text,
            simplified_text=simplified,
            original_length=len(text),
            detected_terms=detected,
            urgent_actions=urgent_actions,
            monitoring_actions=monitoring_actions,
            routine_actions=routine_actions,
            target_lang=target_lang,
            hemodynamic_vector_summary=twin_impact,
        )

    def _calculate_hemodynamic_twin_projection(self, detected_terms: list[dict[str, Any]]) -> dict[str, Any]:
        """Project the extracted clinical terms onto the 3D cardiovascular digital twin."""
        delta_hr = 0.0
        delta_map = 0.0
        stenosis_risk = 0.0
        arrhythmia_detected = False

        for item in detected_terms:
            t = item["term"].lower()
            if t in ["tachycardia", "palpitations", "taquicardia", "palpitaciones"]:
                delta_hr += 22.0
            elif t in ["bradycardia", "bradicardia"]:
                delta_hr -= 18.0
            elif t in ["hypertension", "hipertensión", "hipertension"]:
                delta_map += 15.0
            elif t in ["hypotension", "hipotension", "hipotensión"]:
                delta_map -= 12.0
            elif t in ["angina", "ischemia", "stenosis", "infarction", "isquemia", "infarto"]:
                stenosis_risk = max(stenosis_risk, 0.75)
                delta_hr += 10.0
            elif "arrhythmia" in t or "fibrillation" in t or "arritmia" in t:
                arrhythmia_detected = True

        return {
            "projected_delta_hr_bpm": delta_hr,
            "projected_delta_map_mmhg": delta_map,
            "elevated_stenosis_risk": stenosis_risk > 0.5,
            "arrhythmia_flag": arrhythmia_detected,
            "digital_twin_recommended_view": "CORONARY_LAD" if stenosis_risk > 0.5 else "WHOLE_HEART",
        }


# Singleton engine instance
_medclear_engine: MedClearEngine | None = None


def get_medclear_engine() -> MedClearEngine:
    global _medclear_engine
    if _medclear_engine is None:
        _medclear_engine = MedClearEngine()
    return _medclear_engine
