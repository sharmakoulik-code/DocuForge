export interface Meta {
  app: string;
  version: string;
  milestone: number;
  csrf_token: string;
  local_url: string;
  public_bind_warning: boolean;
  features: Record<string, boolean>;
}

export interface Project {
  project_id: string;
  title: string;
  topic: string;
  status: string;
  revision: number;
  schema_version: number;
  target_duration_minutes: number | null;
  language: string | null;
  aspect_ratio: string | null;
  production_plan_status: string | null;
  root_kind: string;
  relative_folder: string;
  online: boolean;
  editable: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Volume {
  volume_id: string;
  label: string;
  mount_point: string;
  filesystem: string;
  device: string;
  total_bytes: number;
  free_bytes: number;
  used_percent: number;
  is_external: boolean;
  is_removable: boolean;
  identity_confidence: string;
  writable: boolean;
}

export interface StorageConfiguration {
  configured: boolean;
  online: boolean;
  root: string | null;
  volume_id: string | null;
  source: string;
  revision: number;
}

export interface StorageResponse {
  configuration: StorageConfiguration;
  volumes: Volume[];
}

export interface ResourceSnapshot {
  timestamp: string;
  cpu_percent: number;
  memory: { total_bytes: number; available_bytes: number; used_percent: number };
  docuforge_process: { rss_bytes: number; cpu_percent: number };
  disks: Array<{
    volume_id: string;
    label: string;
    free_bytes: number;
    total_bytes: number;
    used_percent: number;
  }>;
}

export interface UserSettings {
  revision: number;
  default_duration_minutes: number;
  internal_free_reserve_gb: number;
  external_free_reserve_percent: number;
  resource_refresh_seconds: number;
}

export interface Job {
  job_id: string;
  job_type: string;
  status: string;
  progress_completed: number;
  progress_total: number;
  progress_step: string;
  result: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceState {
  status: string;
  pid: number | null;
  exit_code?: number | null;
}

export interface Services {
  supervisor: ServiceState;
  api: ServiceState;
  worker: ServiceState;
  public_bind_warning: boolean;
  captured_at?: string;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}
