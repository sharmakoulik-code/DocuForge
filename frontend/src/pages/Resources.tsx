import { useQuery } from "@tanstack/react-query";
import { Cpu, Gauge, HardDrive, MemoryStick, ServerCog } from "lucide-react";
import { api, formatBytes } from "../api";
import { Meter, Panel, StatusBadge } from "../components/ui";
import type { ResourceSnapshot } from "../types";

interface HardwareEnvelope {
  report: {
    captured_at: string;
    os: { system: string; release: string; machine: string };
    cpu: { model: string; generation: string | null; physical_cores: number; logical_threads: number };
    memory: { physical_bytes: number; available_bytes: number };
    gpus: Array<{ name: string; adapter_ram_bytes: number | null }>;
    runtimes: Record<string, { available: boolean; version: string | null }>;
    ai_runtimes: Record<string, { available: boolean; version: string | null }>;
    render_capabilities: { h264_qsv_validated: boolean; note: string };
  } | null;
  job_id: string | null;
}

export function ResourceMonitor({ resource }: { resource: ResourceSnapshot | null }) {
  const hardware = useQuery({
    queryKey: ["hardware"],
    queryFn: () => api<HardwareEnvelope>("/api/v1/system/hardware"),
    refetchInterval: 4000,
  });
  const report = hardware.data?.report;
  return (
    <div className="page resource-page">
      <div className="page-heading"><span className="eyebrow">REAL-TIME LOCAL TELEMETRY</span><h1>Resource Monitor</h1><p>Measured values only. No simulated GPU, RAM, queue or render progress.</p></div>
      <div className="resource-metrics">
        <ResourceDial icon={<Cpu />} label="System CPU" value={resource?.cpu_percent ?? 0} detail="Current aggregate load" />
        <ResourceDial icon={<MemoryStick />} label="Physical memory" value={resource?.memory.used_percent ?? 0} detail={resource ? `${formatBytes(resource.memory.available_bytes)} available` : "Connecting to event stream"} />
        <ResourceDial icon={<ServerCog />} label="DocuForge process" value={resource && resource.memory.total_bytes ? (resource.docuforge_process.rss_bytes / resource.memory.total_bytes) * 100 : 0} detail={resource ? `${formatBytes(resource.docuforge_process.rss_bytes)} resident` : "Connecting"} />
      </div>

      <div className="resource-columns">
        <Panel title="Disk pressure" eyebrow="LIVE VOLUMES">
          <div className="disk-pressure-list">
            {(resource?.disks ?? []).map((disk) => (
              <div key={disk.volume_id}><div className="disk-label"><HardDrive size={17} /><div><strong>{disk.label}</strong><span>{formatBytes(disk.free_bytes)} free of {formatBytes(disk.total_bytes)}</span></div></div><Meter value={disk.used_percent} label={`${disk.label} used`} /></div>
            ))}
            {!resource && <div className="loading-block"><span className="spinner" /> Waiting for live telemetry…</div>}
          </div>
        </Panel>

        <Panel title="Memory protection" eyebrow="ADMISSION POLICY">
          <div className="policy-gauge"><Gauge /><div><strong>One heavy lease</strong><p>Future AI and render tasks will never run concurrently on this 8 GB target.</p></div></div>
          <div className="threshold-list"><div><span>AI start threshold</span><strong>≥ 1.5 GB available</strong></div><div><span>Worker concurrency</span><strong>1</strong></div><div><span>Automatic file deletion</span><strong>Never</strong></div></div>
        </Panel>
      </div>

      <Panel title="Latest capability report" eyebrow="HARDWARE & RUNTIMES">
        {report ? (
          <div className="capability-grid">
            <Capability label="Operating system" value={`${report.os.system} ${report.os.release} · ${report.os.machine}`} />
            <Capability label="Processor" value={`${report.cpu.model}${report.cpu.generation ? ` · ${report.cpu.generation}` : ""}`} />
            <Capability label="Topology" value={`${report.cpu.physical_cores ?? "?"} cores · ${report.cpu.logical_threads ?? "?"} threads`} />
            <Capability label="Physical RAM" value={formatBytes(report.memory.physical_bytes)} />
            <Capability label="Graphics" value={report.gpus.length ? report.gpus.map((gpu) => gpu.name).join(", ") : "No adapter reported"} />
            {Object.entries(report.runtimes).map(([name, runtime]) => <Capability key={name} label={name} value={runtime.available ? runtime.version ?? "Available" : "Not installed"} status={runtime.available ? "available" : "not installed"} />)}
            {Object.entries(report.ai_runtimes).map(([name, runtime]) => <Capability key={name} label={name.replaceAll("_", " ")} value={runtime.available ? runtime.version ?? "Available" : "Not installed"} status={runtime.available ? "available" : "not installed"} />)}
            <Capability label="Intel Quick Sync" value={report.render_capabilities.h264_qsv_validated ? "Validated" : "Not validated"} status={report.render_capabilities.h264_qsv_validated ? "available" : "not validated"} />
          </div>
        ) : (
          <div className="empty-state compact"><div className="empty-mark">HW</div><h3>No completed capability scan</h3><p>Run the scan from Dashboard or Control Centre. Detection never loads an AI model.</p></div>
        )}
      </Panel>
    </div>
  );
}

function ResourceDial({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="resource-dial-card"><div className="dial" style={{ background: `conic-gradient(var(--gold) ${safe * 3.6}deg, rgba(255,255,255,.06) 0deg)` }}><div><strong>{Math.round(safe)}%</strong><span>{icon}</span></div></div><div><span>{label}</span><p>{detail}</p></div></div>;
}

function Capability({ label, value, status }: { label: string; value: string; status?: string }) {
  return <div className="capability-item"><span>{label}</span><strong>{value}</strong>{status && <StatusBadge status={status} />}</div>;
}
