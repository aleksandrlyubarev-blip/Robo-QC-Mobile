import type { QcStatus, OverallStatus, InspectionStatus } from "../api/types";

type AnyStatus = QcStatus | OverallStatus | InspectionStatus | string;

const LABELS: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  missing: "Missing",
  review_needed: "Review",
  reviewing: "Reviewing",
  pending: "Pending",
  conditional_pass: "Conditional",
  capturing: "Capturing",
  pre_screening: "Pre-screen",
  uploading: "Uploading",
  analyzing: "Analyzing",
  completed: "Completed",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  return <span className={`badge ${status}`}>{LABELS[status] ?? status}</span>;
}
