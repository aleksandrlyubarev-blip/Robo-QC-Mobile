import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { SpecsPage } from "./pages/SpecsPage";
import { SpecEditorPage } from "./pages/SpecEditorPage";
import { InspectionsPage } from "./pages/InspectionsPage";
import { NewInspectionPage } from "./pages/NewInspectionPage";
import { InspectionDetailPage } from "./pages/InspectionDetailPage";
import { ReportsPage } from "./pages/ReportsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="specs" element={<SpecsPage />} />
          <Route path="specs/new" element={<SpecEditorPage />} />
          <Route path="specs/:id" element={<SpecEditorPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="inspections/new" element={<NewInspectionPage />} />
          <Route path="inspections/:id" element={<InspectionDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
