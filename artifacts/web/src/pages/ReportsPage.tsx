import { Link } from "react-router-dom";
import { FileText, StickyNote, ArrowRight } from "lucide-react";
import { useReports } from "../api/hooks";
import { StatusBadge } from "../components/StatusBadge";
import { Loader, ErrorBanner, EmptyState } from "../components/states";
import { formatDate } from "../lib/format";

export function ReportsPage() {
  const reports = useReports();

  if (reports.isLoading) return <Loader />;
  if (reports.error) return <ErrorBanner error={reports.error} />;

  const list = [...(reports.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div>
      <h1 className="page-title">QC Reports</h1>

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} strokeWidth={1.5} />}
          title="No reports yet"
          hint="Generate a report from a completed inspection to see it here."
        />
      ) : (
        <div className="list">
          {list.map((r) => {
            const total = r.totalComponents || 1;
            const passPct = Math.round((r.passCount / total) * 100);
            return (
              <div key={r.id} className="card">
                <div className="row-between" style={{ marginBottom: 10 }}>
                  <div>
                    <strong>Report #{r.id}</strong>
                    <div className="faint">{formatDate(r.createdAt)}</div>
                  </div>
                  <StatusBadge status={r.overallStatus} />
                </div>

                <div className="deviation-grid">
                  <Metric k="Pass" v={r.passCount} color="var(--pass)" />
                  <Metric k="Fail" v={r.failCount} color="var(--fail)" />
                  <Metric k="Warning" v={r.warningCount} color="var(--warning)" />
                  <Metric k="Missing" v={r.missingCount} color="var(--missing)" />
                  <Metric k="Total" v={r.totalComponents} />
                </div>

                <div className="divider" />
                <div className="row-between">
                  <span className="faint">{passPct}% components passing</span>
                  <Link to={`/inspections/${r.inspectionId}`} className="chip chip-link">
                    View inspection <ArrowRight size={12} />
                  </Link>
                </div>

                {r.operatorNotes && (
                  <p
                    className="muted"
                    style={{ marginTop: 10, marginBottom: 0, fontSize: 13, display: "flex", gap: 6 }}
                  >
                    <StickyNote size={14} style={{ flex: "none", marginTop: 1 }} />
                    <span>{r.operatorNotes}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ k, v, color }: { k: string; v: number; color?: string }) {
  return (
    <div className="dev">
      <div className="k">{k}</div>
      <div className="v" style={color ? { color } : undefined}>{v}</div>
    </div>
  );
}
