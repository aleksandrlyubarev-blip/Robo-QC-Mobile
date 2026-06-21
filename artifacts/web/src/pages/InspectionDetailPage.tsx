import { useNavigate, useParams } from "react-router-dom";
import {
  useInspection,
  useSpec,
  useAnalyzeInspection,
  useReviewComponent,
  useGenerateReport,
} from "../api/hooks";
import { useMode } from "../app/mode";
import { StatusBadge } from "../components/StatusBadge";
import { DetectionOverlay } from "../components/DetectionOverlay";
import { Loader, ErrorBanner } from "../components/states";
import { formatDate, formatDeviation } from "../lib/format";
import type { QcResultRecord, ReviewDecision } from "../api/types";

const ANALYZING = new Set(["analyzing", "uploading"]);

export function InspectionDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = Number(params.id);
  const { mode, operatorId } = useMode();

  const inspection = useInspection(id);

  const spec = useSpec(inspection.data?.specId);
  const analyze = useAnalyzeInspection(id);
  const review = useReviewComponent(id);
  const generateReport = useGenerateReport();

  if (inspection.isLoading) return <Loader />;
  if (inspection.error) return <ErrorBanner error={inspection.error} />;
  if (!inspection.data) return <ErrorBanner error={new Error("Inspection not found")} />;

  const insp = inspection.data;
  const isAnalyzing = ANALYZING.has(insp.status) || analyze.isPending;
  const hasResults = insp.qcResults.length > 0;
  const componentLabels = new Map(
    (spec.data?.components ?? []).map((c) => [c.componentId, c.label]),
  );

  const summary = summarize(insp.qcResults);
  const canReview = mode === "checker";

  return (
    <div>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>

      <div className="row-between" style={{ marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Inspection #{insp.id}</h1>
        <StatusBadge status={insp.status} />
      </div>
      <p className="page-subtitle">
        {spec.data ? `${spec.data.name} v${spec.data.version}` : `Spec #${insp.specId}`}
        {insp.operatorId ? ` · ${insp.operatorId}` : ""} · {formatDate(insp.createdAt)}
      </p>

      {/* Captured image + detections */}
      {insp.capturedImageUrl ? (
        <DetectionOverlay imageUrl={insp.capturedImageUrl} detections={insp.serverDetections} />
      ) : (
        <div className="card muted" style={{ textAlign: "center" }}>No image captured for this inspection.</div>
      )}

      {/* Analyze action */}
      {mode === "checker" && (
        <div style={{ marginTop: 14 }}>
          <button
            className="btn btn-primary btn-block btn-lg"
            disabled={!insp.capturedImageUrl || isAnalyzing}
            onClick={() => analyze.mutate()}
          >
            {isAnalyzing ? "Analyzing…" : hasResults ? "↻ Re-run analysis" : "▶ Run WildDet3D analysis"}
          </button>
          {!insp.capturedImageUrl && (
            <p className="faint" style={{ textAlign: "center", marginTop: 8 }}>
              Capture an image before running analysis.
            </p>
          )}
        </div>
      )}

      {analyze.error && <div style={{ marginTop: 12 }}><ErrorBanner error={analyze.error} /></div>}
      {isAnalyzing && <div style={{ marginTop: 12 }}><Loader label="Running analysis…" /></div>}

      {/* Summary */}
      {hasResults && (
        <>
          <div className="grid-stats" style={{ marginTop: 18 }}>
            <div className="stat"><div className="num" style={{ color: "var(--pass)" }}>{summary.pass}</div><div className="label">Pass</div></div>
            <div className="stat"><div className="num" style={{ color: "var(--fail)" }}>{summary.fail}</div><div className="label">Fail</div></div>
            <div className="stat"><div className="num" style={{ color: "var(--warning)" }}>{summary.warning}</div><div className="label">Warning</div></div>
            <div className="stat"><div className="num" style={{ color: "var(--missing)" }}>{summary.missing}</div><div className="label">Missing</div></div>
          </div>

          <div className="section-label">Component results</div>
          <div className="list">
            {insp.qcResults.map((r) => (
              <ResultRow
                key={r.id}
                result={r}
                label={componentLabels.get(r.componentId)}
                canReview={canReview && (r.status === "fail" || r.status === "missing" || r.status === "review_needed")}
                onReview={(decision) =>
                  review.mutate({ componentId: r.componentId, decision, reviewedBy: operatorId })
                }
                reviewPending={review.isPending}
              />
            ))}
          </div>

          {review.error && <div style={{ marginTop: 12 }}><ErrorBanner error={review.error} /></div>}

          {/* Report generation (Checker only) */}
          {mode === "checker" && (
            <>
              <div className="section-label">Report</div>
              <div className="card">
                <button
                  className="btn btn-primary btn-block"
                  disabled={generateReport.isPending}
                  onClick={() =>
                    generateReport.mutate(
                      { inspectionId: id },
                      { onSuccess: () => navigate("/reports") },
                    )
                  }
                >
                  {generateReport.isPending ? "Generating…" : "📄 Generate QC report"}
                </button>
                {generateReport.error && <div style={{ marginTop: 10 }}><ErrorBanner error={generateReport.error} /></div>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ResultRow({
  result,
  label,
  canReview,
  onReview,
  reviewPending,
}: {
  result: QcResultRecord;
  label?: string;
  canReview: boolean;
  onReview: (decision: ReviewDecision) => void;
  reviewPending: boolean;
}) {
  return (
    <div className="result-row">
      <div className="row-between">
        <div>
          <strong>{label ?? result.componentId}</strong>
          <div className="faint">{result.componentId}</div>
        </div>
        <StatusBadge status={result.status} />
      </div>

      <div className="deviation-grid">
        <Dev k="Position" v={formatDeviation(result.positionDeviation, " mm")} />
        <Dev k="Orient." v={formatDeviation(result.orientationDeviation, "°")} />
        <Dev k="Extent" v={formatDeviation(result.extentDeviation, " mm")} />
        <Dev k="Score Δ" v={formatDeviation(result.scoreDeviation)} />
      </div>

      {result.reviewDecision && (
        <div className="faint">
          Reviewed: <strong>{result.reviewDecision}</strong>
          {result.reviewedBy ? ` by ${result.reviewedBy}` : ""}
        </div>
      )}

      {canReview && !result.reviewDecision && (
        <div className="btn-row">
          <button className="btn btn-success" disabled={reviewPending} onClick={() => onReview("approved")}>
            ✓ Approve
          </button>
          <button className="btn btn-danger" disabled={reviewPending} onClick={() => onReview("rejected")}>
            ✕ Reject
          </button>
          <button className="btn" disabled={reviewPending} onClick={() => onReview("override_pass")}>
            ⤴ Override pass
          </button>
        </div>
      )}
    </div>
  );
}

function Dev({ k, v }: { k: string; v: string }) {
  return (
    <div className="dev">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function summarize(results: QcResultRecord[]) {
  return {
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
    warning: results.filter((r) => r.status === "warning").length,
    missing: results.filter((r) => r.status === "missing").length,
  };
}
