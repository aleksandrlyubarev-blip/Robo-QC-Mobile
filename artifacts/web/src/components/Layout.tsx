import { NavLink, Outlet } from "react-router-dom";
import { useMode, type AppMode } from "../app/mode";
import { useHealth } from "../api/hooks";

interface Tab {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const TABS: Record<AppMode, Tab[]> = {
  checker: [
    { to: "/", label: "Home", icon: "🏠", end: true },
    { to: "/inspections/new", label: "Inspect", icon: "🎥" },
    { to: "/specs", label: "Specs", icon: "📋" },
    { to: "/reports", label: "Reports", icon: "📄" },
  ],
  display: [
    { to: "/", label: "Dashboard", icon: "🏠", end: true },
    { to: "/inspections", label: "Inspections", icon: "🔍" },
    { to: "/reports", label: "Reports", icon: "📄" },
  ],
};

function ModeToggle() {
  const { mode, setMode } = useMode();
  return (
    <div className="mode-toggle" role="tablist" aria-label="App mode">
      <button
        className={mode === "checker" ? "active" : ""}
        onClick={() => setMode("checker")}
      >
        Checker
      </button>
      <button
        className={mode === "display" ? "active" : ""}
        onClick={() => setMode("display")}
      >
        Display
      </button>
    </div>
  );
}

export function Layout() {
  const { mode } = useMode();
  const health = useHealth();
  const tabs = TABS[mode];

  const inferenceOk = health.data?.inferenceServer === "connected";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="16" stroke="#38bdf8" strokeWidth="3" fill="none" />
            <circle cx="32" cy="32" r="6" fill="#38bdf8" />
          </svg>
          <div>
            Neuron Vision
            <small>{mode === "checker" ? "Checker" : "Display"}</small>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="chip"
            title={inferenceOk ? "Inference server connected" : "Inference server unavailable"}
            style={{ color: inferenceOk ? "var(--pass)" : "var(--text-faint)" }}
          >
            ● Engine
          </span>
          <ModeToggle />
        </div>
      </header>

      <nav className="tabbar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
