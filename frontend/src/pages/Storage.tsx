import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, HardDrive, RefreshCw, ShieldAlert, Usb } from "lucide-react";
import { useState } from "react";
import { api, formatBytes, jsonBody } from "../api";
import { ErrorNotice, Meter, Panel, StatusBadge } from "../components/ui";
import type { StorageResponse, Volume } from "../types";

export function StorageManager() {
  const client = useQueryClient();
  const [folderName, setFolderName] = useState("DocuForgeData");
  const query = useQuery({
    queryKey: ["storage"],
    queryFn: () => api<StorageResponse>("/api/v1/storage"),
    refetchInterval: 5000,
  });
  const select = useMutation({
    mutationFn: (volume: Volume) =>
      api("/api/v1/storage/select", {
        method: "POST",
        body: jsonBody({ volume_id: volume.volume_id, folder_name: folderName }),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["storage"] }),
        client.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
  const configuration = query.data?.configuration;

  return (
    <div className="page storage-page">
      <div className="page-heading row">
        <div><span className="eyebrow">HYBRID LOCAL STORAGE</span><h1>Storage Manager</h1><p>Keep the control database internal and large documentary material on your selected SSD.</p></div>
        <button className="button secondary" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw size={16} className={query.isFetching ? "spin" : ""} /> Rescan volumes</button>
      </div>

      {configuration?.configured && (
        <div className={`storage-banner ${configuration.online ? "online" : "offline"}`}>
          {configuration.online ? <CheckCircle2 /> : <ShieldAlert />}
          <div><strong>{configuration.online ? "Project storage is online" : "Configured storage is disconnected"}</strong><span>{configuration.root}</span></div>
          <StatusBadge status={configuration.online ? "online" : "offline"} />
        </div>
      )}

      <div className="storage-policy-grid">
        <Panel title="Internal drive" eyebrow="CONTROL PLANE">
          <div className="storage-role"><Database /><div><strong>Stable writes only</strong><p>SQLite, configuration, logs, small temporary files and future proxy cache.</p></div></div>
          <ul className="check-list"><li>SQLite WAL stays internal</li><li>Online backups use SQLite's backup API</li><li>Original project media is never auto-deleted</li></ul>
        </Panel>
        <Panel title="External SSD" eyebrow="PRODUCTION DATA">
          <div className="storage-role"><Usb /><div><strong>Large assets and projects</strong><p>Source-of-truth manifests, research archives, approved models, media and renders.</p></div></div>
          <ul className="check-list"><li>Identified by volume marker, not drive letter</li><li>Tasks wait safely when disconnected</li><li>At least 20% free-space reserve recommended</li></ul>
        </Panel>
      </div>

      <Panel title="Available volumes" eyebrow="LIVE SYSTEM INVENTORY" action={<label className="folder-name"><span>Root folder</span><input value={folderName} maxLength={80} onChange={(event) => setFolderName(event.target.value)} /></label>}>
        <ErrorNotice error={query.error ?? select.error} />
        <div className="volume-list">
          {(query.data?.volumes ?? []).map((volume) => (
            <article className="volume-card" key={volume.volume_id}>
              <div className="volume-icon">{volume.is_external ? <Usb /> : <HardDrive />}</div>
              <div className="volume-main">
                <div className="volume-title"><div><strong>{volume.label}</strong><span>{volume.mount_point} · {volume.filesystem}</span></div><div className="volume-tags">{volume.is_external && <em>External</em>}<em>{volume.identity_confidence}</em></div></div>
                <Meter value={volume.used_percent} label="Volume used" />
                <div className="volume-stats"><span>{formatBytes(volume.free_bytes)} free</span><span>{formatBytes(volume.total_bytes)} total</span></div>
              </div>
              <button
                className="button secondary"
                disabled={!volume.writable || select.isPending || configuration?.volume_id === volume.volume_id}
                onClick={() => select.mutate(volume)}
              >
                {configuration?.volume_id === volume.volume_id ? "Selected" : volume.writable ? "Use this volume" : "Read-only"}
              </button>
            </article>
          ))}
          {!query.isLoading && (query.data?.volumes.length ?? 0) === 0 && <div className="notice warning">No writable filesystem volumes were detected.</div>}
        </div>
      </Panel>

      <div className="notice subtle"><ShieldAlert size={18} /><div><strong>Disconnect protection</strong><span>DocuForge verifies the marker before external writes. It will not write to a different disk that later receives the same drive letter.</span></div></div>
    </div>
  );
}
