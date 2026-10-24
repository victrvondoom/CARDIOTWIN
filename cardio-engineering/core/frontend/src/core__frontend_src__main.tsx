import React, { lazy, useLayoutEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

// Production API rewrite: when deployed to a static host (e.g. S3 website),
// fetches to "/api/*" can't be proxied. Rewrite them to the deployed
// backend URL. In dev, VITE_API_BASE is empty and the Vite proxy handles it.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "");
if (API_BASE && !import.meta.hot?.data.apiRewriteInstalled) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return originalFetch(API_BASE + input, init);
    }
    if (input instanceof URL && input.pathname.startsWith("/api/")) {
      return originalFetch(API_BASE + input.pathname + input.search, init);
    }
    return originalFetch(input, init);
  };
  if (import.meta.hot) import.meta.hot.data.apiRewriteInstalled = true;
}

import { RouteBoundary } from "./components/RouteBoundary";
import { AuthProvider } from "./components/core__src_components__AuthContext";
import { RequireAuth } from "./components/RequireAuth";
const AquaCommunity = lazy(() => import("./routes/AquaCommunity"));
const AquaDashboard = lazy(() => import("./routes/AquaDashboard"));
const AquaEvaluation = lazy(() => import("./routes/AquaEvaluation"));
const Interop = lazy(() => import("./routes/Interop"));
const Journey = lazy(() => import("./routes/core__src_routes__Journey"));
const WorkflowArea = lazy(() => import("./routes/WorkflowArea"));
const Runtime = lazy(() => import("./routes/Runtime"));
const OneHealth = lazy(() => import("./routes/OneHealth"));
const AquaMap = lazy(() => import("./routes/AquaMap"));
const OahBridge = lazy(() => import("./routes/OahBridge"));
const NotificationPreferences = lazy(() => import("./routes/NotificationPreferences"));
const AquaObservationDetail = lazy(() => import("./routes/AquaObservationDetail"));
const AquaObservationNew = lazy(() => import("./routes/AquaObservationNew"));
const AquaObservations = lazy(() => import("./routes/AquaObservations"));
const AquaOneHealth = lazy(() => import("./routes/AquaOneHealth"));
const AquaReview = lazy(() => import("./routes/AquaReview"));
const AquaTrends = lazy(() => import("./routes/AquaTrends"));
const Agents = lazy(() => import("./routes/core__src_routes__Agents"));
import App from "./core__frontend_src__App";
const BulkImport = lazy(() => import("./routes/core__src_routes__BulkImport"));
const CardioTwin = lazy(() => import("./routes/CardioTwin"));
const CardioProbeLab = lazy(() => import("./routes/CardioProbeLab"));
const CardioCalculatorStudio = lazy(() => import("./routes/CardioCalculatorStudio"));
const CardioCaseStudio = lazy(() => import("./routes/CardioCaseStudio"));
const Cross5Studio = lazy(() => import("./routes/Cross5Studio"));
const PulseOrchestrator = lazy(() => import("./routes/PulseOrchestrator"));
const MedClear = lazy(() => import("./routes/MedClearRoute"));
const PlatformLaunchpad = lazy(() => import("./routes/PlatformLaunchpadRoute"));
const CaseDetail = lazy(() => import("./routes/CaseDetail"));
const Cases = lazy(() => import("./routes/core__src_routes__Cases"));
const Cohorts = lazy(() => import("./routes/core__src_routes__Cohorts"));
const Compare = lazy(() => import("./routes/core__src_routes__Compare"));
const Compliance = lazy(() => import("./routes/Compliance"));
const Dashboard = lazy(() => import("./routes/Dashboard"));
const Eval = lazy(() => import("./routes/core__src_routes__Eval"));
const Intake = lazy(() => import("./routes/core__src_routes__Intake"));
const Landing = lazy(() => import("./routes/core__src_routes__Landing"));
const Login = lazy(() => import("./routes/core__src_routes__Login"));
const OncologyStack = lazy(() => import("./routes/core__src_routes__OncologyStack"));
const Policies = lazy(() => import("./routes/core__src_routes__Policies"));
const PolicyDiff = lazy(() => import("./routes/core__src_routes__PolicyDiff"));
const Architecture = lazy(() => import("./routes/Architecture"));
const Industrialize = lazy(() => import("./routes/Industrialize"));
const Reviewer = lazy(() => import("./routes/core__src_routes__Reviewer"));
const ROI = lazy(() => import("./routes/ROI"));
const Sandbox = lazy(() => import("./routes/core__src_routes__Sandbox"));
const Settings = lazy(() => import("./routes/core__src_routes__Settings"));
const Signup = lazy(() => import("./routes/core__src_routes__Signup"));
const TwinCommand = lazy(() => import("./routes/TwinCommand"));
const TwinDashboard = lazy(() => import("./routes/TwinDashboard"));
const TwinHub = lazy(() => import("./routes/TwinHub"));
const TwinLab = lazy(() => import("./routes/TwinLab"));
const TwinOps = lazy(() => import("./routes/TwinOps"));
const TwinPatient = lazy(() => import("./routes/TwinPatient"));
const HubOverviewPage = lazy(() => import("./routes/HubOverviewPage"));
const HubModulePage = lazy(() => import("./routes/HubModulePage"));
const HubAnatomyGallery = lazy(() => import("./routes/HubAnatomyGallery"));
const HubModelBenchmarks = lazy(() => import("./routes/HubModelBenchmarks"));
const HubLiveApps = lazy(() => import("./routes/HubLiveApps"));
import "./styles/index.css";
import "./styles/spatial.css";
import "./styles/glass.css";
import "./styles/pixel-interior.css";
import "./styles/pixel-interior-palette.css";
import { installLiveRequestTracking } from "./lib/liveUpdates";

