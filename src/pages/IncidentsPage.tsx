/**
 * Incidents page for ingesting and viewing incidents
 */

import { useState } from "react";
import {
  useIncidents,
  useIngestJira,
  useIngestSlack,
  useIngestSlackExport,
  useIngestStatuspage,
  getErrorMessage,
} from "../api/hooks";
import { IncidentTable } from "../components/IncidentTable";
import { useToastContext } from "../contexts/ToastContext";
import {
  readJiraCredentials,
  readSlackCredentials,
  readStatuspageCredentials,
} from "../utils/stronghold";

export function IncidentsPage() {
  const toast = useToastContext();

  // Fetch incidents
  const { data: incidentsData, isLoading } = useIncidents();

  // Ingest mutations
  const ingestJira = useIngestJira();
  const ingestSlack = useIngestSlack();
  const ingestSlackExport = useIngestSlackExport();
  const ingestStatuspage = useIngestStatuspage();

  // Form state
  const [jql, setJql] = useState("project = OPS AND type = Incident");
  const [slackChannelId, setSlackChannelId] = useState("");
  const [slackDaysBack, setSlackDaysBack] = useState(30);
  const [slackExportJson, setSlackExportJson] = useState("");
  const [slackExportChannel, setSlackExportChannel] = useState("");
  const [statuspageQuery, setStatuspageQuery] = useState("");
  const [statuspageMaxPages, setStatuspageMaxPages] = useState(1);

  const handleFetchJira = async () => {
    const creds = await readJiraCredentials();
    if (!creds) {
      toast.error("Please configure Jira credentials in Settings first");
      return;
    }

    ingestJira.mutate(
      {
        url: creds.url,
        email: creds.email,
        api_token: creds.apiToken,
        jql,
      },
      {
        onSuccess: (data) => {
          const count = data.new_count ?? data.incidents_ingested;
          const dups = data.duplicate_count ?? 0;
          const message = `Fetched ${count} new incidents from Jira${
            dups > 0 ? ` (${dups} duplicates skipped)` : ""
          }`;
          toast.success(message);
        },
        onError: (error: unknown) => {
          toast.error(`Jira ingestion failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  const handleFetchSlack = async () => {
    const creds = await readSlackCredentials();
    if (!creds) {
      toast.error("Please configure Slack credentials in Settings first");
      return;
    }

    if (!slackChannelId) {
      toast.error("Please provide a Slack channel ID");
      return;
    }

    ingestSlack.mutate(
      {
        bot_token: creds.botToken,
        channel_id: slackChannelId,
        days_back: slackDaysBack,
      },
      {
        onSuccess: (data) => {
          const count = data.new_count ?? data.incidents_ingested;
          const dups = data.duplicate_count ?? 0;
          const message = `Fetched ${count} new incidents from Slack${
            dups > 0 ? ` (${dups} duplicates skipped)` : ""
          }`;
          toast.success(message);
        },
        onError: (error: unknown) => {
          toast.error(`Slack ingestion failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  const handleImportSlackExport = () => {
    if (!slackExportJson || !slackExportChannel) {
      toast.error("Please provide both JSON content and channel name");
      return;
    }

    ingestSlackExport.mutate(
      {
        json_content: slackExportJson,
        channel_name: slackExportChannel,
      },
      {
        onSuccess: (data) => {
          const count = data.new_count ?? data.incidents_ingested;
          const dups = data.duplicate_count ?? 0;
          const message = `Imported ${count} new incidents from Slack export${
            dups > 0 ? ` (${dups} duplicates skipped)` : ""
          }`;
          toast.success(message);
        },
        onError: (error: unknown) => {
          toast.error(`Slack export import failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  const handleFetchStatuspage = async () => {
    const creds = await readStatuspageCredentials();
    if (!creds) {
      toast.error("Please configure Statuspage credentials in Settings first");
      return;
    }

    ingestStatuspage.mutate(
      {
        page_id: creds.pageId,
        api_key: creds.apiKey,
        query: statuspageQuery.trim() || null,
        max_pages: statuspageMaxPages,
      },
      {
        onSuccess: (data) => {
          const count = data.new_count ?? data.incidents_ingested;
          const dups = data.duplicate_count ?? 0;
          const message = `Fetched ${count} new incidents from Statuspage${
            dups > 0 ? ` (${dups} duplicates skipped)` : ""
          }`;
          toast.success(message);
        },
        onError: (error: unknown) => {
          toast.error(`Statuspage ingestion failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  return (
    <div className="incidents-page">
      <h1>Incidents</h1>

      {/* Ingestion Section */}
      <div className="ingestion-section">
        <h2>Ingest Incidents</h2>

        {/* Jira Ingestion */}
        <div className="ingest-card">
          <h3>Fetch from Jira</h3>
          <div className="form-group">
            <label htmlFor="jql">JQL Query</label>
            <input
              id="jql"
              type="text"
              value={jql}
              onChange={(e) => setJql(e.target.value)}
              placeholder="project = OPS AND type = Incident"
            />
          </div>
          <button
            onClick={handleFetchJira}
            className="btn btn-primary"
            disabled={ingestJira.isPending}
          >
            {ingestJira.isPending ? "Fetching..." : "Fetch from Jira"}
          </button>

          {ingestJira.data && (
            <div className="result">
              <p>
                ✓ Ingested: {ingestJira.data.incidents_ingested} | Updated:{" "}
                {ingestJira.data.incidents_updated}
              </p>
              {ingestJira.data.errors.length > 0 && (
                <div className="errors">
                  <strong>Errors:</strong>
                  <ul>
                    {ingestJira.data.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slack Ingestion */}
        <div className="ingest-card">
          <h3>Fetch from Slack</h3>
          <div className="form-group">
            <label htmlFor="channel-id">Channel ID</label>
            <input
              id="channel-id"
              type="text"
              value={slackChannelId}
              onChange={(e) => setSlackChannelId(e.target.value)}
              placeholder="C01234567"
            />
          </div>
          <div className="form-group">
            <label htmlFor="days-back">Days Back</label>
            <input
              id="days-back"
              type="number"
              value={slackDaysBack}
              onChange={(e) => setSlackDaysBack(parseInt(e.target.value))}
              min="1"
              max="365"
            />
          </div>
          <button
            onClick={handleFetchSlack}
            className="btn btn-primary"
            disabled={ingestSlack.isPending}
          >
            {ingestSlack.isPending ? "Fetching..." : "Fetch from Slack"}
          </button>

          {/* Progress indicator will be implemented in future iterations */}

          {ingestSlack.data && (
            <div className="result">
              <p>
                ✓ Ingested: {ingestSlack.data.incidents_ingested} | Updated:{" "}
                {ingestSlack.data.incidents_updated}
              </p>
              {ingestSlack.data.errors.length > 0 && (
                <div className="errors">
                  <strong>Errors:</strong>
                  <ul>
                    {ingestSlack.data.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slack Export Import */}
        <div className="ingest-card">
          <h3>Import Slack Export</h3>
          <div className="form-group">
            <label htmlFor="export-channel">Channel Name</label>
            <input
              id="export-channel"
              type="text"
              value={slackExportChannel}
              onChange={(e) => setSlackExportChannel(e.target.value)}
              placeholder="incidents"
            />
          </div>
          <div className="form-group">
            <label htmlFor="export-json">JSON Content</label>
            <textarea
              id="export-json"
              value={slackExportJson}
              onChange={(e) => setSlackExportJson(e.target.value)}
              placeholder='[{"text": "Incident message", "ts": "1234567890.123456"}]'
              rows={6}
            />
          </div>
          <button
            onClick={handleImportSlackExport}
            className="btn btn-primary"
            disabled={ingestSlackExport.isPending}
          >
            {ingestSlackExport.isPending ? "Importing..." : "Import Export"}
          </button>

          {ingestSlackExport.data && (
            <div className="result">
              <p>
                ✓ Ingested: {ingestSlackExport.data.incidents_ingested} |
                Updated: {ingestSlackExport.data.incidents_updated}
              </p>
              {ingestSlackExport.data.errors.length > 0 && (
                <div className="errors">
                  <strong>Errors:</strong>
                  <ul>
                    {ingestSlackExport.data.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Statuspage Ingestion */}
        <div className="ingest-card">
          <h3>Fetch from Statuspage</h3>
          <div className="form-group">
            <label htmlFor="statuspage-query">Search Query (optional)</label>
            <input
              id="statuspage-query"
              type="text"
              value={statuspageQuery}
              onChange={(e) => setStatuspageQuery(e.target.value)}
              placeholder="database, outage, postmortem"
            />
          </div>
          <div className="form-group">
            <label htmlFor="statuspage-max-pages">Max Pages</label>
            <input
              id="statuspage-max-pages"
              type="number"
              value={statuspageMaxPages}
              onChange={(e) => setStatuspageMaxPages(parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>
          <button
            onClick={handleFetchStatuspage}
            className="btn btn-primary"
            disabled={ingestStatuspage.isPending}
          >
            {ingestStatuspage.isPending
              ? "Fetching..."
              : "Fetch from Statuspage"}
          </button>

          {ingestStatuspage.data && (
            <div className="result">
              <p>
                ✓ Ingested: {ingestStatuspage.data.incidents_ingested} |
                Updated: {ingestStatuspage.data.incidents_updated}
              </p>
              {ingestStatuspage.data.errors.length > 0 && (
                <div className="errors">
                  <strong>Errors:</strong>
                  <ul>
                    {ingestStatuspage.data.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="table-section">
        <h2>All Incidents ({incidentsData?.total || 0})</h2>
        <IncidentTable
          incidents={incidentsData?.incidents || []}
          loading={isLoading}
        />
      </div>

      <style>{`
        .incidents-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .incidents-page h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #111827;
        }

        .ingestion-section {
          margin-bottom: 3rem;
        }

        .ingestion-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .ingest-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .ingest-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #374151;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .result {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f0fdf4;
          border: 1px solid #10b981;
          border-radius: 6px;
          color: #065f46;
          font-size: 14px;
        }

        .errors {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #ef4444;
          border-radius: 6px;
          color: #991b1b;
          font-size: 13px;
        }

        .errors ul {
          margin: 0.5rem 0 0 1rem;
          padding: 0;
        }

        .table-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }
      `}</style>
    </div>
  );
}
