import { useState } from "react";
import { Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../components/core__src_components__AuthContext";
import { useTheme } from "../lib/core__src_lib__theme";

export default function Nav() {
  const { user, demoLogin } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [demoEntering, setDemoEntering] = useState(false);

  const handleEnterDemo = async () => {
    setDemoEntering(true);
    try {
      await demoLogin("reviewer@clincase.health");
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    } finally {
      setDemoEntering(false);
    }
  };

  return (
    <header className="pl-nav">
      <Link to="/" className="pl-brand" aria-label="CARDIOTON home">
        <span className="pl-brand-mark" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        CARDIOTON
      </Link>

      <nav className="pl-nav-links" aria-label="Landing">
        <a href="#how-it-works" className="pl-nav-link">How it works</a>
        <a href="#live-status" className="pl-nav-link">Live status</a>
        <Link to="/platform" className="pl-nav-link text-cyan-400 font-bold">
          Master Launchpad
        </Link>
        <Link to="/cardiotwin" className="pl-nav-link">
          3D Heart
        </Link>
        <Link to="/pulse" className="pl-nav-link text-rose-400 font-medium">
          Pulse 911
        </Link>
        <Link to="/medclear" className="pl-nav-link text-emerald-400 font-medium">
          MedClear AI
        </Link>

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          className="pl-btn-icon"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {user ? (
          <Link to="/dashboard" className="pl-btn pl-btn-primary">
            Go to dashboard
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={handleEnterDemo}
              disabled={demoEntering}
              className="pl-btn pl-btn-primary font-semibold"
              title="Enter Dashboard immediately without signing in or signing up"
            >
              {demoEntering ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>Enter Demo Dashboard</span>
            </button>
            <Link to="/login" className="pl-nav-link">
              Sign in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
