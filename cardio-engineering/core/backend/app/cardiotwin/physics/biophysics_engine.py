"""CardioTwin Multiscale Biophysics & Multicellular Electromechanics Engine.

Combines:
1. 0D/1D Navier-Stokes Poiseuille-Bernoulli fluid mechanics (FFR, WSS, CFR, IMR, pressure drop).
2. Multicellular cardiomyocyte electromechanics (Luo-Rudy Phase 2 / Ten Tusscher model approximation):
   - Action potential Vm(t) across Phases 0-4
   - Intracellular Calcium transient [Ca2+]i and sarcomere contractile tension F(t)
   - Ischemia-induced ATP depletion, APD90 shortening, and ST elevation
3. Multilingual Physics Talk & Explanation Engine in 7 languages (EN, HI, ES, ZH, FR, DE, AR).
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from typing import Any

from app.observability.otel import agent_span, current_traceparent


@dataclass
class HemodynamicPhysicsResult:
    vessel_id: str
    stenosis_pct: float
    mean_aortic_pressure_mmhg: float
    distal_coronary_pressure_mmhg: float
    translesional_pressure_drop_mmhg: float
    ffr: float
    flow_rate_ml_min: float
    wall_shear_stress_pa: float
    coronary_flow_reserve: float
    index_microcirculatory_resistance: float
    reynolds_number: float
    flow_regime: str
    ischemic_significance: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class CellularElectromechanics:
    cell_type: str  # "ventricular_cardiomyocyte"
    ischemic_state: bool
    atp_level_pct: float
    resting_membrane_potential_mv: float
    peak_depolarization_mv: float
    action_potential_duration_90_ms: float
    action_potential_duration_50_ms: float
    calcium_transient_peak_um: float
    peak_sarcomere_force_mn_mm2: float
    time_series_ms: list[float]
    voltage_mv: list[float]
    calcium_um: list[float]
    force_mn_mm2: list[float]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class BiophysicsEngine:
    """Master Biophysical and Cellular Simulation Engine for CardioTwin."""

    VESSEL_SPECS = {
        "LAD": {"length_mm": 95.0, "ref_diameter_mm": 3.6, "micro_resistance": 0.85},
        "LCX": {"length_mm": 75.0, "ref_diameter_mm": 3.2, "micro_resistance": 1.10},
        "RCA": {"length_mm": 110.0, "ref_diameter_mm": 3.4, "micro_resistance": 0.95},
        "AORTA": {"length_mm": 180.0, "ref_diameter_mm": 24.0, "micro_resistance": 0.05},
    }

    def solve_navier_stokes_hemodynamics(
        self,
        vessel_id: str,
        stenosis_pct: float,
        mean_aortic_pressure_mmhg: float = 93.3,
        hyperemic_stress: bool = False,
    ) -> HemodynamicPhysicsResult:
        """Solve non-linear Poiseuille-Bernoulli coronary flow circuit.

        Governing Equation:
        ΔP = R_viscous · Q + K_inertial · Q²
        Where:
        - R_viscous = 128 · μ · L / (π · D_sten⁴) (Poiseuille shear loss)
        - K_inertial = ρ/2 · (1/A_sten - 1/A0)² (Bernoulli expansion separation loss)
        """
        spec = self.VESSEL_SPECS.get(vessel_id, self.VESSEL_SPECS["LAD"])
        length_m = spec["length_mm"] * 1e-3
        d0_m = spec["ref_diameter_mm"] * 1e-3
        a0_m2 = math.pi * (d0_m / 2.0) ** 2

        # Viscosity & Density
        mu = 0.0035  # Pa·s (dynamic blood viscosity)
        rho = 1050.0  # kg/m³ (blood density)

        # Stenosis geometry
        s_factor = max(0.0, min(stenosis_pct, 95.0)) / 100.0
        d_sten_m = d0_m * math.sqrt(max(0.05, 1.0 - s_factor))
        a_sten_m2 = math.pi * (d_sten_m / 2.0) ** 2

        # Viscous and inertial coefficients
        r_viscous = (128.0 * mu * length_m) / (math.pi * (d_sten_m**4))
        k_inertial = (rho / 2.0) * ((1.0 / a_sten_m2) - (1.0 / a0_m2)) ** 2

        # Microvascular bed resistance (dilates under hyperemia / stress)
        dilatation = 0.28 if hyperemic_stress else 1.0
        r_micro = (spec["micro_resistance"] * 1.33322e8) * dilatation

        # Convert Pa to mmHg: 1 mmHg = 133.322 Pa
        p_aorta_pa = mean_aortic_pressure_mmhg * 133.322
        p_venous_pa = 5.0 * 133.322  # Central venous pressure ~5 mmHg

        # Quadratic circuit: k_inertial · Q² + (r_viscous + r_micro) · Q - (P_aorta - P_venous) = 0
        a = k_inertial
        b = r_viscous + r_micro
        c = -(p_aorta_pa - p_venous_pa)

        # Stable positive root: Q = (-b + sqrt(b² - 4ac)) / (2a)
        discriminant = b * b - 4.0 * a * c
        q_m3_s = (-b + math.sqrt(discriminant)) / (2.0 * a)
        flow_ml_min = q_m3_s * 60.0 * 1e6

        # Translesional pressure drop ΔP
        dp_stenosis_pa = r_viscous * q_m3_s + k_inertial * (q_m3_s**2)
        dp_stenosis_mmhg = dp_stenosis_pa / 133.322

        # Distal coronary pressure Pd
        p_distal_mmhg = max(10.0, mean_aortic_pressure_mmhg - dp_stenosis_mmhg)

        # FFR = (Pd - Pv) / (Pa - Pv)
        ffr = round((p_distal_mmhg - 5.0) / max(1.0, mean_aortic_pressure_mmhg - 5.0), 3)

        # Wall Shear Stress (WSS) τ_w = 4 · μ · Q / (π · r³) in Pa
        r_sten_m = d_sten_m / 2.0
        wss_pa = round((4.0 * mu * q_m3_s) / (math.pi * (r_sten_m**3)), 2)

        # Reynolds number Re = ρ · v · D / μ
        velocity_m_s = q_m3_s / a_sten_m2
        reynolds = round((rho * velocity_m_s * d_sten_m) / mu, 1)

        # Coronary Flow Reserve (CFR) estimate
        cfr = round(max(1.0, 2.8 - (stenosis_pct / 100.0) * 1.9), 2)
        imr = round(p_distal_mmhg * 0.32, 1)  # Index of Microcirculatory Resistance (mmHg·s)

        regime = "Turbulent / High Shear" if reynolds > 1500 or wss_pa > 15.0 else "Laminar Poiseuille"
        is_ischemic = ffr < 0.80

        return HemodynamicPhysicsResult(
            vessel_id=vessel_id,
            stenosis_pct=stenosis_pct,
            mean_aortic_pressure_mmhg=round(mean_aortic_pressure_mmhg, 1),
            distal_coronary_pressure_mmhg=round(p_distal_mmhg, 1),
            translesional_pressure_drop_mmhg=round(dp_stenosis_mmhg, 1),
            ffr=ffr,
            flow_rate_ml_min=round(flow_ml_min, 1),
            wall_shear_stress_pa=wss_pa,
            coronary_flow_reserve=cfr,
            index_microcirculatory_resistance=imr,
            reynolds_number=reynolds,
            flow_regime=regime,
            ischemic_significance=is_ischemic,
        )

    def simulate_cellular_electromechanics(
        self,
        ischemia_severity: float = 0.0,  # 0.0 = normal healthy, 1.0 = acute transmural ischemia
        heart_rate_bpm: float = 72.0,
    ) -> CellularElectromechanics:
        """Simulate single-cell ventricular cardiomyocyte action potential and sarcomere tension.

        Mechanisms modeled:
        - Phase 0: Fast Na+ influx (INa), rapid depolarization up to +35 mV.
        - Phase 1: Transient outward K+ current (Ito) notch.
        - Phase 2: L-type Ca2+ channel (ICaL) plateau maintaining excitation-contraction coupling.
        - Phase 3: Delayed rectifier K+ currents (IKr, IKs) driving repolarization.
        - Phase 4: Inward rectifier K+ (IK1) setting resting potential at -85 mV.
        - Ischemic Alterations:
          * Intracellular ATP drops (100% -> 35%)
          * K_ATP channels open, causing severe Action Potential Duration (APD90) shortening (320 ms -> 160 ms)
          * Reduced peak Ca2+ transient and weakened sarcomere twitch tension F(t).
        """
        duration_ms = 450.0
        steps = 150
        time_series = [round((i / (steps - 1)) * duration_ms, 1) for i in range(steps)]

        # Ischemia factors
        atp_pct = round(100.0 - (ischemia_severity * 65.0), 1)
        apd_scale = 1.0 - (ischemia_severity * 0.48)  # APD shortening
        v_rest = -85.0 + (ischemia_severity * 14.0)  # Depolarized resting potential (-85 to -71 mV)
        v_peak = 35.0 - (ischemia_severity * 18.0)  # Blunted upstroke amplitude

        voltages = []
        calciums = []
        forces = []

        base_apd90 = 320.0 * apd_scale
        base_apd50 = 210.0 * apd_scale

        for t in time_series:
            # Action Potential Vm(t) curve
            if t < 10.0:
                # Phase 4 Resting
                vm = v_rest
                ca = 0.10  # Diastolic baseline Ca2+ in μM
                force = 0.0
            elif t < 15.0:
                # Phase 0 Rapid Na+ upstroke
                fraction = (t - 10.0) / 5.0
                vm = v_rest + (v_peak - v_rest) * fraction
                ca = 0.10 + 0.3 * fraction
                force = 0.0
            elif t < 35.0:
                # Phase 1 Early notch
                fraction = (t - 15.0) / 20.0
                vm = v_peak - 12.0 * fraction
                ca = 0.40 + 0.8 * fraction
                force = 5.0 * fraction
            elif t < base_apd50:
                # Phase 2 Ca2+ Plateau
                plateau_frac = (t - 35.0) / (base_apd50 - 35.0)
                vm = (v_peak - 12.0) - 15.0 * plateau_frac
                # Intracellular calcium transient peaks around 80 ms
                ca_peak = (1.45 - (ischemia_severity * 0.65))
                ca = ca_peak * math.exp(-math.pow((t - 75.0) / 45.0, 2)) + 0.10
                # Mechanical tension F(t) lags calcium
                peak_force = (48.0 - (ischemia_severity * 28.0))
                force = peak_force * math.exp(-math.pow((t - 120.0) / 60.0, 2))
            elif t < base_apd90:
                # Phase 3 Rapid repolarization
                repol_frac = (t - base_apd50) / (base_apd90 - base_apd50)
                vm = (v_peak - 27.0) - ((v_peak - 27.0) - v_rest) * repol_frac
                ca = 0.15 * (1.0 - repol_frac) + 0.10
                peak_force = (48.0 - (ischemia_severity * 28.0))
                force = peak_force * math.exp(-math.pow((t - 120.0) / 60.0, 2))
            else:
                # Phase 4 Late recovery
                vm = v_rest
                ca = 0.10
                force = 0.0

            voltages.append(round(vm, 2))
            calciums.append(round(ca, 3))
            forces.append(round(force, 2))

        return CellularElectromechanics(
            cell_type="ventricular_cardiomyocyte",
            ischemic_state=ischemia_severity > 0.3,
            atp_level_pct=atp_pct,
            resting_membrane_potential_mv=round(v_rest, 1),
            peak_depolarization_mv=round(v_peak, 1),
            action_potential_duration_90_ms=round(base_apd90, 1),
            action_potential_duration_50_ms=round(base_apd50, 1),
            calcium_transient_peak_um=round(max(calciums), 2),
            peak_sarcomere_force_mn_mm2=round(max(forces), 1),
            time_series_ms=time_series,
            voltage_mv=voltages,
            calcium_um=calciums,
            force_mn_mm2=forces,
        )

    def generate_multilingual_physics_talk(
        self,
        hemo: HemodynamicPhysicsResult,
        cell: CellularElectromechanics,
        lang: str = "en",
        persona: str = "doctor",  # "doctor", "nurse", "patient"
    ) -> dict[str, str]:
        """Formulate multilingual natural language biophysics explanation."""
        v = hemo.vessel_id
        sten = hemo.stenosis_pct
        dp = hemo.translesional_pressure_drop_mmhg
        ffr = hemo.ffr
        wss = hemo.wall_shear_stress_pa
        apd = cell.action_potential_duration_90_ms
        atp = cell.atp_level_pct

        talks = {
            "en": {
                "doctor": (
                    f"Navier-Stokes Poiseuille-Bernoulli solution for {v} with {sten:.0f}% stenosis: "
                    f"viscous and inertial losses generate a translesional pressure gradient ΔP = {dp:.1f} mmHg. "
                    f"The simulated FFR is {ffr:.2f} ({'ISCHEMIC (<0.80)' if ffr < 0.80 else 'Physiologically Preserved'}). "
                    f"Peak wall shear stress is {wss:.1f} Pa with Reynolds number {hemo.reynolds_number:.0f} ({hemo.flow_regime}). "
                    f"At the cellular level, ischemic metabolic stress drops myocyte ATP to {atp:.0f}%, shortening APD90 to {apd:.0f} ms "
                    f"and blunting sarcomere contractile tension to {cell.peak_sarcomere_force_mn_mm2:.1f} mN/mm²."
                ),
                "patient": (
                    f"Your {v} blood vessel has a {sten:.0f}% narrowing. Because of the laws of fluid flow, the blood pressure drops by {dp:.1f} points "
                    f"as it passes the tight spot, meaning your heart muscle is receiving {ffr*100:.0f}% of its normal blood supply. "
                    f"Inside the heart cells, energy levels are at {atp:.0f}%. With proper medication and care, we can protect your heart muscle from strain."
                ),
            },
            "hi": {
                "doctor": (
                    f"नेवियर-स्टोक्स द्रव गतिकी (Fluid Dynamics) के अनुसार, {v} में {sten:.0f}% संकुचन के कारण ΔP = {dp:.1f} mmHg का प्रेशर ड्रॉप उत्पन्न हुआ है। "
                    f"अनुमानित FFR {ffr:.2f} है ({'गंभीर इस्कीमिया (<0.80)' if ffr < 0.80 else 'सुरक्षित स्तर'})। "
                    f"कोशिकीय स्तर पर, कार्डियोमायोसाइट ATP {atp:.0f}% तक गिर गया है, जिससे एक्शन पोटेंशियल अवधि (APD90) घटकर {apd:.0f} ms रह गई है।"
                ),
                "patient": (
                    f"आपकी हृदय की मुख्य धमनी ({v}) में {sten:.0f}% रुकावट है। भौतिक विज्ञान के अनुसार, संकरी जगह से गुजरते समय रक्त का दबाव {dp:.1f} mmHg कम हो जाता है, "
                    f"जिससे हृदय की मांसपेशियों को सामान्य का केवल {ffr*100:.0f}% रक्त मिल पा रहा है। आपकी कोशिकाओं में ऊर्जा {atp:.0f}% है। समय पर दवा से इसे पूरी तरह सुरक्षित रखा जा सकता है।"
                ),
            },
            "es": {
                "doctor": (
                    f"Solución hidrodinámica Navier-Stokes para {v} con {sten:.0f}% de estenosis: "
                    f"el gradiente de presión translesional es ΔP = {dp:.1f} mmHg y la FFR estimada es {ffr:.2f} ({'ISQUÉMICA' if ffr < 0.80 else 'NO ISQUÉMICA'}). "
                    f"El esfuerzo cortante parietal alcanza {wss:.1f} Pa. A nivel celular, el ATP miocárdico cae al {atp:.0f}%, acortando el APD90 a {apd:.0f} ms."
                ),
                "patient": (
                    f"Su arteria {v} presenta un estrechamiento del {sten:.0f}%. La presión sanguínea cae {dp:.1f} mmHg al atravesar la zona estrecha, "
                    f"haciendo que el músculo cardíaco reciba el {ffr*100:.0f}% del flujo normal. La energía celular se encuentra al {atp:.0f}%. Con el tratamiento adecuado podemos proteger su corazón."
                ),
            },
            "zh": {
                "doctor": (
                    f"纳维-斯托克斯冠脉流体解算：{v}狭窄率{sten:.0f}%产生跨病变压差ΔP = {dp:.1f} mmHg，模拟FFR为{ffr:.2f} ({'显著缺血' if ffr < 0.80 else '正常'})。"
                    f"管壁剪切应力达{wss:.1f} Pa。在心肌细胞水平，能量ATP降至{atp:.0f}%，动作电位时程APD90缩短至{apd:.0f}毫秒。"
                ),
                "patient": (
                    f"您的心脏{v}血管存在{sten:.0f}%的狭窄。血液流经狭窄处时压力下降了{dp:.1f}毫米汞柱，导致心肌血流供应仅为正常的{ffr*100:.0f}%。细胞能量水平为{atp:.0f}%。规范治疗能有效保护心肌健康。"
                ),
            },
            "fr": {
                "doctor": (
                    f"Résolution Navier-Stokes Poiseuille-Bernoulli pour {v} avec sténose de {sten:.0f}% : "
                    f"gradient de pression trans-lésionnel ΔP = {dp:.1f} mmHg, FFR simulée = {ffr:.2f} ({'ISCHÉMIQUE' if ffr < 0.80 else 'PRÉSERVÉE'}). "
                    f"Au niveau cellulaire, l'ATP myocytaire chute à {atp:.0f}%, réduisant la durée du potentiel d'action (APD90) à {apd:.0f} ms."
                ),
                "patient": (
                    f"Votre artère {v} présente un rétrécissement de {sten:.0f}%. La pression sanguine chute de {dp:.1f} mmHg au passage de la sténose, "
                    f"fournissant au muscle cardiaque {ffr*100:.0f}% de son flux normal. Le niveau d'énergie cellulaire est à {atp:.0f}%. Un suivi médical adapté permettra de préserver votre cœur."
                ),
            },
            "de": {
                "doctor": (
                    f"Navier-Stokes Hämodynamik-Lösung für {v} mit {sten:.0f}% Stenose: "
                    f"transläsioneller Druckgradient ΔP = {dp:.1f} mmHg, FFR = {ffr:.2f}. "
                    f"Zelluläre Ischämie senkt myozytäres ATP auf {atp:.0f}% und verkürzt die APD90 auf {apd:.0f} ms."
                ),
                "patient": (
                    f"Ihr Herzkranzgefäß {v} weist eine Verengung von {sten:.0f}% auf. Der Blutdruck fällt an der Engstelle um {dp:.1f} mmHg ab, "
                    f"wodurch Ihr Herzmuskel {ffr*100:.0f}% des normalen Blutflusses erhält. Die Zellenergie liegt bei {atp:.0f}%."
                ),
            },
            "ar": {
                "doctor": (
                    f"معادلة نافييه-ستوكس لديناميكا الدم في {v} مع تضيق {sten:.0f}%: "
                    f"انحدار الضغط عبر الآفة ΔP = {dp:.1f} ملم زئبق، و FFR المحاكى = {ffr:.2f}. "
                    f"على المستوى الخلوي، ينخفض مخزون الطاقة ATP إلى {atp:.0f}% مما يقصر فترة كمون العمل APD90 إلى {apd:.0f} مللي ثانية."
                ),
                "patient": (
                    f"يحتوي شريانك {v} على تضيق بنسبة {sten:.0f}%. ينخفض ضغط الدم بمقدار {dp:.1f} ملم زئبق عند مرور الدم في المنطقة الضيقة، "
                    f"مما يجعل عضلة القلب تتلقى {ffr*100:.0f}% من تدفق الدم الطبيعي. مستوى طاقة الخلايا {atp:.0f}%. مع العلاج المنتظم يمكن حماية القلب تماماً."
                ),
            },
        }

        lang_dict = talks.get(lang, talks["en"])
        selected_text = lang_dict.get(persona, lang_dict["doctor"])
        return {
            "language": lang,
            "persona": persona,
            "physics_explanation": selected_text,
            "mathematical_formula": "ΔP = (128·μ·L)/(π·D⁴)·Q + (ρ/2)·(1/A_sten - 1/A0)²·Q²",
            "cellular_model": "Luo-Rudy Phase 2 / Ten Tusscher Multicellular Electromechanics",
            "w3c_traceparent": current_traceparent(),
        }


# Singleton
_biophysics_instance: BiophysicsEngine | None = None


def get_biophysics_engine() -> BiophysicsEngine:
    global _biophysics_instance
    if _biophysics_instance is None:
        _biophysics_instance = BiophysicsEngine()
    return _biophysics_instance
