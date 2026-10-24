/**
 * PaperPageTurn — 3D Paper Turnover Physics & Interactive Book Navigator
 *
 * Implements physical paper page-turning mechanics for CARDIOTON:
 * 1. 3D perspective folding with dynamic cylinder reflection and cast shadow.
 * 2. Draggable/clickable corner "dog-ear" page peel matching human hand movements.
 * 3. Tactile bottom book navigator with page numbers, titles, and table of contents.
 * 4. Native Web Audio synthesized paper friction & rustle sound.
 * 5. Keyboard arrow key support (← / →).
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Hand,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  isPaperSoundEnabled,
  playPaperTurnSound,
  setPaperSoundEnabled,
} from "../lib/paperAudio";
import "../styles/paperTurn.css";

export interface BookChapter {
  path: string;
  title: string;
  chapter: string;
  category: string;
}

export const BOOK_PAGES: BookChapter[] = [
  { path: "/dashboard", title: "Clinic Overview & Operations", chapter: "01", category: "Clinical Operations" },
  { path: "/cases", title: "Patient Registry & Multi-Engine Cases", chapter: "02", category: "Case Management" },
  { path: "/reviewer", title: "Reviewer Queue & HITL Gate", chapter: "03", category: "Clinical Governance" },
  { path: "/intake", title: "Multi-Engine Document Intake", chapter: "04", category: "Vision & OCR" },
  { path: "/cardiotwin", title: "3D Living Cardiovascular Digital Twin", chapter: "05", category: "Biophysics Core" },
  { path: "/pulse", title: "Pulse 911 CAD & Ischemia Studio", chapter: "06", category: "Emergency Mesh" },
  { path: "/cohorts", title: "Cohort Insights & Telemetry", chapter: "07", category: "Population Analytics" },
  { path: "/agents", title: "Multi-Agent Neural DAG", chapter: "08", category: "DAG Transparency" },
];

interface Props {
  children: ReactNode;
}

export function PaperPageTurn({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const [turnDirection, setTurnDirection] = useState<"forward" | "backward" | null>(null);
  const [isTurning, setIsTurning] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isPaperSoundEnabled());
  const [tocOpen, setTocOpen] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const prevPathRef = useRef(location.pathname);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Find current chapter
  const currentIdx = BOOK_PAGES.findIndex((p) => p.path === location.pathname);
  const activePage = currentIdx >= 0 ? BOOK_PAGES[currentIdx] : BOOK_PAGES[0];
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  // Execute paper turn
  const triggerTurn = useCallback(
    (direction: "forward" | "backward", targetPath: string) => {
      if (isTurning) return;
      setIsTurning(true);
      setTurnDirection(direction);
      playPaperTurnSound();

      // Navigate shortly into the turn fold
      setTimeout(() => {
        navigate(targetPath);
      }, 260);

      // Finish turning animation
      setTimeout(() => {
        setIsTurning(false);
        setTurnDirection(null);
        setDragProgress(null);
      }, 740);
    },
    [isTurning, navigate]
  );

  const turnNext = useCallback(() => {
    if (safeIdx < BOOK_PAGES.length - 1) {
      triggerTurn("forward", BOOK_PAGES[safeIdx + 1].path);
    }
  }, [safeIdx, triggerTurn]);

  const turnPrev = useCallback(() => {
    if (safeIdx > 0) {
      triggerTurn("backward", BOOK_PAGES[safeIdx - 1].path);
    }
  }, [safeIdx, triggerTurn]);

  // Detect external navigation changes (e.g. from sidebar, header, links)
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      const oldIdx = BOOK_PAGES.findIndex((p) => p.path === prevPathRef.current);
      const newIdx = BOOK_PAGES.findIndex((p) => p.path === location.pathname);

      if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
        const direction = newIdx > oldIdx ? "forward" : "backward";
        setTurnDirection(direction);
        setIsTurning(true);
        playPaperTurnSound();

        const timer = setTimeout(() => {
          setIsTurning(false);
          setTurnDirection(null);
        }, 740);
        prevPathRef.current = location.pathname;
        return () => clearTimeout(timer);
      }
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Keyboard navigation (← / → keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "ArrowRight") {
        turnNext();
      } else if (e.key === "ArrowLeft") {
        turnPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [turnNext, turnPrev]);

  // Hand Drag Page Peel on Bottom-Right Corner
  const handleCornerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragProgress(0);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = dragStartRef.current.x - moveEvent.clientX; // distance pulled leftward
      const progress = Math.min(Math.max(dx / 320, 0), 1);
      setDragProgress(progress);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = dragStartRef.current.x - upEvent.clientX;
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      // If dragged past threshold (> 80px), commit paper turn
      if (dx > 80 && safeIdx < BOOK_PAGES.length - 1) {
        turnNext();
      } else {
        // Snap back
        setDragProgress(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleCornerTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDragProgress(0);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touchMove = moveEvent.touches[0];
      const dx = dragStartRef.current.x - touchMove.clientX;
      const progress = Math.min(Math.max(dx / 320, 0), 1);
      setDragProgress(progress);
    };

    const handleTouchEnd = (endEvent: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touchEnd = endEvent.changedTouches[0];
      const dx = dragStartRef.current.x - touchEnd.clientX;
      dragStartRef.current = null;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);

      if (dx > 80 && safeIdx < BOOK_PAGES.length - 1) {
        turnNext();
      } else {
        setDragProgress(null);
      }
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setPaperSoundEnabled(next);
    if (next) playPaperTurnSound();
  };

  // Compute live transform if user is dragging by hand
  const dragTransform =
    dragProgress !== null
      ? `rotateY(-${dragProgress * 110}deg) translateZ(${dragProgress * 80}px)`
      : undefined;

  return (
    <div className="paper-book-viewport select-auto">
      {/* 3D Paper Page Folio Sheet */}
      <div
        ref={sheetRef}
        className={`paper-sheet ${
          turnDirection === "forward"
            ? "paper-turning-forward"
            : turnDirection === "backward"
            ? "paper-turning-backward"
            : ""
        }`}
        style={dragTransform ? { transform: dragTransform, transition: "none" } : undefined}
      >
        {/* Dynamic cylinder fold specular reflection and ambient crease shadow */}
        <div className="paper-crease-glare" />

        {/* Paper stack edge thickness */}
        <div className="paper-sheet-stack-edge" />

        {/* Actual page route content */}
        {children}
      </div>

      {/* Interactive Bottom-Right Corner Dog-Ear / Page Curl Peel */}
      <div
        className="paper-corner-peel group"
        onMouseDown={handleCornerMouseDown}
        onTouchStart={handleCornerTouchStart}
        onClick={() => {
          if (dragProgress === null || dragProgress < 0.1) {
            turnNext();
          }
        }}
        title={`Click or drag by hand to turn page to ${
          safeIdx < BOOK_PAGES.length - 1 ? BOOK_PAGES[safeIdx + 1].title : "first page"
        }`}
      >
        <div className="paper-corner-shadow" />
        <div className="paper-corner-flap" />
        <div className="paper-corner-crease" />

        {/* Corner icon & hint badge */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-80 group-hover:opacity-100 transition-opacity">
          <Hand size={13} className="animate-pulse" />
          <span className="hidden sm:inline">PULL</span>
        </div>
      </div>

      {/* Floating 3D Book Turn-Over Dock */}
      <nav
        aria-label="Book page navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-cyan-500/35 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(6,182,212,0.2)] transition-all hover:border-cyan-400"
      >
        {/* Turn Previous Button */}
        <button
          type="button"
          onClick={turnPrev}
          disabled={safeIdx === 0 || isTurning}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Turn back (Left Arrow ←)"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Turn Back</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Current Chapter / Page Selector Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTocOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer"
            title="Open Book Table of Contents"
          >
            <BookOpen size={14} className="text-cyan-400" />
            <span className="font-mono text-cyan-300 font-bold">
              Page {activePage.chapter} / 08:
            </span>
            <span className="max-w-[150px] sm:max-w-[220px] truncate font-medium text-white">
              {activePage.title}
            </span>
          </button>

          {/* Table of Contents Dropdown Popover */}
          {tocOpen && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-[#0D0E10]/95 border border-cyan-500/35 backdrop-blur-2xl p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(6,182,212,0.2)] z-60 divide-y divide-white/5">
              <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center justify-between font-bold">
                <span>Book Table of Contents</span>
                <span className="text-slate-500">8 Chapters</span>
              </div>
              <div className="py-1 space-y-1">
                {BOOK_PAGES.map((page, idx) => {
                  const isActive = idx === safeIdx;
                  return (
                    <button
                      key={page.path}
                      type="button"
                      onClick={() => {
                        setTocOpen(false);
                        if (idx !== safeIdx) {
                          const dir = idx > safeIdx ? "forward" : "backward";
                          triggerTurn(dir, page.path);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-[11px] text-cyan-400/80">
                        {page.chapter}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{page.title}</div>
                        <div className="text-[10px] text-slate-500">{page.category}</div>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Turn Next Button */}
        <button
          type="button"
          onClick={turnNext}
          disabled={safeIdx === BOOK_PAGES.length - 1 || isTurning}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Turn over to next page (Right Arrow →)"
        >
          <span className="hidden sm:inline">Turn Over</span>
          <ChevronRight size={16} />
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Audio Mute/Unmute Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors cursor-pointer"
          title={soundOn ? "Mute paper turn rustle sound" : "Enable paper turn rustle sound"}
          aria-label={soundOn ? "Mute paper turn rustle sound" : "Enable paper turn rustle sound"}
        >
          {soundOn ? <Volume2 size={15} className="text-cyan-400" /> : <VolumeX size={15} />}
        </button>
      </nav>
    </div>
  );
}
