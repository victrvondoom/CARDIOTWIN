import unittest
from simplifier import MedicalTextSimplifier

class TestMedicalTextSimplifier(unittest.TestCase):
    def setUp(self):
        self.simplifier = MedicalTextSimplifier()

    def test_term_detection_and_simplification(self):
        text = "El paciente presenta hypertension y edema en extremidades."
        res = self.simplifier.simplify_text(text)
        terms = [t["term"] for t in res["detected_medical_terms"]]
        self.assertIn("hypertension", terms)
        self.assertIn("edema", terms)
        self.assertIn("presión arterial alta", res["simplified_summary"])

    def test_urgent_triage_flag(self):
        text = "Refiere episodios de dyspnea al caminar."
        res = self.simplifier.simplify_text(text)
        self.assertTrue(any("Atención urgente" in s for s in res["patient_next_steps"]))

if __name__ == "__main__":
    unittest.main()
