import { useState, type ComponentType } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  ClipboardList,
  FileText,
  Search,
  ScanLine,
  MonitorDot,
  ChevronDown,
  Check,
  Database,
  RefreshCw,
  type LucideProps,
} from "lucide-react";
import { useMode, type AppMode } from "../app/mode";
import { useDataSource, type DataPreference } from "../app/dataSource";
import { getApiBase, setApiBase } from "../api/client";

type IconType = ComponentType<LucideProps>;

interface Tab {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
}

const TABS: Record<AppMode, Tab[]> = {
  checker: [
    { to: "/", label: "Home", icon: LayoutDashboard, end: true },
    { to: "/inspections/new", label: "Inspect", icon: Camera },
    { to: "/specs", label: "Specs", icon: ClipboardList },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
  display: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/inspections", label: "Inspections", icon: Search },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
};

function ModeToggle() {
  const { mode, setMode } = useMode();
  return (
    <div className="mode-toggle" role="tablist" aria-label="App mode">
      <button
        className={mode === "checker" ? "active" : ""}
        onClick={() => setMode("checker")}
        aria-label="Checker mode"
        title="Checker"
      >
        <ScanLine size={15} />
        <span className="mt-label">Checker</span>
      </button>
      <button
        className={mode === "display" ? "active" : ""}
        onClick={() => setMode("display")}
        aria-label="Display mode"
        title="Display"
      >
        <MonitorDot size={15} />
        <span className="mt-label">Display</span>
      </button>
    </div>
  );
}

const PREF_OPTIONS: { value: DataPreference; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Live gateway if reachable, else demo" },
  { value: "live", label: "Live", hint: "Always use the gateway API" },
  { value: "demo", label: "Demo", hint: "Seeded in-memory inspection data" },
];

function GatewayUrlField({ onSaved }: { onSaved: () => void }) {
  const [url, setUrl] = useState(() => getApiBase());

  const save = () => {
    setApiBase(url);
    setUrl(getApiBase());
    onSaved();
  };

  return (
    <div className="ds-gw">
      <label className="ds-gw-label" htmlFor="ds-gw-input">
        Gateway URL
      </label>
      <input
        id="ds-gw-input"
        className="ds-gw-input"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="/api or http://10.0.2.2:3001/api"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        inputMode="url"
      />
      <button className="ds-gw-save" onClick={save}>
        Apply
      </button>
      <div className="ds-menu-hint">
        Point a phone/emulator at the gateway. Include the <code>/api</code> path. See MOBILE.md.
      </div>
    </div>
  );
}

function DataSourcePill() {
  const { source, preference, setPreference, probing, recheck } = useDataSource();
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
        <span className="ds-pill-text">{probing ? "…" : isLive ? "LIVE" : "DEMO"}</span>
        <ChevronDown size={12} className="caret" />
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
                  {preference === opt.value && <Check size={14} />}
                </div>
                <div className="ds-menu-hint">{opt.hint}</div>
              </button>
            ))}
            <GatewayUrlField onSaved={recheck} />
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
      <span className="demo-banner-text">
        <Database size={13} />
        <strong>DEMO MODE</strong>{" "}
        {autoFallback
          ? "— gateway unreachable, showing seeded AOI data."
          : "— seeded AOI data (no live backend)."}
      </span>
      {preference !== "demo" && (
        <button className="demo-banner-btn" onClick={recheck} disabled={probing}>
          <RefreshCw size={12} /> {probing ? "Checking…" : "Retry"}
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
          <div className="brand-text">
            Neuron Vision
            <small>{mode === "checker" ? "Checker" : "Display"}</small>
          </div>
        </div>
        <div className="header-controls">
          <DataSourcePill />
          <ModeToggle />
        </div>
      </header>

      <DemoBanner />

      <nav className="tabbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon className="tab-icon" size={20} />
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
