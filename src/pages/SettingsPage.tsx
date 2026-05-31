/**
 * Settings page for configuring integrations
 */

import { useState, useEffect } from "react";
import {
  useTestJiraConnection,
  useTestSlackConnection,
  useTestStatuspageConnection,
  useTestZendeskConnection,
  useHealth,
  getErrorMessage,
} from "../api/hooks";
import { useToastContext } from "../contexts/ToastContext";
import {
  readJiraCredentials,
  saveJiraCredentials,
  readSlackCredentials,
  saveSlackCredentials,
  readStatuspageCredentials,
  saveStatuspageCredentials,
  readZendeskCredentials,
  saveZendeskCredentials,
} from "../utils/stronghold";

export function SettingsPage() {
  const toast = useToastContext();

  // Jira state
  const [jiraUrl, setJiraUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");

  // Slack state
  const [slackBotToken, setSlackBotToken] = useState("");
  const [slackUserToken, setSlackUserToken] = useState("");

  // Statuspage state
  const [statuspagePageId, setStatuspagePageId] = useState("");
  const [statuspageApiKey, setStatuspageApiKey] = useState("");

  // Zendesk state
  const [zendeskUrl, setZendeskUrl] = useState("");
  const [zendeskEmail, setZendeskEmail] = useState("");
  const [zendeskApiToken, setZendeskApiToken] = useState("");

  // Test connection mutations
  const testJira = useTestJiraConnection();
  const testSlack = useTestSlackConnection();
  const testStatuspage = useTestStatuspageConnection();
  const testZendesk = useTestZendeskConnection();
  const { data: health, isLoading: healthLoading } = useHealth();

  // Load credentials on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    const jiraCreds = await readJiraCredentials();
    if (jiraCreds) {
      setJiraUrl(jiraCreds.url);
      setJiraEmail(jiraCreds.email);
      setJiraApiToken(jiraCreds.apiToken);
    }

    const slackCreds = await readSlackCredentials();
    if (slackCreds) {
      setSlackBotToken(slackCreds.botToken);
      setSlackUserToken(slackCreds.userToken || "");
    }

    const statuspageCreds = await readStatuspageCredentials();
    if (statuspageCreds) {
      setStatuspagePageId(statuspageCreds.pageId);
      setStatuspageApiKey(statuspageCreds.apiKey);
    }

    const zendeskCreds = await readZendeskCredentials();
    if (zendeskCreds) {
      setZendeskUrl(zendeskCreds.url);
      setZendeskEmail(zendeskCreds.email);
      setZendeskApiToken(zendeskCreds.apiToken);
    }
  };

  const handleSaveJira = async () => {
    if (!jiraUrl || !jiraEmail || !jiraApiToken) {
      toast.error("Please fill in all Jira fields");
      return;
    }
    try {
      await saveJiraCredentials(jiraUrl, jiraEmail, jiraApiToken);
      toast.success("Jira credentials saved securely");
    } catch (error: unknown) {
      toast.error(`Failed to save Jira credentials: ${getErrorMessage(error)}`);
    }
  };

  const handleTestJira = async () => {
    if (!jiraUrl || !jiraEmail || !jiraApiToken) {
      toast.error("Please fill in all Jira fields");
      return;
    }
    testJira.mutate(
      {
        url: jiraUrl,
        email: jiraEmail,
        api_token: jiraApiToken,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success(
              `Jira connection successful! Connected to ${data.details.server_title || "server"}`,
            );
          } else {
            toast.error(`Jira connection failed: ${data.message}`);
          }
        },
        onError: (error: unknown) => {
          toast.error(`Jira connection failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  const handleSaveSlack = async () => {
    if (!slackBotToken) {
      toast.error("Please provide a Slack bot token");
      return;
    }
    try {
      await saveSlackCredentials(slackBotToken, slackUserToken);
      toast.success("Slack credentials saved securely");
    } catch (error: unknown) {
      toast.error(
        `Failed to save Slack credentials: ${getErrorMessage(error)}`,
      );
    }
  };

  const handleTestSlack = async () => {
    if (!slackBotToken) {
      toast.error("Please provide a Slack bot token");
      return;
    }
    testSlack.mutate(
      {
        bot_token: slackBotToken,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success(
              `Slack connection successful! Team: ${data.details.team || "Unknown"}`,
            );
          } else {
            toast.error(`Slack connection failed: ${data.message}`);
          }
        },
        onError: (error: unknown) => {
          toast.error(`Slack connection failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  const handleSaveStatuspage = async () => {
    if (!statuspagePageId || !statuspageApiKey) {
      toast.error("Please fill in all Statuspage fields");
      return;
    }
    try {
      await saveStatuspageCredentials(statuspagePageId, statuspageApiKey);
      toast.success("Statuspage credentials saved securely");
    } catch (error: unknown) {
      toast.error(
        `Failed to save Statuspage credentials: ${getErrorMessage(error)}`,
      );
    }
  };

  const handleTestStatuspage = async () => {
    if (!statuspagePageId || !statuspageApiKey) {
      toast.error("Please fill in all Statuspage fields");
      return;
    }
    testStatuspage.mutate(
      {
        page_id: statuspagePageId,
        api_key: statuspageApiKey,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success("Statuspage connection successful");
          } else {
            toast.error(`Statuspage connection failed: ${data.message}`);
          }
        },
        onError: (error: unknown) => {
          toast.error(
            `Statuspage connection failed: ${getErrorMessage(error)}`,
          );
        },
      },
    );
  };

  const handleSaveZendesk = async () => {
    if (!zendeskUrl || !zendeskEmail || !zendeskApiToken) {
      toast.error("Please fill in all Zendesk fields");
      return;
    }
    try {
      await saveZendeskCredentials(zendeskUrl, zendeskEmail, zendeskApiToken);
      toast.success("Zendesk credentials saved securely");
    } catch (error: unknown) {
      toast.error(
        `Failed to save Zendesk credentials: ${getErrorMessage(error)}`,
      );
    }
  };

  const handleTestZendesk = async () => {
    if (!zendeskUrl || !zendeskEmail || !zendeskApiToken) {
      toast.error("Please fill in all Zendesk fields");
      return;
    }
    testZendesk.mutate(
      {
        url: zendeskUrl,
        email: zendeskEmail,
        api_token: zendeskApiToken,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast.success(
              `Zendesk connection successful! User: ${data.details.user || "Unknown"}`,
            );
          } else {
            toast.error(`Zendesk connection failed: ${data.message}`);
          }
        },
        onError: (error: unknown) => {
          toast.error(`Zendesk connection failed: ${getErrorMessage(error)}`);
        },
      },
    );
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* Ollama Status */}
      <section className="settings-section">
        <h2>Ollama Status</h2>
        {healthLoading ? (
          <div className="status-indicator">
            <span className="status-dot inactive"></span>
            <span>Checking Ollama status...</span>
          </div>
        ) : (
          <>
            <div className="status-indicator">
              <span
                className={`status-dot ${health?.ollama === "ok" ? "active" : "inactive"}`}
              ></span>
              <span>
                {health?.ollama === "ok"
                  ? "Ollama is running"
                  : "Ollama is not available"}
              </span>
            </div>

            {health?.ollama !== "ok" && (
              <div className="ollama-help">
                <h3>Required Ollama Models</h3>
                <p>
                  Incident Workbench requires these models for clustering and
                  analysis:
                </p>
                <ul>
                  <li>
                    <code>nomic-embed-text</code> - Text embedding model
                  </li>
                  <li>
                    <code>llama3.2</code> - Language model for summaries
                  </li>
                </ul>
                <p>Install them with:</p>
                <pre>
                  ollama pull nomic-embed-text{"\n"}
                  ollama pull llama3.2
                </pre>
                <p>
                  If Ollama is not installed, download it from{" "}
                  <a
                    href="https://ollama.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ollama.ai
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Jira Configuration */}
      <section className="settings-section">
        <h2>Jira Configuration</h2>
        <div className="form-group">
          <label htmlFor="jira-url">Jira URL</label>
          <input
            id="jira-url"
            type="text"
            value={jiraUrl}
            onChange={(e) => setJiraUrl(e.target.value)}
            placeholder="https://your-company.atlassian.net"
          />
        </div>

        <div className="form-group">
          <label htmlFor="jira-email">Email</label>
          <input
            id="jira-email"
            type="email"
            value={jiraEmail}
            onChange={(e) => setJiraEmail(e.target.value)}
            placeholder="your.email@company.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="jira-token">API Token</label>
          <input
            id="jira-token"
            type="password"
            value={jiraApiToken}
            onChange={(e) => setJiraApiToken(e.target.value)}
            placeholder="Your Jira API token"
          />
        </div>

        <div className="button-group">
          <button onClick={handleSaveJira} className="btn btn-primary">
            Save Credentials
          </button>
          <button
            onClick={handleTestJira}
            className="btn btn-secondary"
            disabled={testJira.isPending}
          >
            {testJira.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {testJira.data && (
          <div
            className={`message ${testJira.data.success ? "success" : "error"}`}
          >
            {testJira.data.message}
            {testJira.data.success && testJira.data.details.server_title && (
              <div className="details">
                Server: {testJira.data.details.server_title} (v
                {testJira.data.details.server_version})
              </div>
            )}
          </div>
        )}
      </section>

      {/* Slack Configuration */}
      <section className="settings-section">
        <h2>Slack Configuration</h2>
        <div className="form-group">
          <label htmlFor="slack-bot-token">Bot Token</label>
          <input
            id="slack-bot-token"
            type="password"
            value={slackBotToken}
            onChange={(e) => setSlackBotToken(e.target.value)}
            placeholder="xoxb-your-bot-token"
          />
        </div>

        <div className="form-group">
          <label htmlFor="slack-user-token">
            User Token (optional, for threads)
          </label>
          <input
            id="slack-user-token"
            type="password"
            value={slackUserToken}
            onChange={(e) => setSlackUserToken(e.target.value)}
            placeholder="xoxp-your-user-token"
          />
        </div>

        <div className="button-group">
          <button onClick={handleSaveSlack} className="btn btn-primary">
            Save Credentials
          </button>
          <button
            onClick={handleTestSlack}
            className="btn btn-secondary"
            disabled={testSlack.isPending}
          >
            {testSlack.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {testSlack.data && (
          <div
            className={`message ${testSlack.data.success ? "success" : "error"}`}
          >
            {testSlack.data.message}
            {testSlack.data.success && testSlack.data.details.team && (
              <div className="details">
                Team: {testSlack.data.details.team}, User:{" "}
                {testSlack.data.details.user}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Statuspage Configuration */}
      <section className="settings-section">
        <h2>Statuspage Configuration</h2>
        <div className="form-group">
          <label htmlFor="statuspage-page-id">Page ID</label>
          <input
            id="statuspage-page-id"
            type="text"
            value={statuspagePageId}
            onChange={(e) => setStatuspagePageId(e.target.value)}
            placeholder="your-statuspage-page-id"
          />
        </div>

        <div className="form-group">
          <label htmlFor="statuspage-api-key">API Key</label>
          <input
            id="statuspage-api-key"
            type="password"
            value={statuspageApiKey}
            onChange={(e) => setStatuspageApiKey(e.target.value)}
            placeholder="Your Statuspage API key"
          />
        </div>

        <div className="button-group">
          <button onClick={handleSaveStatuspage} className="btn btn-primary">
            Save Credentials
          </button>
          <button
            onClick={handleTestStatuspage}
            className="btn btn-secondary"
            disabled={testStatuspage.isPending}
          >
            {testStatuspage.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {testStatuspage.data && (
          <div
            className={`message ${testStatuspage.data.success ? "success" : "error"}`}
          >
            {testStatuspage.data.message}
            {testStatuspage.data.success && (
              <div className="details">
                Page: {testStatuspage.data.details.page_id}, sample incidents:{" "}
                {testStatuspage.data.details.sample_incidents}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Zendesk Configuration */}
      <section className="settings-section">
        <h2>Zendesk Configuration</h2>
        <div className="form-group">
          <label htmlFor="zendesk-url">Zendesk URL</label>
          <input
            id="zendesk-url"
            type="text"
            value={zendeskUrl}
            onChange={(e) => setZendeskUrl(e.target.value)}
            placeholder="https://your-company.zendesk.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="zendesk-email">Email</label>
          <input
            id="zendesk-email"
            type="email"
            value={zendeskEmail}
            onChange={(e) => setZendeskEmail(e.target.value)}
            placeholder="your.email@company.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="zendesk-token">API Token</label>
          <input
            id="zendesk-token"
            type="password"
            value={zendeskApiToken}
            onChange={(e) => setZendeskApiToken(e.target.value)}
            placeholder="Your Zendesk API token"
          />
        </div>

        <div className="button-group">
          <button onClick={handleSaveZendesk} className="btn btn-primary">
            Save Credentials
          </button>
          <button
            onClick={handleTestZendesk}
            className="btn btn-secondary"
            disabled={testZendesk.isPending}
          >
            {testZendesk.isPending ? "Testing..." : "Test Connection"}
          </button>
        </div>

        {testZendesk.data && (
          <div
            className={`message ${testZendesk.data.success ? "success" : "error"}`}
          >
            {testZendesk.data.message}
            {testZendesk.data.success && (
              <div className="details">
                User: {testZendesk.data.details.user}, Email:{" "}
                {testZendesk.data.details.email}
              </div>
            )}
          </div>
        )}
      </section>

      <style>{`
        .settings-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .settings-page h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #111827;
        }

        .settings-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .settings-section h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
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

        .form-group input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px;
          ring-color: #3b82f6;
        }

        .button-group {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
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

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
        }

        .message {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 14px;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #ef4444;
        }

        .message .details {
          margin-top: 0.5rem;
          font-size: 12px;
          opacity: 0.9;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .status-dot.active {
          background: #10b981;
        }

        .status-dot.inactive {
          background: #ef4444;
        }

        .ollama-help {
          margin-top: 1rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
        }

        .ollama-help h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #92400e;
        }

        .ollama-help p {
          font-size: 14px;
          color: #78350f;
          margin-bottom: 0.5rem;
        }

        .ollama-help ul {
          margin: 0.5rem 0 0.5rem 1.5rem;
          font-size: 14px;
          color: #78350f;
        }

        .ollama-help code {
          background: #fbbf24;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 13px;
        }

        .ollama-help pre {
          background: #78350f;
          color: #fef3c7;
          padding: 0.75rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
          overflow-x: auto;
          margin: 0.5rem 0;
        }

        .ollama-help a {
          color: #1d4ed8;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
