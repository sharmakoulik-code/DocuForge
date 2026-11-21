import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type Analysis, type Claim, type Project } from "./api";

const WPM = 150; // planning figure only — real audio timing arrives in P2
const CHAPTER_RE = /^##\s+Chapter\s+(\d+)\s*:\s*(.+?)\s*$/;

type StatusKind = "loading" | "ready" | "saving" | "saved" | "error";
interface Status {
  kind: StatusKind;
  text: string;
}

interface LiveChapter {
  number: number;
  title: string;
  words: number;
  offset: number;
}

function wordsOf(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function formatRuntime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Live chapter parse — same rule the engine uses (parseChapters): only text
 * after a `## Chapter N: title` line counts, and other headings stay inside
 * the current chapter's body. Keeps the editor's numbers and the saved
 * analysis in agreement.
 */
function liveStats(markdown: string): { total: number; chapters: LiveChapter[] } {
  const lines = markdown.split(/\r?\n/);
  const nl = markdown.includes("\r\n") ? 2 : 1;
  const chapters: LiveChapter[] = [];
  let current: LiveChapter | null = null;
  let body: string[] = [];
  let offset = 0;

  const flush = () => {
    if (current) {
      current.words = wordsOf(body.join("\n"));
      chapters.push(current);
    }
    body = [];
  };

  for (const line of lines) {
    const m = line.match(CHAPTER_RE);
    if (m) {
      flush();
      current = { number: parseInt(m[1], 10), title: m[2], words: 0, offset };
    } else if (current) {
      body.push(line);
    }
    offset += line.length + nl;
  }
  flush();

  return { total: chapters.reduce((sum, c) => sum + c.words, 0), chapters };
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [savedMarkdown, setSavedMarkdown] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "loading", text: "Loading…" });
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("docuforge.theme") as "dark" | "light" | null) ?? "dark"
  );

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  // Saves are serialized through this promise so two writes can never race
  // (autosave firing while a manual Ctrl+S is still in flight).
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const dirty = markdown !== savedMarkdown;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("docuforge.theme", theme);
  }, [theme]);

  const refreshProjects = useCallback(async () => {
    try {
      const { projects: ps } = await api.listProjects();
      setProjects(ps);
      setSelected((cur) => (cur && ps.some((p) => p.name === cur) ? cur : ps[0]?.name ?? ""));
      setStatus((s) => (s.kind === "error" ? { kind: "ready", text: "Ready" } : s));
    } catch (e) {
      setStatus({
        kind: "error",
        text: `API offline — ${(e as Error).message}`,
      });
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  // Load a project's files whenever the selection changes.
  useEffect(() => {
    if (!selected) {
      setMarkdown("");
      setSavedMarkdown("");
      setAnalysis(null);
      setClaims([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [{ markdown: md }, { analysis: an }, fc] = await Promise.all([
          api.getScript(selected),
          api.getAnalysis(selected),
          api.getFactcheck(selected),
        ]);
        if (cancelled) return;
        setMarkdown(md);
        setSavedMarkdown(md);
        setAnalysis(an);
        setClaims(fc.claims ?? []);
        setStatus({ kind: "ready", text: "Ready" });
      } catch (e) {
        if (!cancelled) setStatus({ kind: "error", text: `Load failed — ${(e as Error).message}` });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const persist = useCallback((name: string, md: string): Promise<void> => {
    const run = async () => {
      setStatus({ kind: "saving", text: "Saving…" });
      try {
        await api.saveScript(name, md);
        const { analysis: an } = await api.getAnalysis(name);
        setAnalysis(an);
        setSavedMarkdown(md);
        const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setStatus({ kind: "saved", text: `Saved ${at}` });
      } catch (e) {
        setStatus({ kind: "error", text: `Save failed — ${(e as Error).message}` });
      }
    };
    const next = saveChainRef.current.then(run, run);
    saveChainRef.current = next.catch(() => undefined);
    return next;
  }, []);

  // Autosave: the script is the source of truth, so don't let a forgotten
  // Ctrl+S cost the writer a paragraph.
  useEffect(() => {
    if (!selected || !dirty) return;
    const t = window.setTimeout(() => void persist(selected, markdown), 1200);
    return () => window.clearTimeout(t);
  }, [markdown, selected, dirty, persist]);

  // Flush before the tab closes so a pending debounce can't lose the last edit.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Switching projects: write the outgoing script first, then load the new one.
  const switchProject = useCallback(
    async (next: string) => {
      if (dirty && selected) await persist(selected, markdown);
      setSelected(next);
    },
    [dirty, selected, markdown, persist]
  );

  // Ctrl/Cmd+S saves immediately.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (selected && dirty) void persist(selected, markdown);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, dirty, markdown, persist]);

  const live = useMemo(() => liveStats(markdown), [markdown]);
  const targetMinutes = analysis?.runtimeTargetMinutes ?? 25;
  const targetWords = Math.round(targetMinutes * WPM);
  const estimatedSeconds = (live.total / WPM) * 60;
  const ratio = targetWords > 0 ? live.total / targetWords : 0;
  const barState = ratio < 0.9 ? "under" : ratio > 1.15 ? "over" : "ok";
  const deltaMinutes = (targetWords - live.total) / WPM;
  const unsourced = claims.filter((c) => c.source.trim() === "").length;
  const unverified = claims.filter((c) => c.status !== "verified").length;
  const numberingOff = live.chapters.some((c, i) => c.number !== i + 1);
  const perChapterTarget = live.chapters.length > 0 ? targetWords / live.chapters.length : 0;

  async function createProject() {
    const name = newName.trim();
    if (!name) return;
    try {
      setStatus({ kind: "loading", text: "Creating…" });
      if (dirty && selected) await persist(selected, markdown);
      await api.createProject({ name, title: newTitle.trim() || undefined });
      setNewName("");
      setNewTitle("");
      const { projects: ps } = await api.listProjects();
      setProjects(ps);
      setSelected(name);
      setStatus({ kind: "ready", text: "Project created" });
    } catch (e) {
      setStatus({ kind: "error", text: `Create failed — ${(e as Error).message}` });
    }
  }

  const saveClaims = useCallback(
    async (next: Claim[]) => {
      if (!selected) return;
      setClaims(next);
      try {
        await api.saveFactcheck(selected, next);
      } catch (e) {
        setStatus({ kind: "error", text: `Claim save failed — ${(e as Error).message}` });
      }
    },
    [selected]
  );

  const addClaim = () =>
    void saveClaims([
      ...claims,
      { id: `c${Date.now()}`, claim: "", source: "", status: "unverified", chapter: null },
    ]);

  const updateClaim = (id: string, patch: Partial<Claim>) =>
    void saveClaims(claims.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeClaim = (id: string) => void saveClaims(claims.filter((c) => c.id !== id));

  function jumpToChapter(offset: number) {
    const ta = editorRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(offset, offset);
    const maxScroll = Math.max(0, ta.scrollHeight - ta.clientHeight);
    ta.scrollTop = (offset / Math.max(1, ta.value.length)) * maxScroll;
  }

  const runtimeBadge =
    barState === "ok"
      ? { tone: "ok", label: "on target" }
      : barState === "under"
        ? { tone: "warn", label: `${deltaMinutes.toFixed(1)} min to go` }
        : { tone: "danger", label: `${Math.abs(deltaMinutes).toFixed(1)} min over` };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <h1>DocuForge</h1>
            <small>Local-first documentary production</small>
          </div>
        </div>

        <div className="project-picker">
          <label className="sr-only" htmlFor="project">
            Project
          </label>
          <select
            id="project"
            value={selected}
            onChange={(e) => void switchProject(e.target.value)}
            disabled={projects.length === 0}
          >
            {projects.length === 0 ? (
              <option value="">no projects yet</option>
            ) : (
              projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.title} — {p.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grow" />

        <span className="status-pill" data-kind={status.kind} title={status.text}>
          <span className="dot" />
          {status.text}
        </span>

        <button
          className="btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <button
          className="btn btn-primary"
          onClick={() => selected && void persist(selected, markdown)}
          disabled={!selected || !dirty}
        >
          Save script
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="onboard">
          <h2>No projects yet</h2>
          <p>
            A project is a folder of plain files: <code>script.md</code>, <code>factcheck.json</code>, audio, assets. Nothing
            leaves this machine.
          </p>
          <div className="panel">
            <div className="panel-head">
              <h2>New project</h2>
            </div>
            <div className="panel-body new-project">
              <input
                placeholder="project-name (letters, numbers, hyphens)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createProject()}
              />
              <input
                placeholder="Documentary title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createProject()}
              />
              <button className="btn btn-primary" onClick={() => void createProject()} disabled={!newName.trim()}>
                Create project
              </button>
              {status.kind === "error" ? <p className="danger-line">{status.text}</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <main className="workspace">
          <section className="panel editor-panel">
            <div className="panel-head">
              <h2>Script</h2>
              <span className="count">## Chapter N: title</span>
              <div className="grow" />
              {dirty ? (
                <span className="badge" data-tone="warn">
                  unsaved
                </span>
              ) : (
                <span className="badge" data-tone="ok">
                  saved
                </span>
              )}
            </div>
            <label className="sr-only" htmlFor="script">
              Script markdown
            </label>
            <textarea
              id="script"
              ref={editorRef}
              className="editor"
              value={markdown}
              spellCheck
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={"# Your documentary\n\n## Chapter 1: Introduction\n\nWrite narration here…"}
            />
            <div className="editor-foot">
              <span>
                <strong>{live.total.toLocaleString()}</strong> words
              </span>
              <span>·</span>
              <span>{live.chapters.length} chapters</span>
              <span>·</span>
              <span>≈ {formatRuntime(estimatedSeconds)} at {WPM} wpm</span>
              <div className="grow" />
              <span className="hint">
                autosaves · <kbd>Ctrl</kbd> + <kbd>S</kbd> to save now
              </span>
            </div>
          </section>

          <aside>
            <div className="panel">
              <div className="panel-head">
                <h2>Runtime</h2>
                <div className="grow" />
                <span className="badge" data-tone={runtimeBadge.tone}>
                  {runtimeBadge.label}
                </span>
              </div>
              <div className="panel-body">
                <div className="runtime">
                  <div className="runtime-big">{formatRuntime(estimatedSeconds)}</div>
                  <div className="runtime-target">
                    target {targetMinutes}:00
                    <br />
                    {targetWords.toLocaleString()} words
                  </div>
                </div>
                <div className="bar">
                  <div className="bar-fill" data-state={barState} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                </div>
                <div className="bar-legend">
                  <span>{live.total.toLocaleString()} words</span>
                  <span>{Math.round(ratio * 100)}% of target</span>
                </div>
                <p className="hint" style={{ marginBottom: 0 }}>
                  Planning figure only ({WPM} wpm). Recorded narration becomes authoritative in P2.
                </p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Chapters</h2>
                <div className="grow" />
                <span className="count">{live.chapters.length}</span>
              </div>
              <div className="panel-body">
                {live.chapters.length === 0 ? (
                  <p className="empty-note">
                    No chapters yet. Add a <code>## Chapter 1: title</code> heading.
                  </p>
                ) : (
                  <ul className="chapter-list">
                    {live.chapters.map((c, i) => (
                      <li key={`${c.number}-${i}`}>
                        <button className="chapter-row" onClick={() => jumpToChapter(c.offset)}>
                          <span className="chapter-num">{c.number}</span>
                          <span className="chapter-name">{c.title}</span>
                          <span className="chapter-meta">
                            {c.words}w · {formatRuntime((c.words / WPM) * 60)}
                          </span>
                          <span className="chapter-bar">
                            <span
                              style={{
                                width: `${perChapterTarget > 0 ? Math.min(100, (c.words / perChapterTarget) * 100) : 0}%`,
                                background: c.words === 0 ? "var(--border-strong)" : undefined,
                              }}
                            />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {numberingOff ? (
                  <p className="warn-line">
                    Chapter numbers are not 1, 2, 3… in order — kept as written, not renumbered.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Sources &amp; claims</h2>
                <div className="grow" />
                {unsourced > 0 ? (
                  <span className="badge" data-tone="danger">
                    {unsourced} unsourced
                  </span>
                ) : claims.length > 0 ? (
                  <span className="badge" data-tone="ok">
                    all sourced
                  </span>
                ) : null}
              </div>
              <div className="panel-body">
                <p className="empty-note" style={{ marginBottom: claims.length ? 10 : 0 }}>
                  Every fact needs a source. {unverified > 0 && claims.length > 0 ? `${unverified} not verified.` : ""}
                </p>
                {claims.map((c, i) => (
                  <div className="claim" key={c.id}>
                    <div className="claim-head">
                      <span className="claim-index">#{i + 1}</span>
                      <div className="grow" />
                      <select
                        aria-label="Verification status"
                        data-status={c.status}
                        value={c.status}
                        onChange={(e) => updateClaim(c.id, { status: e.target.value as Claim["status"] })}
                      >
                        <option value="unverified">unverified</option>
                        <option value="verified">verified</option>
                        <option value="disputed">disputed</option>
                      </select>
                      <button className="btn-danger-ghost" title="Remove claim" onClick={() => removeClaim(c.id)}>
                        ✕
                      </button>
                    </div>
                    <input
                      placeholder="Claim (what the script asserts)"
                      value={c.claim}
                      onChange={(e) => updateClaim(c.id, { claim: e.target.value })}
                    />
                    <input
                      placeholder="Source (URL / citation)"
                      value={c.source}
                      onChange={(e) => updateClaim(c.id, { source: e.target.value })}
                    />
                    <div className="claim-row">
                      <select
                        aria-label="Chapter this claim appears in"
                        value={c.chapter === null || c.chapter === undefined ? "" : String(c.chapter)}
                        onChange={(e) =>
                          updateClaim(c.id, { chapter: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      >
                        <option value="">no chapter</option>
                        {live.chapters.map((ch, idx) => (
                          <option key={`${ch.number}-${idx}`} value={ch.number}>
                            Ch {ch.number}: {ch.title}
                          </option>
                        ))}
                      </select>
                      {c.source.trim() === "" ? (
                        <span className="badge" data-tone="danger">
                          needs source
                        </span>
                      ) : (
                        <span className="badge" data-tone="ok">
                          sourced
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <button className="btn" onClick={addClaim} style={{ marginTop: claims.length ? 10 : 0 }}>
                  + Add claim
                </button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Files</h2>
              </div>
              <div className="panel-body">
                <div className="file-row">
                  <span>Script</span>
                  <span className="path-hint">projects/{selected}/script/script.md</span>
                </div>
                <div className="file-row">
                  <span>Claims</span>
                  <span className="path-hint">projects/{selected}/script/factcheck.json</span>
                </div>
                <div className="file-row">
                  <span>Project</span>
                  <span className="path-hint">projects/{selected}/project.json</span>
                </div>
                <p className="hint" style={{ marginBottom: 0 }}>
                  Plain files on your disk are the source of truth.
                </p>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>New project</h2>
              </div>
              <div className="panel-body new-project">
                <input
                  placeholder="project-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createProject()}
                />
                <input
                  placeholder="Documentary title (optional)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void createProject()}
                />
                <button className="btn" onClick={() => void createProject()} disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
