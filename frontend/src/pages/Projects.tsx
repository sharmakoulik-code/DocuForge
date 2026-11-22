import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Edit3, Film, FolderLock, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, jsonBody } from "../api";
import { EmptyState, ErrorNotice, LoadingBlock, Panel, StatusBadge } from "../components/ui";
import type { Project } from "../types";

export function Projects() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: Project[] }>("/api/v1/projects"),
  });
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return query.data?.projects ?? [];
    return (query.data?.projects ?? []).filter((project) =>
      `${project.title} ${project.topic}`.toLocaleLowerCase().includes(needle),
    );
  }, [query.data, search]);

  return (
    <div className="page projects-page">
      <div className="page-heading row">
        <div><span className="eyebrow">SOURCE-OF-TRUTH FILES</span><h1>Project library</h1><p>Indexed from local manifests. Database records can always be rebuilt.</p></div>
        <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search local projects" /></label>
      </div>
      <ErrorNotice error={query.error} />
      {query.isLoading ? <LoadingBlock label="Scanning project manifests…" /> : filtered.length === 0 ? (
        <EmptyState title={search ? "No matching projects" : "No projects indexed"} text={search ? "Try a different title or topic." : "Configure storage and create your first topic-only draft."} />
      ) : (
        <div className="project-grid">
          {filtered.map((project, index) => (
            <article className={`project-card accent-${index % 4}`} key={project.project_id}>
              <button className="project-cover" onClick={() => setSelected(project)} aria-label={`Open ${project.title}`}>
                <div className="cover-grid" />
                <span className="cover-index">DF/{String(index + 1).padStart(2, "0")}</span>
                <div className="cover-title"><small>DOCUMENTARY PROJECT</small><strong>{project.title}</strong></div>
                <Film size={32} strokeWidth={1.2} />
              </button>
              <div className="project-card-body">
                <div className="project-title-line"><div><h2>{project.title}</h2><p>{project.topic}</p></div><StatusBadge status={project.online ? project.status : "offline"} /></div>
                <div className="project-meta">
                  <span><CalendarClock size={14} /> {project.target_duration_minutes ? `${project.target_duration_minutes} min` : "Legacy duration"}</span>
                  <span>{project.aspect_ratio ?? "Format unknown"}</span>
                  <span>{project.root_kind}</span>
                </div>
                <div className="project-actions">
                  <button className="button secondary" onClick={() => setSelected(project)}>Project details</button>
                  {project.editable ? <span><Edit3 size={14} /> Editable</span> : <span><FolderLock size={14} /> Preserved read-only</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <ProjectDialog project={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(35);
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setTopic(project.topic);
      setDuration(project.target_duration_minutes ?? 35);
    }
  }, [project]);
  const mutation = useMutation({
    mutationFn: () =>
      api<Project>(`/api/v1/projects/${project?.project_id}`, {
        method: "PATCH",
        body: jsonBody({
          expected_revision: project?.revision,
          title,
          topic,
          target_duration_minutes: duration,
        }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
  });
  return (
    <Dialog.Root
      open={Boolean(project)}
      onOpenChange={(open) => {
        if (!open) onClose();
        if (open && project) {
          setTitle(project.title);
          setTopic(project.topic);
          setDuration(project.target_duration_minutes ?? 35);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="dialog-top"><div><span className="eyebrow">PROJECT MANIFEST</span><Dialog.Title>{project?.title}</Dialog.Title><Dialog.Description>Revision {project?.revision} · {project?.relative_folder}</Dialog.Description></div><Dialog.Close className="icon-button"><X /></Dialog.Close></div>
          {project?.editable ? (
            <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
              <label><span>Display title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={500} /></label>
              <label><span>Topic</span><textarea rows={4} value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={500} /></label>
              <label><span>Target minutes</span><input type="number" min={2} max={180} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
              <ErrorNotice error={mutation.error} />
              <div className="dialog-actions"><Dialog.Close className="button ghost" type="button">Cancel</Dialog.Close><button className="button primary" disabled={!title.trim() || !topic.trim() || mutation.isPending}>{mutation.isPending ? "Saving atomically…" : "Save revision"}</button></div>
            </form>
          ) : (
            <div className="read-only-detail"><FolderLock /><div><strong>This manifest is preserved read-only.</strong><p>Legacy and offline projects are indexed without silent schema migration or modification.</p></div></div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
