import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Api } from "../api/contract";
import { liveApi, probeBackend } from "../api/client";
import { createDemoApi } from "../demo/demoApi";

/**
 * Data-source preference:
 *  - "auto": use the live gateway if reachable, otherwise fall back to demo.
 *  - "live": always use the gateway (errors surface if it is down).
 *  - "demo": always use the in-memory seeded backend.
 */
export type DataPreference = "auto" | "live" | "demo";
export type ActiveSource = "live" | "demo";

interface DataSourceValue {
  api: Api;
  source: ActiveSource;
  preference: DataPreference;
  setPreference: (p: DataPreference) => void;
  backendReachable: boolean | null;
  probing: boolean;
  recheck: () => void;
}

const Ctx = createContext<DataSourceValue | null>(null);
const PREF_KEY = "nv.dataMode";

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const demoApi = useMemo(() => createDemoApi(), []);
  const [preference, setPreferenceState] = useState<DataPreference>(
    () => (localStorage.getItem(PREF_KEY) as DataPreference) || "auto",
  );
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const [probing, setProbing] = useState(false);
  const probeToken = useRef(0);

  const runProbe = useCallback(async () => {
    const token = ++probeToken.current;
    setProbing(true);
    const ok = await probeBackend();
    if (token === probeToken.current) {
      setBackendReachable(ok);
      setProbing(false);
    }
  }, []);

  // Probe whenever a live connection is relevant (auto or live preference).
  useEffect(() => {
    if (preference === "demo") {
      setBackendReachable(null);
      return;
    }
    runProbe();
  }, [preference, runProbe]);

  const setPreference = useCallback((p: DataPreference) => {
    localStorage.setItem(PREF_KEY, p);
    setPreferenceState(p);
  }, []);

  const source: ActiveSource = useMemo(() => {
    if (preference === "demo") return "demo";
    if (preference === "live") return "live";
    // auto: live only once we've confirmed the backend is reachable
    return backendReachable ? "live" : "demo";
  }, [preference, backendReachable]);

  // Live and demo backends are independent datasets — reset cached queries when
  // the active source flips so the UI never mixes the two.
  const prevSource = useRef<ActiveSource | null>(null);
  useEffect(() => {
    if (prevSource.current && prevSource.current !== source) {
      queryClient.clear();
    }
    prevSource.current = source;
  }, [source, queryClient]);

  const value = useMemo<DataSourceValue>(
    () => ({
      api: source === "live" ? liveApi : demoApi,
      source,
      preference,
      setPreference,
      backendReachable,
      probing,
      recheck: runProbe,
    }),
    [source, demoApi, preference, setPreference, backendReachable, probing, runProbe],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataSource(): DataSourceValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDataSource must be used within a DataSourceProvider");
  return ctx;
}

export function useApi(): Api {
  return useDataSource().api;
}
