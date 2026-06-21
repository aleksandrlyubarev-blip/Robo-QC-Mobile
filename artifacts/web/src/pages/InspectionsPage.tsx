import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useInspections } from "../api/hooks";
import { useMode } from "../app/mode";
import { StatusBadge } from "../components/StatusBadge";
import { Loader, ErrorBanner, EmptyState } from "../components/states";
import { formatRelative } from "../lib/format";

export function InspectionsPage() {
  const { mode } = useMode();
  const inspections = useInspections();

  if (inspections.isLoading) return <Loader />;
  if (inspections.error) return <ErrorBanner error={inspections.error} />;

  const list = [...(inspections.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Inspections</h1>
        {mode === "checker" && (
          <Link to="/inspections/new" className="btn btn-primary">+ New</Link>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Search size={40} strokeWidth={1.5} />}
          title="No inspections yet"
          hint={mode === "checker" ? "Start a new inspection to capture and analyze a board." : "Inspections will appear here once operators run them."}
          action={mode === "checker" ? <Link to="/inspections/new" className="btn btn-primary">Start inspection</Link> : undefined}
        />
      ) : (
        <div className="list">
          {list.map((i) => (
            <Link key={i.id} to={`/inspections/${i.id}`} className="card link-card">
              <div className="row-between">
                <div>
                  <strong>Inspection #{i.id}</strong>
                  <div className="faint">
                    Spec #{i.specId}
                    {i.operatorId ? ` · ${i.operatorId}` : ""} · {formatRelative(i.createdAt)}
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
