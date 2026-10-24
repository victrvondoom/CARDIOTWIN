"""Build the two submission PDFs: the architecture diagram and the presentation.

Run from the repository root:

    python docs/submission/build_submission_pdfs.py

Every figure and claim is taken from the repository's own records: the README,
NOTICE.md, the model evaluation artifact and docs/implementation/progress.md.
Requires reportlab.
"""

import math
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

OUT_DIR = Path(__file__).resolve().parent
PAGE = landscape((960, 540))
W, H = PAGE

INK = colors.HexColor("#1d2330")
MUTED = colors.HexColor("#5b6472")
ACCENT = colors.HexColor("#c2410c")
PANEL = colors.HexColor("#f4f1ec")
RULE = colors.HexColor("#c9c2b8")
FOOTER = "CardioTwin  |  Team AutoMinds  |  Chennai Institute of Technology"


def wrap(text, font, size, width):
    return simpleSplit(text, font, size, width)


def paragraph(c, text, x, y, width, size=13, font="Helvetica", color=INK):
    leading = size * 1.4
    c.setFont(font, size)
    c.setFillColor(color)
    for line in wrap(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def bullets(c, items, x, y, width, size=14):
    leading = size * 1.4
    for item in items:
        c.setFillColor(ACCENT)
        c.setFont("Helvetica-Bold", size)
        c.drawString(x, y, "•")
        c.setFillColor(INK)
        c.setFont("Helvetica", size)
        for line in wrap(item, "Helvetica", size, width - 18):
            c.drawString(x + 18, y, line)
            y -= leading
        y -= size * 0.35
    return y


def table(c, x, y_top, col_widths, rows, size=12):
    pad = 7
    leading = size * 1.3
    total = sum(col_widths)
    for index, row in enumerate(rows):
        font = "Helvetica-Bold" if index == 0 else "Helvetica"
        cells = [wrap(str(cell), font, size, col_widths[i] - 2 * pad) for i, cell in enumerate(row)]
        row_height = max(len(lines) for lines in cells) * leading + 2 * pad
        if index == 0:
            c.setFillColor(PANEL)
            c.rect(x, y_top - row_height, total, row_height, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(font, size)
        for i, lines in enumerate(cells):
            text_x = x + sum(col_widths[:i]) + pad
            text_y = y_top - pad - size
            for line in lines:
                c.drawString(text_x, text_y, line)
                text_y -= leading
        c.setStrokeColor(RULE)
        c.setLineWidth(0.8)
        c.line(x, y_top - row_height, x + total, y_top - row_height)
        y_top -= row_height
    return y_top


def box(c, x, y, w, h, title, lines):
    c.setFillColor(PANEL)
    c.setStrokeColor(RULE)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 10, y + h - 18, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    text_y = y + h - 33
    for line in lines:
        c.drawString(x + 10, text_y, line)
        text_y -= 12


def arrow(c, x1, y1, x2, y2, dashed=False):
    c.setStrokeColor(MUTED)
    c.setLineWidth(1.2)
    if dashed:
        c.setDash(3, 3)
    c.line(x1, y1, x2, y2)
    c.setDash()
    angle = math.atan2(y2 - y1, x2 - x1)
    size = 7
    head = c.beginPath()
    head.moveTo(x2, y2)
    head.lineTo(x2 - size * math.cos(angle - 0.4), y2 - size * math.sin(angle - 0.4))
    head.lineTo(x2 - size * math.cos(angle + 0.4), y2 - size * math.sin(angle + 0.4))
    head.close()
    c.setFillColor(MUTED)
    c.drawPath(head, fill=1, stroke=0)


def draw_architecture(c):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, 500, "CardioTwin architecture")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 11)
    c.drawString(40, 480, "One local origin for the user. start.ps1 launches every service behind it.")
    for x, label in ((30, "CLIENT (BROWSER)"), (300, "LOCAL GATEWAY (start.ps1)"), (580, "SERVICES AND DATA")):
        c.setFillColor(ACCENT)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x, 458, label)

    box(c, 30, 370, 230, 84, "Dashboard (React 18, Vite 6)",
        ["Launchpad, 3D heart, calculators,", "synthetic case, MedClear pages", "http://localhost:5173"])
    box(c, 30, 250, 230, 84, "Runs in the browser",
        ["Echo calculators (formulas)", "Synthetic case (deterministic)", "Probe and echo simulation"])
    box(c, 300, 370, 200, 84, "Vite proxy",
        ["/api and /mcp to port 8000", "One origin for the user"])
    box(c, 300, 250, 200, 84, "FastAPI gateway",
        ["Port 8000. Routes, auth,", "CROSS-5 API, passports"])
    box(c, 300, 140, 200, 74, "Interop receiver",
        ["Port 8091. Background service."])
    box(c, 580, 370, 350, 84, "CardioTwin risk model v1.0.0",
        ["cardiotwin-lr-multivessel: L2 logistic regression",
         "Platt calibration, bootstrap intervals",
         "Artifact checked against a SHA-256 hash"])
    box(c, 580, 250, 350, 84, "Evidence passports and CROSS-5",
        ["Hash-sealed records that state their limitations",
         "Five-frame multiscale intersection engine"])
    box(c, 580, 140, 350, 74, "MedClear and Pulse 911",
        ["MedClear: offline plain-language engine",
         "Pulse 911: separate app, simulation only"])
    box(c, 30, 40, 230, 74, "Database",
        ["SQLite file (default)", "PostgreSQL in Docker (-Database postgres)"])
    box(c, 580, 40, 350, 74, "Optional LLM (only with -AI)",
        ["Claude Sonnet 4.6 via the Anthropic API",
         "OpenRouter or AWS Bedrock as alternatives"])

    arrow(c, 260, 412, 300, 412)
    arrow(c, 145, 370, 145, 334, dashed=True)
    arrow(c, 400, 370, 400, 334)
    arrow(c, 500, 292, 580, 292)
    arrow(c, 500, 334, 580, 410)
    arrow(c, 400, 250, 400, 214)
    arrow(c, 500, 262, 580, 180)
    arrow(c, 300, 270, 200, 114)
    arrow(c, 480, 250, 600, 114)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(40, 20, "Only port 5173 is opened by the user. Ports 8000 and 8091 run in the background, "
                         "and the calculators and synthetic case run in the browser.")


