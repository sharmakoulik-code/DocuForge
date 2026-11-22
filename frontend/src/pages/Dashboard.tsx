import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Film,
  HardDrive,
  Layers3,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, formatBytes } from "../api";
import { EmptyState, ErrorNotice, Meter, Panel, StatusBadge } from "../components/ui";
import type { PageKey } from "../components/Sidebar";
import type { Job, Project, ResourceSnapshot, StorageResponse } from "../types";

export function Dashboard({
  navigate,
  resource,
}: {
  navigate: (page: PageKey) => void;
  resource: ResourceSnapshot | null;
}) {
  const queryClient = useQueryClient();
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Project[] }>("/api/v1/projects"),
  });
  const storage = useQuery({
    queryKey: ["storage"],
    queryFn: () => api<StorageResponse>("/api/v1/storage"),
  });
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<{ jobs: Job[] }>("/api/v1/jobs"),
    refetchInterval: 2500,
  });
  const scan = useMutation({
    mutationFn: () => api<Job>("/api/v1/system/hardware/scan", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const projectList = projects.data?.projects ?? [];
  const activeJobs = (jobs.data?.jobs ?? []).filter((job) =>
    ["queued", "running", "waiting_for_storage"].includes(job.status),
  );

  return (
    <div className="page dashboard-page">
      <section className="studio-hero">
        <div className="hero-copy">
          <span className="eyebrow">LOCAL PRODUCTION CONTROL</span>
          <h1>Shape evidence into<br /><em>cinematic history.</em></h1>
          <p>
            Your M1 foundation is a real local control plane. Project files remain authoritative;
            future production stages stay locked until their milestones are approved.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => navigate("new")}>
              <Film size={17} /> Start a documentary
            </button>
            <button className="button ghost" onClick={() => navigate("projects")}>
              Open project library <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="hero-monitor" aria-label="Local production foundation status">
          <div className="monitor-top">
            <span><i /> FOUNDATION FEED</span>
            <span>LOCAL • M1</span>
          </div>
          <div className="monitor-frame">
            <div className="frame-grid" />
            <div className="frame-center">
              <div className="aperture"><Play size={28} fill="currentColor" /></div>
              <strong>Production foundation online</strong>
              <span>No video is rendered in Milestone 1</span>
            </div>
            <div className="timecode">DF 01 · 00:00:00:00</div>
          </div>
          <div className="monitor-timeline">
            <div><span className="track-dot gold" /> PROJECT FILES</div>
            <div><span className="track-dot violet" /> SYSTEM TELEMETRY</div>
            <div><span className="track-dot blue" /> SAFE TASK QUEUE</div>
          </div>
        </div>
      </section>

      <div className="metric-grid">
        <Metric
          icon={<Layers3 />}
          label="Indexed projects"
          value={projects.isLoading ? "—" : String(projectList.length)}
          note={`${projectList.filter((item) => item.editable).length} editable drafts`}
        />
        <Metric
          icon={<Activity />}
          label="Available memory"
          value={resource ? formatBytes(resource.memory.available_bytes) : "Connecting…"}
          note={resource ? `${Math.round(resource.memory.used_percent)}% in use` : "Real local telemetry"}
        />
        <Metric
          icon={<HardDrive />}
          label="Project storage"
          value={storage.data?.configuration.online ? "Online" : "Not configured"}
          note={storage.data?.configuration.source ?? "Select an external SSD"}
          warning={!storage.data?.configuration.online}
        />
        <Metric
          icon={<Clock3 />}
          label="Active tasks"
          value={String(activeJobs.length)}
          note="Single-worker low-memory policy"
        />
      </div>

      <div className="dashboard-columns">
        <Panel
          title="Recent projects"
          eyebrow="PROJECT LIBRARY"
          action={<button className="text-button" onClick={() => navigate("projects")}>View all <ArrowRight size={14} /></button>}
        >
          <ErrorNotice error={projects.error} />
          {!projects.isLoading && projectList.length === 0 ? (
            <EmptyState title="No projects yet" text="Choose storage, then create a topic-only documentary draft." />
          ) : (
            <div className="project-rows">
              {projectList.slice(0, 4).map((project) => (
                <button key={project.project_id} onClick={() => navigate("projects")}>
                  <div className="project-monogram">{project.title.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{project.title}</strong>
                    <span>{project.target_duration_minutes ? `${project.target_duration_minutes} min` : "Legacy schema"} · {project.aspect_ratio ?? "format unknown"}</span>
                  </div>
                  <StatusBadge status={project.online ? project.status : "offline"} />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Foundation checks" eyebrow="SYSTEM READINESS">
          <div className="readiness-list">
            <ReadinessRow
              ok={Boolean(storage.data?.configuration.online)}
              title="Project storage"
              detail={storage.data?.configuration.online ? "Configured and available" : "External SSD selection required"}
              onClick={() => navigate("storage")}
            />
            <ReadinessRow ok title="Internal database" detail="SQLite WAL control plane" />
            <ReadinessRow ok title="Local network policy" detail="Loopback-only by default" />
            <ReadinessRow
              ok={Boolean((jobs.data?.jobs ?? []).find((job) => job.job_type === "hardware_scan" && job.status === "completed"))}
              title="Capability report"
              detail="Detect runtimes without loading models"
              onClick={() => scan.mutate()}
            />
          </div>
          <ErrorNotice error={scan.error} />
          <button className="button secondary full" onClick={() => scan.mutate()} disabled={scan.isPending}>
            <RefreshCw size={16} className={scan.isPending ? "spin" : ""} />
            {scan.isPending ? "Queueing scan…" : "Run hardware capability scan"}
          </button>
        </Panel>
      </div>

      {activeJobs.length > 0 && (
        <Panel title="Live operations" eyebrow="PERSISTENT TASK QUEUE" className="operations-panel">
          {activeJobs.map((job) => (
            <div className="job-row" key={job.job_id}>
              <div className="job-icon"><RefreshCw className={job.status === "running" ? "spin" : ""} /></div>
              <div className="job-main">
                <div><strong>{job.job_type.replaceAll("_", " ")}</strong><StatusBadge status={job.status} /></div>
                <p>{job.progress_step}</p>
                <Meter value={(job.progress_completed / Math.max(1, job.progress_total)) * 100} label="Completed detection steps" />
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  warning?: boolean;
}) {
  return (
    <div className={`metric-card ${warning ? "warning" : ""}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function ReadinessRow({
  ok,
  title,
  detail,
  onClick,
}: {
  ok: boolean;
  title: string;
  detail: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={ok ? "ready-icon" : "ready-icon pending"}>
        {ok ? <CheckCircle2 /> : <ShieldCheck />}
      </span>
      <div><strong>{title}</strong><small>{detail}</small></div>
      {onClick && <ArrowRight size={15} />}
    </>
  );
  return onClick ? <button onClick={onClick}>{content}</button> : <div>{content}</div>;
}
