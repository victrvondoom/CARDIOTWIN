#!/usr/bin/env python3
"""
Medical Text Simplifier & Patient Triage Assistant
Built for the Build With AI: Basics Global Hackathon ($2,500 USD)
Transforms dense, complex clinical reports into plain-language summaries
and actionable health next steps for patients.
"""

import re
import json

class MedicalTextSimplifier:
    def __init__(self):
        # Clinical dictionary mapping dense medical jargon to clear patient terminology
        self.glossary = {
            "hypertension": "presión arterial alta (el corazón trabaja con más fuerza de lo normal)",
            "dyslipidemia": "niveles elevados de grasas o colesterol en la sangre",
            "hyperglycemia": "azúcar alta en la sangre",
            "hypoglycemia": "azúcar baja en la sangre",
            "edema": "hinchazón causada por acumulación de líquido en los tejidos",
            "erythema": "enrojecimiento de la piel por irritación o inflamación",
            "tachycardia": "latidos cardíacos acelerados (más de 100 por minuto)",
            "bradycardia": "latidos cardíacos más lentos de lo habitual",
            "dyspnea": "sensación de falta de aire o dificultad para respirar",
            "myalgia": "dolor muscular",
            "arthralgia": "dolor en las articulaciones",
            "cephalalgia": "dolor de cabeza",
            "pruritus": "picazón o comezón constante en la piel",
            "benign": "no canceroso ni peligroso",
            "malignant": "canceroso y requiere atención oncológica especializada",
            "acute": "repentino o de inicio reciente",
            "chronic": "de larga duración o constante",
            "prognosis": "pronóstico o evolución esperada de la salud",
            "analgesic": "medicamento para aliviar el dolor",
            "antipyretic": "medicamento para bajar la fiebre"
        }

    def simplify_text(self, text):
        simplified = text
        detected_terms = []
        for term, plain in self.glossary.items():
            pattern = re.compile(rf'\b{term}\b', re.IGNORECASE)
            if pattern.search(simplified):
                detected_terms.append({"term": term, "explanation": plain})
                simplified = pattern.sub(f"{term} ({plain})", simplified)

        # Generate action checklist
        action_items = []
        if any(t in text.lower() for t in ["dyspnea", "tachycardia", "malignant"]):
            action_items.append("⚠️ Atención urgente: Se detectaron síntomas o términos de alta prioridad. Consulte a su médico a la brevedad.")
        if any(t in text.lower() for t in ["hypertension", "dyslipidemia", "hyperglycemia"]):
            action_items.append("📋 Monitoreo regular: Mantenga registro de sus niveles de presión/glucosa antes de su próxima consulta.")
        if not action_items:
            action_items.append("✅ Cuidados de rutina: Siga las indicaciones de descanso y medicamentos recetados.")

        return {
            "original_length": len(text),
            "detected_medical_terms": detected_terms,
            "simplified_summary": simplified,
            "patient_next_steps": action_items
        }

if __name__ == "__main__":
    simplifier = MedicalTextSimplifier()
    sample = "El paciente presenta disnea aguda con taquicardia y cefalea asociada a hipertensión."
    res = simplifier.simplify_text(sample)
    print(json.dumps(res, indent=2, ensure_ascii=False))
