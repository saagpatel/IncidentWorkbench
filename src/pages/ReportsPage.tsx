/**
 * Reports page - Generate DOCX reports with LLM summaries
 */

import { useEffect, useState } from "react";
import { buildBackendUrl } from "../api/client";
import {
  useClusterRuns,
  useGenerateReport,
  useMetrics,
  useReports,
  getErrorMessage,
} from "../api/hooks";
import { ChartExporter } from "../components/ChartExporter";
import { useToastContext } from "../contexts/ToastContext";

export function ReportsPage() {
  const toast = useToastContext();
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [title, setTitle] = useState("Quarterly Incident Review");
  const [quarter, setQuarter] = useState("Q1 2024");
  const [chartPngs, setChartPngs] = useState<Record<string, string>>({});
  const [downloadBaseUrl, setDownloadBaseUrl] = useState("");

  const { data: runs } = useClusterRuns();
  const { data: reports } = useReports();
  const { data: metrics } = useMetrics();
  const generateMutation = useGenerateReport();

  useEffect(() => {
    let active = true;

    void buildBackendUrl("/")
      .then((url) => {
        if (!active) {
          return;
        }

        setDownloadBaseUrl(url.replace(/\/$/, ""));
      })
      .catch(() => {
        if (active) {
          setDownloadBaseUrl("");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedRunId) {
      toast.error("Please select a cluster run");
      return;
    }

    if (Object.keys(chartPngs).length === 0) {
      toast.error("Please export charts first");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        cluster_run_id: selectedRunId,
        title,
        quarter_label: quarter,
        chart_pngs: chartPngs,
      });

      // Download the DOCX
      const downloadUrl = await buildBackendUrl(
        `/reports/${result.report_id}/download`,
      );
      window.open(downloadUrl, "_blank");

      // Reset form
      setChartPngs({});
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error(`Failed to generate report: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem" }}>Generate Report</h1>

      <div
        style={{
          marginBottom: "3rem",
          padding: "24px",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", fontSize: "20px" }}>
          Report Configuration
        </h2>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
            >
              Select Cluster Run:
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            >
              <option value="">-- Select a cluster run --</option>
              {runs?.map((run) => (
                <option key={run.run_id} value={run.run_id}>
                  {new Date(run.created_at).toLocaleString()} - {run.n_clusters}{" "}
                  clusters ({run.method})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
            >
              Report Title:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
          </div>

          <div>
            <label
              style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
            >
              Quarter Label:
            </label>
            <input
              type="text"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              placeholder="Q1 2024"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "14px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
              }}
            />
          </div>
        </div>
      </div>

      {metrics && (
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "20px" }}>
            Export Charts
          </h2>
          <ChartExporter metrics={metrics} onChartsExported={setChartPngs} />
        </div>
      )}

      <div style={{ marginBottom: "3rem" }}>
        <button
          onClick={handleGenerate}
          disabled={
            !selectedRunId ||
            Object.keys(chartPngs).length === 0 ||
            generateMutation.isPending
          }
          style={{
            padding: "14px 32px",
            fontSize: "16px",
            fontWeight: 600,
            backgroundColor:
              !selectedRunId || Object.keys(chartPngs).length === 0
                ? "#9ca3af"
                : "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor:
              !selectedRunId || Object.keys(chartPngs).length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {generateMutation.isPending
            ? "Generating Report..."
            : "Generate DOCX Report"}
        </button>

        {generateMutation.isPending && (
          <p style={{ marginTop: "16px", color: "#6b7280" }}>
            Generating executive summary with LLM and creating DOCX file...
          </p>
        )}
      </div>

      {reports && reports.length > 0 && (
        <div>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "20px" }}>
            Generated Reports
          </h2>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {reports.map((report) => (
              <div
                key={report.report_id}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "8px",
                      }}
                    >
                      {report.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "8px",
                      }}
                    >
                      Generated: {new Date(report.created_at).toLocaleString()}
                    </p>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>
                      {report.metrics.total_incidents} incidents |{" "}
                      {report.metrics.sev1_count} SEV1 |{" "}
                      {report.metrics.sev2_count} SEV2
                    </p>
                  </div>
                  <a
                    href={
                      downloadBaseUrl
                        ? `${downloadBaseUrl}/reports/${report.report_id}/download`
                        : "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (!downloadBaseUrl) {
                        event.preventDefault();
                        toast.error(
                          "Backend download URL is not available yet",
                        );
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: 600,
                      backgroundColor: "#3b82f6",
                      color: "#ffffff",
                      textDecoration: "none",
                      borderRadius: "6px",
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