installLiveRequestTracking();

// Marks the document so the interior pixel theme (styles/pixel-interior.css) applies to
// every route except the landing page at "/". The landing page keeps its own styling.
function SurfaceMarker() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = pathname === "/" ? "landing" : "interior";
  }, [pathname]);
  return null;
}

// Reuse the root when a dependency invalidates this entry during development.
// Creating another root leaves duplicate subscriptions and mounted canvases.
const root: ReactDOM.Root = import.meta.hot?.data.reactRoot ?? ReactDOM.createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.reactRoot = root;
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SurfaceMarker />
      <AuthProvider>
        <RouteBoundary>
        <Routes>
          {/* Public marketing landing — the app's front door */}
          <Route path="/" element={<Landing />} />
          <Route path="/platform" element={<PlatformLaunchpad />} />
          <Route path="/medclear" element={<MedClear />} />
          {/* SMART launch callback is public-client OAuth; it has its own EHR authorization. */}

          {/* Public auth pages */}
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected app shell */}
          <Route
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          >
            {/* Unified CLINI-CASE evidence journey + runtime topology. Every route below is preserved. */}
            <Route path="/journey" element={<Journey />} />
            <Route path="/journey/:jobId" element={<Journey />} />
            <Route path="/journey/:jobId/:stageId" element={<Journey />} />
            {["/intake-tools", "/evidence", "/review", "/clinical-context", "/follow-up", "/research"].map(path => <Route key={path} path={path} element={<WorkflowArea />} />)}
            <Route path="/runtime" element={<Runtime />} />
            <Route path="/notifications" element={<NotificationPreferences />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/bulk-import" element={<BulkImport />} />
            <Route path="/cases/:caseId" element={<CaseDetail />} />
            <Route path="/cases/:caseId/compare" element={<Compare />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/sandbox" element={<Sandbox />} />

            {/* OncoTwin — dynamic digital-twin layer (additive) */}
            <Route path="/twin" element={<TwinCommand />} />
            <Route path="/twin/overview" element={<TwinHub />} />
            <Route path="/twin/lab" element={<TwinLab />} />
            <Route path="/twin/ops" element={<TwinOps />} />
            <Route path="/twin/demo" element={<TwinPatient demo />} />
            <Route path="/twin/demo/classic" element={<TwinDashboard demo />} />
            {/* /twin/demo/:tab (e.g. /twin/demo/whatif) — same guided demo, deep-linkable to a tab.
                Without this, those URLs fell through to /twin/:patientId/:tab? with patientId
                literally "demo", which the backend correctly 404s (no such twin patient). */}
            <Route path="/twin/demo/:tab" element={<TwinPatient demo />} />
            <Route path="/twin/:patientId/classic" element={<TwinDashboard />} />
            <Route path="/twin/:patientId/:tab?" element={<TwinPatient />} />

            {/* Intelligence Hub — every inherited cardiovascular project, its assets and live app */}
            <Route path="/hub" element={<HubOverviewPage />} />
            <Route path="/hub/anatomy" element={<HubAnatomyGallery />} />
            <Route path="/hub/benchmarks" element={<HubModelBenchmarks />} />
            <Route path="/hub/apps" element={<HubLiveApps />} />
            <Route path="/hub/:slug" element={<HubModulePage />} />

            {/* CardioTwin probe lab: 3D torso, probe and synchronised synthetic echo */}
            <Route path="/cardiotwin" element={<CardioProbeLab />} />
            {/* CardioTwin — cardiovascular risk visualisation & vessel-level prediction (moved from /cardiotwin) */}
            <Route path="/cardiotwin/risk" element={<CardioTwin />} />
            {/* Cardiovascular calculator studio: categories, validated formulas, worked examples */}
            <Route path="/cardiotwin/calculators" element={<CardioCalculatorStudio />} />
            {/* Evidence-Linked CardioTwin: one synthetic case across measurements, calculators, what-if, CROSS-5 and MedClear */}
            <Route path="/cardiotwin/case" element={<CardioCaseStudio />} />
            {/* CROSS-5 — five-frame multiscale intersection engine (additive) */}
            <Route path="/cross5" element={<Cross5Studio />} />
            {/* Pulse 911 CAD & Ischemia Studio — 3D Centralized Multi-Signal Orchestrator (additive) */}
            <Route path="/pulse" element={<PulseOrchestrator />} />
            {/* MedClear AI — Clinical Plain-Language Simplifier & Patient Advocacy (additive) */}
            <Route path="/medclear" element={<MedClear />} />
            {/* Centralized Master Launchpad & Command Center */}

            <Route path="/policies" element={<Policies />} />
            <Route path="/onco" element={<OncologyStack />} />
            <Route path="/policies/:policyId/diff" element={<PolicyDiff />} />
            <Route path="/agents" element={<Agents />} />

            <Route path="/cohorts" element={<Cohorts />} />
            <Route
              path="/reviewer"
              element={
                <RequireAuth roles={["reviewer", "admin"]}>
                  <Reviewer />
                </RequireAuth>
              }
            />
            <Route path="/compliance"     element={<Compliance />} />
            <Route path="/roi"            element={<ROI />} />
            <Route path="/industrialize"  element={<Industrialize />} />
            <Route path="/architecture"   element={<Architecture />} />
            <Route path="/eval"           element={<Eval />} />
            <Route
              path="/settings"
              element={
                <RequireAuth roles={["admin"]}>
                  <Settings />
                </RequireAuth>
              }
            />

            {/* AquaHealth — OneAquaHealth freshwater module (additive).
                Existing ClinCase routes above are unchanged. */}
            <Route path="/aquahealth" element={<AquaDashboard />} />
            <Route path="/onehealth" element={<OneHealth />} />
            <Route path="/oah-bridge" element={<OahBridge />} />
            <Route path="/interop" element={<Interop />} />
            <Route path="/aquahealth/observations" element={<AquaObservations />} />
            <Route path="/aquahealth/observations/new" element={<AquaObservationNew />} />
            <Route path="/aquahealth/observations/:observationId" element={<AquaObservationDetail />} />
            <Route path="/aquahealth/map" element={<AquaMap />} />
            <Route path="/aquahealth/trends" element={<AquaTrends />} />
            <Route path="/aquahealth/one-health" element={<AquaOneHealth />} />
            <Route path="/aquahealth/community" element={<AquaCommunity />} />
            <Route path="/aquahealth/evaluation" element={<AquaEvaluation />} />
            <Route
              path="/aquahealth/review"
              element={
                <RequireAuth roles={["reviewer", "admin"]}>
                  <AquaReview />
                </RequireAuth>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        </RouteBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
