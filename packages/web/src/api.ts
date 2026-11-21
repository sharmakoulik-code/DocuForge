export interface Project {
  name: string;
  title: string;
  runtime_target_minutes: number;
  language: string;
  theme: string;
  strict_mode: boolean;
}

export interface Chapter {
  number: number;
  title: string;
  wordCount: number;
  estimatedRuntime: string;
}

export interface Analysis {
  title: string;
  chapters: Chapter[];
  totalWords: number;
  estimatedRuntime: string;
  runtimeTargetMinutes: number;
  withinTarget: boolean;
}

export interface Claim {
  id: string;
  claim: string;
  source: string;
  status: "verified" | "unverified" | "disputed";
  chapter: number | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => req<{ projects: Project[] }>("/api/projects"),
  createProject: (body: { name: string; title?: string; runtime_target_minutes?: number; language?: string; theme?: string; strict_mode?: boolean }) =>
    req<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  getScript: (name: string) => req<{ markdown: string }>(`/api/projects/${encodeURIComponent(name)}/script`),
  saveScript: (name: string, markdown: string) =>
    req<{ ok: boolean }>(`/api/projects/${encodeURIComponent(name)}/script`, { method: "PUT", body: JSON.stringify({ markdown }) }),
  getAnalysis: (name: string) =>
    req<{ analysis: Analysis }>(`/api/projects/${encodeURIComponent(name)}/script/analysis`),
  getFactcheck: (name: string) =>
    req<{ claims: Claim[] }>(`/api/projects/${encodeURIComponent(name)}/factcheck`),
  saveFactcheck: (name: string, claims: Claim[]) =>
    req<{ ok: boolean }>(`/api/projects/${encodeURIComponent(name)}/factcheck`, {
      method: "PUT",
      body: JSON.stringify({ claims }),
    }),
};
