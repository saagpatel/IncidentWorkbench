"""Custom exception hierarchy for Incident Workbench."""

from typing import Any


class WorkbenchError(Exception):
    """Base exception for all workbench errors."""

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


# Integration errors
class JiraConnectionError(WorkbenchError):
    """Failed to connect to Jira."""

    pass


class JiraQueryError(WorkbenchError):
    """Jira query failed."""

    pass


class SlackAPIError(WorkbenchError):
    """Slack API error."""

    pass


class SlackRateLimitError(SlackAPIError):
    """Slack API rate limit exceeded."""

    pass


class StatuspageAPIError(WorkbenchError):
    """Statuspage API error."""

    pass


class ZendeskAPIError(WorkbenchError):
    """Zendesk API error."""

    pass


# AI/ML errors
class OllamaUnavailableError(WorkbenchError):
    """Ollama service is not available."""

    pass


class OllamaModelNotFoundError(WorkbenchError):
    """Required Ollama model not found."""

    pass


class InsufficientDataError(WorkbenchError):
    """Insufficient data for operation."""

    pass


class ClusteringError(WorkbenchError):
    """Clustering operation failed."""

    pass


class ReportGenerationError(WorkbenchError):
    """Report generation failed."""

    pass
