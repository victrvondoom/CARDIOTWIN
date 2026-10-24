"""CardioTwin Multilingual Signs Database.

Houses structured clinical knowledge of cardiovascular signs, symptoms, and physical findings
with multilingual translations (English, Spanish, Hindi, French, Mandarin, German, Arabic),
ontological anchors (SNOMED-CT, ICD-10, LOINC), and mathematical hemodynamic twin vectors.
"""

from __future__ import annotations

import difflib
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class HemodynamicVector:
    """Quantitative physiological impact of the sign on the cardiovascular digital twin."""
    delta_hr: float = 0.0          # Change in Heart Rate (bpm)
    delta_map: float = 0.0         # Change in Mean Arterial Pressure (mmHg)
    delta_cvp: float = 0.0         # Change in Central Venous Pressure (mmHg)
    delta_pap: float = 0.0         # Change in Pulmonary Artery Pressure (mmHg)
    delta_ef: float = 0.0          # Change in Left Ventricular Ejection Fraction (%)
    flow_resistance_mult: float = 1.0  # Systemic / Coronary Vascular Resistance multiplier
    coronary_weights: dict[str, float] = field(default_factory=lambda: {"LAD": 0.5, "LCX": 0.5, "RCA": 0.5})


@dataclass
class MultilingualSign:
    """Cardiovascular clinical sign with cross-lingual definitions and hemodynamic mappings."""
    id: str
    category: str  # "symptom", "physical_exam", "vital_sign", "hemodynamic"
    canonical_term: str
    snomed_ct: str
    icd10: str
    loinc: str
    severity_scale: str  # e.g., "CCS Angina Class I-IV", "NYHA Class I-IV", "Binary Present/Absent"
    translations: dict[str, str]  # language_code -> translated clinical term
    colloquialisms: dict[str, list[str]]  # language_code -> list of vernacular/patient expressions
    clinical_significance: str
    hemodynamic_vector: HemodynamicVector
    ai_novelty_rationale: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data


