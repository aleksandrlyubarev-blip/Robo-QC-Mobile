import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useMode } from "./app/mode";
import { DashboardPage } from "./pages/DashboardPage";
import { SpecsPage } from "./pages/SpecsPage";
import { SpecEditorPage } from "./pages/SpecEditorPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { NewInspectionPage } from "./pages/NewInspectionPage";
import { InspectionDetailPage } from "./pages/InspectionDetailPage";
import { ReportsPage } from "./pages/ReportsPage";

/** Redirects mutating routes to a safe read-only page while in Display mode. */
function CheckerOnly({ children, to }: { children: React.ReactNode; to: string }) {
  const { readOnly } = useMode();
  if (readOnly) return <Navigate to={to} replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="specs" element={<SpecsPage />} />
          <Route
            path="specs/new"
            element={
              <CheckerOnly to="/specs">
                <SpecEditorPage />
              </CheckerOnly>
            }
          />
          {/* Editing an existing spec is allowed in Display mode but renders
              read-only (the editor disables inputs and hides actions). */}
          <Route path="specs/:id" element={<SpecEditorPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route
            path="inspections/new"
            element={
              <CheckerOnly to="/inspections">
                <NewInspectionPage />
              </CheckerOnly>
            }
          />
          <Route path="inspections/:id" element={<InspectionDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
