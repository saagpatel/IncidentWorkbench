/**
 * TypeScript types mirroring backend Pydantic models
 */

export enum Severity {
  SEV1 = "SEV1",
  SEV2 = "SEV2",
  SEV3 = "SEV3",
  SEV4 = "SEV4",
  UNKNOWN = "UNKNOWN",
}

export enum IncidentSource {
  JIRA = "jira",
  SLACK = "slack",
  SLACK_EXPORT = "slack_export",
}

export interface Incident {
  id: number | null;
  external_id: string;
  source: IncidentSource;
  severity: Severity;
  title: string;
  description: string;
  occurred_at: string; // ISO timestamp
  resolved_at: string | null; // ISO timestamp
  raw_data: Record<string, any>;
  created_at: string; // ISO timestamp
}

// Request types
export interface JiraIngestRequest {
  url: string;
  email: string;
  api_token: string;
  jql: string;
}

export interface SlackIngestRequest {
  bot_token: string;
  channel_id: string;
  days_back: number;
}

export interface SlackExportIngestRequest {
  json_path?: string;
  json_content?: string;
  channel_name: string;
}

export interface TestConnectionRequest {
  url?: string;
  email?: string;
  api_token?: string;
  bot_token?: string;
}

// Response types
export interface IngestResponse {
  incidents_ingested: number;
  incidents_updated: number;
  errors: string[];
  new_count?: number;
  duplicate_count?: number;
}

export interface IncidentResponse {
  incident: Incident;
}

export interface IncidentListResponse {
  incidents: Incident[];
  total: number;
  severity_filter: Severity | null;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details: Record<string, any>;
}

export interface AuthUser {
  username: string;
  roles: string[];
}

export interface AuthSessionResponse {
  user: AuthUser;
  csrf_token: string;
}

export interface HealthResponse {
  status: string;
  version?: string;
  timestamp?: string;
  ollama_available?: boolean;
  database_ok?: boolean;
  database?: string;
  ollama?: string;
}

// Progress callback type for Slack ingestion
export type ProgressCallback = (
  fetchedCount: number,
  total: number,
  nextRequestIn: number,
) => void;

// Clustering types
export interface ClusterResult {
  cluster_id: number;
  incident_ids: number[];
  size: number;
  summary: string | null;
  centroid_text: string | null;
}

export interface ClusterRunResult {
  run_id: string;
  n_clusters: number;
  num_clusters?: number;
  num_incidents?: number;
  method: string;
  parameters: Record<string, any>;
  clusters: ClusterResult[];
  noise_incident_ids: number[];
  created_at: string;
}

export interface ClusterRequest {
  method?: string;
  min_samples?: number;
  eps?: number;
  n_clusters?: number | null;
}

export interface ClusterResponse {
  run: ClusterRunResult;
}

// Metrics types
export interface MetricsResult {
  total_incidents: number;
  sev1_count: number;
  sev2_count: number;
  sev3_count: number;
  sev4_count: number;
  unknown_count: number;
  mean_resolution_hours: number | null;
  median_resolution_hours: number | null;
  p50_resolution_hours: number | null;
  p90_resolution_hours: number | null;
  mttr_by_severity: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_month: Record<string, number>;
  by_assignee: Record<string, number>;
  by_project: Record<string, number>;
}

// Report types
export interface ReportGenerateRequest {
  cluster_run_id: string;
  title: string;
  quarter_label: string;
  chart_pngs: Record<string, string>;
}

export interface ReportResult {
  report_id: string;
  cluster_run_id: string;
  title: string;
  executive_summary: string;
  metrics: MetricsResult;
  created_at: string;
  docx_path: string | null;
}
