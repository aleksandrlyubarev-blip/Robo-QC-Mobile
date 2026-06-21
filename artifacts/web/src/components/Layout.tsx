import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useMode, type AppMode } from "../app/mode";
import { useDataSource, type DataPreference } from "../app/dataSource";

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

const PREF_OPTIONS: { value: DataPreference; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Live gateway if reachable, else demo" },
  { value: "live", label: "Live", hint: "Always use the gateway API" },
  { value: "demo", label: "Demo", hint: "Seeded in-memory inspection data" },
];

function DataSourcePill() {
  const { source, preference, setPreference, probing } = useDataSource();
  const [open, setOpen] = useState(false);
  const isLive = source === "live";

  return (
    <div className="ds-pill-wrap">
      <button
        className={`ds-pill ${source}`}
        onClick={() => setOpen((v) => !v)}
        title="Data source"
      >
        <span className="dot" />
        {probing ? "…" : isLive ? "LIVE" : "DEMO"}
        <span className="caret">▾</span>
      </button>
      {open && (
        <>
          <div className="ds-backdrop" onClick={() => setOpen(false)} />
          <div className="ds-menu" role="menu">
            <div className="ds-menu-head">Data source</div>
            {PREF_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`ds-menu-item ${preference === opt.value ? "active" : ""}`}
                onClick={() => {
                  setPreference(opt.value);
                  setOpen(false);
                }}
              >
                <div className="ds-menu-label">
                  {opt.label}
                  {preference === opt.value && <span> ✓</span>}
                </div>
                <div className="ds-menu-hint">{opt.hint}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DemoBanner() {
  const { source, preference, backendReachable, recheck, probing } = useDataSource();
  if (source !== "demo") return null;

  const autoFallback = preference === "auto" && backendReachable === false;
  return (
    <div className="demo-banner">
      <span>
        <strong>DEMO MODE</strong>{" "}
        {autoFallback
          ? "— gateway unreachable, showing seeded AOI data."
          : "— seeded AOI data (no live backend)."}
      </span>
      {preference !== "demo" && (
        <button className="demo-banner-btn" onClick={recheck} disabled={probing}>
          {probing ? "Checking…" : "Retry connection"}
        </button>
      )}
    </div>
  );
}

export function Layout() {
  const { mode } = useMode();
  const tabs = TABS[mode];

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
          <DataSourcePill />
          <ModeToggle />
        </div>
      </header>

      <DemoBanner />

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
