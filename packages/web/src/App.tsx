import { useCallback, useEffect, useState } from "react";
import { api, type Analysis, type Claim, type Project } from "./api";

const CHAPTER_RE = /^##\s+Chapter\s+(\d+)\s*:\s*(.+?)\s*$/;

/**
 * Word count under the same rule the engine uses (parseChapters): only text
 * after a `## Chapter N: title` line counts. Pre-chapter prose and heading
 * lines are excluded, so the live figure here matches the saved outline
 * instead of quietly disagreeing with it.
 */
function liveStats(markdown: string): { total: number; chapterNumbers: number[] } {
  const bodies: string[] = [];
  let current: string[] | null = null;
  const chapterNumbers: number[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(CHAPTER_RE);
    if (m) {
      if (current) bodies.push(current.join("\n"));
      chapterNumbers.push(parseInt(m[1], 10));
      current = [];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) bodies.push(current.join("\n"));
  const total = bodies.reduce((sum, body) => {
    const trimmed = body.trim();
    return sum + (trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  return { total, chapterNumbers };
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [markdown, setMarkdown] = useState("");
  const [savedMarkdown, setSavedMarkdown] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [status, setStatus] = useState("Loading…");
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const refreshProjects = useCallback(async () => {
    try {
      const { projects: ps } = await api.listProjects();
      setProjects(ps);
      if (ps.length > 0 && !selected) setSelected(ps[0].name);
    } catch (e) {
      setStatus(`API error: ${(e as Error).message}. Is the API running? (npm run dev:api)`);
    }
  }, [selected]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const [{ markdown: md }, { analysis: an }, fc] = await Promise.all([
          api.getScript(selected),
          api.getAnalysis(selected),
          api.getFactcheck(selected),
        ]);
        setMarkdown(md);
        setSavedMarkdown(md);
        setAnalysis(an);
        setClaims(fc.claims ?? []);
        setStatus("Ready");
      } catch (e) {
        setStatus(`Error loading project: ${(e as Error).message}`);
      }
    })();
  }, [selected]);

  // Live word count + runtime estimate (client-side, 150 wpm planning figure),
  // counted under the engine's chapter rules so it agrees with the outline.
  const live = liveStats(markdown);
  const liveWords = live.total;
  const liveMinutes = liveWords / 150;
  const dirty = markdown !== savedMarkdown;
  const unsourced = claims.filter((c) => c.source.trim() === "").length;
  const numberingGaps = live.chapterNumbers.some((n, i) => n !== i + 1);

  async function save() {
    if (!selected) return;
    try {
      setStatus("Saving…");
      await api.saveScript(selected, markdown);
      const { analysis: an } = await api.getAnalysis(selected);
      setAnalysis(an);
      setSavedMarkdown(markdown);
      setStatus("Saved");
    } catch (e) {
      setStatus(`Save failed: ${(e as Error).message}`);
    }
  }

  async function create() {
    if (!newName.trim()) return;
    try {
      setStatus("Creating…");
      await api.createProject({ name: newName.trim(), title: newTitle.trim() || undefined });
      setNewName("");
      setNewTitle("");
      await refreshProjects();
      setSelected(newName.trim());
      setStatus("Created");
    } catch (e) {
      setStatus(`Create failed: ${(e as Error).message}`);
    }
  }

  async function addClaim() {
    const id = `c${Date.now()}`;
    const next: Claim[] = [...claims, { id, claim: "", source: "", status: "unverified", chapter: null }];
    setClaims(next);
    if (selected) await api.saveFactcheck(selected, next);
  }

  async function updateClaim(id: string, patch: Partial<Claim>) {
    const next = claims.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setClaims(next);
    if (selected) await api.saveFactcheck(selected, next);
  }

  async function removeClaim(id: string) {
    const next = claims.filter((c) => c.id !== id);
    setClaims(next);
    if (selected) await api.saveFactcheck(selected, next);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>DocuForge</h1>
        <span style={{ color: "#666" }}>{status}</span>
      </header>
      <p style={{ color: "#555", marginTop: -8 }}>
        Local-first documentary production. The script is authoritative — AI may only propose accept/reject diffs.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {projects.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} — {p.title}
            </option>
          ))}
        </select>
        <input placeholder="new-project-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input placeholder="Title (optional)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button onClick={create}>New project</button>
        <button onClick={save} disabled={!selected}>
          Save script
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div>
          <h2>Script editor</h2>
          <p style={{ color: "#555" }}>
            Markdown with <code>## Chapter N: title</code> headings. Live: {liveWords} words ≈{" "}
            {liveMinutes.toFixed(1)} min (150 wpm planning figure only, counted inside chapters like the
            outline).{" "}
            {dirty ? (
              <strong style={{ color: "#a60" }}>Unsaved changes — outline updates on Save.</strong>
            ) : null}
          </p>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={24}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 14 }}
            placeholder="# Title&#10;&#10;## Chapter 1: Introduction&#10;&#10;Write narration here…"
          />
        </div>

        <div>
          <h2>Chapter outline</h2>
          {analysis ? (
            <>
              <p>
                <strong>{analysis.totalWords}</strong> words ≈ <strong>{analysis.estimatedRuntime}</strong> (target{" "}
                {analysis.runtimeTargetMinutes} min)
              </p>
              <ol>
                {analysis.chapters.map((c, i) => (
                  <li key={`${c.number}-${i}`}>
                    {c.title} <span style={{ color: "#777" }}>({c.wordCount}w, {c.estimatedRuntime})</span>
                  </li>
                ))}
              </ol>
              {analysis.chapters.some((c, i) => c.number !== i + 1) || numberingGaps ? (
                <p style={{ color: "#a60" }}>
                  Chapter numbers are not 1, 2, 3… in order. They are kept in document order — the engine does
                  not renumber them.
                </p>
              ) : null}
            </>
          ) : (
            <p>No analysis yet.</p>
          )}

          <h2>Sources / claims</h2>
          <p style={{ color: "#555" }}>
            Link each claim to a source and the chapter it appears in. No fabrication — every fact needs a
            source.
            {unsourced > 0 ? <strong style={{ color: "#a60" }}> {unsourced} without a source.</strong> : null}
          </p>
          {claims.map((c) => (
            <div key={c.id} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
              <input
                placeholder="Claim"
                value={c.claim}
                onChange={(e) => void updateClaim(c.id, { claim: e.target.value })}
                style={{ width: "100%", marginBottom: 4 }}
              />
              <input
                placeholder="Source (URL / citation)"
                value={c.source}
                onChange={(e) => void updateClaim(c.id, { source: e.target.value })}
                style={{ width: "100%", marginBottom: 4 }}
              />
              <select
                value={c.status}
                onChange={(e) => void updateClaim(c.id, { status: e.target.value as Claim["status"] })}
              >
                <option value="unverified">unverified</option>
                <option value="verified">verified</option>
                <option value="disputed">disputed</option>
              </select>{" "}
              <select
                title="Chapter this claim appears in"
                value={c.chapter === null || c.chapter === undefined ? "" : String(c.chapter)}
                onChange={(e) =>
                  void updateClaim(c.id, {
                    chapter: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">no chapter</option>
                {(analysis?.chapters ?? []).map((ch) => (
                  <option key={ch.number} value={ch.number}>
                    Ch {ch.number}: {ch.title}
                  </option>
                ))}
              </select>{" "}
              <button onClick={() => void removeClaim(c.id)}>Remove</button>
            </div>
          ))}
          <button onClick={() => void addClaim()}>Add claim</button>
        </div>
      </div>
    </div>
  );
}
