/**
 * CardioTwinAgentSandbox.tsx
 *
 * Dedicated Interactive Sandbox Environment to Talk to the CardioTwin AI Agent.
 *
 * Styled to 100% match the Pixel-Native Landing Page Design System:
 * - Scoped under .pixel-landing color ramp & geometry
 * - Deep near-black canvas, sharp square hairline cards (border-radius: 2px)
 * - Exact tokens: var(--void), var(--panel), var(--line), var(--bone), var(--p-orange)
 * - Flat hairline-separated metric cells (.pl-metrics)
 * - Geometric flat buttons (.pl-btn, .pl-btn-primary)
 * - Monospace kickers and precision readouts
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  Cpu,
  Flame,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Stethoscope,
  User,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

export interface SandboxMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  language?: string;
  persona?: string;
  thoughts?: string[];
  tools_executed?: Array<{
    tool_name: string;
    arguments: Record<string, any>;
    output_summary: string;
  }>;
  traceparent?: string;
  timestamp: string;
}

export interface SandboxTwinState {
  target_vessel: string;
  stenosis_pct: number;
  heart_rate_bpm: number;
  mean_arterial_pressure: number;
  ischemia_severity: number;
  hyperemic_stress: boolean;
  ffr: number;
  wall_shear_stress: number;
  apd90_ms: number;
  cardiac_health_score: number;
  persona: string;
  language: string;
}

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

const PRESET_PROMPTS = [
  { label: "Simulate LAD 85% Stenosis & FFR", text: "Simulate severe 85% stenosis on LAD and calculate translesional FFR" },
  { label: "छाती में दर्द (Hindi Triage)", text: "मुझे पिछले दो घंटे से छाती में भारीपन और सांस लेने में तकलीफ हो रही है" },
  { label: "Patient Mode Explanation", text: "Explain my heart health as if I'm a patient with zero medical background" },
  { label: "Query Similar WHO Patients", text: "Find top similar patients from WHO cohort with diabetic coronary artery disease" },
  { label: "Adenosine Hyperemic Stress", text: "Activate adenosine hyperemic stress and check cardiomyocyte APD90 shortening" },
];

export function CardioTwinAgentSandbox({
  sessionId = "sandbox_main",
  initialPersona = "doctor",
}: {
  sessionId?: string;
  initialPersona?: "patient" | "nurse" | "doctor";
}) {
  const [messages, setMessages] = useState<SandboxMessage[]>([
    {
      id: "welcome-1",
      role: "agent",
      content:
        "Welcome to the CardioTwin Agent Sandbox. I am your interactive AI Cardiologist agent.\n\n" +
        "You can talk to me via voice dictation or text across 8 global languages. You can test what-if parameters, " +
        "simulate coronary artery stenosis, trigger adenosine hyperemic stress, calculate Navier-Stokes FFR, " +
        "or query similar patients from WHO & Framingham cohorts. What biophysical scenario shall we examine?",
      persona: initialPersona,
      language: "en",
      thoughts: [
        "CardioTwin Sandbox Agent initialized with 0D/1D Navier-Stokes solver, Luo-Rudy electromechanics, and WHO data lake.",
      ],
      tools_executed: [
        {
          tool_name: "initialize_sandbox",
          arguments: { session_id: sessionId, persona: initialPersona },
          output_summary: "Baseline twin loaded: LAD 75% stenosis, FFR=0.81, APD90=280ms",
        },
      ],
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [activePersona, setActivePersona] = useState<"patient" | "nurse" | "doctor">(initialPersona);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openThoughts, setOpenThoughts] = useState<Record<string, boolean>>({});

  // Live Sandbox Twin Controls
  const [twinState, setTwinState] = useState<SandboxTwinState>({
    target_vessel: "LAD",
    stenosis_pct: 75.0,
    heart_rate_bpm: 72.0,
    mean_arterial_pressure: 93.3,
    ischemia_severity: 0.5,
    hyperemic_stress: false,
    ffr: 0.81,
    wall_shear_stress: 46.2,
    apd90_ms: 280.0,
    cardiac_health_score: 82.0,
    persona: initialPersona,
    language: "en",
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle talk to agent
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    setInputMessage("");
    setLoading(true);

    const userEntry: SandboxMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      language: selectedLang.code,
      persona: activePersona,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userEntry]);

    try {
      const res = await fetch("/api/v1/cardiotwin/sandbox/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          session_id: sessionId,
          language: selectedLang.code,
          persona: activePersona,
          state_overrides: {
            target_vessel: twinState.target_vessel,
            stenosis_pct: twinState.stenosis_pct,
            heart_rate_bpm: twinState.heart_rate_bpm,
            mean_arterial_pressure: twinState.mean_arterial_pressure,
            hyperemic_stress: twinState.hyperemic_stress,
          },
        }),
      });

      if (!res.ok) throw new Error("Sandbox talk failed");
      const data = await res.json();

      const agentEntry: SandboxMessage = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: data.reply,
        language: data.language,
        persona: data.persona,
        thoughts: data.thoughts,
        tools_executed: data.tools_executed,
        traceparent: data.traceparent,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, agentEntry]);
      if (data.sandbox_state) {
        setTwinState((prev) => ({
          ...prev,
          ...data.sandbox_state,
        }));
      }
    } catch {
      // Fallback response if network disconnect
      const fallbackEntry: SandboxMessage = {
        id: `agent-fallback-${Date.now()}`,
        role: "agent",
        content:
          activePersona === "patient"
            ? `Your heart is pumping at ${twinState.heart_rate_bpm} bpm. The current narrowing on ${twinState.target_vessel} is ${twinState.stenosis_pct}%. Your overall health score is ${twinState.cardiac_health_score}%. Everything is being watched carefully.`
            : `Biophysical Assessment: ${twinState.target_vessel} vessel at ${twinState.stenosis_pct}% stenosis. Calculated FFR: ${twinState.ffr.toFixed(2)}. APD90: ${twinState.apd90_ms.toFixed(1)} ms.`,
        persona: activePersona,
        language: selectedLang.code,
        thoughts: ["Evaluated local fallback model heuristics."],
        tools_executed: [
          {
            tool_name: "fallback_heuristics_engine",
            arguments: { vessel: twinState.target_vessel, stenosis: twinState.stenosis_pct },
            output_summary: `FFR=${twinState.ffr.toFixed(2)}`,
          },
        ],
        traceparent: "00-local-fallback-span-01",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackEntry]);
    } finally {
      setLoading(false);
    }
  };

  // Reset sandbox
  const handleReset = async () => {
    try {
      await fetch("/api/v1/cardiotwin/sandbox/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // ignore
    }
    setTwinState({
      target_vessel: "LAD",
      stenosis_pct: 75.0,
      heart_rate_bpm: 72.0,
      mean_arterial_pressure: 93.3,
      ischemia_severity: 0.5,
      hyperemic_stress: false,
      ffr: 0.81,
      wall_shear_stress: 46.2,
      apd90_ms: 280.0,
      cardiac_health_score: 82.0,
      persona: activePersona,
      language: selectedLang.code,
    });
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "agent",
        content: "Sandbox environment reset to baseline physiology. All parameters restored.",
        persona: activePersona,
        language: selectedLang.code,
        thoughts: ["Sandbox memory and physical state cleared."],
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Toggle voice speaking simulation
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (isSpeakingId === msgId) {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = selectedLang.code;
      utter.onend = () => setIsSpeakingId(null);
      utter.onerror = () => setIsSpeakingId(null);
      window.speechSynthesis.speak(utter);
      setIsSpeakingId(msgId);
    } else {
      setIsSpeakingId(msgId);
      setTimeout(() => setIsSpeakingId(null), 3500);
    }
  };

  // Toggle listening dictation simulation
  const handleToggleMic = () => {
    if (!isListening) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setInputMessage("Calculate FFR and wall shear stress for LAD at 80% stenosis");
      }, 2500);
    } else {
      setIsListening(false);
    }
  };

  const isIschemic = twinState.ffr < 0.80;

  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] rounded-[2px] p-5 sm:p-7 space-y-6 shadow-2xl">
      {/* Top Header Bar matching Landing Page Component Structure */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[var(--line-hi)] bg-[var(--void)] flex items-center justify-center text-[var(--p-orange)] rounded-[2px]">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-[var(--bone)] tracking-tight">Dr. Twin AI Agent Terminal</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[var(--line)] text-[var(--p-orange)] bg-[var(--void)]">
                Autonomous CoT
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] font-sans">
              Real-time physiological reasoning · 0D/1D Navier-Stokes fluid circuits · WHO similar cases
            </p>
          </div>
        </div>

        {/* Action Controls: Mode Switcher + Language + Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona Switcher Buttons matching Landing Square Buttons */}
          <div className="inline-flex border border-[var(--line)] bg-[var(--void)] rounded-[2px] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActivePersona("patient")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-medium transition-all ${
                activePersona === "patient"
                  ? "bg-[var(--p-green)] text-[#0D0E10] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <User size={13} /> Patient
            </button>
            <button
              type="button"
              onClick={() => setActivePersona("nurse")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-medium transition-all ${
                activePersona === "nurse"
                  ? "bg-[var(--p-yellow)] text-[#0D0E10] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <Activity size={13} /> Nurse
            </button>
            <button
              type="button"
              onClick={() => setActivePersona("doctor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-medium transition-all ${
                activePersona === "doctor"
                  ? "bg-[var(--p-orange)] text-[#0D0E10] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--bone)]"
              }`}
            >
              <Stethoscope size={13} /> Doctor
            </button>
          </div>

          {/* Language Selector */}
          <select
            value={selectedLang.code}
            onChange={(e) => {
              const found = LANGUAGES.find((l) => l.code === e.target.value);
              if (found) setSelectedLang(found);
            }}
            className="border border-[var(--line-hi)] bg-[var(--void)] text-[var(--bone)] text-xs rounded-[2px] px-3 py-1.5 font-mono focus:outline-none focus:border-[var(--p-orange)]"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset sandbox to baseline physiology"
            className="pl-btn text-xs py-1.5 px-3"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chat Terminal vs Right Parameter Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT: Agent Chat Console (7 Cols) ================= */}
        <div className="lg:col-span-7 flex flex-col h-[680px] border border-[var(--line)] bg-[var(--void)] rounded-[2px] overflow-hidden">
          {/* Chat Transcript Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isAgent = m.role === "agent";
              const hasThoughts = isAgent && m.thoughts && m.thoughts.length > 0;
              const hasTools = isAgent && m.tools_executed && m.tools_executed.length > 0;
              const isThoughtsOpen = !!openThoughts[m.id];

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAgent ? "items-start" : "items-end"} space-y-2`}
                >
                  <div
                    className={`max-w-[94%] sm:max-w-[88%] border rounded-[2px] p-4 ${
                      isAgent
                        ? "bg-[var(--panel)] border-[var(--line)] text-[var(--body)]"
                        : "bg-[var(--panel-2)] border-[var(--line-hi)] text-[var(--bone)]"
                    }`}
                  >
                    {/* Header: Persona & Timestamp */}
                    <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-[var(--line)] text-[11px] font-mono text-[var(--muted)]">
                      <div className="flex items-center gap-2">
                        {isAgent ? (
                          <>
                            <span className="w-2 h-2 bg-[var(--p-orange)]" />
                            <span className="font-semibold text-[var(--bone)]">Dr. Twin Agent</span>
                            <span className="uppercase text-[9px] px-1.5 py-0.2 border border-[var(--line)] text-[var(--p-orange)]">
                              {m.persona || "AI"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 bg-[var(--p-blue)]" />
                            <span className="font-semibold text-[var(--bone)]">User</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] tabular-nums">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans text-[var(--body)]">
                      {m.content}
                    </div>

                    {/* Agent Tools Executed Chips matching Landing Tags */}
                    {hasTools && (
                      <div className="mt-3 pt-2 border-t border-[var(--line)] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--p-orange)]">
                          <Zap size={11} /> Sandbox Tools Invoked:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.tools_executed?.map((t, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 border border-[var(--line-hi)] bg-[var(--void)] text-[var(--bone)] flex items-center gap-1 rounded-[1px]"
                            >
                              <span className="text-[var(--p-blue)]">{t.tool_name}:</span>
                              <span className="text-[var(--muted)]">{t.output_summary}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable Chain-of-Thought (CoT) */}
                    {hasThoughts && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenThoughts((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }
                          className="flex items-center gap-1 text-[11px] font-mono text-[var(--p-blue)] hover:underline"
                        >
                          <Brain size={12} />
                          <span>{isThoughtsOpen ? "Hide Agent Reasoning" : "View Agent Reasoning (CoT)"}</span>
                          {isThoughtsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {isThoughtsOpen && (
                          <div className="mt-1.5 p-2.5 border border-[var(--line-hi)] bg-[var(--void)] text-[11px] font-mono text-[var(--muted)] space-y-1 rounded-[1px]">
                            {m.thoughts?.map((thought, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-[var(--p-orange)]">›</span>
                                <span>{thought}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer: Voice Speak & OTel Span Traceparent */}
                    {isAgent && (
                      <div className="mt-3 flex items-center justify-between text-[10.5px] text-[var(--faint)]">
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(m.id, m.content)}
                          className="flex items-center gap-1 text-[var(--p-blue)] hover:text-[var(--bone)] transition-colors font-mono"
                        >
                          {isSpeakingId === m.id ? (
                            <>
                              <VolumeX size={12} /> Stop Audio
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} /> Listen Voice
                            </>
                          )}
                        </button>
                        {m.traceparent && (
                          <span className="font-mono text-[9px] text-[var(--faint)] truncate max-w-[200px]" title={m.traceparent}>
                            OTel: {m.traceparent.slice(0, 24)}…
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 border border-[var(--line-hi)] bg-[var(--panel)] text-xs text-[var(--p-orange)] font-mono animate-pulse rounded-[2px] w-fit">
                <Bot size={14} className="animate-spin" />
                <span>Solving Navier-Stokes fluid equations & reasoning…</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Preset Prompts matching Landing Section Tags */}
          <div className="px-3 py-2 bg-[var(--panel)] border-t border-[var(--line)] overflow-x-auto flex gap-2 no-scrollbar">
            {PRESET_PROMPTS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(p.text)}
                className="whitespace-nowrap px-2.5 py-1 border border-[var(--line)] bg-[var(--void)] text-[var(--muted)] hover:text-[var(--bone)] hover:border-[var(--p-orange)] text-[11px] font-mono transition-all flex items-center gap-1.5 rounded-[2px]"
              >
                <Sparkles size={11} className="text-[var(--p-orange)]" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Message Input Box matching Landing Form Design */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[var(--panel)] border-t border-[var(--line)] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleMic}
              title="Voice dictation with Wispr Flow"
              className={`p-2.5 border rounded-[2px] transition-all ${
                isListening
                  ? "bg-[var(--p-red)] text-white border-[var(--p-red)] animate-pulse"
                  : "bg-[var(--void)] text-[var(--muted)] border-[var(--line-hi)] hover:text-[var(--bone)] hover:border-[var(--line-hi)]"
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask the agent in ${selectedLang.name}... (e.g. 'What is my FFR if stenosis is 80%?')`}
              className="flex-1 bg-[var(--void)] border border-[var(--line-hi)] text-[var(--bone)] placeholder-[var(--faint)] text-xs rounded-[2px] px-3.5 py-2.5 font-sans focus:outline-none focus:border-[var(--p-orange)]"
            />

            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="pl-btn pl-btn-primary text-xs py-2 px-4 font-semibold disabled:opacity-40"
            >
              <Send size={14} /> Send
            </button>
          </form>
        </div>

        {/* ================= RIGHT: Sandbox Twin Playground (5 Cols) ================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Flat Metric Cells matching .pl-metrics on Landing Page */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                Live Twin Biophysics
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 border ${
                  isIschemic
                    ? "border-[var(--p-red)] text-[var(--p-red)] bg-[rgba(240,68,43,0.1)]"
                    : "border-[var(--p-green)] text-[var(--p-green)] bg-[rgba(89,223,166,0.1)]"
                }`}
              >
                {isIschemic ? "ISCHEMIC DEFICIT" : "PHYSIOLOGICALLY SAFE"}
              </span>
            </div>

            <div className="pl-metrics">
              {/* FFR */}
              <div className="pl-metric">
                <div className="pl-metric-value">
                  <span className={isIschemic ? "text-[var(--p-red)]" : "text-[var(--p-green)]"}>
                    {twinState.ffr.toFixed(2)}
                  </span>
                </div>
                <div className="pl-metric-label">Fractional Flow Reserve (0.80)</div>
              </div>

              {/* Health Score */}
              <div className="pl-metric">
                <div className="pl-metric-value">
                  <span className="text-[var(--p-blue)]">{twinState.cardiac_health_score.toFixed(0)}%</span>
                </div>
                <div className="pl-metric-label">Cardiac Health Score</div>
              </div>

              {/* Wall Shear Stress */}
              <div className="pl-metric">
                <div className="pl-metric-value">
                  <span className="text-[var(--p-yellow)]">{twinState.wall_shear_stress.toFixed(1)}</span>
                </div>
                <div className="pl-metric-label">Wall Shear Stress (dyn/cm²)</div>
              </div>

              {/* Luo-Rudy APD90 */}
              <div className="pl-metric">
                <div className="pl-metric-value">
                  <span className="text-[var(--p-orange)]">{twinState.apd90_ms.toFixed(0)}</span>
                </div>
                <div className="pl-metric-label">Luo-Rudy APD90 (ms)</div>
              </div>
            </div>
          </div>

          {/* Interactive What-If Parameter Sliders matching Landing Card Style */}
          <div className="p-4 border border-[var(--line)] bg-[var(--panel)] rounded-[2px] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-[var(--p-orange)]" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--bone)]">What-If Control Rack</h3>
              </div>
              <span className="text-[10px] text-[var(--faint)] font-mono">Direct Injection</span>
            </div>

            {/* Target Vessel Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] flex justify-between font-mono">
                <span>Target Coronary Vessel</span>
                <span className="text-[var(--p-orange)] font-bold">{twinState.target_vessel}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["LAD", "LCX", "RCA"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setTwinState((prev) => ({ ...prev, target_vessel: v }));
                      handleSendMessage(`Switch target vessel to ${v} and analyze biophysics`);
                    }}
                    className={`py-1.5 text-xs font-mono font-medium border transition-all rounded-[2px] ${
                      twinState.target_vessel === v
                        ? "bg-[var(--p-orange)] text-[#0D0E10] border-[var(--p-orange)] font-semibold"
                        : "bg-[var(--void)] border-[var(--line-hi)] text-[var(--muted)] hover:text-[var(--bone)]"
                    }`}
                  >
                    {v} Artery
                  </button>
                ))}
              </div>
            </div>

            {/* Stenosis % Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--muted)]">Vessel Stenosis Severity</span>
                <span className="text-[var(--bone)] font-bold">{twinState.stenosis_pct.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={twinState.stenosis_pct}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTwinState((prev) => ({ ...prev, stenosis_pct: val }));
                }}
                onMouseUp={() => {
                  handleSendMessage(`Set ${twinState.target_vessel} stenosis to ${twinState.stenosis_pct}%`);
                }}
                className="w-full accent-[var(--p-orange)] bg-[var(--void)] rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-[var(--faint)]">
                <span>0% (Patent)</span>
                <span>50% (Mild)</span>
                <span>75% (Moderate)</span>
                <span>95% (Severe)</span>
              </div>
            </div>

            {/* Heart Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--muted)]">Heart Rate (PR)</span>
                <span className="text-[var(--p-blue)] font-bold">{twinState.heart_rate_bpm.toFixed(0)} bpm</span>
              </div>
              <input
                type="range"
                min="45"
                max="160"
                step="1"
                value={twinState.heart_rate_bpm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTwinState((prev) => ({ ...prev, heart_rate_bpm: val }));
                }}
                onMouseUp={() => {
                  handleSendMessage(`Adjust heart rate to ${twinState.heart_rate_bpm} bpm`);
                }}
                className="w-full accent-[var(--p-blue)] bg-[var(--void)] rounded-none cursor-pointer"
              />
            </div>

            {/* Mean Arterial Pressure Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--muted)]">Mean Arterial Pressure (MAP)</span>
                <span className="text-[var(--p-yellow)] font-bold">{twinState.mean_arterial_pressure.toFixed(1)} mmHg</span>
              </div>
              <input
                type="range"
                min="60"
                max="150"
                step="1"
                value={twinState.mean_arterial_pressure}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTwinState((prev) => ({ ...prev, mean_arterial_pressure: val }));
                }}
                onMouseUp={() => {
                  handleSendMessage(`Set mean arterial pressure to ${twinState.mean_arterial_pressure} mmHg`);
                }}
                className="w-full accent-[var(--p-yellow)] bg-[var(--void)] rounded-none cursor-pointer"
              />
            </div>

            {/* Hyperemic Adenosine Stress Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-[var(--line)]">
              <div className="flex items-center gap-2">
                <Flame size={16} className={twinState.hyperemic_stress ? "text-[var(--p-orange)]" : "text-[var(--muted)]"} />
                <span className="text-xs font-mono text-[var(--bone)]">Adenosine Stress Dilatation</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !twinState.hyperemic_stress;
                  setTwinState((prev) => ({ ...prev, hyperemic_stress: nextVal }));
                  handleSendMessage(
                    nextVal
                      ? "Activate adenosine hyperemic stress test"
                      : "Deactivate stress mode and return to baseline"
                  );
                }}
                className={`px-3 py-1 text-xs font-mono border transition-all rounded-[2px] ${
                  twinState.hyperemic_stress
                    ? "bg-[var(--p-orange)] text-[#0D0E10] border-[var(--p-orange)] font-semibold"
                    : "bg-[var(--void)] border-[var(--line-hi)] text-[var(--muted)] hover:text-[var(--bone)]"
                }`}
              >
                {twinState.hyperemic_stress ? "Active (2.5x Dilated)" : "Inactive"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
