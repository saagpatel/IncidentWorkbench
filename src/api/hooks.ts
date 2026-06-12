/**
 * TanStack Query hooks for API calls
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "./client";
import type {
  Incident,
  IncidentListResponse,
  IncidentSource,
  Severity,
  JiraIngestRequest,
  SlackIngestRequest,
  SlackExportIngestRequest,
  StatuspageIngestRequest,
  ZendeskIngestRequest,
  IngestResponse,
  TestConnectionResponse,
  HealthResponse,
  ClusterRequest,
  ClusterResponse,
  ClusterRunResult,
  MetricsResult,
  ReportGenerateRequest,
  ReportResult,
} from "../types";

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as {
      response?: { data?: { detail?: unknown; message?: string } };
      message?: string;
    };

    if (err.response?.data?.detail) {
      return typeof err.response.data.detail === "string"
        ? err.response.data.detail
        : JSON.stringify(err.response.data.detail);
    }
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }
  }
  return "An unexpected error occurred";
}

// Query keys
export const QUERY_KEYS = {
  incidents: (filters?: { source?: IncidentSource; severity?: Severity }) =>
    ["incidents", filters] as const,
  incident: (id: number) => ["incidents", id] as const,
  health: ["health"] as const,
  clusterRuns: ["clusters"] as const,
  clusterRun: (runId: string) => ["clusters", runId] as const,
  metrics: (filters?: { source?: IncidentSource; severity?: Severity }) =>
    ["metrics", filters] as const,
  reports: ["reports"] as const,
};

/**
 * Fetch all incidents with optional filters
 */
export function useIncidents(filters?: {
  source?: IncidentSource;
  severity?: Severity;
  offset?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.incidents(filters),
    queryFn: async () => {
      const client = await getApiClient();
      const params = new URLSearchParams();

      if (filters?.source) params.append("source", filters.source);
      if (filters?.severity) params.append("severity", filters.severity);
      if (filters?.offset !== undefined)
        params.append("offset", filters.offset.toString());
      if (filters?.limit !== undefined)
        params.append("limit", filters.limit.toString());

      const response = await client.get<IncidentListResponse>(
        `/incidents?${params.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * Fetch a single incident by ID
 */
export function useIncident(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.incident(id),
    queryFn: async () => {
      const client = await getApiClient();
      const response = await client.get<{ incident: Incident }>(
        `/incidents/${id}`,
      );
      return response.data.incident;
    },
    enabled: id > 0,
  });
}

/**
 * Ingest incidents from Jira
 */
export function useIngestJira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: JiraIngestRequest) => {
      const client = await getApiClient();
      const response = await client.post<IngestResponse>(
        "/ingest/jira",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate incidents query to refetch
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Ingest incidents from Slack
 */
export function useIngestSlack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SlackIngestRequest) => {
      const client = await getApiClient();
      const response = await client.post<IngestResponse>(
        "/ingest/slack",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Ingest incidents from Slack export
 */
export function useIngestSlackExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SlackExportIngestRequest) => {
      const client = await getApiClient();
      const response = await client.post<IngestResponse>(
        "/ingest/slack-export",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Ingest incidents from Statuspage
 */
export function useIngestStatuspage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: StatuspageIngestRequest) => {
      const client = await getApiClient();
      const response = await client.post<IngestResponse>(
        "/ingest/statuspage",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Ingest incidents from Zendesk
 */
export function useIngestZendesk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ZendeskIngestRequest) => {
      const client = await getApiClient();
      const response = await client.post<IngestResponse>(
        "/ingest/zendesk",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Test Jira connection
 */
export function useTestJiraConnection() {
  return useMutation({
    mutationFn: async (params: {
      url: string;
      email: string;
      api_token: string;
    }) => {
      const client = await getApiClient();
      const response = await client.post<TestConnectionResponse>(
        "/settings/test-jira",
        params,
      );
      return response.data;
    },
  });
}

/**
 * Test Slack connection
 */
export function useTestSlackConnection() {
  return useMutation({
    mutationFn: async (params: { bot_token: string }) => {
      const client = await getApiClient();
      const response = await client.post<TestConnectionResponse>(
        "/settings/test-slack",
        params,
      );
      return response.data;
    },
  });
}

/**
 * Test Statuspage connection
 */
export function useTestStatuspageConnection() {
  return useMutation({
    mutationFn: async (params: { page_id: string; api_key: string }) => {
      const client = await getApiClient();
      const response = await client.post<TestConnectionResponse>(
        "/settings/test-statuspage",
        params,
      );
      return response.data;
    },
  });
}

/**
 * Test Zendesk connection
 */
export function useTestZendeskConnection() {
  return useMutation({
    mutationFn: async (params: {
      url: string;
      email: string;
      api_token: string;
    }) => {
      const client = await getApiClient();
      const response = await client.post<TestConnectionResponse>(
        "/settings/test-zendesk",
        params,
      );
      return response.data;
    },
  });
}

/**
 * Delete all incidents
 */
export function useDeleteAllIncidents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const client = await getApiClient();
      const response = await client.delete<{
        deleted: number;
        message: string;
      }>("/incidents");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * Health check
 */
export function useHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: async () => {
      const client = await getApiClient();
      const response = await client.get<HealthResponse>("/health");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * List all cluster runs
 */
export function useClusterRuns() {
  return useQuery({
    queryKey: QUERY_KEYS.clusterRuns,
    queryFn: async () => {
      const client = await getApiClient();
      const response = await client.get<ClusterRunResult[]>("/clusters");
      return response.data;
    },
  });
}

/**
 * Get a specific cluster run
 */
export function useClusterRun(runId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.clusterRun(runId),
    queryFn: async () => {
      const client = await getApiClient();
      const response = await client.get<ClusterResponse>(`/clusters/${runId}`);
      return response.data.run;
    },
    enabled: !!runId,
  });
}

/**
 * Run clustering algorithm
 */
export function useRunClustering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ClusterRequest) => {
      const client = await getApiClient();
      const response = await client.post<ClusterResponse>(
        "/clusters/run",
        request,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clusterRuns });
    },
  });
}

/**
 * Fetch metrics with optional filters
 */
export function useMetrics(filters?: {
  source?: IncidentSource;
  severity?: Severity;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.metrics(filters),
    queryFn: async () => {
      const client = await getApiClient();
      const params = new URLSearchParams();

      if (filters?.source) params.append("source", filters.source);
      if (filters?.severity) params.append("severity", filters.severity);

      const response = await client.get<MetricsResult>(
        `/incidents/metrics?${params.toString()}`,
      );
      return response.data;
    },
  });
}

/**
 * List all generated reports
 */
export function useReports() {
  return useQuery({
    queryKey: QUERY_KEYS.reports,
    queryFn: async () => {
      const client = await getApiClient();
      const response = await client.get<ReportResult[]>("/reports");
      return response.data;
    },
  });
}

/**
 * Generate a new DOCX report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ReportGenerateRequest) => {
      const client = await getApiClient();
      const response = await client.post<{
        report_id: string;
        docx_path: string;
      }>("/reports/generate", request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reports });
    },
  });
}
