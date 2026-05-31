"""API request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from models.cluster import ClusterRunResult
from models.incident import Incident, Severity
from models.report import MetricsResult


# Request schemas
class JiraIngestRequest(BaseModel):
    """Request to ingest incidents from Jira."""

    url: str = Field(..., description="Jira instance URL")
    email: str = Field(..., description="Jira user email")
    api_token: str = Field(..., description="Jira API token")
    jql: str = Field(..., description="JQL query to find incidents")


class SlackIngestRequest(BaseModel):
    """Request to ingest incidents from Slack."""

    bot_token: str = Field(..., description="Slack bot token")
    channel_id: str = Field(..., description="Channel ID to search")
    days_back: int = Field(default=30, ge=1, le=365, description="Days to look back")


class SlackExportIngestRequest(BaseModel):
    """Request to ingest from Slack export JSON."""

    json_path: str | None = Field(default=None, description="Path to Slack export JSON file")
    json_content: str | None = Field(default=None, description="Raw Slack export JSON content")
    channel_name: str = Field(..., description="Channel name to extract")

    @model_validator(mode="after")
    def validate_json_source(self):
        """Require exactly one JSON source (path or inline content)."""
        has_path = bool(self.json_path)
        has_content = bool(self.json_content)

        if has_path == has_content:
            raise ValueError("Provide exactly one of 'json_path' or 'json_content'")

        return self


class StatuspageIngestRequest(BaseModel):
    """Request to ingest incidents from Atlassian Statuspage."""

    page_id: str = Field(..., min_length=1, description="Statuspage page identifier")
    api_key: str = Field(..., min_length=1, description="Statuspage API key")
    query: str | None = Field(
        default=None,
        description="Optional search query applied by Statuspage to incident fields",
    )
    max_pages: int = Field(
        default=1,
        ge=1,
        le=20,
        description="Maximum Statuspage result pages to fetch; each page can contain up to 100 incidents",
    )


class ZendeskIngestRequest(BaseModel):
    """Request to ingest incidents from Zendesk Support search."""

    url: str = Field(..., min_length=1, description="Zendesk Support instance URL")
    email: str = Field(..., min_length=1, description="Zendesk user email")
    api_token: str = Field(..., min_length=1, description="Zendesk API token")
    query: str = Field(..., min_length=1, description="Zendesk search query for incident tickets")
    max_pages: int = Field(
        default=1,
        ge=1,
        le=20,
        description="Maximum Zendesk search result pages to fetch; each page can contain up to 100 tickets",
    )


class JiraConnectionTestRequest(BaseModel):
    """Request to test Jira connection."""

    url: str = Field(..., description="Jira instance URL")
    email: str = Field(..., description="Jira user email")
    api_token: str = Field(..., description="Jira API token")


class SlackConnectionTestRequest(BaseModel):
    """Request to test Slack connection."""

    bot_token: str = Field(..., description="Slack bot token")


class StatuspageConnectionTestRequest(BaseModel):
    """Request to test Statuspage connection."""

    page_id: str = Field(..., min_length=1, description="Statuspage page identifier")
    api_key: str = Field(..., min_length=1, description="Statuspage API key")


class ZendeskConnectionTestRequest(BaseModel):
    """Request to test Zendesk connection."""

    url: str = Field(..., min_length=1, description="Zendesk Support instance URL")
    email: str = Field(..., min_length=1, description="Zendesk user email")
    api_token: str = Field(..., min_length=1, description="Zendesk API token")


class ClusterRequest(BaseModel):
    """Request to run clustering."""

    method: str = Field(default="dbscan", description="Clustering method (dbscan, kmeans)")
    min_samples: int = Field(default=3, ge=1, description="Minimum samples for DBSCAN")
    eps: float = Field(default=0.3, ge=0.0, le=1.0, description="Epsilon for DBSCAN")
    n_clusters: int | None = Field(default=None, ge=2, description="Number of clusters for K-means")


class ReportGenerateRequest(BaseModel):
    """Request to generate a report."""

    cluster_run_id: str = Field(..., description="Cluster run ID (UUID)")
    title: str = Field(default="Incident Analysis Report", description="Report title")
    quarter_label: str = Field(..., description="Quarter label (e.g., 'Q1 2024')")
    chart_pngs: dict[str, str] = Field(
        default_factory=dict, description="Chart names to base64-encoded PNG data"
    )


class LoginRequest(BaseModel):
    """Request to create a user session."""

    username: str = Field(..., min_length=3, max_length=128)
    password: str = Field(..., min_length=8, max_length=512)


class TestConnectionRequest(BaseModel):
    """Request to test external service connection."""

    url: str | None = None
    email: str | None = None
    api_token: str | None = None
    bot_token: str | None = None


# Response schemas
class IngestResponse(BaseModel):
    """Response from ingestion operation."""

    incidents_ingested: int
    incidents_updated: int
    errors: list[str] = Field(default_factory=list)


class ClusterResponse(BaseModel):
    """Response from clustering operation."""

    run: ClusterRunResult


class ReportResponse(BaseModel):
    """Response with report metadata."""

    report_id: str
    cluster_run_id: str
    metrics: MetricsResult
    file_path: str
    generated_at: datetime


class IncidentResponse(BaseModel):
    """Single incident response."""

    incident: Incident


class IncidentListResponse(BaseModel):
    """List of incidents response."""

    incidents: list[Incident]
    total: int
    severity_filter: Severity | None = None


class TestConnectionResponse(BaseModel):
    """Test connection response."""

    success: bool
    message: str
    details: dict = Field(default_factory=dict)


class AuthUserResponse(BaseModel):
    """Authenticated user details for API responses."""

    username: str
    roles: list[str]


class AuthSessionResponse(BaseModel):
    """Session response returned by login endpoints."""

    user: AuthUserResponse
    csrf_token: str
