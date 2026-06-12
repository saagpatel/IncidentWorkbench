/**
 * Dashboard Page - Displays metrics and charts
 */

import { useState } from "react";
import { useMetrics } from "../api/hooks";
import { ChartExporter } from "../components/ChartExporter";
import type { IncidentSource, Severity } from "../types";

export function DashboardPage() {
  const [filters, setFilters] = useState<{
    source?: IncidentSource;
    severity?: Severity;
  }>({});

  const [exportedCharts, setExportedCharts] = useState<Record<
    string,
    string
  > | null>(null);

  const { data: metrics, isLoading, error } = useMetrics(filters);

  const handleChartsExported = (chartPngs: Record<string, string>) => {
    setExportedCharts(chartPngs);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "#6b7280" }}>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px" }}>
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <p style={{ color: "#991b1b", fontWeight: 600, margin: 0 }}>
            Failed to load metrics: {String(error)}
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "18px", color: "#6b7280" }}>
          No metrics available
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "8px" }}>
          Incident Metrics Dashboard
        </h1>
        <p style={{ fontSize: "16px", color: "#6b7280", margin: 0 }}>
          Visualize and analyze incident data with interactive charts
        </p>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <StatCard label="Total Incidents" value={metrics.total_incidents} />
        <StatCard
          label="SEV1 Critical"
          value={metrics.sev1_count}
          color="#ef4444"
        />
        <StatCard
          label="SEV2 High"
          value={metrics.sev2_count}
          color="#f97316"
        />
        <StatCard
          label="SEV3 Medium"
          value={metrics.sev3_count}
          color="#eab308"
        />
        <StatCard label="SEV4 Low" value={metrics.sev4_count} color="#3b82f6" />
      </div>

      {/* Filters */}
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Filters:</label>
          <select
            value={filters.source || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                source: e.target.value as IncidentSource | undefined,
              })
            }
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">All Sources</option>
            <option value="jira">Jira</option>
            <option value="slack">Slack</option>
            <option value="slack_export">Slack Export</option>
            <option value="statuspage">Statuspage</option>
            <option value="zendesk">Zendesk</option>
          </select>
          <select
            value={filters.severity || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                severity: e.target.value as Severity | undefined,
              })
            }
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          >
            <option value="">All Severities</option>
            <option value="SEV1">SEV1</option>
            <option value="SEV2">SEV2</option>
            <option value="SEV3">SEV3</option>
            <option value="SEV4">SEV4</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
          <button
            onClick={() => setFilters({})}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Charts */}
      <ChartExporter
        metrics={metrics}
        onChartsExported={handleChartsExported}
      />

      {/* Debug: Show exported chart count */}
      {exportedCharts && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
          }}
        >
          <p style={{ margin: 0, color: "#15803d" }}>
            <strong>Debug:</strong> {Object.keys(exportedCharts).length} charts
            exported and ready for DOCX generation
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
}

function StatCard({ label, value, color = "#1f2937" }: StatCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
