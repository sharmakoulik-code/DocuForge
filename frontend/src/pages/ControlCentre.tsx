import { Group, Panel as ResizablePanel, Separator } from "react-resizable-panels";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Cpu, FileText, Power, RefreshCw, RotateCcw, Server, SquareTerminal } from "lucide-react";
import { useState } from "react";
import { api, jsonBody } from "../api";
import { ErrorNotice, Meter, Panel, StatusBadge } from "../components/ui";
import type { Job, Services } from "../types";

export function ControlCentre() {
  const client = useQueryClient();
  const [logService, setLogService] = useState("api");
  const [confirmStop, setConfirmStop] = useState(false);
  const services = useQuery({ queryKey: ["services"], queryFn: () => api<Services>("/api/v1/control/services"), refetchInterval: 2000 });
  const logs = useQuery({ queryKey: ["logs", logService], queryFn: () => api<{ lines: string[]; available: boolean }>(`/api/v1/control/logs/${logService}?lines=160`), refetchInterval: 3000 });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api<{ jobs: Job[] }>("/api/v1/jobs"), refetchInterval: 2000 });
  const command = useMutation({
    mutationFn: (action: "restart_api" | "restart_worker" | "stop_all") => api("/api/v1/control/commands", { method: "POST", body: jsonBody({ action }) }),
    onSuccess: () => { setConfirmStop(false); setTimeout(() => client.invalidateQueries({ queryKey: ["services"] }), 1200); },
  });
  const scan = useMutation({
    mutationFn: () => api<Job>("/api/v1/system/hardware/scan", { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const supervisorOnline = services.data?.supervisor.status === "running";

  return (
    <div className="page control-page">
      <div className="page-heading row"><div><span className="eyebrow">LOCAL PROCESS SUPERVISION</span><h1>System Control Centre</h1><p>Actual process health, logs, task state and safe service commands.</p></div><div className="control-actions"><button className="button secondary" disabled={!supervisorOnline || command.isPending} onClick={() => command.mutate("restart_worker")}><RotateCcw size={16} /> Restart worker</button><button className="button danger" disabled={!supervisorOnline || command.isPending} onClick={() => setConfirmStop(true)}><Power size={16} /> Stop studio</button></div></div>
      {services.data?.public_bind_warning && <div className="notice danger"><AlertTriangle /><div><strong>Non-local bind override is active.</strong><span>Use only for the explicit preview/development environment; normal Windows use must remain loopback-only.</span></div></div>}
      {!supervisorOnline && <div className="notice warning"><AlertTriangle /><div><strong>Supervisor is not running.</strong><span>The API was started directly. Service restart/stop controls are disabled; use the one-click launcher for full control.</span></div></div>}
      <ErrorNotice error={services.error ?? command.error ?? scan.error} />

      <div className="service-grid">
        <ServiceCard icon={<Server />} name="Supervisor" state={services.data?.supervisor} detail="Owns only DocuForge child processes" />
        <ServiceCard icon={<SquareTerminal />} name="FastAPI" state={services.data?.api} detail="Local API and static studio UI" />
        <ServiceCard icon={<Cpu />} name="Worker" state={services.data?.worker} detail="One Huey thread · persistent SQLite queue" />
      </div>

      <Group orientation="horizontal" className="control-split">
        <ResizablePanel defaultSize="58%" minSize="36%">
          <Panel title="Service logs" eyebrow="ROTATED LOCAL FILES" action={<div className="log-tabs">{["api", "worker", "supervisor"].map((name) => <button className={logService === name ? "active" : ""} onClick={() => setLogService(name)} key={name}>{name}</button>)}</div>}>
            <div className="log-view" role="log" aria-label={`${logService} logs`}>
              {(logs.data?.lines ?? []).length ? logs.data?.lines.map((line, index) => <code key={`${index}-${line}`}>{line}</code>) : <div className="log-empty"><FileText /><span>{logs.data?.available ? "Log file is currently empty." : "No log file yet. Start with the one-click launcher."}</span></div>}
            </div>
          </Panel>
        </ResizablePanel>
        <Separator className="resize-handle" />
        <ResizablePanel defaultSize="42%" minSize="28%">
          <Panel title="Persistent task queue" eyebrow="REAL OPERATIONS" action={<button className="icon-button" aria-label="Refresh jobs" onClick={() => jobs.refetch()}><RefreshCw size={16} className={jobs.isFetching ? "spin" : ""} /></button>}>
            <div className="queue-list">
              {(jobs.data?.jobs ?? []).map((job) => <div className="queue-job" key={job.job_id}><div><strong>{job.job_type.replaceAll("_", " ")}</strong><StatusBadge status={job.status} /></div><p>{job.progress_step}</p><Meter value={(job.progress_completed / Math.max(1, job.progress_total)) * 100} label="Completed steps" />{job.error && <small className="error-text">{job.error}</small>}</div>)}
              {(jobs.data?.jobs.length ?? 0) === 0 && <div className="empty-state compact"><div className="empty-mark">Q</div><h3>Queue is empty</h3><p>No fake background work is running.</p></div>}
            </div>
            <button className="button secondary full" onClick={() => scan.mutate()} disabled={scan.isPending}><Cpu size={16} /> {scan.isPending ? "Queueing…" : "Queue hardware scan"}</button>
          </Panel>
        </ResizablePanel>
      </Group>

      {confirmStop && <div className="confirm-bar" role="alertdialog" aria-label="Confirm safe shutdown"><AlertTriangle /><div><strong>Stop all DocuForge services?</strong><span>Pending project writes finish; the browser will become unavailable.</span></div><button className="button ghost" onClick={() => setConfirmStop(false)}>Cancel</button><button className="button danger" onClick={() => command.mutate("stop_all")}>Confirm safe shutdown</button></div>}
    </div>
  );
}

function ServiceCard({ icon, name, state, detail }: { icon: React.ReactNode; name: string; state?: { status: string; pid: number | null; exit_code?: number | null }; detail: string }) {
  return <div className="service-card"><div className="service-icon">{icon}</div><div><span>{name}</span><strong>{state?.status ?? "checking"}</strong><small>{detail}</small></div><div className="service-state"><StatusBadge status={state?.status ?? "checking"} /><em>{state?.pid ? `PID ${state.pid}` : "No PID"}</em></div></div>;
}
