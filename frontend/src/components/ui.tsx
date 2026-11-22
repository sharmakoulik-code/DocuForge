import * as Progress from "@radix-ui/react-progress";
import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  title,
  eyebrow,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow || action) && (
        <header className="panel-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="meter-wrap">
      <div className="meter-label">
        <span>{label}</span>
        <strong>{Math.round(safe)}%</strong>
      </div>
      <Progress.Root className="meter" value={safe} max={100} aria-label={label}>
        <Progress.Indicator className="meter-fill" style={{ transform: `translateX(-${100 - safe}%)` }} />
      </Progress.Root>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ["running", "healthy", "online", "completed", "draft"].includes(status)
    ? "success"
    : ["failed", "offline", "stopped"].includes(status)
      ? "danger"
      : ["queued", "running", "handling", "waiting_for_storage"].includes(status)
        ? "active"
        : "neutral";
  return <span className={`status-badge ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="notice danger" role="alert">
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

export function LoadingBlock({ label = "Loading local data…" }: { label?: string }) {
  return (
    <div className="loading-block" aria-live="polite">
      <span className="spinner" /> {label}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">DF</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
