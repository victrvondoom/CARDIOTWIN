/**
 * Contextual new-case shortcut for the patient workflow.
 */
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FAB() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/intake")}
      className="group fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-6 z-30 inline-flex items-center gap-2 h-10 pl-2 pr-3 rounded-[2px] border border-[var(--p-orange)] bg-[var(--p-orange)] text-[#0D0E10] font-medium text-xs hover:bg-[#FF8E26] shadow-xl transition-all duration-150"
      title="New case (N)"
      aria-label="Start a new case"
    >
      <span className="w-6 h-6 rounded-[2px] grid place-items-center bg-black/15">
        <Plus size={15} aria-hidden="true" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-[180px]">
        <span className="pl-1">New case</span>
      </span>
      <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-black/15 rounded-[2px]">
        N
      </kbd>
    </button>
  );
}
