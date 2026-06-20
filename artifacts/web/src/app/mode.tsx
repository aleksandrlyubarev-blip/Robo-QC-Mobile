import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * The app runs in two modes that share the same data layer:
 *  - "checker": the operator-facing flow — capture, run analysis, review (HITL).
 *  - "display": the read-only dashboard — fleet status, reports, history.
 */
export type AppMode = "checker" | "display";

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  operatorId: string;
  setOperatorId: (id: string) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

const MODE_KEY = "nv.mode";
const OPERATOR_KEY = "nv.operatorId";

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(
    () => (localStorage.getItem(MODE_KEY) as AppMode) || "checker",
  );
  const [operatorId, setOperatorIdState] = useState<string>(
    () => localStorage.getItem(OPERATOR_KEY) || "operator-1",
  );

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
    document.documentElement.dataset["mode"] = mode;
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(OPERATOR_KEY, operatorId);
  }, [operatorId]);

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      setMode: setModeState,
      operatorId,
      setOperatorId: setOperatorIdState,
    }),
    [mode, operatorId],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
