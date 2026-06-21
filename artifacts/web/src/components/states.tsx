import { ApiError } from "../api/client";

export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="loader">
      <span className="spinner" /> {label}
    </div>
  );
}

export function EmptyState({
  emoji = "📭",
  title,
  hint,
  action,
}: {
  emoji?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
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
  return <div className="banner-error">⚠ {message}</div>;
}
