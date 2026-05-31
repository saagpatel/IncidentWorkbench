"""Incident domain models."""

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class Severity(str, Enum):
    """Incident severity levels."""

    SEV1 = "SEV1"
    SEV2 = "SEV2"
    SEV3 = "SEV3"
    SEV4 = "SEV4"
    UNKNOWN = "UNKNOWN"


class IncidentSource(str, Enum):
    """Source of incident data."""

    JIRA = "jira"
    SLACK = "slack"
    SLACK_EXPORT = "slack_export"
    STATUSPAGE = "statuspage"
    ZENDESK = "zendesk"


class Incident(BaseModel):
    """Incident data model."""

    id: int | None = None
    external_id: str = Field(..., description="External ID from source system")
    source: IncidentSource
    severity: Severity
    title: str = Field(..., min_length=1)
    description: str = ""
    occurred_at: datetime
    resolved_at: datetime | None = None
    raw_data: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
