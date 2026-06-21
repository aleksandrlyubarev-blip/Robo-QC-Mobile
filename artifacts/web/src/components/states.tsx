import type { ReactNode } from "react";
import { Inbox, TriangleAlert } from "lucide-react";
import { ApiError } from "../api/client";

export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loader">
      <span className="spinner" /> {label}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon ?? <Inbox size={40} strokeWidth={1.5} />}</div>
      <div style={{ fontWeight: 600, color: "var(--text-dim)" }}>{title}</div>
      {hint && <div className="faint" style={{ marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorBanner({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError || error instanceof Error
      ? error.message
      : "Something went wrong";
  return (
    <div className="banner-error">
      <TriangleAlert size={16} /> <span>{message}</span>
    </div>
  );
}
