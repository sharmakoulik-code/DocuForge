import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api, jsonBody } from "../api";
import { ErrorNotice, LoadingBlock, Panel } from "../components/ui";
import type { Meta, UserSettings } from "../types";

export function SettingsPage({ meta }: { meta: Meta }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api<UserSettings>("/api/v1/settings") });
  const [form, setForm] = useState<UserSettings | null>(null);
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);
  const save = useMutation({
    mutationFn: () => api<UserSettings>("/api/v1/settings", {
      method: "PUT",
      body: jsonBody({
        expected_revision: form?.revision,
        default_duration_minutes: form?.default_duration_minutes,
        internal_free_reserve_gb: form?.internal_free_reserve_gb,
        external_free_reserve_percent: form?.external_free_reserve_percent,
        resource_refresh_seconds: form?.resource_refresh_seconds,
      }),
    }),
    onSuccess: async (updated) => { setForm(updated); await client.invalidateQueries({ queryKey: ["settings"] }); },
  });
  const setNumber = (key: keyof UserSettings, value: number) => setForm((current) => current ? { ...current, [key]: value } : current);

  return (
    <div className="page settings-page">
      <div className="page-heading"><span className="eyebrow">LOCAL STUDIO POLICY</span><h1>Settings</h1><p>Conservative defaults for a low-memory Windows production workstation.</p></div>
      <div className="settings-layout">
        <Panel title="Production defaults" eyebrow="PROJECT INTAKE">
          {query.isLoading || !form ? <LoadingBlock /> : (
            <form className="settings-form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
              <label><div><strong>Default documentary duration</strong><span>Planning target before narration exists</span></div><div className="number-control"><input type="number" min={2} max={180} value={form.default_duration_minutes} onChange={(event) => setNumber("default_duration_minutes", Number(event.target.value))} /><em>minutes</em></div></label>
              <label><div><strong>Internal free-space reserve</strong><span>New temporary work waits below this level</span></div><div className="number-control"><input type="number" min={5} max={500} value={form.internal_free_reserve_gb} onChange={(event) => setNumber("internal_free_reserve_gb", Number(event.target.value))} /><em>GB</em></div></label>
              <label><div><strong>External SSD reserve</strong><span>Large jobs are blocked before the disk fills</span></div><div className="number-control"><input type="number" min={5} max={80} value={form.external_free_reserve_percent} onChange={(event) => setNumber("external_free_reserve_percent", Number(event.target.value))} /><em>%</em></div></label>
              <label><div><strong>Resource refresh</strong><span>Live local telemetry interval</span></div><div className="number-control"><input type="number" min={1} max={30} value={form.resource_refresh_seconds} onChange={(event) => setNumber("resource_refresh_seconds", Number(event.target.value))} /><em>seconds</em></div></label>
              <ErrorNotice error={query.error ?? save.error} />
              <button className="button primary" disabled={save.isPending}><Save size={16} /> {save.isPending ? "Saving revision…" : "Save local settings"}</button>
            </form>
          )}
        </Panel>
        <div className="settings-aside">
          <Panel title="Network boundary" eyebrow="SECURITY">
            <div className="security-state"><ShieldCheck /><div><strong>{meta.public_bind_warning ? "Wider binding enabled" : "Loopback-only default"}</strong><p>{meta.public_bind_warning ? "An explicit non-local development override is active." : "The production launcher binds to 127.0.0.1 and does not expose DocuForge to your LAN."}</p></div></div>
            <dl className="settings-facts"><div><dt>Local URL</dt><dd>{meta.local_url}</dd></div><div><dt>API keys</dt><dd>None stored in M1</dd></div><div><dt>Cloud account</dt><dd>Not connected</dd></div></dl>
          </Panel>
          <div className="policy-card"><LockKeyhole size={18} /><div><strong>Credential policy</strong><p>Later API keys must use Windows Credential Manager or an approved encrypted store—never project files or Git.</p></div></div>
        </div>
      </div>
    </div>
  );
}
