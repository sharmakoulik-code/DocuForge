import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Archive,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  Captions,
  ChartNoAxesCombined,
  Clapperboard,
  Cpu,
  Database,
  FileAudio,
  FilePenLine,
  Film,
  Gauge,
  GitFork,
  HardDrive,
  Home,
  Image,
  Library,
  Map,
  Menu,
  Mic2,
  MonitorCog,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

export type PageKey =
  | "dashboard"
  | "new"
  | "projects"
  | "storage"
  | "resources"
  | "settings"
  | "control";

interface Item {
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  page?: PageKey;
  milestone?: string;
}

const groups: Array<{ title: string; items: Item[] }> = [
  {
    title: "Production",
    items: [
      { label: "Dashboard", icon: Home, page: "dashboard" },
      { label: "New Documentary", icon: Plus, page: "new" },
      { label: "Projects", icon: Library, page: "projects" },
      { label: "Research Studio", icon: Search, milestone: "M2" },
      { label: "Script Studio", icon: FilePenLine, milestone: "M3" },
      { label: "Storyboard Studio", icon: Clapperboard, milestone: "M4" },
      { label: "Narration Studio", icon: Mic2, milestone: "M5" },
    ],
  },
  {
    title: "Post-production",
    items: [
      { label: "Visual Asset Library", icon: Image, milestone: "M6" },
      { label: "Audio Library", icon: FileAudio, milestone: "M7" },
      { label: "Timeline Editor", icon: SlidersHorizontal, milestone: "M7" },
      { label: "Render Studio", icon: Film, milestone: "M8" },
      { label: "Thumbnail Studio", icon: Sparkles, milestone: "M9" },
      { label: "YouTube Publishing Package", icon: Upload, milestone: "M9" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Research Reports", icon: BookOpenCheck, milestone: "M2" },
      { label: "Model Manager", icon: BrainCircuit, milestone: "M10" },
      { label: "GitHub / Open Source", icon: GitFork, milestone: "M10" },
      { label: "Historical Maps", icon: Map, milestone: "M6" },
      { label: "Infographics", icon: ChartNoAxesCombined, milestone: "M6" },
      { label: "Subtitles", icon: Captions, milestone: "M7" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Storage Manager", icon: HardDrive, page: "storage" },
      { label: "Resource Monitor", icon: Gauge, page: "resources" },
      { label: "Settings", icon: Settings, page: "settings" },
      { label: "System Control Centre", icon: MonitorCog, page: "control" },
    ],
  },
];

export const pageTitles: Record<PageKey, string> = {
  dashboard: "Production Dashboard",
  new: "New Documentary",
  projects: "Project Library",
  storage: "Storage Manager",
  resources: "Resource Monitor",
  settings: "Studio Settings",
  control: "System Control Centre",
};

export function Sidebar({
  active,
  onNavigate,
  mobileOpen,
  onMobileToggle,
}: {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}) {
  return (
    <Tooltip.Provider delayDuration={350}>
      <button className="mobile-menu" onClick={onMobileToggle} aria-label="Toggle navigation">
        {mobileOpen ? <X /> : <Menu />}
      </button>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <span>D</span>
            <i />
          </div>
          <div>
            <strong>DOCUFORGE</strong>
            <small>DOCUMENTARY STUDIO</small>
          </div>
        </div>
        <div className="local-ribbon">
          <span className="live-dot" /> Local production environment
        </div>
        <nav aria-label="Studio navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => {
                const Icon = item.icon;
                const disabled = !item.page;
                const button = (
                  <button
                    key={item.label}
                    type="button"
                    disabled={disabled}
                    className={item.page === active ? "active" : ""}
                    onClick={() => {
                      if (item.page) {
                        onNavigate(item.page);
                        if (window.innerWidth < 900) onMobileToggle();
                      }
                    }}
                    aria-current={item.page === active ? "page" : undefined}
                  >
                    <Icon size={17} strokeWidth={1.7} />
                    <span>{item.label}</span>
                    {item.milestone && <em>{item.milestone}</em>}
                  </button>
                );
                if (!disabled) return button;
                return (
                  <Tooltip.Root key={item.label}>
                    <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="tooltip" side="right" sideOffset={8}>
                        Planned for {item.milestone}. No placeholder functionality is presented.
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                );
              })}
            </div>
          ))}
        </nav>
        <footer className="sidebar-footer">
          <div><Cpu size={15} /> Hardware-aware mode</div>
          <div><Database size={15} /> Files remain local</div>
          <div><Archive size={15} /> M1 Foundation</div>
        </footer>
      </aside>
    </Tooltip.Provider>
  );
}
