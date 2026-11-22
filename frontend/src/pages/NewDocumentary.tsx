import * as Select from "@radix-ui/react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Clapperboard, Film, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api, jsonBody } from "../api";
import { ErrorNotice, Panel } from "../components/ui";
import type { PageKey } from "../components/Sidebar";
import type { Project, StorageResponse, UserSettings } from "../types";

export function NewDocumentary({ navigate }: { navigate: (page: PageKey) => void }) {
  const client = useQueryClient();
  const storage = useQuery({
    queryKey: ["storage"],
    queryFn: () => api<StorageResponse>("/api/v1/storage"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<UserSettings>("/api/v1/settings"),
  });
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(35);
  const [aspect, setAspect] = useState("16:9");
  useEffect(() => {
    if (settings.data) setDuration(settings.data.default_duration_minutes);
  }, [settings.data]);

  const create = useMutation({
    mutationFn: () =>
      api<Project>("/api/v1/projects", {
        method: "POST",
        body: jsonBody({
          topic,
          target_duration_minutes: duration,
          language: "en",
          aspect_ratio: aspect,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["projects"] });
      navigate("projects");
    },
  });
  const storageReady = Boolean(storage.data?.configuration.online);

  return (
    <div className="page new-project-page">
      <div className="page-heading">
        <span className="eyebrow">PROJECT INTAKE</span>
        <h1>Begin with one compelling subject.</h1>
        <p>Create a durable local draft. AI planning is intentionally not simulated in Milestone 1.</p>
      </div>
      <div className="intake-layout">
        <Panel className="intake-form-panel">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (storageReady && topic.trim()) create.mutate();
            }}
          >
            <div className="step-label"><span>01</span><div><strong>Documentary topic</strong><small>The subject that will anchor future research</small></div></div>
            <label className="topic-field">
              <span>What story do you want to investigate?</span>
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={500}
                rows={5}
                placeholder="How the East India Company Took Control of India"
                autoFocus
              />
              <small>{topic.length}/500 characters</small>
            </label>

            <div className="form-divider" />
            <div className="step-label"><span>02</span><div><strong>Production frame</strong><small>Editable project constraints, not AI output</small></div></div>
            <div className="field-grid">
              <label>
                <span>Target duration</span>
                <Select.Root value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
                  <Select.Trigger className="select-trigger" aria-label="Target duration">
                    <Select.Value /><ChevronDown size={15} />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="select-content" position="popper" sideOffset={5}>
                      <Select.Viewport>
                        {[2, 3, 15, 30, 35, 45, 60].map((minutes) => (
                          <Select.Item value={String(minutes)} key={minutes} className="select-item">
                            <Select.ItemText>{minutes} minutes{minutes <= 3 ? " · test" : ""}</Select.ItemText>
                            <Select.ItemIndicator><Check size={14} /></Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label>
                <span>Format</span>
                <Select.Root value={aspect} onValueChange={setAspect}>
                  <Select.Trigger className="select-trigger" aria-label="Video format">
                    <Select.Value /><ChevronDown size={15} />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="select-content" position="popper" sideOffset={5}>
                      <Select.Viewport>
                        <Select.Item value="16:9" className="select-item"><Select.ItemText>16:9 · Documentary</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>
                        <Select.Item value="9:16" className="select-item"><Select.ItemText>9:16 · Shorts</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label>
                <span>Output language</span>
                <div className="locked-field">English <LockKeyhole size={14} /></div>
              </label>
            </div>

            {!storageReady && !storage.isLoading && (
              <div className="notice warning">
                <HardDriveNotice />
                <div><strong>Project storage is not configured.</strong><span>Choose the external SSD before creating a source-of-truth project.</span></div>
                <button type="button" className="text-button" onClick={() => navigate("storage")}>Open Storage Manager</button>
              </div>
            )}
            <ErrorNotice error={create.error} />
            <button className="button primary large" disabled={!topic.trim() || !storageReady || create.isPending}>
              {create.isPending ? <span className="spinner" /> : <Clapperboard size={18} />}
              {create.isPending ? "Creating atomic project…" : "Create documentary draft"}
            </button>
          </form>
        </Panel>

        <aside className="intake-aside">
          <Panel title="What happens now" eyebrow="MILESTONE 1">
            <ol className="process-list">
              <li className="current"><span><Film /></span><div><strong>Local draft created</strong><p>A versioned manifest is written atomically.</p></div></li>
              <li><span><Sparkles /></span><div><strong>AI production proposal</strong><p>Locked until its later milestone and model approval.</p></div></li>
              <li><span>03</span><div><strong>Research approval</strong><p>No research starts without your approved plan.</p></div></li>
            </ol>
          </Panel>
          <div className="policy-card">
            <LockKeyhole size={18} />
            <div><strong>Local by design</strong><p>No topic or project data is sent to an external service.</p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function HardDriveNotice() {
  return <div className="notice-icon">!</div>;
}
