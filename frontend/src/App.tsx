import { useQuery } from "@tanstack/react-query";
import { Bell, CircleHelp, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { bootstrap } from "./api";
import { Sidebar, pageTitles, type PageKey } from "./components/Sidebar";
import { ErrorNotice, LoadingBlock } from "./components/ui";
import { ControlCentre } from "./pages/ControlCentre";
import { Dashboard } from "./pages/Dashboard";
import { NewDocumentary } from "./pages/NewDocumentary";
import { Projects } from "./pages/Projects";
import { ResourceMonitor } from "./pages/Resources";
import { SettingsPage } from "./pages/Settings";
import { StorageManager } from "./pages/Storage";
import type { ResourceSnapshot } from "./types";

const validPages: PageKey[] = ["dashboard", "new", "projects", "storage", "resources", "settings", "control"];

function initialPage(): PageKey {
  const value = new URLSearchParams(window.location.search).get("view") as PageKey | null;
  return value && validPages.includes(value) ? value : "dashboard";
}

export default function App() {
  const [page, setPage] = useState<PageKey>(initialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resource, setResource] = useState<ResourceSnapshot | null>(null);
  const meta = useQuery({ queryKey: ["meta"], queryFn: bootstrap, staleTime: Infinity, retry: 2 });

  useEffect(() => {
    if (!meta.data) return;
    const source = new EventSource("/api/v1/system/resources/events");
    source.onmessage = (event) => {
      try { setResource(JSON.parse(event.data) as ResourceSnapshot); } catch { /* Ignore malformed single event; stream will continue. */ }
    };
    return () => source.close();
  }, [meta.data]);

  useEffect(() => {
    const onPop = () => setPage(initialPage());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: PageKey) => {
    setPage(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
  };

  if (meta.isLoading) {
    return <main className="boot-screen"><div className="boot-mark">D<span>F</span></div><LoadingBlock label="Starting local production studio…" /></main>;
  }
  if (meta.error || !meta.data) {
    return <main className="boot-screen"><div className="boot-mark">D<span>F</span></div><ErrorNotice error={meta.error ?? new Error("Local API did not answer")} /><p>Start DocuForge with the one-click launcher, then reload this page.</p></main>;
  }

  const content = (() => {
    switch (page) {
      case "new": return <NewDocumentary navigate={navigate} />;
      case "projects": return <Projects />;
      case "storage": return <StorageManager />;
      case "resources": return <ResourceMonitor resource={resource} />;
      case "settings": return <SettingsPage meta={meta.data} />;
      case "control": return <ControlCentre />;
      default: return <Dashboard navigate={navigate} resource={resource} />;
    }
  })();

  return (
    <div className="app-shell">
      <Sidebar active={page} onNavigate={navigate} mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen((open) => !open)} />
      <div className="studio-main">
        <header className="topbar">
          <div><span>DOCUFORGE / M1</span><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-actions">
            <div className="connection-pill"><Wifi size={14} /><span>Local</span><i /></div>
            <button className="icon-button" aria-label="Help" title="M1 foundation: later studios remain locked"><CircleHelp /></button>
            <button className="icon-button" aria-label="Notifications" title="No unread system notices"><Bell /></button>
            <div className="profile-mark">KS</div>
          </div>
        </header>
        {meta.data.public_bind_warning && <div className="public-warning">Development preview override active — normal Windows use binds only to 127.0.0.1.</div>}
        <main className="content">{content}</main>
      </div>
    </div>
  );
}
