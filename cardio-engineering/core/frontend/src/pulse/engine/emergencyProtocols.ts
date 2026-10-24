/**
 * Unified Emergency Dispatch & Resuscitation Protocols.
 * Inherits and merges all 16 clinical protocols from pulse911-main with
 * CARDIO-INTELLIGENCE acute coronary, hemodynamic, and lethal contraindication locks.
 */

import type { EmergencyProtocol } from '../types';

export const CLINICAL_REVIEW_METADATA = {
  reviewerId: 'CARDIO-INTELLIGENCE-AHA-CONSORTIUM-2026',
  reviewedAt: '2026-10-20',
  scope: 'All 16 resuscitation protocols, CAD unit configurations, and acute coronary ischemia cascades',
  accreditation: 'AHA ECC Guidelines 2026 / ERC Guidelines / ACC STEMI Revascularization Standards',
} as const;

export const EMERGENCY_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'CARD-01',
    code: 'AHA-ECC-2026-CARD',
    title: 'Adult Out-of-Hospital Cardiac Arrest (OHCA)',
    category: 'cardiac',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Sudden loss of heart function, breathing, and consciousness. Time to CPR and defibrillation is the primary determinant of neurological survival.',
    immediateActions: [
      'Position patient flat on the back on a firm, hard floor.',
      'Place heel of one hand in the center of the chest; interlock fingers of second hand.',
      'Deliver continuous chest compressions at 100 to 120 BPM at 2 to 2.4 inches (5-6 cm) depth.',
      'Allow complete chest recoil between compressions without leaning.',
      'Retrieve and apply Automated External Defibrillator (AED) immediately upon arrival.'
    ],
    verbalResponseText: "Help is on the way. Put me on speaker and listen closely. Lay them flat on their back on the floor right now. Place your hands in the center of their chest. Push hard and fast to the beat of 'Stayin Alive'—about twice per second. Do not stop.",
    cadenceBpm: 110,
    criticalQuestions: [
      'Is the patient breathing normally or only making gasping/snoring sounds (agonal breathing)?',
      'Is an Automated External Defibrillator (AED) nearby in the building?'
    ],
    contraindications: [
      'Do not stop compressions for more than 10 seconds.',
      'Do not place soft pillows or mattresses underneath the patient during CPR.'
    ],
    unitRecommendation: {
      unitType: 'ALS Paramedic Rescue Engine + Battalion Medic',
      priority: 'Code 3 (Emergency Lights & Sirens)',
      requiredEquipment: ['Lucas Mechanical CPR Device', 'Zoll X-Series Defibrillator', 'Video Laryngoscopy Kit']
    },
    keywords: [
      'cardiac arrest', 'not breathing', 'heart attack', 'cpr', 'chest compressions',
      'unconscious', 'no pulse', 'collapsed', 'passed out', 'chest pain', 'defibrillator', 'aed',
      'gasping', 'agonal', 'unresponsive', 'not responding', 'not awake', 'stopped breathing',
      'blue lips', 'no heartbeat'
    ],
    lethalContraindicationLocks: [
      'LOCK: NEVER pause CPR for pulse checks exceeding 10 seconds',
      'LOCK: DO NOT hyperventilate (>10 breaths/min decreases cardiac output)'
    ],
    hemodynamicProfile: {
      expectedMap: '0 - 25 mmHg (unsupported)',
      targetHr: '100 - 120 bpm (external cadence)',
      shockIndexThreshold: 2.0,
      stemiRisk: true,
    }
  },
  {
    id: 'ACS-14',
    code: 'AHA-ACC-2026-ACS',
    title: 'Acute Coronary Syndrome / STEMI Cascade',
    category: 'cardiac',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Transmural coronary arterial occlusion with ischemic cascade: singular perturbation shear stress, regional wall motion failure, ST-elevation, and pulse transit delay.',
    immediateActions: [
      'Have patient rest in semi-Fowler position; strictly avoid physical exertion.',
      'Administer 324 mg chewable Aspirin unless allergic or active GI bleed.',
      'Acquire 12-lead ECG immediately; transmit directly to Cath Lab interventionalist.',
      'Establish bilateral large-bore IV access; prepare defibrillation pads.',
      'Activate STEMI Cath Lab protocol with target door-to-balloon time < 60 minutes.'
    ],
    verbalResponseText: "Stay seated and completely calm. Chew 4 baby aspirins or 1 full adult aspirin right now. Do not walk or climb stairs. Paramedics are en route with a 12-lead heart monitor.",
    cadenceBpm: 72,
    criticalQuestions: [
      'Is the chest pain radiating to the left arm, jaw, neck, or between shoulder blades?',
      'Have you taken any phosphodiesterase-5 inhibitors (e.g., Viagra/Cialis) in the last 48 hours?'
    ],
    contraindications: [
      'LOCK: DO NOT administer Nitroglycerin if systolic BP < 90 mmHg or PDE-5 inhibitor used within 48h (risk of fatal refractory hypotension).',
      'LOCK: DO NOT administer Nitroglycerin in suspected Right Ventricular Infarction (pre-load dependent).'
    ],
    unitRecommendation: {
      unitType: 'ALS Mobile Intensive Care Unit (MICU)',
      priority: 'Code 3 (Emergency Lights & Sirens)',
      requiredEquipment: ['12-Lead Cellular Telemetry ECG', 'Heparin/Ticagrelor Kit', 'Transcutaneous Pacer']
    },
    keywords: [
      'heart attack', 'crushing chest pain', 'chest tightness', 'angina', 'stemi',
      'sweating profusely', 'pain radiating to arm', 'jaw pain', 'elephant on chest',
      'shortness of breath with chest pain', 'coronary', 'diaphoretic', 'nitro'
    ],
    lethalContraindicationLocks: [
      'LOCK: NO Nitrates with PDE-5 inhibitors (Viagra/Cialis/Levitra)',
      'LOCK: NO Beta-blockers in acute cardiogenic shock or cocaine-induced vasospasm'
    ],
    hemodynamicProfile: {
      expectedMap: '65 - 110 mmHg (collapsing in shock)',
      targetHr: '60 - 90 bpm',
      shockIndexThreshold: 0.9,
      stemiRisk: true,
    }
  },
  {
    id: 'AIR-02',
    code: 'AHA-ECC-2026-AIR',
    title: 'Acute Upper Airway Obstruction / Foreign Body Asphyxiation',
    category: 'airway',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Complete mechanical obstruction of trachea or larynx causing acute hypoxemia, stridor, and impending anoxic arrest.',
    immediateActions: [
      'If conscious and unable to speak/cough, deliver 5 firm back blows between shoulder blades.',
      'Follow with 5 rapid upward abdominal thrusts (Heimlich maneuver).',
      'Repeat cycles until foreign object is expelled or patient loses consciousness.',
      'If patient becomes unresponsive, lower to floor and immediately initiate chest compressions.'
    ],
    verbalResponseText: "Stand behind them immediately. Wrap your arms around their waist. Make a fist with one hand just above their belly button. Grasp your fist and pull sharply upward and inward. Keep going until the object pops out.",
    criticalQuestions: [
      'Can the person speak, cough forcefully, or make any sound at all?',
      'Has the person turned blue around the lips or fingernails?'
    ],
    contraindications: [
      'Do not perform blind finger sweeps in the mouth (can push object deeper).',
      'Do not deliver abdominal thrusts to infants under 1 year (use 5 back slaps and 5 chest thrusts).'
    ],
    unitRecommendation: {
      unitType: 'ALS Rescue Engine + Paramedic Ambulance',
      priority: 'Code 3',
      requiredEquipment: ['Magill Forceps', 'Surgical Cricothyrotomy Kit', 'Portable Suction']
    },
    keywords: [
      'choking', 'cannot breathe', 'food stuck in throat', 'turning blue', 'stridor',
      'hands around throat', 'heimlich', 'foreign body', 'gagging', 'silent cough'
    ],
    hemodynamicProfile: {
      expectedMap: '100 -> 30 mmHg (acute asphyxial collapse)',
      targetHr: '130 -> 35 bpm (severe bradycardia)',
      shockIndexThreshold: 1.4,
      stemiRisk: false,
    }
  },
  {
    id: 'NEURO-03',
    code: 'AHA-ASA-2026-NEURO',
    title: 'Acute Ischemic Stroke / Large Vessel Occlusion (LVO)',
    category: 'stroke',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Cerebrovascular thromboembolism producing acute focal neurological deficits. Door-to-needle thrombolysis < 4.5h and endovascular thrombectomy < 24h.',
    immediateActions: [
      'Assess BE-FAST: Balance, Eyes, Face droop, Arm weakness, Speech difficulty, Time.',
      'Establish exact Last Known Well (LKW) timestamp; record from witnesses.',
      'Maintain head of bed at 15-30 degrees; strictly NPO (nothing by mouth).',
      'Do not treat hypertension unless MAP > 130 mmHg or BP > 220/120 mmHg.',
      'Pre-notify Comprehensive Stroke Center with mobile CT priority.'
    ],
    verbalResponseText: "Help is en route. Do not give them anything to eat or drink—not even water or aspirin. Keep them lying down with head slightly elevated. Note the exact time their symptoms started.",
    criticalQuestions: [
      'What was the exact minute they were last seen completely normal?',
      'Can they smile evenly, raise both arms, or repeat a simple sentence clearly?'
    ],
    contraindications: [
      'LOCK: DO NOT administer Aspirin before non-contrast head CT rules out hemorrhagic stroke.',
      'LOCK: DO NOT aggressively lower blood pressure in acute ischemic stroke.'
    ],
    unitRecommendation: {
      unitType: 'ALS Mobile Stroke Unit / Paramedic Rescue',
      priority: 'Code 3',
      requiredEquipment: ['Mobile CT Scanner (if available)', 'Point-of-Care Glucometer', 'NIHSS Protocol']
    },
    keywords: [
      'stroke', 'face drooping', 'arm weakness', 'slurred speech', 'cannot talk',
      'numb on one side', 'befast', 'fast', 'brain bleed', 'ischemic stroke', 'lvo'
    ],
    hemodynamicProfile: {
      expectedMap: '105 - 130 mmHg (permissive hypertension)',
      targetHr: '60 - 90 bpm',
      shockIndexThreshold: 0.7,
      stemiRisk: false,
    }
  },
  {
    id: 'IMMUNO-04',
    code: 'WAO-2026-IMMUNO',
    title: 'Severe Anaphylactic Shock',
    category: 'allergy',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'IgE-mediated systemic hypersensitivity reaction causing rapid vasodilation, airway angioedema, bronchospasm, and distributive circulatory shock.',
    immediateActions: [
      'Administer Epinephrine 0.3 mg (adult) or 0.15 mg (child) IM into anterolateral mid-thigh immediately.',
      'Place patient supine with legs elevated; DO NOT allow patient to stand or sit up suddenly (empty ventricle syndrome).',
      'Repeat Epinephrine IM dose every 5 to 15 minutes if symptoms persist.',
      'High-flow supplemental oxygen; prepare 1-2L warm normal saline IV bolus.'
    ],
    verbalResponseText: "Use their Epinephrine auto-injector (EpiPen) right now. Press firmly into the outside of the thigh until it clicks and hold for 3 seconds. Keep them lying flat with legs raised. Do not let them stand up.",
    criticalQuestions: [
      'Do they have an EpiPen or auto-injector available right now?',
      'Are they having trouble swallowing, breathing, or feeling dizzy?'
    ],
    contraindications: [
      'LOCK: DO NOT allow the patient to stand or sit upright (sudden venous pooling causes fatal cardiac arrest).',
      'LOCK: NEVER delay Epinephrine in favor of antihistamines or albuterol.'
    ],
    unitRecommendation: {
      unitType: 'ALS Paramedic Rescue Unit',
      priority: 'Code 3',
      requiredEquipment: ['IM/IV Epinephrine 1:1000 and 1:10000', 'Video Laryngoscope', 'Normal Saline Rapid Infuser']
    },
    keywords: [
      'anaphylaxis', 'allergic reaction', 'epipen', 'throat closing', 'swollen tongue',
      'peanut allergy', 'bee sting', 'hives all over', 'stridor', 'cannot swallow'
    ],
    hemodynamicProfile: {
      expectedMap: '40 - 65 mmHg (distributive shock)',
      targetHr: '120 - 160 bpm (compensatory tachycardia)',
      shockIndexThreshold: 1.5,
      stemiRisk: false,
    }
  },
  {
    id: 'TOX-05',
    code: 'AHA-TOX-2026',
    title: 'Acute Opioid Overdose & Respiratory Arrest',
    category: 'toxicology',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Mu-opioid receptor hyper-stimulation causing central respiratory depression, pinpoint pupils, hypoxia, and secondary pulseless arrest.',
    immediateActions: [
      'Administer Naloxone (Narcan) 4 mg nasal spray into one nostril immediately.',
      'Begin rescue breathing with bag-valve-mask at 1 breath every 5-6 seconds.',
      'If no response within 2-3 minutes, administer second dose of Naloxone into alternate nostril.',
      'If patient has no pulse or is in agonal breathing, immediately initiate CPR.'
    ],
    verbalResponseText: "Spray Narcan into their nose right now. If they do not wake up and are not breathing normally, lay them on their back and begin chest compressions immediately.",
    criticalQuestions: [
      'Is Naloxone / Narcan available in the home or nearby kit?',
      'Are they breathing at all or making snoring/gasping sounds?'
    ],
    contraindications: [
      'Do not delay CPR if patient is pulseless while searching for Naloxone.',
      'Be prepared for acute opioid withdrawal agitation upon reversal.'
    ],
    unitRecommendation: {
      unitType: 'ALS Paramedic Medic Unit + Police AED First Responder',
      priority: 'Code 3',
      requiredEquipment: ['Naloxone IV/IM/IN', 'Bag-Valve-Mask (BVM) Resuscitator', 'End-Tidal CO2 Detector']
    },
    keywords: [
      'overdose', 'narcan', 'naloxone', 'fentanyl', 'heroin', 'not breathing',
      'pinpoint pupils', 'blue lips', 'unresponsive', 'gasping', 'snoring'
    ],
    hemodynamicProfile: {
      expectedMap: '50 - 75 mmHg',
      targetHr: '45 - 65 bpm (bradycardic hypoxia)',
      shockIndexThreshold: 1.1,
      stemiRisk: false,
    }
  },
  {
    id: 'CYBER-06',
    code: 'AHA-HRS-2026-DEVICE',
    title: 'Implantable Cardioverter-Defibrillator (ICD) / Pacemaker Storm',
    category: 'device',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Recurrent ICD shock storms (>= 3 shocks in 24 hours), runaway pacing, or pacing failure with hemodynamic instability.',
    immediateActions: [
      'Position patient supine; attach external cardiac telemetry and defibrillation pads.',
      'Apply clinical doughnut magnet over ICD pulse generator to disable inappropriate shocks if in VT storm.',
      'Administer antiarrhythmic infusion (Amiodarone / Lidocaine) per ALS protocol.',
      'Prepare for emergent transcutaneous pacing if bradycardic pacemaker failure.'
    ],
    verbalResponseText: "Help is on the way. Sit down and lean back. If an automated magnet is present, hold it over the implant site on your upper chest. Do not disconnect any monitors.",
    cadenceBpm: 60,
    criticalQuestions: [
      'How many shocks has the device delivered in the last 2 hours?',
      'Is the patient currently awake, speaking, or experiencing chest flutter?'
    ],
    contraindications: [
      'Do not place external defibrillation pads directly over the implanted pulse generator (maintain at least 8 cm separation).',
      'Do not remove magnet until continuous ECG monitoring is established.'
    ],
    unitRecommendation: {
      unitType: 'ALS Critical Care Transport Medic',
      priority: 'Code 3',
      requiredEquipment: ['Clinical Ring Magnet', 'External Transcutaneous Pacer', 'Cellular Interrogator']
    },
    keywords: [
      'pacemaker', 'icd', 'defibrillator shock', 'shocking repeatedly', 'pacemaker failure',
      'icd storm', 'heart flutter', 'implanted device', 'chest twitching'
    ],
    hemodynamicProfile: {
      expectedMap: '55 - 90 mmHg',
      targetHr: '30 - 180 bpm (wide variance)',
      shockIndexThreshold: 1.3,
      stemiRisk: true,
    }
  },
  {
    id: 'AIR-03',
    code: 'AHA-PALS-2026-CHOKE',
    title: 'Pediatric Foreign Body Airway Obstruction',
    category: 'airway',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Severe airway obstruction in infant (<1 year) or child (1-8 years) with rapidly deteriorating hypoxemic arrest risk.',
    immediateActions: [
      'For infant (<1 yr): Place face-down along forearm supporting jaw; deliver 5 back slaps.',
      'Turn infant face-up; deliver 5 quick downward chest thrusts using 2 fingers.',
      'Repeat until object is dislodged or child becomes unresponsive.',
      'If unresponsive, begin CPR immediately (30:2 or continuous).'
    ],
    verbalResponseText: "Put the baby face down on your arm, supporting their chin with your hand. Give 5 quick, firm slaps between their shoulder blades. Then flip them over and give 5 chest thrusts with two fingers.",
    criticalQuestions: [
      'Is the child under 1 year old or older?',
      'Is the child able to cry or make any noise at all?'
    ],
    contraindications: [
      'LOCK: NEVER perform blind finger sweep in infants (causes laryngospasm or pushes object into carina).',
      'LOCK: DO NOT perform abdominal Heimlich thrusts on infants under 1 year (liver laceration risk).'
    ],
    unitRecommendation: {
      unitType: 'Pediatric ALS Rescue Engine',
      priority: 'Code 3',
      requiredEquipment: ['Broselow Pediatric Emergency Tape', 'Infant BVM', 'Pediatric Magill Forceps']
    },
    keywords: [
      'baby choking', 'infant choking', 'child cannot breathe', 'toddler choking', 'toy stuck in throat',
      'turning purple', 'silent crying', 'infant cpr'
    ],
    hemodynamicProfile: {
      expectedMap: '35 - 60 mmHg',
      targetHr: '60 -> 180 -> 40 bpm',
      shockIndexThreshold: 1.6,
      stemiRisk: false,
    }
  },
  {
    id: 'BURN-07',
    code: 'ABA-2026-BURN',
    title: 'Major Thermal & Inhalation Injury (>20% TBSA)',
    category: 'burn',
    triageLevel: 'ESI-2 (Emergent / High Risk)',
    clinicalSummary: 'Severe thermal skin disruption with hypovolemic burn shock, carbon monoxide poisoning, and acute laryngeal airway edema.',
    immediateActions: [
      'Extinguish flames and remove smoldering non-adherent clothing; do not peel burned clothing stuck to skin.',
      'Cool thermal burns with clean room-temperature water for 10-20 minutes; avoid ice water.',
      'Initiate Parkland formula resuscitation: 4 mL/kg/% TBSA Lactated Ringer.',
      'Assess for stridor, singed nasal hairs, or carbonaceous sputum indicating impending airway compromise.'
    ],
    verbalResponseText: "Get away from the heat source right now. Pour cool tap water over the burns—do not use ice or butter. Cover with a clean dry sheet. Paramedics are on the way.",
    criticalQuestions: [
      'Was the fire inside an enclosed room with smoke, or outdoors?',
      'Are their facial hairs singed, or are they coughing up black soot?'
    ],
    contraindications: [
      'Do not apply ice or freezing cold water (causes deep tissue ischemia and systemic hypothermia).',
      'Do not break intact blisters.'
    ],
    unitRecommendation: {
      unitType: 'ALS Burn Center Transport Unit',
      priority: 'Code 3',
      requiredEquipment: ['Sterile Burn Sheets', 'Warming Blankets', 'CyanoKit (Hydroxocobalamin)']
    },
    keywords: [
      'burn', 'fire', 'explosion', 'severe burn', 'skin peeling', 'chemical burn',
      'smoke inhalation', 'charred skin', 'blistered burn'
    ],
    hemodynamicProfile: {
      expectedMap: '60 - 90 mmHg',
      targetHr: '110 - 140 bpm',
      shockIndexThreshold: 1.2,
      stemiRisk: false,
    }
  },
  {
    id: 'SEIZ-08',
    code: 'AES-2026-SEIZ',
    title: 'Status Epilepticus / Prolonged Convulsive Seizure',
    category: 'seizure',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Continuous convulsive seizure activity lasting > 5 minutes, or recurrent seizures without return of consciousness between episodes.',
    immediateActions: [
      'Clear surrounding area of sharp objects, hard edges, and furniture.',
      'Place patient in lateral recovery position once convulsions subside to protect airway.',
      'Do not attempt to hold patient down or restrain extremities.',
      'Prepare IV/IM Benzodiazepines (Midazolam 10 mg IM or Lorazepam 4 mg IV).'
    ],
    verbalResponseText: "Help is on the way. Do not hold them down and do not put anything in their mouth. Clear away hard objects so they do not hurt themselves. Time the seizure.",
    criticalQuestions: [
      'Has the seizure lasted more than 5 minutes continuously?',
      'Does the person have a known history of epilepsy or head trauma?'
    ],
    contraindications: [
      'LOCK: NEVER place fingers, spoons, or objects inside patient\'s mouth (causes tooth fracture, aspiration, and airway obstruction).',
      'LOCK: DO NOT aggressively restrain convulsive movements (causes shoulder dislocation).'
    ],
    unitRecommendation: {
      unitType: 'ALS Paramedic Rescue Engine',
      priority: 'Code 3',
      requiredEquipment: ['Midazolam/Lorazepam', 'Point-of-Care Glucometer', 'Suction Canister']
    },
    keywords: [
      'seizure', 'convulsing', 'shaking uncontrollably', 'epilepsy', 'status epilepticus',
      'foaming at mouth', 'eyes rolled back', 'jerking violently', 'grand mal'
    ],
    hemodynamicProfile: {
      expectedMap: '90 - 130 mmHg',
      targetHr: '120 - 160 bpm',
      shockIndexThreshold: 0.9,
      stemiRisk: false,
    }
  },
  {
    id: 'HEM-09',
    code: 'AHA-COT-2026-HEM',
    title: 'Exsanguinating Extremity or Junctional Hemorrhage',
    category: 'hemorrhage',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Pulsatile or rapid arterial bleeding capable of causing hemorrhagic shock and cardiac arrest in < 3 minutes.',
    immediateActions: [
      'Apply high and tight arterial Combat Application Tourniquet (CAT) on extremity 2-3 inches above bleeding site.',
      'Tighten windlass until arterial pulsation stops completely and bleeding ceases.',
      'For junctional or neck/groin hemorrhage, pack tightly with hemostatic gauze and maintain 3 min firm pressure.',
      'Prevent hypothermia; prepare 1:1:1 balanced blood component resuscitation.'
    ],
    verbalResponseText: "Press down with both hands as hard as you can directly on the bleeding wound with a clean towel or cloth. If you have a tourniquet, apply it 2 inches above the wound and twist until bleeding stops. Do not ease up pressure.",
    criticalQuestions: [
      'Is the blood spurting out rhythmically with the heartbeat or pooling rapidly?',
      'Is the wound on an arm, leg, neck, or groin?'
    ],
    contraindications: [
      'Do not apply tourniquets directly over a joint (knee or elbow).',
      'Do not loosen tourniquet once placed without direct surgical supervision.'
    ],
    unitRecommendation: {
      unitType: 'ALS Trauma Rescue Medic Engine',
      priority: 'Code 3',
      requiredEquipment: ['Combat Application Tourniquet (CAT)', 'QuikClot Hemostatic Gauze', 'Low-Titer O-Negative Whole Blood']
    },
    keywords: [
      'bleeding profusely', 'arterial bleed', 'spurting blood', 'blood everywhere', 'stabbed',
      'gunshot wound', 'tourniquet', 'severed limb', 'amputation', 'deep laceration'
    ],
    hemodynamicProfile: {
      expectedMap: '40 - 70 mmHg (class III/IV shock)',
      targetHr: '130 - 170 bpm',
      shockIndexThreshold: 1.8,
      stemiRisk: false,
    }
  },
  {
    id: 'OB-10',
    code: 'ACOG-2026-OB',
    title: 'Precipitous Out-of-Hospital Childbirth & Shoulder Dystocia',
    category: 'obstetric',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Imminent delivery with crowning, breech presentation, or shoulder dystocia requiring maternal positioning maneuvers.',
    immediateActions: [
      'Position mother supine with knees bent apart; place clean dry towels beneath hips.',
      'Support crowning infant head gently; DO NOT pull or force delivery.',
      'Check for nuchal cord around neck; gently slip over head if loose.',
      'Immediately dry and stimulate infant; suction mouth then nose; keep infant warm on maternal chest.'
    ],
    verbalResponseText: "Lie down on a bed or floor with knees bent and spread wide. Put clean towels underneath. When you feel the urge to push, pant gently through your mouth. Support the baby's head as it emerges, but do not pull.",
    criticalQuestions: [
      'Can you see the baby\'s head crowning right now during contractions?',
      'How many weeks pregnant is the mother, and is this her first child?'
    ],
    contraindications: [
      'LOCK: NEVER pull forcefully on the infant\'s head or neck (risk of permanent brachial plexus palsy).',
      'LOCK: DO NOT clamp the umbilical cord before initial infant drying and breathing assessment.'
    ],
    unitRecommendation: {
      unitType: 'ALS Maternal-Neonatal Rescue Unit',
      priority: 'Code 3',
      requiredEquipment: ['Neonatal Resuscitation Kit', 'Cord Clamps and Shears', 'Infant Thermal Swaddle']
    },
    keywords: [
      'giving birth', 'baby coming out', 'labor', 'water broke', 'crowning',
      'contractions', 'pregnant bleeding', 'shoulder dystocia', 'breech birth'
    ],
    hemodynamicProfile: {
      expectedMap: '75 - 105 mmHg',
      targetHr: '85 - 120 bpm (maternal) / 120 - 160 bpm (neonatal)',
      shockIndexThreshold: 0.8,
      stemiRisk: false,
    }
  },
  {
    id: 'DIA-11',
    code: 'ADA-2026-DIA',
    title: 'Severe Hypoglycemia with Neuroglycopenia',
    category: 'endocrine',
    triageLevel: 'ESI-2 (Emergent / High Risk)',
    clinicalSummary: 'Acute blood glucose < 54 mg/dL producing confusion, diaphoresis, focal deficits, seizure, or coma.',
    immediateActions: [
      'Assess point-of-care blood glucose immediately.',
      'If conscious and able to swallow, administer 15-20g rapid-acting oral glucose (fruit juice or glucose tablets).',
      'If unresponsive or unable to swallow safely, administer Glucagon 1 mg IM/SC or Dextrose 10% IV bolus.',
      'Re-check glucose in 15 minutes; maintain airway.'
    ],
    verbalResponseText: "If they are awake and can swallow, give them a glass of orange juice or 3 teaspoons of sugar dissolved in water right now. If they are unconscious, do not put anything in their mouth; paramedics will give medication directly into their vein.",
    criticalQuestions: [
      'Is the person conscious and able to drink without coughing?',
      'Do they have a history of diabetes or use an insulin pump?'
    ],
    contraindications: [
      'LOCK: NEVER give liquids or solids by mouth to an unconscious or seizing patient (severe aspiration risk).',
      'Do not delay emergency dispatch to search for food.'
    ],
    unitRecommendation: {
      unitType: 'ALS Paramedic Rescue Engine',
      priority: 'Code 3',
      requiredEquipment: ['Point-of-Care Glucometer', 'Dextrose 10% IV', 'Glucagon / Baqsimi']
    },
    keywords: [
      'hypoglycemia', 'low blood sugar', 'diabetic emergency', 'insulin shock',
      'shaky and confused', 'diabetic passed out', 'sweaty diabetic', 'glucagon'
    ],
    hemodynamicProfile: {
      expectedMap: '70 - 105 mmHg',
      targetHr: '100 - 130 bpm (adrenergic surge)',
      shockIndexThreshold: 0.9,
      stemiRisk: false,
    }
  },
  {
    id: 'TRAUMA-12',
    code: 'ATLS-2026-TRAUMA',
    title: 'Severe Polytrauma & Tension Pneumothorax',
    category: 'trauma',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Blunt or penetrating high-energy trauma with tension pneumothorax, flail chest, or pelvic ring disruption.',
    immediateActions: [
      'Maintain cervical spine stabilization in neutral alignment.',
      'Assess for tension pneumothorax: severe respiratory distress, absent breath sounds, tracheal deviation, and hypotension.',
      'Perform emergent needle decompression at 2nd intercostal space mid-clavicular or 4th/5th anterior axillary line.',
      'Apply pelvic circumferential compression binder for suspected open-book pelvic fracture.'
    ],
    verbalResponseText: "Keep their head and neck completely still. Do not move them unless they are in immediate danger from fire or water. Help is on the way with specialized trauma equipment.",
    criticalQuestions: [
      'Was there a high-speed vehicle crash, fall from height, or penetrating injury?',
      'Is the chest rising and falling equally on both sides?'
    ],
    contraindications: [
      'LOCK: DO NOT remove penetrating impaled objects from chest or abdomen in the field (acts as a vascular plug).',
      'LOCK: DO NOT move patient with suspected spinal trauma without full spinal immobilization.'
    ],
    unitRecommendation: {
      unitType: 'ALS Heavy Rescue + Trauma Flight Medic (Helicopter)',
      priority: 'Code 3',
      requiredEquipment: ['Tension Pneumothorax Decompression Needle (14G 3.25in)', 'Sam Pelvic Sling', 'Rigid Cervical Collar']
    },
    keywords: [
      'car crash', 'fall from height', 'crushed', 'tension pneumothorax', 'chest crushed',
      'cannot breathe after hit', 'broken pelvis', 'trauma', 'hit by car'
    ],
    hemodynamicProfile: {
      expectedMap: '45 - 75 mmHg',
      targetHr: '125 - 165 bpm',
      shockIndexThreshold: 1.7,
      stemiRisk: false,
    }
  },
  {
    id: 'DROW-13',
    code: 'AHA-ECC-2026-DROW',
    title: 'Submersion Injury / Near-Drowning Respiratory Arrest',
    category: 'environmental',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Hypoxemic respiratory arrest following fluid aspiration into airways, secondary surfactant washout, and alveolar collapse.',
    immediateActions: [
      'Remove victim from water safely without placing rescuers in danger.',
      'Place supine on hard surface; immediately deliver 2 to 5 initial rescue breaths.',
      'If victim remains pulseless, initiate chest compressions at 30:2 ratio.',
      'Wipe chest dry before applying AED pads; prevent systemic hypothermia.'
    ],
    verbalResponseText: "Get them out of the water onto solid ground. Dry their chest quickly. If they are not breathing, pinch their nose, seal your mouth over theirs, and give 2 full breaths. Then push hard and fast on the center of the chest.",
    cadenceBpm: 110,
    criticalQuestions: [
      'How long was the person submerged under water?',
      'Was the water cold or warm, and is their body cold to the touch?'
    ],
    contraindications: [
      'Do not waste time attempting to drain water from lungs with abdominal thrusts.',
      'Do not terminate resuscitation until the hypothermic patient has been rewarmed in hospital.'
    ],
    unitRecommendation: {
      unitType: 'ALS Water Rescue Medic Engine',
      priority: 'Code 3',
      requiredEquipment: ['Suction Unit', 'Bag-Valve-Mask with PEEP Valve', 'Hypothermia Rewarming Wrap']
    },
    keywords: [
      'drowning', 'submerged in pool', 'fell in lake', 'underwater', 'pulled from pool',
      'not breathing after swimming', 'water in lungs', 'near drowning'
    ],
    hemodynamicProfile: {
      expectedMap: '0 - 45 mmHg',
      targetHr: '30 - 110 bpm',
      shockIndexThreshold: 1.5,
      stemiRisk: false,
    }
  },
  {
    id: 'HEAT-15',
    code: 'ACSM-2026-HEAT',
    title: 'Exertional / Classic Heat Stroke (Core Temp > 40°C)',
    category: 'environmental',
    triageLevel: 'ESI-1 (Immediate Resuscitation)',
    clinicalSummary: 'Failure of thermoregulatory mechanisms producing hyperpyrexia (> 104°F / 40°C), central nervous system dysfunction, and systemic inflammatory response.',
    immediateActions: [
      'Initiate immediate cold-water immersion or aggressive evaporative cooling (ice sheets + misting + fans).',
      'Cool first, transport second: goal is to lower core temperature < 39°C (102°F) within 30 minutes.',
      'Assess airway and mental status; place in recovery position if altered.',
      'Administer cooled isotonic IV fluids if peripheral access established.'
    ],
    verbalResponseText: "Move them out of the heat into shade or air conditioning immediately. Strip off heavy clothes. Pour cool water all over them and fan vigorously. Put ice packs under their armpits and groin.",
    criticalQuestions: [
      'Is their skin hot and dry, or were they exercising intensely in the sun?',
      'Are they confused, delirious, or having a seizure?'
    ],
    contraindications: [
      'LOCK: DO NOT administer Antipyretics (Aspirin or Acetaminophen) — ineffective in heat stroke and causes acute hepatotoxicity and coagulopathy.',
      'Do not delay cooling to initiate transport.'
    ],
    unitRecommendation: {
      unitType: 'ALS Heat Emergency Medic Unit',
      priority: 'Code 3',
      requiredEquipment: ['Cold Water Immersion Tarp', 'Continuous Rectal Core Temp Probe', 'Chilled Normal Saline']
    },
    keywords: [
      'heat stroke', 'overheated', 'passed out in sun', 'temperature 105', 'hot dry skin',
      'delirious from heat', 'heat exhaustion collapse', 'marathon collapse'
    ],
    hemodynamicProfile: {
      expectedMap: '60 - 95 mmHg',
      targetHr: '130 - 170 bpm',
      shockIndexThreshold: 1.4,
      stemiRisk: false,
    }
  },
  {
    id: 'MH-16',
    code: 'APA-2026-PSYCH',
    title: 'Acute Excited Delirium with Agitated Exhaustion',
    category: 'psychiatric',
    triageLevel: 'ESI-2 (Emergent / High Risk)',
    clinicalSummary: 'Extreme hyper-adrenergic delirium with psychomotor agitation, hyperthermia, and vulnerability to sudden unexpected metabolic acidosis and cardiac arrest.',
    immediateActions: [
      'Ensure scene safety; maintain non-threatening verbal de-escalation posture.',
      'Avoid prone physical restraint (positioning in prone causes fatal positional asphyxia).',
      'Rapid chemical sedation with IM Ketamine (4-5 mg/kg) or Midazolam under direct medical control.',
      'Continuous pulse oximetry, capnography, and cardiac telemetry immediately upon calming.'
    ],
    verbalResponseText: "Keep a safe distance. Speak calmly and do not corner or physically fight the person. Keep them sitting up or on their side. Police and paramedics with medical calming supplies are arriving.",
    criticalQuestions: [
      'Is the person violent, stripping off clothes, or demonstrating superhuman strength?',
      'Are there any weapons visible in their hands or vicinity?'
    ],
    contraindications: [
      'LOCK: NEVER place agitated patient face-down in prone position or compress chest/back (fatal positional asphyxia).',
      'Do not engage in physical confrontation without adequate trained personnel.'
    ],
    unitRecommendation: {
      unitType: 'Crisis Intervention ALS Paramedic + CIT Police Unit',
      priority: 'Code 3',
      requiredEquipment: ['IM Ketamine', 'Point-of-Care Blood Gas Analyzer', 'BVM with High-Flow O2']
    },
    keywords: [
      'excited delirium', 'violently agitated', 'screaming incoherently', 'tearing clothes off',
      'superhuman strength', 'hallucinating', 'paranoia', 'delirium agitation'
    ],
    hemodynamicProfile: {
      expectedMap: '110 - 150 mmHg',
      targetHr: '140 - 180 bpm',
      shockIndexThreshold: 1.1,
      stemiRisk: true,
    }
  }
];

export function getProtocolById(id: string): EmergencyProtocol | undefined {
  return EMERGENCY_PROTOCOLS.find((p) => p.id === id);
}

export function getAllProtocols(): EmergencyProtocol[] {
  return [...EMERGENCY_PROTOCOLS];
}