def slide_frame(c, title, number):
    c.setFillColor(colors.white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, H - 8, W, 8, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(50, H - 70, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(50, 22, FOOTER)
    c.drawRightString(W - 50, 22, str(number))


def title_slide(c):
    c.setFillColor(INK)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(50, H - 150, 80, 6, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 54)
    c.drawString(50, H - 230, "CardioTwin")
    c.setFont("Helvetica", 22)
    c.drawString(50, H - 268, "Coronary risk with stated uncertainty, and echo education")
    c.setFont("Helvetica", 15)
    c.setFillColor(colors.HexColor("#d8d2c8"))
    c.drawString(50, H - 320, "Team AutoMinds  |  Chennai Institute of Technology")
    c.drawString(50, H - 343, "Developed by V. S. Rupesh Kumar")
    c.setFont("Helvetica", 12)
    c.drawString(50, 60, "Research prototype. Not a medical device. MIT License.")


def slide_problem(c):
    slide_frame(c, "Problem statement", 2)
    y = paragraph(c, "Coronary artery disease is one of the leading causes of death worldwide. Whether a "
                     "patient with chest pain or breathlessness needs invasive angiography depends on "
                     "routine findings that often do not point clearly one way.", 50, H - 120, W - 100, size=15)
    y -= 14
    bullets(c, [
        "Simple risk scores return one number, often without uncertainty or vessel-level detail.",
        "Trainees have few chances to match echocardiogram views to cardiac anatomy.",
        "CardioTwin asks whether an open, transparent tool can help with both gaps.",
    ], 50, y, W - 100, size=15)
    paragraph(c, "It supports clinical reasoning. It does not replace angiography or clinical judgment.",
              50, 110, W - 100, size=13, color=MUTED)


def slide_use_case(c):
    slide_frame(c, "Healthcare use case (from the codebase)", 3)
    bullets(c, [
        "Vessel-level risk from 54 routine inputs: demographics, risk factors, symptoms, ECG, echo and labs.",
        "Transparent output: bootstrap intervals, calibration method and recorded limitations.",
        "Hash-sealed evidence passports for traceability.",
        "Echo trainer: 3D heart, six probe positions and a synthetic echo (simulation).",
        "Six echo calculators that return raw results with sources. No clinical thresholds applied.",
        "MedClear: plain-language clinical notes, offline. Pulse 911: emergency dispatch simulation.",
    ], 50, H - 110, W - 100, size=15)
    paragraph(c, "Intended users: cardiology clinicians and trainees, and researchers. "
                 "Not intended for patient-care decisions.", 50, 90, W - 100, size=13, color=MUTED)


def slide_routes(c):
    slide_frame(c, "What the demo shows", 4)
    table(c, 50, H - 100, [250, 430, 230], [
        ["Route", "What it does", "Status"],
        ["/platform", "Launchpad for every section", "Working"],
        ["/cardiotwin", "3D torso, heart and probe, synchronised synthetic echo", "Working. Simulation."],
        ["/cardiotwin/calculators", "Six echo calculators with worked examples", "Working"],
        ["/cardiotwin/case", "Evidence-linked synthetic case, what-if, CROSS-5 status", "Working. Synthetic data."],
        ["/cardiotwin/risk", "CAD risk prediction, sensitivity and model trust", "Working"],
        ["/medclear", "Plain-language summaries of clinical notes", "Working"],
        ["/pulse", "Pulse 911 emergency copilot studio", "Simulation"],
        ["/cross5", "CROSS-5 multiscale intersection engine", "Experimental"],
    ], size=12)


def slide_architecture(c):
    slide_frame(c, "Architecture", 5)
    draw_architecture(c)


def slide_stack(c):
    slide_frame(c, "Technical stack", 6)
    table(c, 50, H - 100, [220, 660], [
        ["Layer", "Technology"],
        ["Risk model", "Python 3.12, scikit-learn logistic regression, NumPy"],
        ["Backend API", "FastAPI 0.115, Uvicorn 0.32, Pydantic 2.9"],
        ["Dashboard", "React 18.3, TypeScript 5, Vite 6, React Router 7"],
        ["3D", "Three.js 0.169, React Three Fiber 8.17, Drei 9.114"],
        ["Pulse 911 app", "React 19, Vite, Tailwind CSS v4"],
        ["MedClear", "Python 3.12"],
        ["Tests", "pytest (backend), Vitest 4 (dashboard)"],
        ["Data stores", "SQLite (default), PostgreSQL in Docker (optional)"],
        ["Launcher", "PowerShell (start.ps1)"],
        ["Optional AI", "Anthropic SDK 0.39 (Claude); OpenRouter and AWS Bedrock as alternatives"],
    ], size=12)


def slide_model(c):
    slide_frame(c, "AI/ML model: cardiotwin-lr-multivessel v1.0.0", 7)
    bullets(c, [
        "One L2-regularised logistic regression each for CAD, LAD, LCX and RCA. Regularisation chosen by inner 5-fold CV.",
        "The shipped CAD output is max-projected, so P(CAD) is at least the largest vessel probability.",
        "Platt calibration adopted for all four outputs, under a rule requiring the Brier gain to exceed its standard error.",
        "Intervals from 1,000 patient-level bootstrap resamples. No conformal coverage guarantee for the shipped artifact.",
        "Training data: Z-Alizadeh Sani extension (UCI 411), 303 patients, CC BY 4.0, single centre in Iran.",
        "LAD, LCX, RCA and catheterisation are excluded from the CAD inputs to prevent label leakage.",
        "The risk model does not use an LLM. Claude Sonnet 4.6 is optional and runs only with -AI.",
    ], 50, H - 105, W - 100, size=14)


def slide_results(c):
    slide_frame(c, "Outcomes: model results (out-of-fold)", 8)
    table(c, 50, H - 100, [300, 220, 360], [
        ["Output", "ROC-AUC", "95% CI (patient-level bootstrap)"],
        ["CAD, direct model", "0.913", "0.876 to 0.944"],
        ["CAD, shipped (max-projected)", "0.912", "not reported separately"],
        ["LAD", "0.823", "0.776 to 0.868"],
        ["LCX", "0.679", "0.615 to 0.734"],
        ["RCA", "0.738", "0.682 to 0.788"],
    ], size=13)
    paragraph(c, "CAD direct model: PR-AUC 0.961 (0.938 to 0.979); Brier 0.103 (0.081 to 0.125); "
                 "ECE 0.054. Protocol: 3 x 5 repeated stratified cross-validation.",
              50, 230, W - 100, size=12, color=MUTED)
    paragraph(c, "These come from one centre with no external validation. Discrimination for LCX and "
                 "RCA is modest, and performance in other populations is unknown.",
              50, 180, W - 100, size=13, color=INK)


def slide_verification(c):
    slide_frame(c, "Outcomes: engineering verification", 9)
    table(c, 50, H - 100, [380, 500], [
        ["Check", "Result (last recorded run)"],
        ["Dashboard type check", "0 errors"],
        ["Dashboard unit tests", "439 of 460 pass. 21 fail in 7 files; these failures predate this work."],
        ["Probe geometry and echo simulation", "36 tests pass"],
        ["Calculator formulas and registry", "42 tests pass"],
        ["Evidence-linked case model", "15 tests pass"],
        ["Backend CROSS-5 tests", "Pass (subset run with -k cross5)"],
        ["MedClear", "2 of 2 pass"],
        ["Not yet run", "Full backend pytest; 390 px and 768 px layout checks; production build after final navigation edits; launcher re-run"],
    ], size=12)


def slide_limits(c):
    slide_frame(c, "Limitations and safety", 10)
    bullets(c, [
        "Research prototype. Not a medical device. Not CE-marked or FDA-cleared.",
        "Single-centre training data. No external validation yet.",
        "Intervals describe sampling uncertainty, not performance in other hospitals.",
        "Outputs are not diagnoses. Clinical confirmation, such as angiography or CT, is required.",
        "Calculators give raw values only. Pulse 911 is a simulation, not a validated triage system.",
        "The 3D heart and echo simulation are educational, and their two clocks are not frame-locked.",
    ], 50, H - 110, W - 100, size=15)


def slide_license(c):
    slide_frame(c, "Open source and third-party licences", 11)
    bullets(c, [
        "Original work: MIT License, Copyright (c) 2026 V. S. Rupesh Kumar (LICENSE).",
        "Eight module folders keep their own licence files: MIT, BSD 3-Clause and EPL 2.0.",
        "Third-party data and assets: UCI 411 (CC BY 4.0), BodyParts3D-derived mesh (CC BY-SA 2.1 Japan), "
        "HRA heart model (CC BY 4.0).",
        "23 module folders have no licence text, so this licence does not cover them. Their status is open "
        "(NOTICE.md lists them).",
    ], 50, H - 110, W - 100, size=15)


def slide_next(c):
    slide_frame(c, "Demo video and next steps", 12)
    paragraph(c, "Demo video: PENDING. A 15 to 20 minute unlisted YouTube video must be recorded and "
                 "uploaded. Its link goes in README.md under Demo video.",
              50, H - 110, W - 100, size=15, font="Helvetica-Bold")
    bullets(c, [
        "Proposed: validate the model on an independent cohort before any clinical claim.",
        "Proposed: clinician review of the outputs, the uncertainty display and the wording.",
        "Proposed: finish the full backend test run and the layout checks at phone and tablet widths.",
        "Proposed: resolve the licence status of the 23 module folders and the adapted code in core.",
    ], 50, H - 190, W - 100, size=15)


def build_architecture_pdf():
    path = OUT_DIR / "CardioTwin_Architecture.pdf"
    c = canvas.Canvas(str(path), pagesize=PAGE)
    c.setTitle("CardioTwin architecture diagram")
    c.setAuthor("V. S. Rupesh Kumar")
    c.setSubject("Team AutoMinds, Chennai Institute of Technology")
    c.setFillColor(colors.white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_architecture(c)
    c.showPage()
    c.save()
    return path


def build_presentation_pdf():
    path = OUT_DIR / "CardioTwin_Presentation.pdf"
    c = canvas.Canvas(str(path), pagesize=PAGE)
    c.setTitle("CardioTwin presentation")
    c.setAuthor("V. S. Rupesh Kumar")
    c.setSubject("Team AutoMinds, Chennai Institute of Technology")
    for slide in (title_slide, slide_problem, slide_use_case, slide_routes, slide_architecture,
                  slide_stack, slide_model, slide_results, slide_verification, slide_limits,
                  slide_license, slide_next):
        slide(c)
        c.showPage()
    c.save()
    return path


if __name__ == "__main__":
    print(build_architecture_pdf())
    print(build_presentation_pdf())
