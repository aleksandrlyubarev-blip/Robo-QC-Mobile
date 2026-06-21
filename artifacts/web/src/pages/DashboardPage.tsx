import { Link } from "react-router-dom";
import { useInspections, useReports, useSpecs } from "../api/hooks";
import { useMode } from "../app/mode";
import { useDataSource } from "../app/dataSource";
import { StatusBadge } from "../components/StatusBadge";
import { Loader, ErrorBanner, EmptyState } from "../components/states";
import { formatRelative } from "../lib/format";
import type { Inspection } from "../api/types";

const OPEN_STATUSES = new Set(["reviewing", "analyzing", "pre_screening", "capturing", "uploading"]);

export function DashboardPage() {
  const { mode } = useMode();
  const { source } = useDataSource();
  const inspections = useInspections();
  const reports = useReports();
  const specs = useSpecs();

  if (inspections.isLoading) return <Loader />;
  if (inspections.error) return <ErrorBanner error={inspections.error} />;

  const all = inspections.data ?? [];

  // Live backend reachable but empty — show an explicit state, never silent zeros.
  if (source === "live" && all.length === 0 && (specs.data?.length ?? 0) === 0) {
    return (
      <div>
        <h1 className="page-title">{mode === "checker" ? "Inspection Console" : "QC Dashboard"}</h1>
        <EmptyState
          emoji="🗄️"
          title="Live backend connected — no data yet"
          hint="The database is empty. Seed demo AOI data with `pnpm db:seed`, or switch the data source to Demo from the header."
          action={
            mode === "checker" ? (
              <Link to="/specs/new" className="btn btn-primary">Create first spec</Link>
            ) : undefined
          }
        />
      </div>
    );
  }
  const open = all.filter((i) => OPEN_STATUSES.has(i.status));
  const completed = all.filter((i) => i.status === "completed");
  const failed = reports.data?.filter((r) => r.overallStatus === "fail").length ?? 0;

  const recent = [...all]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <h1 className="page-title">
        {mode === "checker" ? "Inspection Console" : "QC Dashboard"}
      </h1>

      {mode === "checker" && (
        <Link to="/inspections/new" className="btn btn-primary btn-block btn-lg" style={{ marginBottom: 18 }}>
          🎥 Start New Inspection
        </Link>
      )}

      <div className="grid-stats">
        <div className="stat">
          <div className="num">{all.length}</div>
          <div className="label">Inspections</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--review)" }}>{open.length}</div>
          <div className="label">In Progress</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--pass)" }}>{completed.length}</div>
          <div className="label">Completed</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--fail)" }}>{failed}</div>
          <div className="label">Failed Reports</div>
        </div>
        <div className="stat">
          <div className="num">{specs.data?.length ?? 0}</div>
          <div className="label">PCB Specs</div>
        </div>
      </div>

      <div className="section-label">Recent activity</div>
      {recent.length === 0 ? (
        <div className="card muted">No inspections yet.</div>
      ) : (
        <div className="list">
          {recent.map((i) => (
            <RecentRow key={i.id} inspection={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentRow({ inspection }: { inspection: Inspection }) {
  return (
    <Link to={`/inspections/${inspection.id}`} className="card link-card">
      <div className="row-between">
        <div>
          <strong>Inspection #{inspection.id}</strong>
          <div className="faint">
            Spec #{inspection.specId} · {formatRelative(inspection.updatedAt)}
          </div>
        </div>
        <StatusBadge status={inspection.status} />
      </div>
    </Link>
  );
}