class MultilingualSignDB:
    """In-memory and searchable Multilingual Clinical Signs Database."""

    def __init__(self) -> None:
        self._signs: dict[str, MultilingualSign] = {}
        self._seed_database()

    def _seed_database(self) -> None:
        signs = [
            MultilingualSign(
                id="sign_angina_substernal",
                category="symptom",
                canonical_term="Substernal Chest Pressure / Angina Pectoris",
                snomed_ct="225566008",
                icd10="I20.9",
                loinc="75325-1",
                severity_scale="CCS Angina Class I-IV",
                translations={
                    "en": "Substernal chest pressure / angina pectoris",
                    "es": "Presión torácica retroesternal / angina de pecho",
                    "hi": "छाती के बीच में भारीपन और दबाव / एनजाइना पेक्टोरिस",
                    "zh": "胸骨后压迫感 / 心绞痛",
                    "fr": "Oppression thoracique rétrosternale / angine de poitrine",
                    "de": "Retrosternales Druckgefühl / Angina Pectoris",
                    "ar": "ضغط وألم خلف عظم القص / ذبحة صدرية",
                    "ja": "胸骨後部圧迫感 / 狭心症",
                },
                colloquialisms={
                    "en": ["elephant on chest", "tightness in chest", "squeezing heart pain", "burning behind breastbone"],
                    "es": ["pecho apretado", "dolor de pecho como una opresión", "pata de elefante", "ardor en el pecho"],
                    "hi": ["छाती में भारीपन", "दिल में खिंचाव", "सीने में जलन और दर्द", "दम घुटने जैसा दर्द"],
                    "zh": ["胸口发闷", "胸膛有石头压迫感", "心绞痛", "胸口发紧"],
                    "fr": ["poids sur la poitrine", "serrement au thorax", "étau thoracique", "brûlure rétro-sternale"],
                    "de": ["Brustenge", "Druck auf der Brust", "Elefant auf der Brust", "Einschnürungsgefühl"],
                    "ar": ["ثقل في الصدر", "ألم ضاغط في القلب", "كأن صخرة فوق صدري", "عصر في الصدر"],
                    "ja": ["胸が締め付けられる", "胸の圧迫感", "心臓が苦しい", "胸骨の裏が痛い"],
                },
                clinical_significance="Cardinal symptom of myocardial ischemia typically reflecting significant coronary artery stenosis (>70%) in LAD or multivessel disease.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=12.0,
                    delta_map=10.0,
                    delta_cvp=2.0,
                    delta_pap=4.0,
                    delta_ef=-6.0,
                    flow_resistance_mult=1.35,
                    coronary_weights={"LAD": 0.88, "LCX": 0.68, "RCA": 0.62},
                ),
                ai_novelty_rationale="Enables cross-lingual acoustic zero-shot grounding: mapping colloquial patient voice in Hindi or Spanish directly to LAD-dominant microvascular resistance in the 3D twin without translation hallucination.",
            ),
            MultilingualSign(
                id="sign_dyspnea_exertion",
                category="symptom",
                canonical_term="Dyspnea on Exertion (DOE)",
                snomed_ct="282840006",
                icd10="R06.02",
                loinc="54508-7",
                severity_scale="NYHA Functional Class I-IV",
                translations={
                    "en": "Dyspnea on exertion / shortness of breath",
                    "es": "Disnea de esfuerzo / falta de aire",
                    "hi": "चलने-फिरने पर सांस फूलना / परिश्रमजन्य श्वासकष्ट",
                    "zh": "劳力性呼吸困难 / 活动后气喘",
                    "fr": "Dyspnée d'effort / essoufflement",
                    "de": "Belastungsdyspnoe / Kurzatmigkeit bei Anstrengung",
                    "ar": "ضيق التنفس عند بذل الجهد / زلة تنفسية",
                    "ja": "労作時呼吸困難 / 動悸息切れ",
                },
                colloquialisms={
                    "en": ["winded after climbing stairs", "can't catch my breath when walking", "panting during basic chores"],
                    "es": ["me ahogo al subir escaleras", "me falta el aire", "sofoco al caminar", "fatiga al esfuerzo"],
                    "hi": ["सीढ़ियां चढ़ने पर सांस उखड़ना", "जरा सा चलने पर हांफना", "सांस नहीं आना"],
                    "zh": ["爬楼梯气喘吁吁", "走两步就喘不过气", "稍微活动就憋气"],
                    "fr": ["essoufflé dans les escaliers", "manque d'air à la marche", "difficulté à respirer en marchant"],
                    "de": ["Atemnot beim Treppensteigen", "komme schnell außer Puste", "Luftnot bei Anstrengung"],
                    "ar": ["يلهث مع طلوع الدرج", "انقطاع النفس عند المشي", "تعب شديد في الصدر مع الحركة"],
                    "ja": ["階段を上ると息が切れる", "少し歩いただけで息苦しい", "息切れがする"],
                },
                clinical_significance="Reflects elevated left ventricular end-diastolic pressure (LVEDP) and pulmonary venous congestion under metabolic stress.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=18.0,
                    delta_map=8.0,
                    delta_cvp=5.0,
                    delta_pap=12.0,
                    delta_ef=-10.0,
                    flow_resistance_mult=1.40,
                    coronary_weights={"LAD": 0.76, "LCX": 0.72, "RCA": 0.65},
                ),
                ai_novelty_rationale="Connects multilingual respiratory descriptions directly to boundary conditions of pulmonary vascular resistance and LV compliance models.",
            ),
            MultilingualSign(
                id="sign_orthopnea_pnd",
                category="symptom",
                canonical_term="Orthopnea and Paroxysmal Nocturnal Dyspnea (PND)",
                snomed_ct="70187000",
                icd10="R06.01",
                loinc="80345-2",
                severity_scale="Number of Pillows Required (1 to 4+)",
                translations={
                    "en": "Orthopnea / Paroxysmal nocturnal dyspnea",
                    "es": "Ortopnea / Disnea paroxística nocturna",
                    "hi": "लेटने पर सांस रुकना / रात में अचानक दम घुटना (ऑर्थोप्निया)",
                    "zh": "端坐呼吸 / 夜间阵发性呼吸困难",
                    "fr": "Orthopnée / Dyspnée paroxystique nocturne",
                    "de": "Orthopnoe / Paroxysmale nächtliche Dyspnoe",
                    "ar": "ضيق التنفس الاضطجاعي / الزلة الليلية الانتيابية",
                    "ja": "起座呼吸 / 発作性夜間呼吸困難",
                },
                colloquialisms={
                    "en": ["need 3 pillows to sleep", "wake up gasping for air at 2 AM", "must sit upright to breathe"],
                    "es": ["duermo sentado con tres almohadas", "me despierto ahogándome a medianoche", "tengo que levantarme para respirar"],
                    "hi": ["तकिया ऊंचा करके सोना पड़ता है", "रात में घबराकर उठ जाना", "सीधे लेटते ही दम घुटता है"],
                    "zh": ["晚上必须垫高枕头睡觉", "半夜憋醒需要坐起来呼吸", "平躺就感觉窒息"],
                    "fr": ["besoin de plusieurs oreillers pour dormir", "réveil en sursaut étouffé la nuit", "obligé de s'asseoir pour respirer"],
                    "de": ["schlafe mit mehreren Kissen", "wache nachts nach Luft schnappend auf", "kann nicht flach liegen"],
                    "ar": ["لا أستطيع النوم إلا برفع رأسي بعدة وسائد", "أستيقظ ليلاً أختنق باحثاً عن الهواء", "أجلس لكي أتنفس"],
                    "ja": ["枕を高くしないと眠れない", "夜中に息苦しくて目が覚める", "体を起こさないと息ができない"],
                },
                clinical_significance="Strong clinical indicator of acute/chronic heart failure with elevated pulmonary capillary wedge pressure (PCWP > 18 mmHg).",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=15.0,
                    delta_map=-5.0,
                    delta_cvp=8.0,
                    delta_pap=16.0,
                    delta_ef=-15.0,
                    flow_resistance_mult=1.55,
                    coronary_weights={"LAD": 0.82, "LCX": 0.79, "RCA": 0.70},
                ),
                ai_novelty_rationale="Quantifies posture-dependent venous return shifts in the digital twin's lumped-parameter cardiovascular loop.",
            ),
            MultilingualSign(
                id="sign_pedal_edema",
                category="physical_exam",
                canonical_term="Bilateral Peripheral / Pitting Pedal Edema",
                snomed_ct="271809000",
                icd10="R60.0",
                loinc="70753-9",
                severity_scale="Pitting Scale 1+ to 4+",
                translations={
                    "en": "Bilateral pedal edema / ankle swelling",
                    "es": "Edema periférico bilateral / hinchazón de tobillos",
                    "hi": "पैरों और टखनों में सूजन (गड्ढे पड़ने वाली सूजन)",
                    "zh": "双下肢水肿 / 踝部凹陷性水肿",
                    "fr": "Œdème des membres inférieurs / gonflement des chevilles",
                    "de": "Beidseitige periphere Beinödeme / Knöchelschwellung",
                    "ar": "وذمة محيطية ثنائية / تورم الكاحلين والقدمين",
                    "ja": "両側下肢浮腫 / 足首のむくみ",
                },
                colloquialisms={
                    "en": ["shoes feel too tight by evening", "socks leave deep dents on legs", "puffy swollen feet"],
                    "es": ["los zapatos no me entran por la tarde", "las medias dejan marcas profundas", "tobillos hinchados"],
                    "hi": ["शाम को जूते तंग होना", "मोजे के निशान पड़ना", "पैरों में पानी भरना या सूजन"],
                    "zh": ["鞋子下午变紧", "袜子在腿上留下深印", "脚踝肿胀按压有坑"],
                    "fr": ["chaussures trop serrées le soir", "marques profondes de chaussettes", "chevilles gonflées"],
                    "de": ["Schuhe passen abends nicht mehr", "tiefe Sockenabdrücke an den Beinen", "geschwollene Knöchel"],
                    "ar": ["الأحذية تصبح ضيقة في المساء", "الجوارب تترك علامات عميقة في الساق", "انتفاخ في القدمين"],
                    "ja": ["夕方になると靴がきつくなる", "靴下の跡がくっきり残る", "足がむくんで重い"],
                },
                clinical_significance="Sign of elevated central venous pressure (CVP > 10 mmHg) and systemic venous congestion, characteristic of right ventricular dysfunction or biventricular heart failure.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=5.0,
                    delta_map=0.0,
                    delta_cvp=7.0,
                    delta_pap=6.0,
                    delta_ef=-8.0,
                    flow_resistance_mult=1.20,
                    coronary_weights={"RCA": 0.85, "LCX": 0.55, "LAD": 0.50},
                ),
                ai_novelty_rationale="Provides real-time boundary coupling to inferior vena cava (IVC) compliance and right atrial filling curves in the centralized whole-body twin.",
            ),
            MultilingualSign(
                id="sign_palpitations_tachycardia",
                category="symptom",
                canonical_term="Cardiac Palpitations / Tachyarrhythmia",
                snomed_ct="80313002",
                icd10="R00.2",
                loinc="80344-5",
                severity_scale="Frequency & Episode Duration (seconds to hours)",
                translations={
                    "en": "Cardiac palpitations / rapid fluttering heartbeat",
                    "es": "Palpitaciones cardíacas / latidos acelerados",
                    "hi": "दिल की धड़कन तेज होना / घबराहट और फड़फड़ाहट",
                    "zh": "心悸 / 心律不齐与心跳加快",
                    "fr": "Palpitations cardiaques / battements rapides et irréguliers",
                    "de": "Herzrasen / Palpitationen und Herzstolpern",
                    "ar": "خفقان القلب / تسارع النبض ورفرفة القلب",
                    "ja": "動悸 / 脈の乱れと頻脈",
                },
                colloquialisms={
                    "en": ["heart is fluttering like a bird", "racing pulse out of nowhere", "skipping beats in my chest"],
                    "es": ["el corazón me da vuelcos", "latidos como un pájaro revoloteando", "taquicardia repentina"],
                    "hi": ["दिल की धड़कन बेकाबू होना", "छाती में फड़फड़ाहट", "घबराहट के साथ दिल उछलना"],
                    "zh": ["心里像小鹿乱撞", "突然心跳加速", "心律漏跳或跳得慌"],
                    "fr": ["cœur qui bat la chamade", "papillonnements dans la poitrine", "battements manqués"],
                    "de": ["Herzklopfen bis zum Hals", "Herz stolpert", "plötzliches Herzrasen"],
                    "ar": ["قلبي يخفق بسرعة شديدة", "رفرفة في الصدر", "ضربات قلب غير منتظمة"],
                    "ja": ["心臓がバクバクする", "胸の中で鳥が羽ばたくような感覚", "脈が飛ぶ"],
                },
                clinical_significance="Common symptom reflecting atrial fibrillation, supraventricular tachycardia (SVT), ventricular premature contractions (VPCs), or autonomic dysregulation, shortening diastolic filling time.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=35.0,
                    delta_map=-8.0,
                    delta_cvp=3.0,
                    delta_pap=5.0,
                    delta_ef=-12.0,
                    flow_resistance_mult=1.15,
                    coronary_weights={"LAD": 0.65, "LCX": 0.70, "RCA": 0.60},
                ),
                ai_novelty_rationale="Translates subjective vernacular fluttering into electrophysiological telemetry perturbation and reduced diastolic coronary perfusion pressure.",
            ),
            MultilingualSign(
                id="sign_diaphoresis_sweating",
                category="vital_sign",
                canonical_term="Profuse Cold Diaphoresis / Autonomic Surge",
                snomed_ct="52613005",
                icd10="R61",
                loinc="80347-8",
                severity_scale="Mild / Moderate / Drenching",
                translations={
                    "en": "Cold diaphoresis / profuse sweating during chest pain",
                    "es": "Diaforesis fría / sudoración profusa con dolor torácico",
                    "hi": "ठंडा पसीना छूटना / घबराहट के साथ अत्यधिक पसीना",
                    "zh": "冷汗淋漓 / 伴随胸痛的大汗出",
                    "fr": "Diaphorèse froide / sueurs profuses lors de la douleur",
                    "de": "Kalter Schweiß / Profuses Schwitzen bei Brustschmerz",
                    "ar": "تعرق بارد غزير / تصبب العرق مع ألم الصدر",
                    "ja": "冷や汗 / 胸痛に伴う多汗",
                },
                colloquialisms={
                    "en": ["breaking into cold sweat", "drenched in sweat with pain", "clammy skin"],
                    "es": ["sudor frío de repente", "empapado en sudor frío", "piel pegajosa y fría"],
                    "hi": ["सीने के दर्द में ठंडा पसीना आना", "पसीने से लथपथ होना", "हाथ-पैर ठंडे पड़ना"],
                    "zh": ["突然冒冷汗", "浑身被冷汗浸透", "皮肤湿冷"],
                    "fr": ["sueur froide instantanée", "trempé de sueur avec malaise", "peau moite et froide"],
                    "de": ["plötzlicher kalter Schweiß", "schweißgebadet vor Schmerz", "feuchtkalte Haut"],
                    "ar": ["عرق بارد فجائي", "غارق في العرق مع الألم", "برودة ورطوبة في الجلد"],
                    "ja": ["突然の冷や汗", "汗びっしょりになる", "手足が冷たくなって汗が出る"],
                },
                clinical_significance="Powerful autonomic sympathetic reflex sign often associated with acute coronary syndrome (ACS) / transmural acute myocardial infarction with cardiogenic shock risk.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=20.0,
                    delta_map=15.0,
                    delta_cvp=4.0,
                    delta_pap=7.0,
                    delta_ef=-14.0,
                    flow_resistance_mult=1.60,
                    coronary_weights={"LAD": 0.92, "RCA": 0.78, "LCX": 0.75},
                ),
                ai_novelty_rationale="Key systemic biomarker mapping acute sympathetic neuro-cardiac reflex loop in multi-telemetry streams.",
            ),
            MultilingualSign(
                id="sign_syncope_presyncope",
                category="symptom",
                canonical_term="Syncope / Transient Loss of Consciousness",
                snomed_ct="271594007",
                icd10="R55",
                loinc="80348-6",
                severity_scale="Presyncope (Lightheaded) vs Complete Syncope",
                translations={
                    "en": "Syncope / Presyncope / Blackout",
                    "es": "Síncope / Presíncope / Desmayo transitorio",
                    "hi": "बेहोशी / चक्कर आकर गिरना (सिंकोप)",
                    "zh": "晕厥 / 先兆晕厥 / 短暂意识丧失",
                    "fr": "Syncope / Malaise lipothymique / Perte de connaissance",
                    "de": "Synkope / Präsynkope / Vorübergehende Bewusstlosigkeit",
                    "ar": "إغماء / ما قبل الإغماء / غياب عن الوعي",
                    "ja": "失神 / 前駆失神 / 一過性意識消失",
                },
                colloquialisms={
                    "en": ["passed out cold", "blacked out for a few seconds", "vision went dark and collapsed"],
                    "es": ["me desmayé", "se me apagó la vista y caí", "pérdida momentánea del conocimiento"],
                    "hi": ["आंखों के आगे अंधेरा छाकर गिर पड़ना", "अचानक बेहोश होना", "चक्कर खाकर सुध खोना"],
                    "zh": ["眼前一黑晕倒", "断片式昏厥", "突然失去知觉倒地"],
                    "fr": ["perte de connaissance brutale", "voile noir et chute", "tombé dans les pommes"],
                    "de": ["schwarz vor den Augen geworden und umgekippt", "kurze Ohnmacht", "Weggetreten"],
                    "ar": ["أغمي علي فجأة", "اسودت الرؤية وسقطت أرضاً", "فقدان مؤقت للوعي"],
                    "ja": ["急に意識を失って倒れた", "目の前が真っ暗になって気を失った", "失神した"],
                },
                clinical_significance="Warning sign of critical cerebral hypoperfusion due to severe bradyarrhythmia (AV block), ventricular tachycardia, severe aortic stenosis, or malignant LAD occlusion.",
                hemodynamic_vector=HemodynamicVector(
                    delta_hr=-25.0,
                    delta_map=-30.0,
                    delta_cvp=-1.0,
                    delta_pap=-4.0,
                    delta_ef=-20.0,
                    flow_resistance_mult=0.85,
                    coronary_weights={"LAD": 0.88, "RCA": 0.85, "LCX": 0.65},
                ),
                ai_novelty_rationale="Triggers dynamic cerebral perfusion autoregulation and sudden cardiac collapse modeling in the full-body digital twin.",
            ),
        ]

        for sign in signs:
            self._signs[sign.id] = sign

    def get_all(self) -> list[MultilingualSign]:
        """Return all signs in the database."""
        return list(self._signs.values())

    def get_by_id(self, sign_id: str) -> MultilingualSign | None:
        """Lookup sign by its unique identifier."""
        return self._signs.get(sign_id)

    def search(self, query: str, lang: str = "en") -> list[dict[str, Any]]:
        """Search signs by term, colloquialism, or code across languages.

        Uses exact, substring, and fuzzy matching for high cross-lingual recall.
        """
        q = query.strip().lower()
        if not q:
            return [s.to_dict() for s in self._signs.values()]

        results = []
        for sign in self._signs.values():
            score = 0.0
            matched_phrase = ""

            # Check codes
            if q in sign.snomed_ct.lower() or q in sign.icd10.lower() or q in sign.loinc.lower():
                score = 1.0
                matched_phrase = f"Code Match ({sign.snomed_ct} / {sign.icd10})"

            # Check translations
            for code, trans in sign.translations.items():
                t_lower = trans.lower()
                if q in t_lower or t_lower in q:
                    score = max(score, 0.95 if code == lang else 0.85)
                    matched_phrase = trans

            # Check colloquial phrases
            for code, phrases in sign.colloquialisms.items():
                for phrase in phrases:
                    p_lower = phrase.lower()
                    if q in p_lower or p_lower in q:
                        score = max(score, 0.92 if code == lang else 0.80)
                        matched_phrase = phrase
                    else:
                        p_words = [w for w in p_lower.split() if w not in ("in", "of", "on", "with", "the", "a", "an", "and", "mein", "de", "en", "le", "la")]
                        if p_words and all(w in q for w in p_words):
                            score = max(score, 0.88 if code == lang else 0.78)
                            matched_phrase = phrase
                        else:
                            ratio = difflib.SequenceMatcher(None, q, p_lower).ratio()
                            if ratio > 0.65 and ratio > score:
                                score = ratio
                                matched_phrase = phrase

            if score > 0.5:
                res = sign.to_dict()
                res["search_match_score"] = round(score, 3)
                res["matched_phrase"] = matched_phrase
                results.append(res)

        results.sort(key=lambda x: x["search_match_score"], reverse=True)
        return results

    def resolve_spoken_utterance(self, utterance: str, lang: str = "en") -> dict[str, Any]:
        """Extract cardiac signs from natural voice transcription and compute combined twin impact."""
        matches = self.search(utterance, lang=lang)
        matched_signs = [m for m in matches if m["search_match_score"] >= 0.70]

        # Compute aggregate hemodynamic vector
        agg_delta_hr = sum(s["hemodynamic_vector"]["delta_hr"] for s in matched_signs)
        agg_delta_map = sum(s["hemodynamic_vector"]["delta_map"] for s in matched_signs)
        agg_delta_cvp = sum(s["hemodynamic_vector"]["delta_cvp"] for s in matched_signs)
        agg_delta_ef = sum(s["hemodynamic_vector"]["delta_ef"] for s in matched_signs)

        # Vessel stenosis probability priors from matched signs
        lad_weights = [s["hemodynamic_vector"]["coronary_weights"]["LAD"] for s in matched_signs]
        lcx_weights = [s["hemodynamic_vector"]["coronary_weights"]["LCX"] for s in matched_signs]
        rca_weights = [s["hemodynamic_vector"]["coronary_weights"]["RCA"] for s in matched_signs]

        lad_prob = round(sum(lad_weights) / len(lad_weights), 3) if lad_weights else 0.45
        lcx_prob = round(sum(lcx_weights) / len(lcx_weights), 3) if lcx_weights else 0.40
        rca_prob = round(sum(rca_weights) / len(rca_weights), 3) if rca_weights else 0.38

        return {
            "utterance": utterance,
            "detected_language": lang,
            "matched_signs": matched_signs,
            "matched_count": len(matched_signs),
            "aggregate_hemodynamic_impact": {
                "delta_hr_bpm": agg_delta_hr,
                "delta_map_mmhg": agg_delta_map,
                "delta_cvp_mmhg": agg_delta_cvp,
                "delta_ef_pct": agg_delta_ef,
                "coronary_risk_priors": {
                    "LAD": lad_prob,
                    "LCX": lcx_prob,
                    "RCA": rca_prob,
                },
            },
            "twin_action_recommendation": "stress_ischemia_simulation" if agg_delta_ef < -8 else "hemodynamic_baseline",
        }


# Global Singleton Instance
_db_instance: MultilingualSignDB | None = None


def get_multilingual_signs_db() -> MultilingualSignDB:
    """Return singleton instance of MultilingualSignDB."""
    global _db_instance
    if _db_instance is None:
        _db_instance = MultilingualSignDB()
    return _db_instance
